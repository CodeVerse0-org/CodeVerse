from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
import json

from db.session import get_db
from db.models import User, UserRepository, Notification
from services.socket_service import sio

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
        pusher = payload.get("pusher", {}).get("name")

        print("📁 Repo:", repo_name, repo_id)

        if not repo_id:
            return {"status": "missing repo id"}

        # -------------------
        # GET USERS LINKED TO REPO
        # -------------------
        links = db.query(UserRepository).filter(
            UserRepository.repo_id == repo_id
        ).all()

        print("👥 USERS FOUND:", len(links))

        if not links:
            return {"status": "no linked users"}

        # -------------------
        # CREATE NOTIFICATIONS
        # -------------------
        notifications = []

        for link in links:

            # validate user exists
            user = db.query(User).filter(User.id == link.user_id).first()
            if not user:
                print(f"❌ USER NOT FOUND: {link.user_id}")
                continue

            notifications.append(
                Notification(
                    user_id=link.user_id,
                    repo_id=repo_id,
                    title="Repository Updated",
                    message=f"{pusher} pushed code to {repo_name}",
                    event_type="push",
                    is_read=False
                )
            )

        db.add_all(notifications)
        db.commit()

        print("✅ Notifications saved")

        # -------------------
        # SOCKET EMIT
        # -------------------
        await sio.emit(
            "repo_updated",
            {
                "repoId": repo_id,
                "repoName": repo_name,
                "pusher": pusher,
                "message": f"{pusher} pushed changes"
            },
            room=f"repo_{repo_id}"
        )

        print(f"📡 Emitted to repo_{repo_id}")

        return {"status": "success"}

    except Exception as e:
        print("❌ WEBHOOK ERROR:", str(e))
        return {"status": "error", "message": str(e)}