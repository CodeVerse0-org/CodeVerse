import re
from tree_sitter_languages import get_language, get_parser

try:
    js_language = get_language('javascript')
    js_parser = get_parser('javascript')
except Exception as e:
    print(f"Error initializing tree-sitter: {e}")

def extract_dependencies(code: str):
    if not code or not isinstance(code, str):
        return []
    
    try:
        code_bytes = bytes(code, "utf8")
        tree = js_parser.parse(code_bytes)
        dependencies = []

        def traverse(node):
            if node.type == "import_statement":
                for child in node.children:
                    if child.type == "string":
                        dep = code_bytes[child.start_byte:child.end_byte].decode("utf8").strip('"\'')
                        dependencies.append(dep)
            elif node.type == "call_expression":
                func_node = node.children[0]
                func_name = code_bytes[func_node.start_byte:func_node.end_byte].decode("utf8")

                if func_name in ["require", "import"]:
                    for child in node.children:
                        if child.type == "arguments":
                            for arg in child.children:
                                if arg.type == "string":
                                    dep = code_bytes[arg.start_byte:arg.end_byte].decode("utf8").strip('"\'')
                                    dependencies.append(dep)

            for child in node.children:
                traverse(child)

        traverse(tree.root_node)
        return list(set(d for d in dependencies if d))

    except Exception as e:
        print(f"Parsing error: {e}")
        return []


# ======================================================
# API EXTRACTION HELPERS (FRONTEND & BACKEND)
# ======================================================

def extract_api_calls(code: str, file_path: str):
    """
    Extracts outgoing API calls from frontend files (fetch, axios, etc.)
    """
    if not code or not isinstance(code, str):
        return []

    calls = []
    
    # 1. Match fetch("...", { method: "POST" }) or fetch(`/api/...`)
    fetch_pattern = r'fetch\(\s*[`"\']([^`"\']+)[`"\'](?:,\s*\{\s*method:\s*[`"\'](\w+)[`"\'])?'
    for match in re.finditer(fetch_pattern, code, re.IGNORECASE):
        endpoint = match.group(1)
        method = (match.group(2) or "GET").upper()
        # Clean dynamic template strings like /api/users/${id} -> /api/users/{param}
        normalized_endpoint = re.sub(r'\$\{[^}]+\}', '{param}', endpoint)
        calls.append({
            "file": file_path,
            "endpoint": normalized_endpoint,
            "method": method,
            "raw": match.group(0)
        })

    # 2. Match axios.get("..."), axios.post("...")
    axios_pattern = r'axios\.(get|post|put|delete|patch)\(\s*[`"\']([^`"\']+)[`"\']'
    for match in re.finditer(axios_pattern, code, re.IGNORECASE):
        method = match.group(1).upper()
        endpoint = match.group(2)
        normalized_endpoint = re.sub(r'\$\{[^}]+\}', '{param}', endpoint)
        calls.append({
            "file": file_path,
            "endpoint": normalized_endpoint,
            "method": method,
            "raw": match.group(0)
        })

    return calls


def extract_api_routes(code: str, file_path: str):
    """
    Extracts backend API route definitions (FastAPI / Express / Flask).
    """
    if not code or not isinstance(code, str):
        return []

    routes = []

    # 1. Python / FastAPI: @app.get("/path"), @router.post("/path")
    fastapi_pattern = r'@(app|router)\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']'
    for match in re.finditer(fastapi_pattern, code, re.IGNORECASE):
        method = match.group(2).upper()
        endpoint = match.group(3)
        # Convert FastAPI path params /users/{user_id} -> /users/{param}
        normalized_endpoint = re.sub(r'\{[^}]+\}', '{param}', endpoint)
        routes.append({
            "file": file_path,
            "endpoint": normalized_endpoint,
            "method": method,
            "raw_endpoint": endpoint
        })

    # 2. Express.js: app.get("/path", ...), router.post("/path", ...)
    express_pattern = r'(?:app|router)\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']'
    for match in re.finditer(express_pattern, code, re.IGNORECASE):
        method = match.group(1).upper()
        endpoint = match.group(2)
        # Convert Express params /users/:id -> /users/{param}
        normalized_endpoint = re.sub(r'/:[a-zA-Z0-0_]+', '/{param}', endpoint)
        routes.append({
            "file": file_path,
            "endpoint": normalized_endpoint,
            "method": method,
            "raw_endpoint": endpoint
        })

    return routes