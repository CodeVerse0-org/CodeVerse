from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={'api_version': 'v1beta'}
)

def generate_file_summary(file_content: str):
    try:
        if not file_content or len(file_content.strip()) < 10:
            return "File is empty or contains no code."

        model_id = "gemini-3.1-flash-lite-preview" 
        
        # New prompt designed for "Easy wording" and "Proper flow"
        prompt = f"""
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

CODE:
{file_content}
"""
        
        response = client.models.generate_content(
            model=model_id,
            contents=prompt
        )
        
        return response.text.strip()
        
    except Exception as e:
        print(f"❌ AI Error: {e}")
        return "Could not generate a simple summary."