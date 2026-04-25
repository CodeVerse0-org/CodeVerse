from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from utils.ai_service import process_chat_message
from utils.neo4j_storage import save_chat_message, get_user_repo_history,delete_chat_session # New Utility
# Assuming you have an auth middleware
# from utils.auth import get_current_user 

router = APIRouter(prefix="/api/chat", tags=["chatbot"])

class ChatRequest(BaseModel):
    message: str
    repository: str
    user_id: str  # Added to track the owner
    session_id: str # Added to group messages into threads
    history: Optional[List[Dict[str, str]]] = [] 

@router.post("/")
async def chat_with_repository(request: ChatRequest):
    try:
        # 1. Get AI Answer
        answer = await process_chat_message(
            request.repository, 
            request.message, 
            request.history
        )
        
        # 2. Store both User Message and AI Answer in Neo4j
        await save_chat_message(
            user_id=request.user_id,
            repo_name=request.repository,
            session_id=request.session_id,
            user_msg=request.message,
            ai_msg=answer
        )
        
        return {"role": "assistant", "content": answer}
    
    except Exception as e:
        print(f"❌ Chat Router Error: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}/{repo_name:path}")
async def fetch_history(user_id: str, repo_name: str):
    print(f"🔍 Fetching history for {user_id} in {repo_name}")
    
    sessions = await get_user_repo_history(user_id, repo_name)

    if not sessions:
        return {"sessions": []}

    return {"sessions": sessions}
@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """
    Permanently deletes a chat session and all its associated messages
    from the Neo4j database.
    """
    print(f"🗑️ Deleting session: {session_id}")
    
    try:
        success = await delete_chat_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found or already deleted")
            
        return {"message": "Session deleted successfully", "session_id": session_id}
        
    except Exception as e:
        print(f"❌ Delete Router Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))