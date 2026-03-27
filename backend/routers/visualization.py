import httpx
import base64
import os
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
    try:
        with driver.session() as session:
            # Create Repository and unique File nodes using repo_name prefix
            session.run("""
                MERGE (r:Repository {name: $repo_name})
                WITH r
                UNWIND $nodes as node
                MERGE (f:File {id: $repo_name + "_" + node.id})
                SET f.label = node.data.label, f.content = node.data.content
                MERGE (r)-[:HAS_FILE]->(f)
            """, repo_name=repo_name, nodes=nodes)

            # Create Relationships between these unique files
            session.run("""
                UNWIND $edges as edge
                MATCH (source:File {id: $repo_name + "_" + edge.source})
                MATCH (target:File {id: $repo_name + "_" + edge.target_full})
                MERGE (source)-[:IMPORTS]->(target)
            """, repo_name=repo_name, edges=edges)
            print(f"✅ Neo4j: File Graph stored for {repo_name}")
    except Exception as e:
        print(f"❌ Neo4j File Sync Error: {e}")

# --- NEO4J SYNC: FUNCTION LEVEL ---
def sync_functions_to_neo4j(driver, repo_name, graph_data):
    if not driver: return
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    try:
        with driver.session() as session:
            session.run("""
                MERGE (r:Repository {name: $repo_name})
                WITH r
                UNWIND $nodes as node
                MERGE (f:Function {id: $repo_name + "_" + node.id})
                SET f.name = node.data.label, f.file = node.data.file
                MERGE (r)-[:CONTAINS_FUNCTION]->(f)
            """, repo_name=repo_name, nodes=nodes)

            session.run("""
                UNWIND $edges as edge
                MATCH (caller:Function {id: $repo_name + "_" + edge.source})
                MATCH (callee:Function {id: $repo_name + "_" + edge.target})
                MERGE (caller)-[:CALLS]->(callee)
            """, repo_name=repo_name, edges=edges)
            print(f"✅ Neo4j: Function Graph stored for {repo_name}")
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
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch repo tree")

        items = resp.json().get("tree", [])
        file_paths = [i["path"] for i in items if not any(d in i["path"].split("/") for d in IGNORE_DIRS) and any(i["path"].endswith(ext) for ext in SUPPORTED_EXTENSIONS)]

        all_functions, all_calls = [], []
        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            if c_resp.status_code != 200: continue

            content_data = c_resp.json()
            raw_code = base64.b64decode(content_data["content"]).decode("utf-8")
            funcs, calls = extract_function_dependencies(raw_code, path)
            all_functions.extend(funcs)
            all_calls.extend(calls)

        graph = build_function_graph(all_functions, all_calls)
        sync_functions_to_neo4j(request.app.state.neo4j_driver, full_repo, graph)
        return graph