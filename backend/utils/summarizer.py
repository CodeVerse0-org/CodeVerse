import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize GenAI Client using the official Google GenAI SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def resolve_node_type(node_type: str, file_content: str) -> str:
    """Detects and maps node types to primary analysis categories."""
    node_type = (node_type or "").strip().lower()

    if node_type in ["api_endpoint", "api", "endpoint", "http_request", "route"]:
        return "api_endpoint"

    if node_type in ["function", "method", "hook", "utility", "helper"]:
        return "function"

    if node_type in ["state", "prop", "context", "data", "store", "reducer"]:
        return "state"

    # Context-based fallbacks
    if any(
        kw in file_content
        for kw in ["express", "router.", "@app.", "fetch(", "axios"]
    ):
        return "api_endpoint"

    return "file"


def generate_file_summary(
    file_content: str, node_type: str = "file", max_retries: int = 3
) -> str:
    """Generates a granular, deeply technical architectural summary for a graph node,

    forcing concrete symbol extraction (variable names, props, functions, paths).
    """
    if not file_content or len(file_content.strip()) < 10:
        return "File is empty or contains insufficient code for analysis."

    model_id = "gemini-2.5-flash"
    category = resolve_node_type(node_type, file_content)

    # Global instruction prepended to enforce extreme detail
    anti_generic_rule = """
CRITICAL INSTRUCTION:
Do NOT use high-level, generic summaries (e.g. "This handles user state"). 
You MUST use exact names of variables, exported functions, imported packages, props, state keys, and specific logic paths present in the code snippet. 
Be exhaustive, precise, and highly technical.
"""

    if category == "api_endpoint":
        prompt_instruction = f"""
{anti_generic_rule}
You are an expert software architect analyzing an API Endpoint Node.
Generate a comprehensive breakdown of this endpoint using the EXACT Markdown structure below:

### 📌 Endpoint Summary & Purpose
Explain the exact business operation and data flow managed by this code.

### 🌐 Route & Contract Details
* **HTTP Method & Route:** Exact method (`GET`, `POST`, etc.) and path string.
* **Caller Context:** Exact component names, hooks, or external callers triggering this route.
* **Auth & Security:** Specific middleware checks, JWT/session validations, or missing security measures.

### 🔗 Relationships & Graph Connections
* **Upstream Triggers:** Client-side triggers, React components, or caller modules.
* **Downstream Services:** Database queries/models, external APIs, helper utilities called.

### ⚙️ Core Logic & Code Execution Flow
1. **Request Parsing & Input Handling:** Exact params (`req.params`, `req.body`, query params) extracted.
2. **Business Logic Execution:** Step-by-step logic, transformations, calculations, or validations performed.
3. **Persistence & Side Effects:** DB operations (inserts, updates), state mutations, or cached keys.

### 💻 Key Code Highlight
Extract the most critical 5-10 lines of code and explain line-by-line what executes.

### 📥 Request & Response Contract
* **Expected Input:** Input keys, data types, validation constraints.
* **Return Payload & Status Codes:** Explicit JSON output key-value structures and HTTP status codes returned (e.g., `200`, `400`, `500`).
"""

    elif category == "function":
        prompt_instruction = f"""
{anti_generic_rule}
You are an expert developer analyzing a Function/Method/Hook Node.
Generate a comprehensive breakdown using the EXACT Markdown structure below:

### 📌 Function Purpose
State the exact technical purpose of this function and the exact problem it solves.

### 🔗 Module & Graph Relationships
* **Invoked By:** List specific components, hooks, or routines calling this function.
* **Calls / Dependencies:** List exact helper functions, library imports, or API services called inside.

### ⚙️ Functional Logic Breakdown
1. **Inputs & Guard Clauses:** Parameter default values, type checks, or early `return` conditions.
2. **Execution Steps:** Algorithmic logic, array manipulations, conditional trees, or async promises.
3. **State Updates & Side Effects:** State setters (`setState`), DOM alterations, or storage writes.

### 💻 Key Code Breakdown
Quote specific lines or variables from the function and explain their exact role.

### 📥 Inputs & Outputs
* **Parameters:** `(paramName: Type)` — explain exact role and optionality.
* **Return Value / Side Effect:** Exact return data type or promised output.
"""

    elif category == "state":
        prompt_instruction = f"""
{anti_generic_rule}
You are an expert system architect analyzing a State/Context/Store Node.
Generate a structural analysis using the EXACT Markdown structure below:

### 📌 State / Context Purpose
Detail the exact application domain this state represents (e.g., active user sessions, notification queue).

### 🔗 Architecture & Graph Connections
* **State Origin / Provider:** Component/File where state is initialized or context `Provider` lives.
* **Consumers:** Specific components reading from or listening to this state.

### ⚙️ Functional Workflow & Lifecycle
1. **Initialization:** Default initial value structure.
2. **State Mutators & Dispatch Actions:** Functions, reducers, or setters responsible for updating state.
3. **Reactive Impact:** Precise UI updates or side-effect re-renders triggered upon modification.

### 💻 State Schema & Structure
List every state property/key, data type, and role within the object.
"""

    else:  # File / Component Node analysis
        prompt_instruction = f"""
{anti_generic_rule}
You are an expert software architect analyzing a File/Component Node in a codebase graph.
Generate a highly detailed breakdown using the EXACT Markdown structure below:

### 📌 Component / File Purpose
Clear breakdown of this specific file's structural responsibility within the application.

### 🔗 Relationships & Graph Connections
* **Imported Dependencies:** List exact local module paths and hooks imported.
* **External Libraries:** List specific npm/PyPI packages used (e.g., `react-toastify`, `axios`).
* **Exported Capabilities:** Name the exported React components, hooks, or constants and where they are consumed.

### ⚙️ Functional Execution & Core Features
1. **State & Hook Management:** List exact state names (`useState`), Context subscribers, and `useEffect` dependency arrays.
2. **Event Handlers & Interactivity:** Detail functions triggered by clicks, form submits, or inputs.
3. **Render Structure & UI Output:** Outline JSX elements rendered, conditionally displayed blocks, or fallback layouts.

### 💻 Key Code Snippet Walkthrough
Extract the core snippet of this file (e.g., main return JSX, reducer, or service flow) and explain its logic in detail.

### 💥 Refactoring Risk & System Impact
What specific components or features will break across the system if this file's signature or exports change?
"""

    # Assemble complete prompt
    prompt = f"{prompt_instruction}\n\nFILE CONTENT TO ANALYZE:\n```\n{file_content}\n```"

    # Config options: low temperature for maximum factual consistency
    config = types.GenerateContentConfig(
        temperature=0.1,
    )

    # Retry loop with exponential backoff for resilience
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_id, contents=prompt, config=config
            )

            if response and response.text:
                return response.text.strip()

            return "Could not generate a detailed summary for this node."

        except Exception as e:
            error_msg = str(e).lower()
            print(f"⚠️ Attempt {attempt + 1} failed: {e}")

            if any(
                err in error_msg
                for err in ["503", "unavailable", "429", "quota", "overloaded"]
            ):
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # Exponential wait: 2s, 4s, 6s
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    return "SERVICE_UNAVAILABLE_RETRY_LATER"

            return (
                "Could not generate a summary due to an internal processing error."
            )