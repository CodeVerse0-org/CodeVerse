def build_state_graph(files):
    nodes = []
    edges = []
    added_nodes = set()

    def add_node(node_id, label, node_type, content=""):
        if node_id not in added_nodes:
            nodes.append({
                "id": node_id,
                "data": {
                    "label": label,
                    "type": node_type,
                    "content": content
                }
            })
            added_nodes.add(node_id)

    # Map component name → file data
    comp_to_data = {
        f["path"].split("/")[-1].split(".")[0]: f
        for f in files
    }

    # Map state/context name → origin file path
    state_origins = {}
    for f in files:
        for dep in f.get("state_dependencies", []):
            if dep["flow_type"] in ["context_provider", "redux_slice_definition"]:
                state_origins[dep["state_name"]] = f["path"]

    for f in files:
        source_path = f["path"]
        source_label = source_path.split("/")[-1]
        source_content = f.get("content", "")

        # Ensure the source node is added with its content
        add_node(source_path, source_label, "file", source_content)

        for dep in f.get("state_dependencies", []):
            flow = dep["flow_type"]
            var = dep["state_name"]

            # PROPS: Current File → Child Component File
            if flow == "prop":
                target_comp = dep.get("target_component")
                target_info = comp_to_data.get(target_comp)
                if target_info:
                    # Add target node first to ensure content is captured
                    add_node(
                        target_info["path"], 
                        target_comp, 
                        "file", 
                        target_info.get("content", "")
                    )
                    
                    edges.append({
                        "source": source_path,
                        "target": target_info["path"],
                        "label": f"PROP ({var})"
                    })

            # CONTEXT: Provider File → Consumer File
            elif flow == "context_consumer":
                origin_path = state_origins.get(var)
                if origin_path and origin_path != source_path:
                    edges.append({
                        "source": origin_path,
                        "target": source_path,
                        "label": f"CONTEXT ({var})"
                    })

            # REDUX: Slice/Store File → Consumer File
            elif flow == "redux":
                origin_path = state_origins.get(var)
                if origin_path and origin_path != source_path:
                    edges.append({
                        "source": origin_path,
                        "target": source_path,
                        "label": f"REDUX ({var})"
                    })

    return {
        "nodes": nodes,
        "dependencies": edges
    }