def build_function_graph(all_functions, all_calls):
    nodes = []
    edges = []

    # Map function names to their full unique IDs for edge resolution
    name_to_id_map = {f["name"]: f["id"] for f in all_functions}

    for f in all_functions:
        nodes.append({
            "id": f["id"],
            "data": {
                "label": f["name"],
                "category": "function",
                "file": f["file"],
                "content": f.get("content", "// Source not available") # CRITICAL: Pass code to frontend
            }
        })

    for call in all_calls:
        target_name = call["target"]
        
        # Resolve the call target name (e.g., 'login') to its full ID
        if target_name in name_to_id_map:
            target_id = name_to_id_map[target_name]
            
            # Avoid self-loops
            if call["source"] != target_id:
                edges.append({
                    "source": call["source"],
                    "target": target_id,
                    "label": "CALLS"
                })

    return {"nodes": nodes, "dependencies": edges}