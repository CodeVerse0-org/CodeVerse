import os

SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"]

def resolve_dependency(current_file, dependency, all_files):
    if not dependency.startswith("."):
        return None

    base_dir = os.path.dirname(current_file)
    candidate = os.path.normpath(os.path.join(base_dir, dependency))

    # Try direct extension resolution
    for ext in SUPPORTED_EXTENSIONS:
        full_path = candidate + ext
        if full_path in all_files:
            return full_path

    # Try index file resolution
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
