def build_state_graph(files):
    nodes = []
    edges = []
    seen_state_nodes = set()

    for f in files:
        file_path = f["path"]
        file_label = file_path.split("/")[-1]

        # Add the Component Node
        nodes.append({
            "id": file_path,
            "data": {
                "label": file_label,
                "type": "component",
                "category": "frontend"
            }
        })

        for dep in f.get("state_dependencies", []):
            state_id = f"state_{dep['name']}"
            
            # Add the State/Prop Node (if not already added)
            if state_id not in seen_state_nodes:
                nodes.append({
                    "id": state_id,
                    "data": {
                        "label": dep['name'],
                        "type": dep['type'],
                        "category": "backend" # This triggers the Rose color in your UI
                    }
                })
                seen_state_nodes.add(state_id)

            # Create edge from State to Component (Data Flow)
            edges.append({
                "source": state_id,
                "target": file_path,
                "label": dep['type'].upper()
            })

    return {"nodes": nodes, "dependencies": edges}