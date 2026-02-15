import httpx
import base64
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from routers.auth import get_current_user 
from routers.github import get_installation_access_token
from utils.dependency_parser import extract_dependencies

router = APIRouter(prefix="/api/repos", tags=["Visualization"])

IGNORE_DIRS = {"node_modules", "venv", ".git", "__pycache__", "dist", "build"}
SUPPORTED_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}

@router.post("/generate-graph")
async def generate_graph(
    full_repo: str = Query(...),
    installation_id: int = Query(...),
    user_data: dict = Depends(get_current_user)
):
    token = get_installation_access_token(installation_id)
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient() as client:
        # 1. Fetch File Tree
        tree_url = f"https://api.github.com/repos/{full_repo}/git/trees/HEAD?recursive=1"
        resp = await client.get(tree_url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch repo tree")

        items = resp.json().get("tree", [])
        
        # We need a list of all files first to resolve dependencies correctly
        file_paths = []
        for item in items:
            path = item.get("path", "")
            if any(d in path.split("/") for d in IGNORE_DIRS): continue
            if any(path.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
                file_paths.append(path)

        nodes = []
        edges = []

        # 2. Deep Scan: Fetch content, store it for frontend, and find dependencies
        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            
            if c_resp.status_code == 200:
                content_data = c_resp.json()
                # Decode the original code
                raw_code = base64.b64decode(content_data["content"]).decode("utf-8")
                
                # --- CRITICAL UPDATE: Add content to the node data ---
                nodes.append({
                    "id": path, 
                    "data": {
                        "label": path.split("/")[-1],
                        "content": raw_code  # This allows React to show the preview
                    }
                })
                
                # Extract raw import strings
                found_deps = extract_dependencies(raw_code)
                
                for dep in found_deps:
                    resolved_path = resolve_github_path(path, dep, file_paths)
                    if resolved_path:
                        edges.append({
                            "source": path,
                            "target_full": resolved_path 
                        })

        return {"nodes": nodes, "dependencies": edges}

def resolve_github_path(current_file, import_string, all_files):
    """
    Attempts to match an import string to an actual file in the repo.
    """
    # Clean import string (remove quotes if any)
    import_string = import_string.strip("'\"")
    
    if import_string.startswith("."):
        # Create an absolute-style path based on the current file directory
        base_dir = os.path.dirname(current_file)
        joined = os.path.normpath(os.path.join(base_dir, import_string)).replace("\\", "/")
        
        # 1. Check direct match (e.g., import './utils.js')
        if joined in all_files:
            return joined
            
        # 2. Check match with extensions (e.g., import './utils' -> './utils.js')
        for ext in SUPPORTED_EXTENSIONS:
            potential = f"{joined}{ext}"
            if potential in all_files:
                return potential
                
        # 3. Check for index files (e.g., import './components' -> './components/index.js')
        for ext in SUPPORTED_EXTENSIONS:
            potential_index = f"{joined}/index{ext}"
            if potential_index in all_files:
                return potential_index
                
    return None