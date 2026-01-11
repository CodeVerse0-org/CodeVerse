# backend/routers/invite.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List
from db.session import get_db
from db.models import Invitation, UserRepository, User
from utils.email_utils import send_invitation_email  # implement this with SMTP/Mailtrap

router = APIRouter(tags=["invite"])

# --- Payloads ---
class InviteCreate(BaseModel):
    email: EmailStr
    repo_ids: List[int]

class AcceptPayload(BaseModel):
    user_id: int

# --- Send Invitation ---
@router.post("/")
def send_invite(payload: InviteCreate, db: Session = Depends(get_db)):
    token = str(uuid.uuid4())
    invite = Invitation(
        email=payload.email.lower(),
        token=token,
        repo_ids=payload.repo_ids,
        accepted=False
    )
    try:
        db.add(invite)
        db.commit()
        db.refresh(invite)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database save failed")

    # Send email with invite link
    link = f"http://localhost:5173/accept-invite/{token}"
    try:
        send_invitation_email(payload.email, link)
    except Exception as e:
        print(f"Email sending failed: {e}")
        # Optionally continue; invite still created

    return {"message": "Invitation sent", "link": link, "token": token}

# --- Accept Invitation ---
@router.post("/accept/{token}")
def accept_invite(token: str, payload: AcceptPayload, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(Invitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.accepted:
        return {"message": "Already accepted"}

    # Validate user exists
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Link repositories
        for rid in invite.repo_ids:
            exists = db.query(UserRepository).filter_by(user_id=user.id, repo_id=rid).first()
            if not exists:
                db.add(UserRepository(user_id=user.id, repo_id=rid))

        # Mark invite accepted
        invite.accepted = True
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to accept invite: {e}")

    return {"message": "Invite accepted and repositories linked"}
