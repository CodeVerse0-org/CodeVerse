from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
import json
from datetime import datetime, timezone

from db.session import get_db
from db.models import (
    User,
    Repository,
    UserRepository,
    Notification,
    GitHubInstallation
)

from services.audit_service import create_audit_log
from services.socket_service import (
    emit_to_admin,
    emit_to_developer,
)

router = APIRouter()

@router.post("/api/github/webhook")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    print("🔥 WEBHOOK RECEIVED")

    try:
        raw_body = await request.body()
        if not raw_body:
            return {"status": "empty body"}

        payload = json.loads(raw_body)
        event = request.headers.get("X-GitHub-Event")

        if event != "push":
            return {"status": "ignored"}

        # Extract Event Details
        repo = payload.get("repository", {})
        repo_id = repo.get("id")
        repo_name = repo.get("name")
        repo_full_name = repo.get("full_name")
        repo_owner = repo.get("owner", {})
        owner_id = repo_owner.get("id")
        branch = payload.get("ref", "").replace("refs/heads/", "")
        commit_count = len(payload.get("commits", []))
        pusher = payload.get("pusher", {}).get("name")

        if not repo_id:
            return {"status": "missing repo id"}

        # Find Admin Ownership
        installation = (
            db.query(GitHubInstallation)
            .filter(GitHubInstallation.org_id == owner_id)
            .first()
        )
        admin_id = installation.admin_user_id if installation else None

        # Save Repository if missing
        existing_repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not existing_repo:
            db.add(
                Repository(
                    id=repo_id,
                    name=repo_name,
                    full_name=repo_full_name,
                    html_url=repo.get("html_url"),
                    private=repo.get("private", False),
                    admin_id=admin_id,
                )
            )
            db.commit()

        # Find assigned developers
        links = db.query(UserRepository).filter(UserRepository.repo_id == repo_id).all()

        notification_title = "New Commits Pushed"
        notification_msg = f"{pusher} pushed {commit_count} commit(s) to {branch}. Would you like to sync the repo for an updated graph?"

        created_notifications = []

        # Create & Persist Notifications
        for link in links:
            notif = Notification(
                user_id=link.user_id,
                repo_id=repo_id,
                title=notification_title,
                message=notification_msg,
                event_type="repo_sync_required",
                is_read=False,
                created_at=datetime.now(timezone.utc)
            )
            db.add(notif)
            created_notifications.append((link.user_id, notif))

        db.commit()

        # Save Audit Log
        create_audit_log(
            admin_id=admin_id,
            actor_id=None,
            repository_id=repo_id,
            repository_name=repo_name,
            action="Repository Updated",
            details=f"{pusher} pushed new commits to {branch}."
        )

        # Emit Realtime Events to Developers
        for user_id, notif in created_notifications:
            db.refresh(notif)  # Get saved ID
            await emit_to_developer(
                user_id,
                "repo_updated",
                {
                    "id": notif.id,
                    "repoId": repo_id,
                    "repoName": repo_name,
                    "pusher": pusher,
                    "branch": branch,
                    "title": notification_title,
                    "message": notification_msg,
                    "time": "Just now",
                    "created_at": notif.created_at.isoformat() if hasattr(notif, 'created_at') else datetime.now(timezone.utc).isoformat(),
                    "isRead": False,
                    "actionRequired": True
                }
            )

        # Emit Realtime Event to Admin
        if admin_id:
            await emit_to_admin(
                admin_id,
                "admin_notification",
                {
                    "title": "Repository Updated",
                    "message": f"{repo_name} updated by {pusher}.",
                    "details": f"{pusher} pushed {commit_count} commit(s) to {branch}.",
                    "repository": repo_name,
                    "action": "Repository Updated",
                }
            )

        return {"status": "success"}

    except Exception as e:
        print("❌ WEBHOOK ERROR:", str(e))
        db.rollback()
        return {"status": "error", "message": str(e)}