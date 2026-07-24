from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
import json

from db.session import get_db
from db.models import (
    User,
    UserRepository,
    Notification,
    Repository,
    GitHubInstallation,
)

from services.audit_service import create_audit_log
from services.socket_service import emit_to_admin, emit_to_developer

router = APIRouter()


@router.post("/api/github/webhook")
async def github_webhook(request: Request, db: Session = Depends(get_db)):

    print("\n================ WEBHOOK RECEIVED ================\n")

    try:

        payload = await request.json()

        print("EVENT:", request.headers.get("X-GitHub-Event"))

        repo = payload.get("repository", {})

        repo_id = repo.get("id")
        repo_name = repo.get("name")

        print("Repo ID:", repo_id)
        print("Repo Name:", repo_name)

        links = db.query(UserRepository).filter(
            UserRepository.repo_id == repo_id
        ).all()

        print("FOUND LINKS:", len(links))

        for l in links:
            print(
                "Developer:",
                l.user_id,
                "Repo:",
                l.repo_id,
                "Admin:",
                l.admin_id,
            )

        if len(links) == 0:
            print("NO USER ASSIGNED TO THIS REPOSITORY")
            return {"status": "no mapping"}

        installation = (
            db.query(GitHubInstallation)
            .filter(
                GitHubInstallation.admin_user_id == links[0].admin_id
            )
            .first()
        )

        print("INSTALLATION:", installation)

        for link in links:

            notification = Notification(
                user_id=link.user_id,
                repo_id=repo_id,
                title="Repository Updated",
                message="New commit pushed.",
                event_type="push",
                is_read=False,
            )

            db.add(notification)

        db.commit()

        print("NOTIFICATIONS INSERTED")

        for link in links:

            await emit_to_developer(
                link.user_id,
                "repo_updated",
                {
                    "title": "Repository Updated",
                    "message": "New commit pushed.",
                },
            )

            print("SOCKET SENT TO", link.user_id)

        if installation:

            await emit_to_admin(
                installation.admin_user_id,
                "admin_notification",
                {
                    "title": "Repository Updated",
                    "message": "Repository updated.",
                },
            )

            print("ADMIN SOCKET SENT")

        print("============== FINISHED ==============")

        return {"success": True}

    except Exception as e:

        db.rollback()

        print("WEBHOOK ERROR")
        print(e)

        return {"error": str(e)}