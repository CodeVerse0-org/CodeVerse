import re

def extract_state_dependencies(code: str, current_file=""):
    if not code:
        return []

    deps = []
    lines = code.splitlines()

    # 1. CONTEXT CONSUMPTION
    # Find the line containing useContext to provide as a snippet
    for line in lines:
        context_receivers = re.findall(r"useContext\(([a-zA-Z0-9_]+)\)", line)
        for name in context_receivers:
            deps.append({
                "flow_type": "context_consumer",
                "state_name": name,
                "snippet": line.strip()
            })

    # 2. CONTEXT PROVIDER
    for line in lines:
        context_providers = re.findall(r"<([a-zA-Z0-9_]+)\.Provider", line)
        for name in context_providers:
            deps.append({
                "flow_type": "context_provider",
                "state_name": name,
                "snippet": line.strip()
            })

    # 3. REDUX
    for line in lines:
        redux_matches = re.findall(
            r"useSelector\s*\(\s*\(?\s*state\s*\)?\s*=>\s*state\.([a-zA-Z0-9_]+)",
            line
        )
        for match in redux_matches:
            deps.append({
                "flow_type": "redux",
                "state_name": match,
                "snippet": line.strip()
            })

    # 4. PROPS (File → File)
    # We look for JSX tags and their associated props line by line
    for line in lines:
        jsx_tags = re.findall(r"<([A-Z][A-Za-z0-9_]*)[^>]*?>", line)
        for tag_name in jsx_tags:
            prop_matches = re.findall(
                r"([a-zA-Z0-9_]+)=\{([a-zA-Z0-9_]+)\}",
                line
            )
            for prop_name, var_name in prop_matches:
                deps.append({
                    "flow_type": "prop",
                    "state_name": var_name,
                    "target_component": tag_name,
                    "snippet": line.strip()
                })

    return deps