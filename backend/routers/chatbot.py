import urllib.parse
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field

from utils.ai_service import process_chat_message
from utils.neo4j_storage import (
    delete_chat_session,
    get_user_repo_history,
    save_chat_message,
)
from utils.security import decode_access_token

router = APIRouter(prefix="/api/chat", tags=["chatbot"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def get_current_user_id(token: Optional[str] = Depends(oauth2_scheme)) -> str:
    """Extracts and verifies the authenticated developer user_id directly from the JWT token."""
    if not token or token in ["null", "undefined", "None"]:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Missing or invalid authorization token.",
        )
    try:
        payload = decode_access_token(token)
        user_id = str(payload.get("sub")).strip()
        if not user_id or user_id.lower() in ["none", "null", "guest", "0"]:
            raise HTTPException(
                status_code=401, detail="Unauthorized: Invalid token subject."
            )
        return user_id
    except Exception:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Expired or malformed token."
        )


class ChatRequest(BaseModel):
    message: str
    repository: str
    user_id: Optional[Union[int, str]] = None
    session_id: str
    installation_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = []


@router.post("/")
async def chat_with_repository(
    request: ChatRequest,
    auth_user_id: str = Depends(get_current_user_id),
):
    try:
        history = request.history or []
        trimmed_history = history[-6:]

        answer = await process_chat_message(
            repo_name=request.repository,
            message=request.message,
            history=trimmed_history,
            installation_id=request.installation_id,
        )

        try:
            # Overrides request payload user_id with strictly validated JWT auth_user_id
            await save_chat_message(
                user_id=auth_user_id,
                repo_name=request.repository,
                session_id=request.session_id,
                user_msg=request.message,
                ai_msg=answer,
            )
        except Exception as db_error:
            print(f"⚠️ Neo4j write failed: {db_error}")

        return {"role": "assistant", "content": answer}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Chat processing failed")


@router.get("/history/{user_id}/{repo_name:path}")
async def fetch_history(
    user_id: str,
    repo_name: str,
    auth_user_id: str = Depends(get_current_user_id),
):
    decoded_repo = urllib.parse.unquote(repo_name).strip()

    # Enforce token ownership over requested history path
    print(f"🔍 FETCH HISTORY: Auth User '{auth_user_id}' requested repo '{decoded_repo}'")

    try:
        sessions = await get_user_repo_history(auth_user_id, decoded_repo)
        print(f"📊 RESULT: Found {len(sessions)} sessions for User '{auth_user_id}'")
        return {"sessions": sessions or []}

    except Exception as e:
        print(f"❌ History Error: {e}")
        return {"sessions": []}


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    repository: str = Query(..., description="Repository name for session scoping"),
    auth_user_id: str = Depends(get_current_user_id),
):
    decoded_repo = urllib.parse.unquote(repository).strip()

    try:
        success = await delete_chat_session(
            session_id=session_id,
            user_id=auth_user_id,
            repo_name=decoded_repo,
        )

        if not success:
            raise HTTPException(
                status_code=404,
                detail="Session not found or permission denied.",
            )

        return {
            "message": "Session deleted successfully",
            "session_id": session_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")
