def build_function_graph(all_functions, all_calls):
    nodes = []
    edges = []

    # Map function names to their full unique IDs
    # Format: {"login": "src/auth/authService.js::login"}
    name_to_id_map = {f["name"]: f["id"] for f in all_functions}

    for f in all_functions:
        nodes.append({
            "id": f["id"],
            "data": {
                "label": f["name"],
                "category": "function",
                "file": f["file"]
            }
        })

    for call in all_calls:
        target_name = call["target"]
        
        # Connect if we know where this function is defined
        if target_name in name_to_id_map:
            target_id = name_to_id_map[target_name]
            
            # Avoid self-loops (function calling itself)
            if call["source"] != target_id:
                edges.append({
                    "source": call["source"],
                    "target": target_id,
                    "label": "CALLS"
                })

    return {"nodes": nodes, "dependencies": edges}