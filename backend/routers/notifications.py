from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import Notification
from utils.security import decode_access_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user_id(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    return int(payload["sub"])


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    return notifications


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    db.query(Notification).filter(
        Notification.user_id == user_id
    ).update(
        {Notification.is_read: True},
        synchronize_session=False,
    )

    db.commit()

    return {"message": "All notifications marked as read"}