import httpx
import base64
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from routers.auth import get_current_user 
from routers.github import get_installation_access_token
from utils.dependency_parser import extract_dependencies
from utils.function_dependency_parser import extract_function_dependencies
from utils.function_graph_builder import build_function_graph

router = APIRouter(prefix="/api/repos", tags=["Visualization"])

IGNORE_DIRS = {"node_modules", "venv", ".git", "__pycache__", "dist", "build", "target"}
SUPPORTED_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}

# --- NEO4J SYNC: FILE LEVEL ---
def sync_to_neo4j(driver, repo_name, nodes, edges):
    if not driver: return
    timestamp = datetime.now().isoformat()
    try:
        with driver.session() as session:
            # Create a unique Graph Snapshot node
            session.run("""
                MERGE (r:Repository {name: $repo_name})
                CREATE (g:Graph {id: apoc.create.uuid(), timestamp: $time, type: 'file'})
                MERGE (r)-[:HAS_GRAPH]->(g)
                WITH g
                UNWIND $nodes as node
                CREATE (f:File {id: node.id, label: node.data.label, content: node.data.content})
                MERGE (g)-[:HAS_FILE]->(f)
            """, repo_name=repo_name, time=timestamp, nodes=nodes)

            # Create Relationships within that specific snapshot
            session.run("""
                MATCH (g:Graph {timestamp: $time})<-[:HAS_GRAPH]-(r:Repository {name: $repo_name})
                UNWIND $edges as edge
                MATCH (g)-[:HAS_FILE]->(source:File {id: edge.source})
                MATCH (g)-[:HAS_FILE]->(target:File {id: edge.target_full})
                MERGE (source)-[:IMPORTS]->(target)
            """, repo_name=repo_name, time=timestamp, edges=edges)
            print(f"✅ Neo4j: File Graph snapshot stored for {repo_name}")
    except Exception as e:
        print(f"❌ Neo4j File Sync Error: {e}")

# --- NEO4J SYNC: FUNCTION LEVEL ---
def sync_functions_to_neo4j(driver, repo_name, graph_data):
    if not driver: return

    # Capture nodes and real edges (checking multiple possible keys)
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("links") or graph_data.get("edges") or graph_data.get("dependencies") or []
    timestamp = datetime.now().isoformat()

    try:
        with driver.session() as session:
            # 1. Create the Graph Snapshot and Function Nodes
            session.run("""
                MERGE (r:Repository {name: $repo_name})
                CREATE (g:Graph {
                    id: randomUUID(), 
                    timestamp: $time, 
                    type: 'function'
                })
                MERGE (r)-[:HAS_GRAPH]->(g)
                WITH g
                UNWIND $nodes as node
                CREATE (f:Function {
                    id: node.id, 
                    name: node.data.label, 
                    file: node.data.file, 
                    content: node.data.content
                })
                MERGE (g)-[:CONTAINS_FUNCTION]->(f)
            """, repo_name=repo_name, time=timestamp, nodes=nodes)

            # 2. Link Real Edges (CALLS)
            if edges:
                session.run("""
                    MATCH (g:Graph {timestamp: $time})<-[:HAS_GRAPH]-(r:Repository {name: $repo_name})
                    UNWIND $edges as edge
                    MATCH (g)-[:CONTAINS_FUNCTION]->(caller:Function {id: edge.source})
                    MATCH (g)-[:CONTAINS_FUNCTION]->(callee:Function)
                    WHERE callee.id = edge.target_full 
                       OR callee.id = edge.target 
                       OR callee.name = edge.target
                    MERGE (caller)-[:CALLS]->(callee)
                """, repo_name=repo_name, time=timestamp, edges=edges)
                print(f"✅ Neo4j: {len(edges)} real function calls stored.")
    except Exception as e:
        print(f"❌ Neo4j Function Sync Error: {e}")
def resolve_github_path(current_file, import_string, all_files):
    import_string = import_string.strip("'\"")
    if import_string.startswith("."):
        base_dir = os.path.dirname(current_file)
        joined = os.path.normpath(os.path.join(base_dir, import_string)).replace("\\", "/")
        if joined in all_files: return joined
        for ext in SUPPORTED_EXTENSIONS:
            potential = f"{joined}{ext}"
            if potential in all_files: return potential
        for ext in SUPPORTED_EXTENSIONS:
            potential_index = f"{joined}/index{ext}"
            if potential_index in all_files: return potential_index
    return None
@router.post("/generate-graph")
async def generate_graph(
    request: Request,
    full_repo: str = Query(...),
    installation_id: int = Query(...),
    user_data: dict = Depends(get_current_user) 
):
    token = get_installation_access_token(installation_id)
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient() as client:
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch repo tree")

        items = resp.json().get("tree", [])
        file_paths = [i["path"] for i in items if not any(d in i["path"].split("/") for d in IGNORE_DIRS) and any(i["path"].endswith(ext) for ext in SUPPORTED_EXTENSIONS)]

        nodes, edges = [], []
        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            if c_resp.status_code == 200:
                content_data = c_resp.json()
                raw_code = base64.b64decode(content_data["content"]).decode("utf-8")
                nodes.append({"id": path, "data": {"label": path.split("/")[-1], "content": raw_code}})
                found_deps = extract_dependencies(raw_code)
                for dep in found_deps:
                    resolved_path = resolve_github_path(path, dep, file_paths)
                    if resolved_path:
                        edges.append({"source": path, "target_full": resolved_path})

        sync_to_neo4j(request.app.state.neo4j_driver, full_repo, nodes, edges)
        return {"nodes": nodes, "dependencies": edges}

@router.post("/generate-function-graph")
async def generate_function_graph(
    request: Request,
    full_repo: str = Query(...),
    installation_id: int = Query(...),
    user_data: dict = Depends(get_current_user)
):
    token = get_installation_access_token(installation_id)
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient() as client:
        # 1. Get Repo Tree
        tree_resp = await client.get(f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1", headers=headers)
        if tree_resp.status_code != 200: raise HTTPException(status_code=400, detail="Repo tree fetch failed")
        
        items = tree_resp.json().get("tree", [])
        file_paths = [i["path"] for i in items if not any(d in i["path"].split("/") for d in IGNORE_DIRS) and any(i["path"].endswith(ext) for ext in SUPPORTED_EXTENSIONS)]

        all_functions, all_calls = [], []
        
        # 2. Parse Files for REAL Definitions and Calls
        for path in file_paths:
            c_resp = await client.get(f"https://api.github.com/repos/{full_repo}/contents/{path}", headers=headers)
            if c_resp.status_code != 200: continue
            
            raw_code = base64.b64decode(c_resp.json()["content"]).decode("utf-8")
            funcs, calls = extract_function_dependencies(raw_code, path)
            all_functions.extend(funcs)
            all_calls.extend(calls)

        # 3. Build Graph and Sync Real Data
        graph = build_function_graph(all_functions, all_calls)
        sync_functions_to_neo4j(request.app.state.neo4j_driver, full_repo, graph)
        
        return graph
# ===============================
# 📜 HISTORY API
# ===============================
@router.get("/history")
async def get_history(request: Request):
    driver = request.app.state.neo4j_driver
    with driver.session() as session:
        result = session.run("""
            MATCH (r:Repository)-[:HAS_GRAPH]->(g:Graph)
            RETURN r.name AS repo, g.timestamp AS time, g.type AS type, g.id AS id
            ORDER BY g.timestamp DESC
        """)
        return [{
            "id": r["id"],
            "repo_name": r["repo"],
            "timestamp": r["time"],
            "graph_type": r["type"]
        } for r in result]

# ===============================
# 📊 FETCH GRAPH BY TIMESTAMP
# ===============================
# --- FETCH SPECIFIC SNAPSHOT ---
# Added :path to repo_name to handle slashes in GitHub repo names
# --- FETCH SPECIFIC SNAPSHOT ---
@router.get("/graph-history/{repo_name:path}")
async def get_stored_graph(repo_name: str, timestamp: str, graph_type: str = "file", request: Request = None):
    driver = request.app.state.neo4j_driver
    with driver.session() as session:
        if graph_type == "function":
            # Fetch nodes from snapshot
            nodes_res = session.run("""
                MATCH (r:Repository {name: $repo})-[:HAS_GRAPH]->(g:Graph)
                WHERE g.timestamp CONTAINS $time AND g.type = 'function'
                MATCH (g)-[:CONTAINS_FUNCTION]->(f)
                RETURN f
            """, repo=repo_name, time=timestamp)
            
            # Fetch real edges from snapshot
            edges_res = session.run("""
                MATCH (r:Repository {name: $repo})-[:HAS_GRAPH]->(g:Graph)
                WHERE g.timestamp CONTAINS $time AND g.type = 'function'
                MATCH (g)-[:CONTAINS_FUNCTION]->(s)-[:CALLS]->(t)
                RETURN s.id AS source, t.id AS target_full
            """, repo=repo_name, time=timestamp)

            nodes = [{"id": n["f"]["id"], "data": {"label": n["f"]["name"], "content": n["f"].get("content", "")}} for n in nodes_res]
            edges = [{"source": e["source"], "target_full": e["target_full"]} for e in edges_res]
            
            return {"nodes": nodes, "dependencies": edges}
            # ... process results as usual ...
        else:
    # --- FILE LEVEL HISTORY ---
            nodes_q = """
        MATCH (r:Repository {name: $repo})-[:HAS_GRAPH]->(g:Graph)
        WHERE g.timestamp CONTAINS $time AND g.type = 'file'
        MATCH (g)-[:HAS_FILE]->(f)
        RETURN f
    """
            edges_q = """
        MATCH (r:Repository {name: $repo})-[:HAS_GRAPH]->(g:Graph)
        WHERE g.timestamp CONTAINS $time AND g.type = 'file'
        MATCH (g)-[:HAS_FILE]->(s)-[:IMPORTS]->(t)
        RETURN s.id AS source, t.id AS target_full  // Added _full here
    """

        nodes_raw = session.run(nodes_q, repo=repo_name, time=timestamp).data()
        edges_raw = session.run(edges_q, repo=repo_name, time=timestamp).data()

    if not nodes_raw:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Map nodes and ensure labels/content are captured
    nodes = [{
        "id": n["f"]["id"], 
        "data": {
            "label": n["f"].get("name") or n["f"].get("label"), 
            "file": n["f"].get("file"),
            "content": n["f"].get("content")
        }
    } for n in nodes_raw]
    
    # Return as 'dependencies' so the frontend mapping catches it
    return {"nodes": nodes, "dependencies": edges_raw}