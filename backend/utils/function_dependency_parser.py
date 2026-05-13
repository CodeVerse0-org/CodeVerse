import os
from tree_sitter_languages import get_parser

js_parser = get_parser("javascript")

def extract_function_dependencies(code: str, file_path: str):
    if not code:
        return [], []

    code_bytes = bytes(code, "utf8")
    tree = js_parser.parse(code_bytes)
    
    functions = []
    calls = []
    # Map of local name -> source file (for cross-file tracking)
    import_map = {} 

    def get_text(node):
        return code_bytes[node.start_byte:node.end_byte].decode("utf8", errors="ignore")

    def traverse(node, current_function=None):
        nonlocal import_map
        new_scope = current_function

        # ---------------- 1. TRACK IMPORTS ----------------
        if node.type == "import_declaration":
            source_node = node.child_by_field_name("source")
            if source_node:
                raw_path = get_text(source_node).strip("'\"")
                # Normalize path to find target file
                source_file = os.path.normpath(os.path.join(os.path.dirname(file_path), raw_path))
                if not source_file.endswith(('.js', '.ts', '.jsx', '.tsx')):
                    source_file += '.js'

                for child in node.children:
                    if child.type == "import_clause":
                        for spec in child.named_children:
                            if spec.type == "named_imports":
                                for import_spec in spec.named_children:
                                    local_name = get_text(import_spec)
                                    import_map[local_name] = source_file
                            if spec.type == "identifier": # Default import
                                import_map[get_text(spec)] = source_file

        # ---------------- 2. EXTRACT FUNCTIONS ----------------
        if node.type in ["function_declaration", "method_definition"]:
            name_node = node.child_by_field_name("name")
            if name_node:
                func_name = get_text(name_node)
                full_id = f"{file_path}::{func_name}"
                functions.append({
                    "id": full_id,
                    "file": file_path,
                    "name": func_name,
                    "content": get_text(node)
                })
                new_scope = full_id

        elif node.type == "variable_declarator":
            name_node = node.child_by_field_name("name")
            value_node = node.child_by_field_name("value")
            if name_node and value_node and value_node.type in ["arrow_function", "function"]:
                func_name = get_text(name_node)
                full_id = f"{file_path}::{func_name}"
                functions.append({
                    "id": full_id,
                    "file": file_path,
                    "name": func_name,
                    "content": get_text(value_node)
                })
                new_scope = full_id

        # ---------------- 3. EXTRACT CALLS ----------------
        elif node.type == "call_expression":
            func_node = node.child_by_field_name("function")
            if func_node:
                called_name = get_text(func_node)
                if called_name and "." not in called_name:
                    # Resolve which file this function belongs to
                    target_file = import_map.get(called_name, file_path)
                    calls.append({
                        "source": current_function or f"{file_path}::global",
                        "target": called_name,
                        "target_file": target_file
                    })

        for child in node.children:
            traverse(child, new_scope)

    traverse(tree.root_node)
    return functions, calls