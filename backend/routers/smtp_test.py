import socket
from fastapi import APIRouter

router = APIRouter(tags=["SMTP Test"])

@router.get("/smtp-test")
def smtp_test():
    try:
        socket.create_connection(("smtp.gmail.com", 587), timeout=10)
        return {"status": "connected"}
    except Exception as e:
        return {"error": repr(e)}