from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
import json

from db.session import get_db
from db.models import (
    User,
    UserRepository,
    Notification,
    Repository,
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

        # -------------------
        # EXTRACT DATA
        # -------------------
        repo = payload.get("repository", {})
        repo_id = repo.get("id")
        repo_name = repo.get("name")
        repo_full_name = repo.get("full_name")
        repo_owner = repo.get("owner", {})
        owner_id = repo_owner.get("id")
        branch = payload.get("ref", "").replace("refs/heads/", "")
        commit_count = len(payload.get("commits", []))
        pusher = payload.get("pusher", {}).get("name")

        print("📁 Repo:", repo_name, repo_id)

        if not repo_id:
            return {"status": "missing repo id"}

        # -------------------
        # FIND ADMIN OWNERSHIP
        # -------------------
        installation = (
            db.query(GitHubInstallation)
            .filter(GitHubInstallation.org_id == owner_id)
            .first()
        )

        admin_id = installation.admin_user_id if installation else None

        # -------------------
        # SAVE REPOSITORY IF MISSING
        # -------------------
        existing_repo = (
            db.query(Repository)
            .filter(Repository.id == repo_id)
            .first()
        )

        if not existing_repo:
            db.add(
                Repository(
                    id=repo_id,
                    name=repo_name,
                    full_name=repo_full_name,
                    html_url=repo.get("html_url"),
                    private=repo.get("private", False),
                )
            )
            db.commit()

        # -------------------
        # GET USERS LINKED TO REPO
        # -------------------
        links = db.query(UserRepository).filter(
            UserRepository.repo_id == repo_id
        ).all()

        print("👥 USERS FOUND:", len(links))

        # -------------------
        # CREATE NOTIFICATIONS
        # -------------------
        for link in links:

            user = db.query(User).filter(User.id == link.user_id).first()

            if not user:
                print(f"❌ USER NOT FOUND: {link.user_id}")
                continue

            notification = Notification(
                user_id=link.user_id,
                repo_id=repo_id,
                title="Repository Updated",
                message=f"{pusher} pushed {commit_count} commit(s) to {branch}",
                event_type="push",
                is_read=False,
            )

            db.add(notification)

        db.commit()
        print("✅ Notifications saved")

        # -------------------
        # ADD AUDIT LOG
        # -------------------
        create_audit_log(
            admin_id=admin_id,
            actor_id=None,
            repository_id=repo_id,
            repository_name=repo_name,
            action="Repository Updated",
            details=f"{pusher} pushed new commits."
        )

        # -------------------
        # SOCKET EMIT
        # -------------------
        
        # SOCKET → DEVELOPERS
        for link in links:
            await emit_to_developer(
                link.user_id,
                "repo_updated",
                {
                    "repoId": repo_id,
                    "repoName": repo_name,
                    "fullName": repo_full_name,
                    "pusher": pusher,
                    "branch": branch,
                    "commitCount": commit_count,
                    "title": "Repository Updated",
                    "details": f"{pusher} pushed {commit_count} commit(s) to {branch}.",
                    "userId": link.user_id
                },
            )

        print("📡 Repository update sent to assigned developers.")

        # SOCKET → ADMIN
        if admin_id:
            await emit_to_admin(
                admin_id,
                "admin_notification",
                {
                    "title": "Repository Updated",
                    "message": f"{repo_name} has been updated.",
                    "details": f"{pusher} pushed {commit_count} commit(s) to {branch}.",
                    "repository": repo_name,
                    "action": "Repository Updated",
                },
            )

            print(f"📡 Repository update sent to admin {admin_id}.")

        return {"status": "success"}

    except Exception as e:
        print("❌ WEBHOOK ERROR:", str(e))
        db.rollback()
        return {"status": "error", "message": str(e)}