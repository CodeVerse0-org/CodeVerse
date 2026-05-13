from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict

from utils.ai_service import process_chat_message
from utils.neo4j_storage import (
    save_chat_message,
    get_user_repo_history,
    delete_chat_session
)

router = APIRouter(prefix="/api/chat", tags=["chatbot"])

class ChatRequest(BaseModel):
    message: str
    repository: str
    user_id: str
    session_id: str
    installation_id: int
    history: Optional[List[Dict[str, str]]] = None

@router.post("/")
async def chat_with_repository(request: ChatRequest):

    try:
        history = request.history or []
        trimmed_history = history[-6:]

        answer = await process_chat_message(
            repo_name=request.repository,
            message=request.message,
            history=trimmed_history,
            installation_id=request.installation_id
        )

        # Retry once for Neo4j stability
        try:
            await save_chat_message(
                user_id=request.user_id,
                repo_name=request.repository,
                session_id=request.session_id,
                user_msg=request.message,
                ai_msg=answer
            )
        except Exception as db_error:
            print(f"⚠️ Neo4j retry: {db_error}")
            try:
                await save_chat_message(
                    user_id=request.user_id,
                    repo_name=request.repository,
                    session_id=request.session_id,
                    user_msg=request.message,
                    ai_msg=answer
                )
            except:
                print("❌ Neo4j failed again")

        return {
            "role": "assistant",
            "content": answer
        }

    except Exception as e:
        print(f"❌ Chat Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Chat processing failed"
        )

@router.get("/history/{user_id}/{repo_name:path}")
async def fetch_history(user_id: str, repo_name: str):

    try:
        sessions = await get_user_repo_history(user_id, repo_name)
        return {"sessions": sessions or []}

    except Exception as e:
        print(f"❌ History Error: {e}")
        return {"sessions": []}

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):

    try:
        success = await delete_chat_session(session_id)

        if not success:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )

        return {
            "message": "Session deleted successfully",
            "session_id": session_id
        }

    except Exception as e:
        print(f"❌ Delete Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete session"
        )
