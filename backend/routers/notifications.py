from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from db.session import get_db
from db.models import Notification, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[dict])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": n.id,
            "repoId": n.repo_id,
            "title": n.title,
            "message": n.message,
            "isRead": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "actionRequired": n.event_type == "repo_sync_required"
        }
        for n in notifications
    ]

@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")

    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"status": "success"}