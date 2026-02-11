from tree_sitter_languages import get_language, get_parser

# The library handles the ptr/name internally, 
# but we ensure we fetch them correctly here.
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
            # ES6: import ... from 'module'
            if node.type == "import_statement":
                for child in node.children:
                    if child.type == "string":
                        dep = code_bytes[child.start_byte:child.end_byte].decode("utf8").strip('"\'')
                        dependencies.append(dep)
            
            # CommonJS/Dynamic: require('module') or import('module')
            elif node.type == "call_expression":
                # Safely get function name
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