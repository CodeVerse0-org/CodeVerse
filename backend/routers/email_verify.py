from fastapi import APIRouter, HTTPException
from db.connection import get_db
from datetime import datetime

router = APIRouter()

@router.post("/verify-email")
def verify_email(payload: dict):
    email = payload.get("email")
    otp = payload.get("otp")

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP required")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, email_otp, email_otp_expires
        FROM users WHERE email=%s
    """, (email.lower(),))

    user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id, saved_otp, expires = user

    if saved_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > expires:
        raise HTTPException(status_code=400, detail="OTP expired")

    cur.execute("""
        UPDATE users
        SET is_email_verified=TRUE,
            email_otp=NULL,
            email_otp_expires=NULL
        WHERE id=%s
    """, (user_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Email verified",
        "user_id": user_id
    }
