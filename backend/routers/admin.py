from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db.session import get_db
from db.models import (
    User,
    Notification,
    UserRepository
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

# =====================================================
# REAL AUDIT LOGS
# =====================================================

@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db)
):

    notifications = (
        db.query(Notification)
        .order_by(desc(Notification.id))
        .all()
    )

    logs = []

    for n in notifications:

        # -----------------------------------------
        # GET USER
        # -----------------------------------------

        user = (
            db.query(User)
            .filter(User.id == n.user_id)
            .first()
        )

        # -----------------------------------------
        # GET REPOSITORY
        # -----------------------------------------

        repo = (
            db.query(UserRepository)
            .filter(UserRepository.id == n.repo_id)
            .first()
        )

        logs.append({

            "id": n.id,

            "user":
                user.email
                if user else "Unknown User",

            "action":
                n.event_type
                if n.event_type else "ACTIVITY",

            "resource":
                repo.full_name
                if repo else n.title,

            "status":
                "SUCCESS",

            "ip":
                "N/A",

            "timestamp":
                str(n.id)

        })

    return logs