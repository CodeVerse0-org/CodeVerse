from tree_sitter_languages import get_parser

js_parser = get_parser("javascript")

def extract_function_dependencies(code: str, file_path: str):
    if not code:
        return [], []

    code_bytes = bytes(code, "utf8")
    tree = js_parser.parse(code_bytes)
    functions, calls = [] , []

    def get_text(node):
        return code_bytes[node.start_byte:node.end_byte].decode("utf8")

    def traverse(node, current_function=None):
        new_scope = current_function

        # 1. Capture Function Declarations / Methods
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
                new_scope = full_id # Update scope for children

        # 2. Capture Variable-based functions (const x = () => {})
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

        # 3. Capture Function Calls
        elif node.type == "call_expression":
            func_node = node.child_by_field_name("function")
            if func_node:
                called_name = get_text(func_node)
                # Ignore built-ins and noise
                built_ins = ["console", "log", "require", "import", "setTimeout", "setInterval", "push", "map", "filter"]
                if called_name not in built_ins and "." not in called_name:
                    calls.append({
                        "source": current_function or f"{file_path}::global",
                        "target": called_name, # This is just the name, Neo4j will fuzzy match it
                        "source_file": file_path
                    })

        # Continue traversing with the current (or new) scope
        for child in node.children:
            traverse(child, new_scope)

    traverse(tree.root_node)
    return functions, calls