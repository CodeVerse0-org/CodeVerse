import re

def extract_state_dependencies(code: str):
    if not code: return []
    deps = []

    # 1. Redux Slices (useSelector / state.x)
    redux_matches = re.findall(r"state\.([a-zA-Z0-9_]+)", code)
    for m in redux_matches:
        deps.append({"name": m, "type": "redux_state"})

    # 2. Props (Destructured in function params)
    props_match = re.findall(r"function\s+\w+\s*\(\s*{([^}]*)}\s*\)", code)
    for m in props_match:
        for p in [p.strip() for p in m.split(",") if p.strip()]:
            deps.append({"name": p, "type": "prop"})

    # 3. Context (useContext)
    context_match = re.findall(r"useContext\(([a-zA-Z0-9_]+)\)", code)
    for m in context_match:
        deps.append({"name": m, "type": "context"})

    return deps