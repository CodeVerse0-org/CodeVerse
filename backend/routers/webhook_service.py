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
    print("\n==================================================")
    print("🔥 GITHUB WEBHOOK EVENT RECEIVED")
    print("==================================================")

    try:
        raw_body = await request.body()
        if not raw_body:
            print("⚠️ WEBHOOK FAILED: Empty body received.")
            return {"status": "empty body"}

        payload = json.loads(raw_body)
        event = request.headers.get("X-GitHub-Event")
        print(f"📌 Event Header: {event}")

        if event != "push":
            print(f"ℹ️ Event '{event}' ignored (Only handling 'push').")
            return {"status": f"ignored event: {event}"}

        # -------------------------------------------------------------
        # Extract Event Details Safely
        # -------------------------------------------------------------
        repo = payload.get("repository", {})
        raw_repo_id = repo.get("id")
        
        if not raw_repo_id:
            print("❌ WEBHOOK ERROR: Missing repository ID in payload.")
            return {"status": "missing repository id"}
            
        repo_id = int(raw_repo_id)  # Standardize as integer matching BigInteger column
        repo_name = repo.get("name", "Unknown Repo")
        repo_full_name = repo.get("full_name", repo_name)
        repo_owner = repo.get("owner", {})
        owner_id = repo_owner.get("id")
        
        ref = payload.get("ref", "")
        branch = ref.replace("refs/heads/", "") if "refs/heads/" in ref else ref
        commit_count = len(payload.get("commits", []))
        pusher = payload.get("pusher", {}).get("name", "A contributor")

        print(f"📦 Repository: {repo_name} (ID: {repo_id})")
        print(f"👤 Pusher: {pusher} | Branch: {branch} | Commits: {commit_count}")

        # -------------------------------------------------------------
        # Find Admin Ownership via Installation
        # -------------------------------------------------------------
        installation = None
        if owner_id:
            installation = (
                db.query(GitHubInstallation)
                .filter(GitHubInstallation.org_id == int(owner_id))
                .first()
            )
        admin_id = installation.admin_user_id if installation else None

        # Ensure Repository exists in DB
        existing_repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not existing_repo:
            print(f"➕ Registering missing Repository: {repo_name} (ID: {repo_id})")
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

        # -------------------------------------------------------------
        # 1. FETCH ASSIGNED DEVELOPERS FOR THIS REPO
        # -------------------------------------------------------------
        assigned_links = db.query(UserRepository).filter(UserRepository.repo_id == repo_id).all()
        assigned_developer_ids = [link.user_id for link in assigned_links]

        print(f"🔍 WEBHOOK TARGET REPO ID: {repo_id}")
        print(f"👥 ASSIGNED DEVELOPER IDs: {assigned_developer_ids}")

        if not assigned_developer_ids:
            print("⚠️ No assigned developers found for this repository in `user_repositories` table.")

        notification_title = "New Commits Pushed"
        notification_msg = f"{pusher} pushed {commit_count} commit(s) to {branch}. Would you like to sync the repo for an updated graph?"

        created_notifications = []

        # -------------------------------------------------------------
        # 2. PERSIST NOTIFICATION FOR EACH ASSIGNED DEVELOPER
        # -------------------------------------------------------------
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

        # Save Audit Log
        create_audit_log(
            admin_id=admin_id,
            actor_id=None,
            repository_id=repo_id,
            repository_name=repo_name,
            action="Repository Updated",
            details=f"{pusher} pushed {commit_count} commit(s) to {branch}."
        )

        # -------------------------------------------------------------
        # 3. EMIT REAL-TIME SOCKET EVENT TO ASSIGNED DEVELOPERS ONLY
        # -------------------------------------------------------------
        for dev_id, notif in created_notifications:
            db.refresh(notif)
            
            # Format time explicitly to avoid JSON serialization crash in socket engine
            created_at_iso = (
                notif.created_at.isoformat() 
                if hasattr(notif.created_at, "isoformat") 
                else str(notif.created_at)
            )

            socket_payload = {
                "id": notif.id,
                "repoId": repo_id,
                "repoName": repo_name,
                "pusher": pusher,
                "branch": branch,
                "title": notification_title,
                "message": notification_msg,
                "time": "Just now",
                "created_at": created_at_iso,
                "isRead": False,
                "actionRequired": True
            }

            print(f"📡 Dispatching live notification to Developer ID: {dev_id}")
            await emit_to_developer(dev_id, "repo_updated", socket_payload)

        # Emit Real-time Socket Event to Admin
        if admin_id:
            print(f"📡 Dispatching admin event to Admin ID: {admin_id}")
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

        print("✅ WEBHOOK PROCESSING COMPLETE SUCCESSFULLY")
        print("==================================================\n")
        return {"status": "success", "notified_developers": assigned_developer_ids}

    except Exception as e:
        print(f"❌ WEBHOOK PROCESSING ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return {"status": "error", "message": str(e)}