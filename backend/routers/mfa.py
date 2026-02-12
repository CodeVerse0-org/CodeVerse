from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_db
import pyotp
from utils.security import create_access_token

router = APIRouter()

class MFASetupRequest(BaseModel):
    user_id: int

class MFAVerifyRequest(BaseModel):
    user_id: int
    token: str

@router.post("/setup")
def setup_mfa(data: MFASetupRequest):
    conn = get_db()
    cur = conn.cursor()

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)

    otpauth_url = totp.provisioning_uri(
        name=f"CodeVerse:{data.user_id}",
        issuer_name="CodeVerse"
    )

    cur.execute("""
        UPDATE users
        SET mfa_secret=%s, mfa_enabled=FALSE
        WHERE id=%s
    """, (secret, data.user_id))
    conn.commit()

    cur.close()
    conn.close()

    return { "otpauth_url": otpauth_url }

@router.post("/verify")
def verify_mfa(data: MFAVerifyRequest):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT mfa_secret, role FROM users WHERE id=%s", (data.user_id,))
    row = cur.fetchone()

    if not row:
        raise HTTPException(404, "User not found")

    secret, role = row
    totp = pyotp.TOTP(secret)

    if not totp.verify(data.token, valid_window=1):
        raise HTTPException(400, "Invalid MFA code")

    cur.execute("UPDATE users SET mfa_enabled=TRUE WHERE id=%s", (data.user_id,))
    conn.commit()

    access_token = create_access_token({
        "sub": str(data.user_id),
        "role": role
    })

    cur.close()
    conn.close()

    return { "access_token": access_token }
@router.post("/disable")
def disable_mfa(data: MFASetupRequest): # Re-using the same schema with user_id
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE users 
        SET mfa_enabled = FALSE, mfa_secret = NULL 
        WHERE id = %s
    """, (data.user_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"message": "MFA disabled successfully"}
@router.get("/status/{user_id}")
def get_mfa_status(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT mfa_enabled FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return {"mfa_enabled": False}
    return {"mfa_enabled": row[0]}