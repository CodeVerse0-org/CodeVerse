import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Initialize the NEW client (Stable v1)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_file_summary(file_name, code_content):
    try:
        # The new SDK correctly routes 'gemini-1.5-flash' to the stable endpoint
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=f"Summarize this code file: {file_name}\n\nCode:\n{code_content[:15000]}"
        )

        if response.text:
            return response.text.strip()
        return "PURPOSE: Error\nFEATURES: - AI returned no content."

    except Exception as e:
        print(f"--- Gemini SDK Error ---")
        print(str(e))
        
        # If 1.5-flash STILL 404s, your API key is likely restricted to 'gemini-pro'
        if "404" in str(e):
            try:
                fallback = client.models.generate_content(
                    model='gemini-pro',
                    contents=f"Summarize this: {file_name}\n{code_content[:5000]}"
                )
                return fallback.text.strip()
            except:
                pass
                
        return f"PURPOSE: AI Error\nFEATURES: - {str(e)}"