from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any

from db.connection import get_db  # Ensure get_db yields a SessionLocal()
from db.models import AuditLog, User, UserRepository
from routers.auth import get_current_user

router = APIRouter()

@router.get("/api/audit-logs")
def get_all_audit_logs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches audit logs visible ONLY to the logged-in admin:
    1. Actions performed directly by or for this admin.
    2. Actions performed by developers assigned to repositories managed by this admin.
    """
    admin_id = current_user.get("user_id") or current_user.get("id")
    if not admin_id:
        raise HTTPException(status_code=401, detail="User identification missing from token.")

    try:
        # Subquery to find developer IDs managed by this admin
        dev_ids_subquery = (
            db.query(UserRepository.user_id)
            .filter(UserRepository.admin_id == admin_id)
            .scalar_subquery()
        )

        # Query AuditLogs with User details
        results = (
            db.query(AuditLog, User)
            .outerjoin(User, AuditLog.actor_id == User.id)
            .filter(
                or_(
                    AuditLog.admin_id == admin_id,
                    AuditLog.actor_id == admin_id,
                    AuditLog.actor_id.in_(dev_ids_subquery)
                )
            )
            .order_by(AuditLog.created_at.desc())
            .distinct()
            .all()
        )

        logs = []
        for log, actor in results:
            if actor and actor.first_name and actor.last_name:
                role_str = f" ({actor.role.capitalize()})" if actor.role else ""
                actor_name = f"{actor.first_name} {actor.last_name}{role_str}"
            elif actor and actor.first_name:
                role_str = f" ({actor.role.capitalize()})" if actor.role else ""
                actor_name = f"{actor.first_name}{role_str}"
            else:
                actor_name = "System Level"

            logs.append({
                "id": log.id,
                "admin_id": log.admin_id,
                "actor_id": log.actor_id,
                "target_user_id": log.target_user_id,
                "action": log.action,
                "repository_id": log.repository_id,
                "repository_name": log.repository_name,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "actor_name": actor_name
            })

        return logs

    except Exception as e:
        print("❌ API Error fetching audit logs:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs.")