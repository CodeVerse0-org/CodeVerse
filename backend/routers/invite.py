# backend/routers/invite.py

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from db.session import get_db
from db.models import Invitation, UserRepository, User
from utils.email_utils import send_invitation_email
from utils.security import decode_access_token


# =========================
# INIT
# =========================
router = APIRouter(tags=["invite"])

# ✅ FIX 1: DEFINE oauth2_scheme HERE
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# =========================
# PAYLOADS
# =========================
class InviteCreate(BaseModel):
    email: EmailStr
    repo_ids: List[int]


class AcceptPayload(BaseModel):
    user_id: int


# =========================
# AUTH HELPER
# =========================
def get_current_user_id(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    return int(payload["sub"])


# =========================
# SEND INVITE
# =========================
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

    link = f"http://localhost:5173/accept-invite/{token}"

    try:
        send_invitation_email(payload.email, link)
    except Exception as e:
        print(f"Email sending failed: {e}")

    return {"message": "Invitation sent", "link": link, "token": token}


# =========================
# ACCEPT INVITE
# =========================
@router.post("/accept/{token}")
def accept_invite(
    token: str, 
    db: Session = Depends(get_db), 
    current_user_id: int = Depends(get_current_user_id) # ✅ Strict Security
):
    invite = db.query(Invitation).filter(Invitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invite.accepted:
        return {"message": "Already accepted"}

    # ✅ Use current_user_id from JWT, not from payload
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        for rid in invite.repo_ids:
            exists = db.query(UserRepository).filter_by(user_id=user.id, repo_id=rid).first()
            if not exists:
                db.add(UserRepository(user_id=user.id, repo_id=rid))

        invite.accepted = True
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Invite accepted and repositories linked"}


# =========================
# MANAGEMENT LIST
# =========================
@router.get("/manage")
def get_user_management_list(db: Session = Depends(get_db)):

    active_developers = (
        db.query(User)
        .join(UserRepository, User.id == UserRepository.user_id)
        .filter(User.role == "developer")
        .distinct()
        .all()
    )

    pending_invites = db.query(Invitation).filter(
        Invitation.accepted == False
    ).all()

    management_data = []

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


# =========================
# REVOKE ACCESS
# =========================
@router.delete("/revoke/{id}")
def revoke_access(
    id: int,
    is_invite: bool = Query(...),
    db: Session = Depends(get_db)
):
    try:
        if is_invite:
            db.query(Invitation).filter(Invitation.id == id).delete()
        else:
            db.query(UserRepository).filter(
                UserRepository.user_id == id
            ).delete()

        db.commit()

        return {"message": "Access revoked and user removed from view"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))