from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
import json
from datetime import datetime, timezone

from db.session import get_db
from db.models import (
    Repository,
    UserRepository,
    Notification,
    GitHubInstallation
)

from services.audit_service import create_audit_log
from services.socket_service import emit_to_admin, emit_to_developer

router = APIRouter()

@router.post("/api/github/webhook")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        raw_body = await request.body()
        if not raw_body:
            return {"status": "empty body"}

        payload = json.loads(raw_body)
        event = request.headers.get("X-GitHub-Event")

        # -------------------------------------------------------------
        # 1. HANDLE APP INSTALLATION / UNINSTALLATION
        # -------------------------------------------------------------
        if event == "installation":
            action = payload.get("action")
            installation_id = payload.get("installation", {}).get("id")
            org_id = payload.get("installation", {}).get("account", {}).get("id")

            if action == "created":
                # Note: 'admin_user_id' can be linked during OAuth callback/finalize
                print(f"✅ App Installed: Installation ID {installation_id}")
            elif action == "deleted":
                # Clean up local installation record
                db.query(GitHubInstallation).filter(
                    GitHubInstallation.installation_id == installation_id
                ).delete()
                db.commit()
                print(f"🗑️ App Uninstalled: Installation ID {installation_id}")

            return {"status": f"processed installation action: {action}"}

        # -------------------------------------------------------------
        # 2. HANDLE ADDING/REMOVING REPOSITORIES FROM INSTALLATION
        # -------------------------------------------------------------
        if event == "installation_repositories":
            action = payload.get("action")
            repos_added = payload.get("repositories_added", [])
            repos_removed = payload.get("repositories_removed", [])

            installation_id = payload.get("installation", {}).get("id")
            inst = db.query(GitHubInstallation).filter_by(installation_id=installation_id).first()
            admin_id = inst.admin_user_id if inst else None

            # Register newly added repositories
            if action == "added" and repos_added:
                for repo_data in repos_added:
                    repo_id = int(repo_data["id"])
                    repo_name = repo_data["name"]
                    repo_full_name = repo_data["full_name"]

                    existing = db.query(Repository).filter_by(id=repo_id).first()
                    if not existing:
                        db.add(
                            Repository(
                                id=repo_id,
                                name=repo_name,
                                full_name=repo_full_name,
                                html_url=f"https://github.com/{repo_full_name}",
                                admin_id=admin_id,
                            )
                        )
                db.commit()
                print(f"➕ Auto-registered {len(repos_added)} new repositories.")

            return {"status": f"processed repo updates: {action}"}

        # -------------------------------------------------------------
        # 3. HANDLE CODE PUSH EVENTS
        # -------------------------------------------------------------
        if event == "push":
            repo = payload.get("repository", {})
            raw_repo_id = repo.get("id")
            
            if not raw_repo_id:
                return {"status": "missing repository id"}
                
            repo_id = int(raw_repo_id)
            repo_name = repo.get("name", "Unknown Repo")
            repo_full_name = repo.get("full_name", repo_name)
            owner_id = repo.get("owner", {}).get("id")

            ref = payload.get("ref", "")
            branch = ref.replace("refs/heads/", "") if "refs/heads/" in ref else ref
            commit_count = len(payload.get("commits", []))
            pusher = payload.get("pusher", {}).get("name", "A contributor")

            # Resolve Admin via Installation mapping
            installation = None
            if owner_id:
                installation = (
                    db.query(GitHubInstallation)
                    .filter(GitHubInstallation.org_id == int(owner_id))
                    .first()
                )
            admin_id = installation.admin_user_id if installation else None

            # Upsert Repository record
            existing_repo = db.query(Repository).filter(Repository.id == repo_id).first()
            if not existing_repo:
                db.add(
                    Repository(
                        id=repo_id,
                        name=repo_name,
                        full_name=repo_full_name,
                        html_url=repo.get("html_url", f"https://github.com/{repo_full_name}"),
                        private=repo.get("private", False),
                        admin_id=admin_id,
                    )
                )
                db.commit()

            # Process developer notifications & websockets...
            assigned_links = db.query(UserRepository).filter(UserRepository.repo_id == repo_id).all()
            assigned_developer_ids = [link.user_id for link in assigned_links]

            notification_title = "New Commits Pushed"
            notification_msg = f"{pusher} pushed {commit_count} commit(s) to {branch}."

            created_notifications = []
            for dev_id in assigned_developer_ids:
                notif = Notification(
                    user_id=dev_id,
                    repo_id=repo_id,
                    title=notification_title,
                    message=notification_msg,
                    event_type="repo_sync_required",
                    is_read=False,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(notif)
                created_notifications.append((dev_id, notif))

            db.commit()

            # Dispatch real-time web socket alerts
            for dev_id, notif in created_notifications:
                db.refresh(notif)
                socket_payload = {
                    "id": notif.id,
                    "repoId": repo_id,
                    "repoName": repo_name,
                    "pusher": pusher,
                    "branch": branch,
                    "title": notification_title,
                    "message": notification_msg,
                    "isRead": False
                }
                await emit_to_developer(dev_id, "repo_updated", socket_payload)

            return {"status": "success", "notified_developers": assigned_developer_ids}

        return {"status": f"ignored event: {event}"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}