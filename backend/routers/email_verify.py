from fastapi import APIRouter, HTTPException
from db.connection import get_db
from datetime import datetime
from utils.security import create_access_token

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
        SELECT id, email_otp, email_otp_expires, role, mfa_enabled
        FROM users WHERE email=%s
    """, (email.lower(),))

    user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id, saved_otp, expires, role, mfa_enabled = user

    if saved_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > expires:
        raise HTTPException(status_code=400, detail="OTP expired")

    # Mark email verified
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

    # Create JWT
    access_token = create_access_token({
        "sub": str(user_id),
        "role": role
    })

    return {
        "access_token": access_token,
        "role": role,
        "mfa_enabled": mfa_enabled,
        "user_id": user_id
    }