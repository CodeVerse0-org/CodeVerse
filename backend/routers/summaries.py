from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from .auth import get_current_user
from utils.summarizer import generate_file_summary
from db.queries import get_file_summary_db, save_file_summary_db

router = APIRouter()

class SummaryRequest(BaseModel):
    file_path: str
    file_content: str
    node_type: str = "file"  # Added to support file, function, or state/prop types
    regenerate: bool = False

@router.post("/process")
async def process_summary(request: SummaryRequest, current_user: any = Depends(get_current_user)):
    # Safely extract user_id
    user_id_val = None
    if isinstance(current_user, (list, tuple)) and len(current_user) > 0:
        user_id_val = current_user[0]
    elif isinstance(current_user, dict):
        user_id_val = current_user.get("id")
    else:
        user_id_val = getattr(current_user, "id", None)

    if user_id_val is None:
        raise HTTPException(status_code=401, detail="User identification failed.")

    user_id = str(user_id_val)

    # 1. Cache Check
    if not request.regenerate:
        try:
            cached = get_file_summary_db(request.file_path, user_id)
            if cached:
                return {"summary": cached, "cached": True}
        except Exception as e:
            print(f"🔍 Cache Lookup Error: {e}")

    # 2. AI Generation
    # Passed request.node_type to the utility and removed duplicate call
    new_summary = generate_file_summary(request.file_content, node_type=request.node_type)
    
    if new_summary == "SERVICE_UNAVAILABLE_RETRY_LATER":
        raise HTTPException(
            status_code=503, 
            detail="The AI is currently under heavy load. Please try again in a moment."
        )
    
    if new_summary == "Could not generate a simple summary.":
        # Changed to 422 or 500 depending on preference; 
        # 500 is what happened before, but now we catch it gracefully.
        raise HTTPException(
            status_code=500,
            detail="The AI failed to analyze this file. Please ensure it contains valid code."
        )

    # 3. Save to Neo4j
    try:
        saved = save_file_summary_db(request.file_path, new_summary, user_id)
        if not saved:
            print(f"⚠️ DB Save Warning: No node found for {request.file_path}")
    except Exception as e:
        print(f"💾 Database Save Error: {e}")
            
    return {"summary": new_summary, "cached": False}