import re

def extract_state_dependencies(code: str, current_file=""):
    if not code:
        return []

    deps = []

    # 1. CONTEXT CONSUMPTION
    context_receivers = re.findall(r"useContext\(([a-zA-Z0-9_]+)\)", code)
    for name in context_receivers:
        deps.append({
            "flow_type": "context_consumer",
            "state_name": name
        })

    # 2. CONTEXT PROVIDER
    context_providers = re.findall(r"<([a-zA-Z0-9_]+)\.Provider", code)
    for name in context_providers:
        deps.append({
            "flow_type": "context_provider",
            "state_name": name
        })

    # 3. REDUX
    redux_matches = re.findall(
        r"useSelector\s*\(\s*\(?\s*state\s*\)?\s*=>\s*state\.([a-zA-Z0-9_]+)",
        code
    )

    for match in redux_matches:
        deps.append({
            "flow_type": "redux",
            "state_name": match
        })

    # 4. PROPS (File → File)
    jsx_props = re.findall(
        r"<([A-Z][A-Za-z0-9_]*)[^>]*?>",
        code
    )

    # ✅ FIX: ensure variable always exists
    prop_matches = []

    for comp in jsx_props:
        prop_matches = re.findall(
            r"([a-zA-Z0-9_]+)=\{([a-zA-Z0-9_]+)\}",
            code
        )

        for prop_name, var_name in prop_matches:
            deps.append({
                "flow_type": "prop",
                "state_name": var_name,
                "target_component": comp
            })

    return deps