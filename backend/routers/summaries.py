from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.summarizer import generate_file_summary
from db.queries import get_file_summary_db, save_file_summary_db

router = APIRouter()

class SummaryRequest(BaseModel):
    file_path: str  # This should be the full 'id' from the node (e.g. ridafatima1157/...)
    file_content: str
    regenerate: bool = False

@router.post("/process")
async def process_summary(request: SummaryRequest):
    # 1. Check if the summary already exists in YOUR node
    if not request.regenerate:
        try:
            cached = get_file_summary_db(request.file_path)
            if cached:
                print(f"📖 Loading from database: {request.file_path}")
                return {"summary": cached, "cached": True}
        except Exception as e:
            print(f"🔍 Database Lookup Error: {e}")

    # 2. Generate summary if not found or if regenerating
    print(f"🤖 AI generating summary for: {request.file_path}")
    new_summary = generate_file_summary(request.file_content)
    
    # 3. Save only if the generation was successful
    if new_summary and "error" not in new_summary.lower():
        try:
            save_file_summary_db(request.file_path, new_summary)
        except Exception as e:
            print(f"💾 Database Save Error: {e}")
            
    return {"summary": new_summary, "cached": False}