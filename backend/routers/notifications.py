from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db.session import get_db
from db.models import Notification
from routers.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[dict])
def get_user_notifications(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    user_id = (
        current_user.id if hasattr(current_user, "id") else current_user.get("id")
    )

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
            "created_at": (
                n.created_at.isoformat() if hasattr(n, "created_at") and n.created_at else None
            ),
            "actionRequired": n.event_type == "repo_sync_required",
        }
        for n in notifications
    ]


@router.delete("/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Permanently removes all notifications for the authenticated user."""
    user_id = (
        current_user.id if hasattr(current_user, "id") else current_user.get("id")
    )

    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.commit()

    return {"status": "success", "message": "All notifications cleared permanently."}


@router.delete("/{notification_id}")
def delete_single_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Deletes a single notification record."""
    user_id = (
        current_user.id if hasattr(current_user, "id") else current_user.get("id")
    )

    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        .first()
    )

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    db.delete(notif)
    db.commit()

    return {"status": "success", "message": "Notification deleted."}