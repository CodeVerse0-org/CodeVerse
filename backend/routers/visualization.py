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
        nodes = []
        file_paths = []

        for item in items:
            path = item.get("path", "")
            if any(d in path.split("/") for d in IGNORE_DIRS): continue
            if any(path.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
                nodes.append({"id": path, "data": {"label": path.split("/")[-1]}})
                file_paths.append(path)

        # 2. Deep Scan: Fetch content and find dependencies
        edges = []
        for path in file_paths:
            content_url = f"https://api.github.com/repos/{full_repo}/contents/{path}"
            c_resp = await client.get(content_url, headers=headers)
            
            if c_resp.status_code == 200:
                content_data = c_resp.json()
                # GitHub sends content as base64
                raw_code = base64.b64decode(content_data["content"]).decode("utf-8")
                
                # Extract raw import strings (e.g., "./dbConnect")
                found_deps = extract_dependencies(raw_code)
                
                for dep in found_deps:
                    # Logic to resolve relative path to full repo path
                    resolved_path = resolve_github_path(path, dep, file_paths)
                    if resolved_path:
                        edges.append({
                            "source": path,
                            "target_full": resolved_path # Matches your React target_full key
                        })

        return {"nodes": nodes, "dependencies": edges}

def resolve_github_path(current_file, import_string, all_files):
    """
    Attempts to match an import string to an actual file in the repo.
    """
    if import_string.startswith("."):
        # Create an absolute-style path based on the current file directory
        base_dir = os.path.dirname(current_file)
        joined = os.path.normpath(os.path.join(base_dir, import_string)).replace("\\", "/")
        
        # Check for direct match or match with extensions
        for ext in SUPPORTED_EXTENSIONS:
            potential = joined if joined.endswith(ext) else f"{joined}{ext}"
            if potential in all_files:
                return potential
    return None