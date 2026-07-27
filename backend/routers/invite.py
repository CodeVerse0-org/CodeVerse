import uuid
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from db.session import get_db
from db.models import Invitation, UserRepository, User
from utils.email_utils import send_invitation_email
from utils.security import decode_access_token
from services.audit_service import create_audit_log
from services.socket_service import emit_to_admin

# Environment variable with fallback to production Vercel domain
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://code-verse-one.vercel.app")

# =========================
# INIT
# =========================
router = APIRouter(tags=["invite"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class InviteCreate(BaseModel):
    email: EmailStr
    repo_ids: List[int]

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    return int(payload["sub"])

@router.post("/")
def send_invite(
    payload: InviteCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    token = str(uuid.uuid4())

    invite = Invitation(
        email=payload.email.lower(),
        token=token,
        repo_ids=payload.repo_ids,
        accepted=False,
        admin_id=current_user_id
    )

    try:
        db.add(invite)
        db.commit()
        db.refresh(invite)

        create_audit_log(
            admin_id=current_user_id,
            actor_id=current_user_id,
            action="INVITE_USER",
            details=f"Invitation sent to {payload.email}"
        )
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database save failed")

    # Dynamic secure frontend link
    link = f"{FRONTEND_URL.rstrip('/')}/accept-invite/{token}"

    try:
        send_invitation_email(payload.email, link)
    except Exception as e:
        print(f"Email sending failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "Invitation sent", "link": link, "token": token}


@router.post("/accept/{token}")
async def accept_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    invite = db.query(Invitation).filter(Invitation.token == token).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invite.accepted:
        return {"message": "Already accepted"}

    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        for rid in invite.repo_ids:
            exists = db.query(UserRepository).filter_by(
                user_id=user.id,
                repo_id=rid,
                admin_id=invite.admin_id
            ).first()

            if not exists:
                db.add(UserRepository(
                    user_id=user.id,
                    repo_id=rid,
                    admin_id=invite.admin_id
                ))

        invite.accepted = True
        db.commit()

        create_audit_log(
            admin_id=invite.admin_id,
            actor_id=user.id,
            action="DEVELOPER_JOINED",
            target_user_id=user.id,
            details=f"{user.first_name} {user.last_name} accepted the invitation."
        )

        await emit_to_admin(
            invite.admin_id,
            "admin_notification",
            {
                "title": "Invitation Accepted",
                "message": f"{user.first_name} {user.last_name} joined your project.",
                "details": "The developer can now access assigned repositories.",
                "action": "INVITE_ACCEPTED",
            },
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Invite accepted and repositories linked"}


@router.get("/manage")
def get_user_management_list(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    active_developers = (
        db.query(User)
        .join(UserRepository, User.id == UserRepository.user_id)
        .filter(
            User.role == "developer",
            UserRepository.admin_id == current_user_id
        )
        .distinct()
        .all()
    )

    pending_invites = db.query(Invitation).filter(
        Invitation.accepted == False,
        Invitation.admin_id == current_user_id
    ).all()

    management_data = []

    for dev in active_developers:
        repo_count = db.query(UserRepository).filter(
            UserRepository.user_id == dev.id,
            UserRepository.admin_id == current_user_id
        ).count()

        management_data.append({
            "id": dev.id,
            "name": f"{dev.first_name} {dev.last_name}",
            "email": dev.email,
            "repo_count": repo_count,
            "status": "Active",
            "date": dev.created_at.strftime("%d %b, %Y") if dev.created_at else "Active User",
            "is_invite": False
        })

    for invite in pending_invites:
        management_data.append({
            "id": invite.id,
            "name": "Pending User",
            "email": invite.email,
            "repo_count": len(invite.repo_ids) if invite.repo_ids else 0,
            "status": "Pending Invitation",
            "date": "Pending",
            "is_invite": True
        })

    return management_data


@router.delete("/revoke/{id}")
async def revoke_access(
    id: int,
    is_invite: bool = Query(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    try:
        if is_invite:
            db.query(Invitation).filter(
                Invitation.id == id,
                Invitation.admin_id == current_user_id
            ).delete()
        else:
            developer = db.query(User).filter(User.id == id).first()
            if developer:
                create_audit_log(
                    admin_id=current_user_id,
                    actor_id=current_user_id,
                    target_user_id=id,
                    action="REVOKE_REPOSITORY",
                    details=f"Access revoked for {developer.first_name} {developer.last_name}"
                )

            db.query(UserRepository).filter(
                UserRepository.user_id == id,
                UserRepository.admin_id == current_user_id
            ).delete(synchronize_session=False)

        db.commit()
        return {"message": "Access revoked"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))