import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_file_summary(file_content: str, node_type: str = "file", max_retries=3):
    if not file_content or len(file_content.strip()) < 10:
        return "File is empty or contains no code."

    model_id = "gemini-3.1-flash-lite-preview" 
    
    # Select the prompt based on the type of node being analyzed
    if node_type == "function":
        prompt_instruction = """
Explain exactly what this function does, its logic flow, and its return value.
IMPORTANT: Use exactly two newlines between every section and every bullet point.

**Function Purpose:**
(One simple sentence describing what this function achieves)

**Logic Flow:**

* (Describe the first part of the logic)

* (Describe the transformation or process)

* (Describe the result)

**Returns:**

* (What does this function output?)
"""
    elif node_type in ["state", "prop", "context"]:
        prompt_instruction = """
Identify the purpose of this specific data/prop and describe its type and usage.
IMPORTANT: Use exactly two newlines between every section and every bullet point.

**Data Purpose:**
(One sentence explaining why this specific prop or state exists)

**Type & Content:**

* **Type:** (e.g., Object, String, Function)

* **Contains:** (What kind of data is stored here?)

**Data Flow:**

* (How is this data sent or used by other parts of the application?)
"""
    else:  # Default 'file' behavior
        prompt_instruction = """
Analyze this code and explain it simply. 
IMPORTANT: Use exactly two newlines between every section and every bullet point.

**Main Purpose:**
(One simple sentence)

**How it works:**

* (Step one)

* (Step two)

* (Step three)

**Important Notes:**

* (Key detail)
"""

    prompt = f"{prompt_instruction}\n\nCODE:\n{file_content}"

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=prompt
            )
            
            if response and response.text:
                return response.text.strip()
            
            return "Could not generate a simple summary."

        except Exception as e:
            error_msg = str(e).lower()
            print(f"⚠️ Attempt {attempt + 1} failed: {e}")

            # If it's a 503 (Overloaded) or 429 (Rate Limit), wait and retry
            if any(err in error_msg for err in ["503", "unavailable", "429", "quota"]):
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # Wait 2s, then 4s
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    return "SERVICE_UNAVAILABLE_RETRY_LATER"
            
            # For other errors (like 404 or Auth), don't retry
            return "Could not generate a simple summary."