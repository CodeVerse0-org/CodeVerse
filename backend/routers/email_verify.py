from fastapi import APIRouter, HTTPException
from db.connection import get_db
from datetime import datetime, timedelta, timezone
from utils.security import create_access_token
from utils.email_utils import send_otp_email
import random

router = APIRouter()

# ----------------------------------------------------------
# VERIFY EMAIL OTP
# ----------------------------------------------------------
@router.post("/verify-email")
def verify_email(payload: dict):
    email = payload.get("email")
    otp = payload.get("otp")

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP required")

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, email_otp, email_otp_expires, role, mfa_enabled
            FROM users WHERE email=%s
        """, (email.lower(),))

        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_id, saved_otp, expires, role, mfa_enabled = user

        if not saved_otp or saved_otp != otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")

        # Timezone-aware expiration check
        now = datetime.now(timezone.utc) if expires and expires.tzinfo else datetime.utcnow()
        if expires and now > expires:
            raise HTTPException(status_code=400, detail="OTP expired")

        # Mark email verified & clear used OTP
        cur.execute("""
            UPDATE users
            SET is_email_verified=TRUE,
                email_otp=NULL,
                email_otp_expires=NULL
            WHERE id=%s
        """, (user_id,))
        conn.commit()

        # Create JWT Access Token
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

    finally:
        cur.close()
        conn.close()


# ----------------------------------------------------------
# RESEND VERIFICATION OTP
# ----------------------------------------------------------
@router.post("/resend-otp")
def resend_otp(payload: dict):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, is_email_verified 
            FROM users WHERE email=%s
        """, (email.lower(),))

        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_id, is_email_verified = user

        if is_email_verified:
            raise HTTPException(status_code=400, detail="Email is already verified")

        # Generate fresh 6-digit OTP (10-minute expiry)
        otp = str(random.randint(100000, 999999))
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)

        cur.execute("""
            UPDATE users
            SET email_otp=%s,
                email_otp_expires=%s
            WHERE id=%s
        """, (otp, expires, user_id))

        conn.commit()

        # Dispatch email using email utility
        send_otp_email(email, otp)

        return {"message": "Verification OTP sent successfully"}

    finally:
        cur.close()
        conn.close()