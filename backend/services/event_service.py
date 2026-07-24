from sqlalchemy.orm import Session

from services.audit_service import create_audit_log
from services.socket_service import sio
from db.models import Notification, UserRepository


async def create_system_event(
    db: Session,
    *,
    admin_id=None,
    actor_id=None,
    target_user_id=None,
    repository_id=None,
    repository_name=None,
    action=None,
    details=None,
    notification_title=None,
    notification_message=None,
    event_type=None,
):
    """
    Single entry point for:

    ✔ Audit Logs
    ✔ Notifications
    ✔ Socket Events
    """

    # ----------------------------------
    # AUDIT LOG
    # ----------------------------------

    create_audit_log(
        admin_id=admin_id,
        actor_id=actor_id,
        target_user_id=target_user_id,
        repository_id=repository_id,
        repository_name=repository_name,
        action=action,
        details=details,
    )

    # ----------------------------------
    # NOTIFICATIONS
    # ----------------------------------

    if repository_id:

        users = (
            db.query(UserRepository)
            .filter(UserRepository.repo_id == repository_id)
            .all()
        )

        for user in users:

            notification = Notification(
                user_id=user.user_id,
                repo_id=repository_id,
                title=notification_title or action,
                message=notification_message or details,
                event_type=event_type or action,
            )

            db.add(notification)

        db.commit()

    # ----------------------------------
    # SOCKET
    # ----------------------------------

    if repository_id:

        users = (
            db.query(UserRepository)
            .filter(UserRepository.repo_id == repository_id)
            .all()
        )

        for user in users:

            # FIXED: Target the unified 'developer_{id}' room layout instead of 'user_{id}'
            await sio.emit(
                "repo_updated",
                {
                    "repoId": repository_id,
                    "repoName": repository_name,
                    "title": notification_title or action,
                    "message": notification_message or details,
                    "details": details,
                    "action": action,
                    "userId": user.user_id
                },
                room=f"developer_{user.user_id}",
            )