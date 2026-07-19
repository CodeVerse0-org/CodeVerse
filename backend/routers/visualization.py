import httpx
import base64
import os
import json
import uuid
from datetime import datetime
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header

# ✅ Correct imports
from routers.auth import get_current_user, get_optional_user
from routers.github import get_installation_access_token
from utils.dependency_parser import extract_dependencies
from utils.function_dependency_parser import extract_function_dependencies
from utils.function_graph_builder import build_function_graph
from utils.state_dependency_parser import extract_state_dependencies
from utils.state_graph_builder import build_state_graph
from db.queries import get_all_user_summaries

# ✅ Added imports for audit logging
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models import User, UserRepository
from services.audit_service import create_audit_log

router = APIRouter(prefix="/api/repos", tags=["Visualization"])

IGNORE_DIRS = {"node_modules", "venv", ".git", "__pycache__", "dist", "build", "target"}
SUPPORTED_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".py"}

# ---------------- SAFE SANITIZER ----------------
def force_scalar(val, max_len=20000):
    if val is None:
        return ""
    if isinstance(val, (dict, list)):
        try:
            val = json.dumps(val)
        except Exception:
            val = str(val)
    try:
        val = str(val)
    except Exception:
        return ""
    return val[:max_len]

def safe_session(driver):
    """
    Safe Neo4j session handler with basic reconnect fallback
    """
    try:
        return driver.session()
    except Exception as e:
        print("♻️ Neo4j reconnect triggered:", e)
        try:
            driver.close()
        except:
            pass
        return driver.session()

# ---------------- AUDIT LOG HELPER ----------------
def log_graph_generation(
    user_id: Any,
    repo_name: str,
    graph_type: str
):
    # Fallback to prevent processing for generic public actions without valid user profiles
    if not user_id or str(user_id) == "public_user":
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.id == int(user_id)
        ).first()

        if not user:
            return

        user_repo = (
            db.query(UserRepository)
            .filter(UserRepository.user_id == int(user_id))
            .first()
        )

        create_audit_log(
            admin_id=None,
            actor_id=int(user_id),
            repository_id=user_repo.repo_id if user_repo else None,
            repository_name=repo_name,
            action="GRAPH_GENERATED",
            details=f"{user.first_name} {user.last_name} generated {graph_type} graph for {repo_name}"
        )
    finally:
        db.close()

# ---------------- GET HISTORY LIST ----------------
@router.get("/history")
async def get_history(
    request: Request,
    user_data: dict = Depends(get_current_user)
):
    driver = request.app.state.neo4j_driver
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j driver not initialized")

    user_id = str(user_data.get("id"))

    query = """
    MATCH (r:Repository {user_id: $user_id})-[:HAS_GRAPH]->(g:Graph)
    RETURN g.id AS id, r.name AS repo_name, g.timestamp AS timestamp, g.type AS graph_type
    ORDER BY g.timestamp DESC
    """

    try:
        with safe_session(driver) as session:
            result = session.run(query, user_id=user_id)
            history = [dict(record) for record in result]
            return history
    except Exception as e:
        print(f"❌ Error fetching history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ---------------- GET SPECIFIC HISTORY ----------------
@router.get("/graph-history/{owner}/{repo}")
async def get_specific_graph_history(
    owner: str,
    repo: str,
    request: Request,
    timestamp: str = Query(...),
    graph_type: str = Query("file"),
    user_data: dict = Depends(get_current_user)
):
    driver = request.app.state.neo4j_driver
    full_repo = f"{owner}/{repo}"
    user_id = str(user_data.get("id"))

    # ✅ UPDATED: Added rel.label to the edge collection
    query = """
    MATCH (r:Repository {name: $repo_name, user_id: $user_id})-[:HAS_GRAPH]->(g:Graph {timestamp: $timestamp, type: $type})
    OPTIONAL MATCH (g)-[:HAS_FILE|CONTAINS_FUNCTION|HAS_STATE]->(node)
    OPTIONAL MATCH (node)-[rel:IMPORTS|CALLS|STATE_FLOW]->(target)
    WHERE (g)-[:HAS_FILE|CONTAINS_FUNCTION|HAS_STATE]->(target)
    RETURN 
        collect(distinct {
            id: node.id, 
            data: {
                label: coalesce(node.label, node.name), 
                content: node.content, 
                file: node.file,
                summary: node.summary,
                type: node.type
            }
        }) as nodes,
        collect(distinct {source: node.id, target: target.id, label: rel.label}) as edges
    """

    try:
        with safe_session(driver) as session:
            result = session.run(
                query,
                repo_name=full_repo,
                timestamp=timestamp,
                type=graph_type,
                user_id=user_id
            ).data()

            if not result:
                return {"nodes": [], "dependencies": []}

            record = result[0]
            nodes = record.get("nodes") or []
            edges = record.get("edges") or []

            cleaned_edges = [e for e in edges if e and e.get("source") is not None]

            return {
                "nodes": nodes,
                "dependencies": cleaned_edges
            }

    except Exception as e:
        print(f"❌ Error loading history graph for {full_repo}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load historical graph")

# ---------------- NEO4J FILE SYNC ----------------
def sync_to_neo4j(driver, repo_name, nodes, edges, user_id):
    if not driver: return
    timestamp = datetime.now().isoformat()
    user_id_str = force_scalar(user_id)
    graph_id = str(uuid.uuid4())

    try:
        with safe_session(driver) as session:
            session.run("""
                MERGE (r:Repository {name: $repo_name, user_id: $user_id})
                CREATE (g:Graph {id: $graph_id, timestamp: $time, type: 'file'})
                MERGE (r)-[:HAS_GRAPH]->(g)
            """, repo_name=force_scalar(repo_name), user_id=user_id_str, time=timestamp, graph_id=graph_id)

            batch_size = 25
            for i in range(0, len(nodes), batch_size):
                batch = nodes[i:i + batch_size]
                session.run("""
                    MATCH (g:Graph {id: $graph_id})
                    UNWIND $batch_nodes as node
                    CREATE (f:File {
                        id: node.id,
                        path: node.id,
                        label: node.label,
                        content: node.content
                    })
                    MERGE (g)-[:HAS_FILE]->(f)
                """, graph_id=graph_id, batch_nodes=[{
                    "id": force_scalar(n.get("id")),
                    "label": force_scalar(n.get("data", {}).get("label")),
                    "content": force_scalar(n.get("data", {}).get("content"))
                } for n in batch])

            for i in range(0, len(edges), batch_size):
                batch = edges[i:i + batch_size]
                session.run("""
                    MATCH (g:Graph {id: $graph_id})
                    UNWIND $batch_edges as edge
                    MATCH (g)-[:HAS_FILE]->(source:File {id: edge.source})
                    MATCH (g)-[:HAS_FILE]->(target:File {id: edge.target})
                    MERGE (source)-[:IMPORTS]->(target)
                """, graph_id=graph_id, batch_edges=[{
                    "source": force_scalar(e.get("source")),
                    "target": force_scalar(e.get("target_full") or e.get("target"))
                } for e in batch])
    except Exception as e:
        print(f"❌ Neo4j File Sync Error: {e}")

# ---------------- GET SUMMARY HISTORY ----------------
@router.get("/summary-history")
async def get_summary_history(user_data: dict = Depends(get_current_user)):
    user_id = str(user_data.get("id"))
    try:
        history_list = get_all_user_summaries(user_id)
        return history_list
    except Exception as e:
        print(f"❌ ERROR in /summary-history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# ---------------- FUNCTION SYNC ----------------
def sync_functions_to_neo4j(driver, repo_name, graph_data, user_id):
    if not driver: return
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("links") or graph_data.get("edges") or graph_data.get("dependencies") or []
    timestamp = datetime.now().isoformat()
    user_id_str = force_scalar(user_id)
    graph_id = str(uuid.uuid4())

    try:
        with safe_session(driver) as session:
            session.run("""
                MERGE (r:Repository {name: $repo_name, user_id: $user_id})
                CREATE (g:Graph {id: $graph_id, timestamp: $time, type: 'function'})
                MERGE (r)-[:HAS_GRAPH]->(g)
            """, repo_name=force_scalar(repo_name), user_id=user_id_str, time=timestamp, graph_id=graph_id)

            batch_size = 50
            for i in range(0, len(nodes), batch_size):
                batch = nodes[i : i + batch_size]
                session.run("""
                    MATCH (g:Graph {id: $graph_id})
                    UNWIND $batch as node
                    CREATE (f:Function {id: node.id, name: node.name, file: node.file, content: node.content})
                    MERGE (g)-[:CONTAINS_FUNCTION]->(f)
                """, graph_id=graph_id, batch=[{
                    "id": force_scalar(n.get("id")),
                    "name": force_scalar(n.get("data", {}).get("label")),
                    "file": force_scalar(n.get("data", {}).get("file")),
                    "content": force_scalar(n.get("data", {}).get("content"))
                } for n in batch])

            if edges:
                for i in range(0, len(edges), batch_size):
                    batch = edges[i : i + batch_size]
                    session.run("""
                        MATCH (g:Graph {id: $graph_id})
                        UNWIND $batch as edge
                        MATCH (g)-[:CONTAINS_FUNCTION]->(caller:Function {id: edge.source})
                        MATCH (g)-[:CONTAINS_FUNCTION]->(callee:Function {id: edge.target})
                        MERGE (caller)-[:CALLS]->(callee)
                    """, graph_id=graph_id, batch=[{
                        "source": force_scalar(e.get("source")),
                        "target": force_scalar(e.get("target_full") or e.get("target"))
                    } for e in batch])
    except Exception as e:
        print(f"❌ Neo4j Function Sync Error: {e}")

# ---------------- STATE GRAPH SYNC ----------------
def sync_state_graph_to_neo4j(driver, repo_name, graph_data, user_id):
    if not driver: return
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("dependencies", []) or graph_data.get("edges", [])
    timestamp = datetime.now().isoformat()
    user_id_str = force_scalar(user_id)
    graph_id = str(uuid.uuid4())

    try:
        with safe_session(driver) as session:
            session.run("""
                MERGE (r:Repository {name: $repo_name, user_id: $user_id})
                CREATE (g:Graph {id: $graph_id, timestamp: $time, type: 'state'})
                MERGE (r)-[:HAS_GRAPH]->(g)
            """, repo_name=force_scalar(repo_name), user_id=user_id_str, time=timestamp, graph_id=graph_id)

            batch_size = 50
            for i in range(0, len(nodes), batch_size):
                batch = nodes[i:i + batch_size]
                session.run("""
                    MATCH (g:Graph {id: $graph_id})
                    UNWIND $batch as node
                    CREATE (s:State {
                        id: node.id,
                        label: node.label,
                        file: node.file,
                        type: node.type,
                        content: node.content
                    })
                    MERGE (g)-[:HAS_STATE]->(s)
                """, graph_id=graph_id, batch=[{
                        "id": force_scalar(n.get("id")),
                        "label": force_scalar(n.get("data", {}).get("label") or n.get("label")),
                        "file": force_scalar(n.get("data", {}).get("file") or n.get("file")),
                        "type": force_scalar(n.get("data", {}).get("type") or n.get("type")),
                        "content": force_scalar(n.get("data", {}).get("content") or n.get("content"))
                    } for n in batch])

            # ✅ UPDATED: Added {label: edge.label} to the MERGE relationship
            for i in range(0, len(edges), batch_size):
                batch = edges[i:i + batch_size]
                session.run("""
                    MATCH (g:Graph {id: $graph_id})
                    UNWIND $batch as edge
                    MATCH (g)-[:HAS_STATE]->(source:State {id: edge.source})
                    MATCH (g)-[:HAS_STATE]->(target:State {id: edge.target})
                    MERGE (source)-[:STATE_FLOW {label: edge.label}]->(target)
                """, graph_id=graph_id, batch=[{
                        "source": force_scalar(e.get("source")),
                        "target": force_scalar(e.get("target")),
                        "label": force_scalar(e.get("label")) # ✅ Passes the "PROP (var)" label to Neo4j
                    } for e in batch])
    except Exception as e:
        print(f"❌ Neo4j State Graph Sync Error: {e}")

# ---------------- PATH RESOLVER ----------------
def resolve_github_path(current_file, import_string, all_files):
    import_string = import_string.strip("'\"")
    if import_string.startswith("."):
        base_dir = os.path.dirname(current_file)
        joined = os.path.normpath(os.path.join(base_dir, import_string)).replace("\\", "/")
        if joined in all_files: return joined
        for ext in SUPPORTED_EXTENSIONS:
            if f"{joined}{ext}" in all_files: return f"{joined}{ext}"
    return None

# ---------------- FILE GRAPH GENERATION ----------------
@router.post("/generate-graph")
async def generate_graph(
    request: Request,
    full_repo: str = Query(...),
    installation_id: int | None = Query(None),
    user_data: dict = Depends(get_current_user)
):
    token = get_installation_access_token(installation_id) if installation_id else os.getenv("GITHUB_TOKEN")
    user_id = user_data.get("id")
    headers = {"Accept": "application/vnd.github+json"}
    if token: headers["Authorization"] = f"token {token}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200:
             raise HTTPException(status_code=resp.status_code, detail=f"GitHub Error: {resp.text}")

        items = resp.json().get("tree", [])
        file_paths = [i["path"] for i in items if not any(d in i["path"].split("/") for d in IGNORE_DIRS) 
                      and any(i["path"].endswith(ext) for ext in SUPPORTED_EXTENSIONS)]

        nodes, edges = [], []
        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            if c_resp.status_code == 200:
                raw_code = base64.b64decode(c_resp.json()["content"]).decode("utf-8", errors="ignore")
                nodes.append({"id": path, "data": {"label": path.split("/")[-1], "content": raw_code}})
                for dep in extract_dependencies(raw_code):
                    resolved = resolve_github_path(path, dep, file_paths)
                    if resolved: edges.append({"source": path, "target_full": resolved})

        sync_to_neo4j(request.app.state.neo4j_driver, full_repo, nodes, edges, user_id)
        
        # ✅ Added file graph audit log step
        log_graph_generation(
            user_id=user_id,
            repo_name=full_repo,
            graph_type="File Dependency"
        )
        
        return {"nodes": nodes, "dependencies": edges}

# ---------------- FUNCTION GRAPH GENERATION ----------------
@router.post("/generate-function-graph")
async def generate_function_graph(
    request: Request,
    full_repo: str = Query(...),
    installation_id: int | None = Query(None),
    user_data: dict = Depends(get_current_user)
):
    token = get_installation_access_token(installation_id) if installation_id else os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json"}
    if token: headers["Authorization"] = f"token {token}"
    user_id = user_data.get("id")

    all_functions_data, all_calls_data = [], []

    async with httpx.AsyncClient(timeout=150.0) as client:
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch repo tree")

        items = resp.json().get("tree", [])
        file_paths = [i["path"] for i in items if any(i["path"].endswith(ext) for ext in SUPPORTED_EXTENSIONS)
                      and not any(d in i["path"].split("/") for d in IGNORE_DIRS)]

        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            if c_resp.status_code != 200: continue
            try:
                raw_code = base64.b64decode(c_resp.json()["content"]).decode("utf-8", errors="ignore")
                functions, calls = extract_function_dependencies(raw_code, path)
                all_functions_data.extend(functions)
                all_calls_data.extend(calls)
            except Exception: continue

        graph = build_function_graph(all_functions_data, all_calls_data)
        sync_functions_to_neo4j(request.app.state.neo4j_driver, full_repo, graph, user_id)
        
        # ✅ Added function graph audit log step
        log_graph_generation(
            user_id=user_id,
            repo_name=full_repo,
            graph_type="Function Dependency"
        )
        
        return graph

# ---------------- GENERATE ALL GRAPHS ----------------
@router.post("/generate-all-graphs")
async def generate_graphs(
    request: Request,
    full_repo: str = Query(...),
    installation_id: int | None = Query(None),
    user_data: dict | None = Depends(get_optional_user)
):
    # -------------------------------
    # SAFE HEADERS
    # -------------------------------
    headers = {
        "Accept": "application/vnd.github+json"
    }

    token = (
        get_installation_access_token(installation_id)
        if installation_id
        else os.getenv("GITHUB_TOKEN")
    )

    print(f"--- DEBUG: generate-all-graphs ---")

    if token:
        print(f"GitHub Token Loaded: {token[:10]}...")
    else:
        print("No GitHub Token Found")

    # -------------------------------
    # CLEAN TOKEN
    # -------------------------------
    if token and token.strip() not in ["", "null", "undefined", "None"]:
        clean_github_token = token.strip()

        clean_github_token = clean_github_token.replace("Bearer ", "")
        clean_github_token = clean_github_token.replace("token ", "")

        headers["Authorization"] = f"Bearer {clean_github_token}"

    # -------------------------------
    # USER ID
    # -------------------------------
    user_id = "public_user"

    if user_data:
        user_id = (
            user_data.get("id")
            or user_data.get("user_id")
            or "public_user"
        )

    # -------------------------------
    # FETCH REPO
    # -------------------------------
    async with httpx.AsyncClient(timeout=180.0) as client:

        tree_url = (
            f"https://api.github.com/repos/"
            f"{full_repo}/git/trees/HEAD?recursive=1"
        )

        # -------------------------------
        # FIRST TRY (WITH TOKEN)
        # -------------------------------
        resp = await client.get(tree_url, headers=headers)

        # -------------------------------
        # FALLBACK FOR PUBLIC REPOS
        # -------------------------------
        if resp.status_code == 401:
            print("⚠️ Invalid GitHub token. Retrying without token...")

            public_headers = {
                "Accept": "application/vnd.github+json"
            }

            resp = await client.get(
                tree_url,
                headers=public_headers
            )

        # -------------------------------
        # FINAL FAILURE
        # -------------------------------
        if resp.status_code != 200:
            print(f"❌ GitHub API Error: {resp.status_code}")
            print(resp.text)

            raise HTTPException(
                status_code=resp.status_code,
                detail=f"GitHub Error ({resp.status_code}): {resp.text}"
            )

        # -------------------------------
        # FILE FILTERING
        # -------------------------------
        items = resp.json().get("tree", [])

        file_paths = [
            i["path"]
            for i in items
            if not any(
                d in i["path"].split("/")
                for d in IGNORE_DIRS
            )
            and any(
                i["path"].endswith(ext)
                for ext in SUPPORTED_EXTENSIONS
            )
        ]

        # -------------------------------
        # STORAGE
        # -------------------------------
        file_nodes = []
        file_edges = []

        all_functions_data = []
        all_calls_data = []

        state_files_data = []

        # -------------------------------
        # PROCESS FILES
        # -------------------------------
        for path in file_paths:

            content_url = (
                f"https://api.github.com/repos/"
                f"{full_repo}/contents/{path}"
            )

            c_resp = await client.get(
                content_url,
                headers=headers
            )

            # -------------------------------
            # RETRY CONTENT FETCH WITHOUT TOKEN
            # -------------------------------
            if c_resp.status_code == 401:

                c_resp = await client.get(
                    content_url,
                    headers={
                        "Accept": "application/vnd.github+json"
                    }
                )

            if c_resp.status_code != 200:
                print(f"⚠️ Failed to fetch file: {path}")
                continue

            try:
                raw_code = base64.b64decode(
                    c_resp.json()["content"]
                ).decode(
                    "utf-8",
                    errors="ignore"
                )

                # -------------------------------
                # FILE GRAPH
                # -------------------------------
                file_nodes.append({
                    "id": path,
                    "data": {
                        "label": path.split("/")[-1],
                        "content": raw_code
                    }
                })

                for dep in extract_dependencies(raw_code):
                    resolved = resolve_github_path(
                        path,
                        dep,
                        file_paths
                    )

                    if resolved:
                        file_edges.append({
                            "source": path,
                            "target_full": resolved
                        })

                # -------------------------------
                # FUNCTION GRAPH
                # -------------------------------
                functions, calls = extract_function_dependencies(
                    raw_code,
                    path
                )

                all_functions_data.extend(functions)
                all_calls_data.extend(calls)

                # -------------------------------
                # STATE GRAPH snippet construction
                # -------------------------------
                state_deps = extract_state_dependencies(
                    raw_code,
                    path
                )

                if state_deps:
                    # ✅ Extract only relevant lines instead of raw_code
                    relevant_snippets = []
                    for dep in state_deps:
                        if "snippet" in dep:
                            relevant_snippets.append(dep["snippet"])
                        elif "name" in dep:
                            relevant_snippets.append(f"// Related: {dep['name']}")
                    
                    snippet_content = "\n".join(relevant_snippets) if relevant_snippets else "// Dependencies identified but no snippet available"

                    state_files_data.append({
                        "path": path,
                        "state_dependencies": state_deps,
                        "content": snippet_content # ✅ Changed from raw_code
                    })

            except Exception as e:
                print(f"❌ File parse error: {path}")
                print(str(e))
                continue

        # -------------------------------
        # BUILD ALL GRAPHS
        # -------------------------------
        file_graph = {
            "nodes": file_nodes,
            "dependencies": file_edges
        }

        function_graph = build_function_graph(
            all_functions_data,
            all_calls_data
        )

        state_graph = build_state_graph(
            state_files_data
        )

        # -------------------------------
        # NEO4J SYNC
        # -------------------------------
        try:
            sync_to_neo4j(
                request.app.state.neo4j_driver,
                full_repo,
                file_nodes,
                file_edges,
                user_id
            )

            sync_functions_to_neo4j(
                request.app.state.neo4j_driver,
                full_repo,
                function_graph,
                user_id
            )

            sync_state_graph_to_neo4j(
                request.app.state.neo4j_driver,
                full_repo,
                state_graph,
                user_id
            )

        except Exception as e:
            print("❌ Neo4j Sync Error:")
            print(str(e))

        # ✅ Added single audit entry step for comprehensive generations
        log_graph_generation(
            user_id=user_id,
            repo_name=full_repo,
            graph_type="All Graphs"
        )

        # -------------------------------
        # SUCCESS RESPONSE
        # -------------------------------
        return {
            "file_graph": file_graph,
            "function_graph": function_graph,
            "state_graph": state_graph
        }


# ---------------- STATE GRAPH GENERATION ----------------
@router.post("/generate-state-graph")
async def generate_state_graph(
    request: Request,
    full_repo: str = Query(...),
    user_data: dict = Depends(get_current_user)
):
    token = os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json"}
    if token: headers["Authorization"] = f"token {token}"
    user_id = user_data.get("id")

    async with httpx.AsyncClient(timeout=120.0) as client:
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200: raise HTTPException(status_code=resp.status_code, detail="GitHub Error")

        items = resp.json().get("tree", [])
        file_paths = [i["path"] for i in items if i["path"].endswith((".js", ".jsx", ".ts", ".tsx")) 
                      and not any(x in i["path"] for x in ["node_modules", "dist", "build"])]

        files_data = []
        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            if c_resp.status_code == 200:
                raw_code = base64.b64decode(c_resp.json()["content"]).decode("utf-8", errors="ignore")
                state_deps = extract_state_dependencies(raw_code, path)
                if state_deps:
                    # ✅ Extract only relevant lines instead of raw_code
                    relevant_snippets = []
                    for dep in state_deps:
                        if "snippet" in dep:
                            relevant_snippets.append(dep["snippet"])
                        elif "name" in dep:
                            relevant_snippets.append(f"// Related: {dep['name']}")
                    
                    snippet_content = "\n".join(relevant_snippets) if relevant_snippets else "// No line snippet found"

                    files_data.append({
                        "path": path, 
                        "state_dependencies": state_deps, 
                        "content": snippet_content # ✅ Changed from raw_code
                    })

        graph = build_state_graph(files_data)
        sync_state_graph_to_neo4j(request.app.state.neo4j_driver, full_repo, graph, user_id)
        
        # ✅ Added state graph audit log step
        log_graph_generation(
            user_id=user_id,
            repo_name=full_repo,
            graph_type="State Dependency"
        )
        
        return graph