from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from utils.ai_service import process_chat_message

router = APIRouter(prefix="/api/chat", tags=["chatbot"])

class ChatRequest(BaseModel):
    message: str
    repository: str
    installation_id: Optional[str] = None
    # Added history so the AI remembers previous messages in the session
    history: Optional[List[Dict[str, str]]] = [] 

@router.post("/")
async def chat_with_repository(request: ChatRequest):
    try:
        # Pass the history to the service
        answer = await process_chat_message(
            request.repository, 
            request.message, 
            request.history
        )
        
        return {"role": "assistant", "content": answer}
    
    except Exception as e:
        # This helps you see the exact error in your terminal (like the 429 quota error)
        print(f"❌ Chat Router Error: {e}") 
        raise HTTPException(status_code=500, detail=str(e))