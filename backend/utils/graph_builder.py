import os

SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py"]

def resolve_dependency(current_file, dependency, all_files):
    if not dependency.startswith("."):
        return None

    base_dir = os.path.dirname(current_file)
    candidate = os.path.normpath(os.path.join(base_dir, dependency))

    for ext in SUPPORTED_EXTENSIONS:
        full_path = candidate + ext
        if full_path in all_files:
            return full_path

    for ext in SUPPORTED_EXTENSIONS:
        index_path = os.path.join(candidate, f"index{ext}")
        if index_path in all_files:
            return index_path

    return None


def build_graph(files_with_deps):
    nodes = []
    edges = []

    file_paths = {f["path"] for f in files_with_deps}

    for file in files_with_deps:
        nodes.append({
            "id": file["path"],
            "data": {"label": file["path"]}
        })

        for dep in file["dependencies"]:
            resolved = resolve_dependency(file["path"], dep, file_paths)
            if resolved:
                edges.append({
                    "source": file["path"],
                    "target_full": resolved
                })

    return {
        "nodes": nodes,
        "dependencies": edges
    }


# ======================================================
# API GRAPH BUILDER
# ======================================================

def build_api_graph(all_api_calls, all_api_routes):
    """
    Connects frontend files to backend files based on matching API Endpoints and HTTP Methods.
    """
    nodes_dict = {}
    edges = []

    # 1. Register Backend Endpoint Nodes
    for route in all_api_routes:
        route_id = f"route::{route['method']}::{route['endpoint']}"
        backend_file = route['file']

        # Ensure file node exists
        if backend_file not in nodes_dict:
            nodes_dict[backend_file] = {
                "id": backend_file,
                "type": "backend_file",
                "data": {"label": backend_file.split('/')[-1], "category": "backend"}
            }

        # Add route node
        nodes_dict[route_id] = {
            "id": route_id,
            "type": "api_endpoint",
            "data": {
                "label": f"{route['method']} {route['raw_endpoint']}",
                "category": "api_endpoint",
                "method": route['method'],
                "endpoint": route['raw_endpoint']
            }
        }

        # Edge from API endpoint to handling Backend File
        edges.append({
            "source": route_id,
            "target_full": backend_file,
            "label": "HANDLED_BY"
        })

    # 2. Connect Frontend Calls to API Nodes
    for call in all_api_calls:
        frontend_file = call['file']
        endpoint = call['endpoint']
        method = call['method']

        if frontend_file not in nodes_dict:
            nodes_dict[frontend_file] = {
                "id": frontend_file,
                "type": "frontend_file",
                "data": {"label": frontend_file.split('/')[-1], "category": "frontend"}
            }

        # Match against routes flexible on base URLs (e.g. http://localhost:8000/api/users -> /api/users)
        matched_route_id = None
        for route in all_api_routes:
            if route['method'] == method and (route['endpoint'] in endpoint or endpoint in route['endpoint']):
                matched_route_id = f"route::{route['method']}::{route['endpoint']}"
                break

        if matched_route_id:
            edges.append({
                "source": frontend_file,
                "target_full": matched_route_id,
                "label": f"CALLS_{method}"
            })

    return {
        "nodes": list(nodes_dict.values()),
        "dependencies": edges
    }