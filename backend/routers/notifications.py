from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import Notification
from db.session import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: int
    repoId: Optional[int] = None
    title: Optional[str] = None
    message: Optional[str] = None
    isRead: bool
    created_at: Optional[str] = None
    actionRequired: bool

    class Config:
        from_attributes = True


def _get_user_id(current_user) -> int:
    if hasattr(current_user, "id"):
        return current_user.id
    if isinstance(current_user, dict) and "id" in current_user:
        return current_user["id"]
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _get_user_id(current_user)

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        NotificationResponse(
            id=n.id,
            repoId=n.repo_id,
            title=n.title,
            message=n.message,
            isRead=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else None,
            actionRequired=(n.event_type == "repo_sync_required"),
        )
        for n in notifications
    ]


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _get_user_id(current_user)

    db.query(Notification).filter(Notification.user_id == user_id).delete(
        synchronize_session=False
    )
    db.commit()
    return {"status": "success", "message": "All notifications cleared."}


@router.delete("/{notification_id}")
def delete_single_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _get_user_id(current_user)

    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db.delete(notif)
    db.commit()

    return {"status": "success", "message": "Notification deleted."}