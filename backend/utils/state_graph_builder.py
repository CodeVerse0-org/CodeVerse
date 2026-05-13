def build_state_graph(files):
    nodes = []
    edges = []
    added_nodes = set()

    # UPDATED: node now always stores file only (no prop/context/redux nodes)
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

    # Map component name → file path + content
    comp_to_data = {
        f["path"].split("/")[-1].split(".")[0]: {
            "path": f["path"],
            "content": f.get("content", "")
        }
        for f in files
    }

    for f in files:
        source_path = f["path"]
        source_label = source_path.split("/")[-1]
        source_content = f.get("content", "")

        # File node
        add_node(source_path, source_label, "file", source_content)

        for dep in f.get("state_dependencies", []):
            flow = dep["flow_type"]
            var = dep["state_name"]

            # =========================
            # PROPS: File → File (DIRECT)
            # =========================
            if flow == "prop":
                target_comp = dep.get("target_component")
                target_info = comp_to_data.get(target_comp)

                if target_info:
                    target_path = target_info["path"]
                    target_content = target_info["content"]

                    # DIRECT EDGE (no prop node anymore)
                    edges.append({
                        "source": source_path,
                        "target": target_path,
                        "label": f"PROP ({var})"
                    })

                    # ensure target exists as file node
                    add_node(target_path, target_comp, "file", target_content)

            # =========================
            # CONTEXT: File → File (DIRECT)
            # =========================
            elif flow == "context_provider":
                # provider file just becomes source relationship
                edges.append({
                    "source": source_path,
                    "target": source_path,
                    "label": f"PROVIDES ({var})"
                })

            elif flow == "context_consumer":
                # consumer stays file-to-file (self or resolved future mapping)
                edges.append({
                    "source": source_path,
                    "target": source_path,
                    "label": f"CONSUMES ({var})"
                })

            # =========================
            # REDUX: File → File (DIRECT)
            # =========================
            elif flow == "redux":
                edges.append({
                    "source": source_path,
                    "target": source_path,
                    "label": f"REDUX ({var})"
                })

    return {
        "nodes": nodes,
        "dependencies": edges
    }