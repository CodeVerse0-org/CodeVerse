# backend/routers/invite.py
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
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

# backend/routers/invite.py

@router.get("/manage")
def get_user_management_list(db: Session = Depends(get_db)):
    # 1. Fetch only developers who have at least one repository assigned
    # If the user_repositories entry is deleted, they disappear from this result.
    active_developers = (
        db.query(User)
        .join(UserRepository, User.id == UserRepository.user_id)
        .filter(User.role == "developer")
        .distinct()
        .all()
    )
    
    # 2. Fetch pending invitations
    pending_invites = db.query(Invitation).filter(Invitation.accepted == False).all()
    
    management_data = []

    # Process Active Developers
    for dev in active_developers:
        repo_count = db.query(UserRepository).filter_by(user_id=dev.id).count()
        management_data.append({
            "id": dev.id,
            "name": f"{dev.first_name} {dev.last_name}",
            "email": dev.email,
            "repo_count": repo_count,
            "status": "Active",
            "date": "12 Jan, 2025", 
            "is_invite": False
        })

    # Process Pending Invites
    for invite in pending_invites:
        management_data.append({
            "id": invite.id,
            "name": "Pending User",
            "email": invite.email,
            "repo_count": 0,
            "status": "Pending Invitation",
            "date": "31 Jan, 2025",
            "is_invite": True
        })

    return management_data
# backend/routers/invite.py

@router.delete("/revoke/{id}")
def revoke_access(id: int, is_invite: bool = Query(...), db: Session = Depends(get_db)):
    try:
        if is_invite:
            # Case 1: Remove a pending invitation
            db.query(Invitation).filter(Invitation.id == id).delete()
        else:
            # Case 2: Remove repository access for an active developer
            # If you want the user to disappear from the "Users" list, 
            # you must either delete the user or ensure the GET query filters them out.
            db.query(UserRepository).filter(UserRepository.user_id == id).delete()
            
            # Optional: Delete the user entirely if "Revoke" means "Delete User"
            # db.query(User).filter(User.id == id).delete()

        db.commit()
        return {"message": "Access revoked and user removed from view"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))