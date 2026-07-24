# routers/summaries.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from .auth import get_current_user
from utils.summarizer import generate_file_summary
from db.queries import get_file_summary_db, save_file_summary_db

from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models import User, UserRepository
from services.audit_service import create_audit_log

router = APIRouter()

class SummaryRequest(BaseModel):
    file_path: str
    file_content: str
    node_type: str = "file"  # Supports file, function, or state/prop types
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
    new_summary = generate_file_summary(request.file_content, node_type=request.node_type)
    
    if new_summary == "SERVICE_UNAVAILABLE_RETRY_LATER":
        raise HTTPException(
            status_code=503, 
            detail="The AI is currently under heavy load. Please try again in a moment."
        )
    
    if new_summary == "Could not generate a simple summary.":
        raise HTTPException(
            status_code=500,
            detail="The AI failed to analyze this file. Please ensure it contains valid code."
        )

    # 3. Save to Neo4j & Record Audit Metrics
    try:
        saved = save_file_summary_db(request.file_path, new_summary, user_id)
        if not saved:
            print(f"⚠️ DB Save Warning: No node found for {request.file_path}")
            
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()

            user_repo = (
                db.query(UserRepository)
                .filter(UserRepository.user_id == int(user_id))
                .first()
            )

            if user:
                base_repo_name = user_repo.repo_name if (user_repo and hasattr(user_repo, 'repo_name')) else "Unknown Repository"
                
                # ✅ FIX: Inject file trace targeting path string into repository details
                extended_repo_identity = f"{base_repo_name} -> {request.file_path}"
                
                create_audit_log(
                    admin_id=None,
                    actor_id=int(user_id),
                    repository_id=user_repo.repo_id if user_repo else None,
                    repository_name=extended_repo_identity,
                    action="SUMMARY_GENERATED",
                    details=f"{user.first_name} {user.last_name} generated a structure definition logic analysis map summary ({request.node_type}) for {request.file_path}."
                )
        finally:
            db.close()
            
    except Exception as e:
        print(f"💾 Database Save Error: {e}")
            
    return {"summary": new_summary, "cached": False}