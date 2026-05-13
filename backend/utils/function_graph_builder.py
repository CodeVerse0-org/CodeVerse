def build_function_graph(all_functions, all_calls):
    nodes = []
    edges = []
    
    # ID Map for lookups
    id_map = {f.get("id"): f.get("id") for f in all_functions}
    name_map = {f.get("name"): f.get("id") for f in all_functions}

    for f in all_functions:
        full_path = f.get("file", "")
        file_name = full_path.split("/")[-1] if "/" in full_path else full_path
        func_name = f.get('name', '')

        # Label Format: (FileName (FunctionName))
        display_label = f"({file_name} ({func_name}))"

        nodes.append({
            "id": f.get("id"),
            "data": {
                "label": display_label,
                "functionName": func_name,
                "file": full_path,
                "content": f.get("content", "")
            }
        })

    for call in all_calls:
        source = call.get("source")
        target_name = call.get("target")
        target_file = call.get("target_file")
        
        target_id = f"{target_file}::{target_name}"
        
        # Check if target exists in our project
        if target_id not in id_map:
            target_id = name_map.get(target_name)

        if target_id and source != target_id:
            edges.append({
                "source": source,
                "target": target_id,
                "label": "CALLS"
            })

    return {"nodes": nodes, "dependencies": edges}