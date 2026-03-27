from tree_sitter_languages import get_parser

js_parser = get_parser("javascript")

def extract_function_dependencies(code: str, file_path: str):
    if not code:
        return [], []

    code_bytes = bytes(code, "utf8")
    tree = js_parser.parse(code_bytes)
    functions, calls = [], []

    def get_text(node):
        return code_bytes[node.start_byte:node.end_byte].decode("utf8")

    def traverse(node, current_function=None):
        # 1. Capture Function Declarations (Definitions)
        if node.type in ["function_declaration", "method_definition"]:
            name_node = node.child_by_field_name("name")
            if name_node:
                func_name = get_text(name_node)
                full_id = f"{file_path}::{func_name}"
                functions.append({"id": full_id, "file": file_path, "name": func_name})
                current_function = full_id # Scope updated

        # 2. Capture Variable-based functions (const login = () => ...)
        elif node.type == "variable_declarator":
            name_node = node.child_by_field_name("name")
            value_node = node.child_by_field_name("value")
            if name_node and value_node and value_node.type in ["arrow_function", "function"]:
                func_name = get_text(name_node)
                full_id = f"{file_path}::{func_name}"
                functions.append({"id": full_id, "file": file_path, "name": func_name})
                current_function = full_id

        # 3. Capture Function Calls
        elif node.type == "call_expression":
            func_node = node.child_by_field_name("function")
            if func_node:
                called_name = get_text(func_node)
                # Ignore standard library
                if called_name not in ["console", "log", "require", "import", "settimeout"]:
                    calls.append({
                        "source": current_function or f"{file_path}::global",
                        "target": called_name,
                        "source_file": file_path
                    })

        for child in node.children:
            traverse(child, current_function)

    traverse(tree.root_node)
    return functions, calls