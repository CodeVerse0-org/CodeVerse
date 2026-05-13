from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pyotp
from db.connection import get_db

# ✅ FIXED: use SAME token system
from utils.security import create_access_token

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

    cur.execute("SELECT mfa_enabled FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()

    if not row:
        raise HTTPException(404, "User not found")

    return {"mfa_enabled": row[0]}


@router.post("/setup")
def mfa_setup(data: MFASetupRequest):
    conn = get_db()
    cur = conn.cursor()

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

    cur.close()
    conn.close()

    return {"otpauth_url": otp_url}


@router.post("/verify")
def mfa_verify(data: MFAVerifyRequest):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT mfa_secret, role, email FROM users WHERE id=%s",
        (data.user_id,)
    )
    row = cur.fetchone()

    if not row or not row[0]:
        raise HTTPException(400, "MFA not initialized")

    secret, role, email = row
    totp = pyotp.TOTP(secret)

    if not totp.verify(data.token, valid_window=1):
        raise HTTPException(400, "Invalid MFA code")

    # enable MFA
    cur.execute(
        "UPDATE users SET mfa_enabled=TRUE WHERE id=%s",
        (data.user_id,)
    )
    conn.commit()

    cur.close()
    conn.close()

    # ✅ FIXED TOKEN
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


@router.post("/disable")
def mfa_disable(data: MFASetupRequest):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "UPDATE users SET mfa_enabled=FALSE, mfa_secret=NULL WHERE id=%s",
        (data.user_id,)
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "MFA disabled"}