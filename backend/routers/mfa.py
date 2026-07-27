from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pyotp

from db.connection import get_db
from utils.security import create_access_token
from services.audit_service import create_audit_log 

router = APIRouter()


class MFASetupRequest(BaseModel):
    user_id: int


class MFAVerifyRequest(BaseModel):
    user_id: int
    token: str


@router.get("/status/{user_id}")
def get_mfa_status(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT mfa_enabled FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(404, "User not found")

        return {"mfa_enabled": bool(row[0])}
    finally:
        cur.close()
        conn.close()


@router.post("/setup")
def mfa_setup(data: MFASetupRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        secret = pyotp.random_base32()
        otp_url = pyotp.totp.TOTP(secret).provisioning_uri(
            name=str(data.user_id),
            issuer_name="CodeVerse"
        )

        cur.execute(
            "UPDATE users SET mfa_secret=%s WHERE id=%s",
            (secret, data.user_id)
        )
        conn.commit()

        return {"otpauth_url": otp_url}
    finally:
        cur.close()
        conn.close()


@router.post("/verify")
def mfa_verify(data: MFAVerifyRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                mfa_secret,
                role,
                email,
                first_name,
                last_name
            FROM users
            WHERE id=%s
            """,
            (data.user_id,)
        )
        row = cur.fetchone()

        if not row or not row[0]:
            raise HTTPException(400, "MFA not initialized")

        secret, role, email, first_name, last_name = row
        totp = pyotp.TOTP(secret)

        if not totp.verify(data.token, valid_window=1):
            raise HTTPException(400, "Invalid MFA code")

        # Enable MFA
        cur.execute(
            "UPDATE users SET mfa_enabled=TRUE WHERE id=%s",
            (data.user_id,)
        )
        conn.commit()

        # FIXED: Replaced .trim() with .strip()
        full_name = f"{first_name or ''} {last_name or ''}".strip()
        create_audit_log(
            admin_id=data.user_id if role == "admin" else None,
            actor_id=data.user_id,
            action="MFA_ENABLED",
            details=f"{full_name} enabled Multi-Factor Authentication"
        )

        access_token = create_access_token({
            "sub": str(data.user_id),
            "role": role,
            "email": email,
            "mfa_verified": True
        })

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": role
        }
    finally:
        cur.close()
        conn.close()


@router.post("/disable")
def mfa_disable(data: MFASetupRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT role, first_name, last_name
            FROM users
            WHERE id=%s
            """,
            (data.user_id,)
        )
        user_row = cur.fetchone()

        if not user_row:
            raise HTTPException(404, "User not found")

        role, first_name, last_name = user_row

        cur.execute(
            "UPDATE users SET mfa_enabled=FALSE, mfa_secret=NULL WHERE id=%s",
            (data.user_id,)
        )
        conn.commit()

        full_name = f"{first_name or ''} {last_name or ''}".strip()
        create_audit_log(
            admin_id=data.user_id if role == "admin" else None,
            actor_id=data.user_id,
            action="MFA_DISABLED",
            details=f"{full_name} disabled Multi-Factor Authentication"
        )

        return {"message": "MFA disabled"}
    finally:
        cur.close()
        conn.close()