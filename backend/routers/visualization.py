import httpx
import base64
import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from routers.auth import get_current_user
from routers.github import get_installation_access_token
from utils.dependency_parser import extract_dependencies
from utils.function_dependency_parser import extract_function_dependencies
from utils.function_graph_builder import build_function_graph

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
        with driver.session() as session:
            result = session.run(query, user_id=user_id)
            return [dict(record) for record in result]
    except Exception as e:
        print(f"❌ Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")


# ---------------- GET SPECIFIC HISTORY (MATCHES FRONTEND 404 URL) ----------------
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
    
    # This query finds the specific graph based on repo name and the exact timestamp clicked
    query = """
    MATCH (r:Repository {name: $repo_name})-[:HAS_GRAPH]->(g:Graph {timestamp: $timestamp, type: $type})
    OPTIONAL MATCH (g)-[:HAS_FILE|CONTAINS_FUNCTION]->(node)
    OPTIONAL MATCH (node)-[rel:IMPORTS|CALLS]->(target)
    WHERE (g)-[:HAS_FILE|CONTAINS_FUNCTION]->(target)
    RETURN 
        collect(distinct {
            id: node.id, 
            data: {
                label: coalesce(node.label, node.name), 
                content: node.content, 
                file: node.file
            }
        }) as nodes,
        collect(distinct {source: node.id, target: target.id}) as edges
    """
    
    try:
        with driver.session() as session:
            result = session.run(query, repo_name=full_repo, timestamp=timestamp, type=graph_type).single()
            if not result or not result["nodes"]:
                return {"nodes": [], "dependencies": []}
            return {"nodes": result["nodes"], "dependencies": result["edges"]}
    except Exception as e:
        print(f"❌ Error loading history graph: {e}")
        raise HTTPException(status_code=500, detail="Failed to load historical graph")


# ---------------- NEO4J FILE SYNC (STABLE BATCHED VERSION) ----------------
def sync_to_neo4j(driver, repo_name, nodes, edges, user_id):
    if not driver: return
    timestamp = datetime.now().isoformat()
    user_id_str = force_scalar(user_id)
    graph_id = str(uuid.uuid4())

    try:
        with driver.session() as session:
            # 1. Root Setup
            session.run("""
                MERGE (r:Repository {name: $repo_name, user_id: $user_id})
                CREATE (g:Graph {id: $graph_id, timestamp: $time, type: 'file'})
                MERGE (r)-[:HAS_GRAPH]->(g)
            """, repo_name=force_scalar(repo_name), user_id=user_id_str, time=timestamp, graph_id=graph_id)

            # 2. Batched Nodes (Fixes SSLEOFError)
            batch_size = 25 
            for i in range(0, len(nodes), batch_size):
                batch = nodes[i : i + batch_size]
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

            # 3. Batched Edges
            for i in range(0, len(edges), batch_size):
                batch = edges[i : i + batch_size]
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


# ---------------- FUNCTION SYNC (STABLE BATCHED VERSION) ----------------
def sync_functions_to_neo4j(driver, repo_name, graph_data, user_id):
    if not driver: return
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("links") or graph_data.get("edges") or []
    timestamp = datetime.now().isoformat()
    user_id_str = force_scalar(user_id)
    graph_id = str(uuid.uuid4())

    try:
        with driver.session() as session:
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
    installation_id: int = Query(...),
    user_data: dict = Depends(get_current_user)
):
    token = get_installation_access_token(installation_id)
    user_id = user_data.get("id")
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=120.0) as client:
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed repo fetch")

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
        return {"nodes": nodes, "dependencies": edges}