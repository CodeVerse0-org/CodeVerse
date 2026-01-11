# backend/routers/invite.py

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from db.models import Invitation, UserRepository
from utils.email_utils import send_invitation_email

router = APIRouter(prefix="/api/invite", tags=["Invite"])

# ------------------------------
# SEND INVITATION
# ------------------------------
@router.post("/")
def send_invite(payload: dict, db: Session = Depends(get_db)):
    """
    Send invitation email to developer
    payload: {
        "email": str,
        "repo_ids": list[int]
    }
    """
    # Check required fields
    if "email" not in payload or "repo_ids" not in payload:
        raise HTTPException(status_code=400, detail="Missing email or repo_ids")

    token = str(uuid.uuid4())

    # Save invitation in DB
    invite = Invitation(
        email=payload["email"],
        token=token,
        repo_ids=payload["repo_ids"]
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Build invitation link (frontend route)
    link = f"http://localhost:5173/accept-invite/{token}"

    # Send email
    try:
        send_invitation_email(payload["email"], link)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

    return {"message": f"Invitation sent to {payload['email']}", "token": token}


# ------------------------------
# ACCEPT INVITATION
# ------------------------------
@router.post("/accept/{token}")
def accept_invite(token: str, user_id: int, db: Session = Depends(get_db)):
    """
    Developer accepts invitation
    Path param: token
    Query/body param: user_id (int)
    """
    # Fetch invitation
    invite = db.query(Invitation).filter_by(token=token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.accepted:
        raise HTTPException(status_code=400, detail="Invitation already accepted")

    # Mark invitation as accepted
    invite.accepted = True

    # Assign repos to user
    for repo_id in invite.repo_ids:
        user_repo = UserRepository(user_id=user_id, repo_id=repo_id)
        db.add(user_repo)

    db.commit()

    return {"message": "Invitation accepted successfully", "user_id": user_id}
