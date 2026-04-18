# backend/routers/auth_reset.py

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import random
import bcrypt

from db.connection import get_db
from utils.email_utils import send_reset_password_email

router = APIRouter()

# ------------------------------
# SEND RESET OTP
# ------------------------------
@router.post("/reset-password")
def send_reset_otp(payload: dict):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    otp = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id FROM users WHERE email=%s
    """, (email.lower(),))
    user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cur.execute("""
        UPDATE users
        SET reset_otp=%s,
            reset_otp_expires=%s
        WHERE email=%s
    """, (otp, expires, email.lower()))

    conn.commit()
    cur.close()
    conn.close()

    send_reset_password_email(email, otp)

    return {"message": "Reset OTP sent to email"}


# ------------------------------
# VERIFY OTP & RESET PASSWORD
# ------------------------------
@router.post("/reset-password/confirm")
def confirm_reset(payload: dict):
    email = payload.get("email")
    otp = payload.get("otp")
    password = payload.get("password")

    if not email or not otp or not password:
        raise HTTPException(status_code=400, detail="All fields required")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, reset_otp, reset_otp_expires
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

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    cur.execute("""
        UPDATE users
        SET password_hash=%s,
            reset_otp=NULL,
            reset_otp_expires=NULL
        WHERE id=%s
    """, (hashed, user_id))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Password reset successful"}