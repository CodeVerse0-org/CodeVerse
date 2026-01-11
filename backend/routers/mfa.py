from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_db
import pyotp
import logging

router = APIRouter()
logging.basicConfig(level=logging.INFO)

class MFASetupRequest(BaseModel):
    user_id: int

class MFAVerifyRequest(BaseModel):
    user_id: int
    token: str

@router.post("/setup")
def mfa_setup(data: MFASetupRequest):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        # Generate secret
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        otpauth_url = totp.provisioning_uri(
            name=f"CodeVerse:{data.user_id}", issuer_name="CodeVerse"
        )

        # Save secret to DB
        cur.execute("UPDATE users SET mfa_secret=%s, mfa_enabled=FALSE WHERE id=%s", (secret, data.user_id))
        conn.commit()

        return {"otpauth_url": otpauth_url, "secret": secret}  # return secret for debugging

    finally:
        if cur: cur.close()
        if conn: conn.close()

@router.post("/verify")
def mfa_verify(data: MFAVerifyRequest):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("SELECT mfa_secret, role FROM users WHERE id=%s", (data.user_id,))
        row = cur.fetchone()
        if not row or not row[0]:
            raise HTTPException(status_code=400, detail="MFA not initialized")

        secret, role = row
        totp = pyotp.TOTP(secret)

        # Allow 1 step window before/after to handle small clock differences
        if not totp.verify(data.token, valid_window=1):
            logging.warning(f"Invalid MFA token for user {data.user_id}")
            logging.info(f"Expected token: {totp.now()}, Provided token: {data.token}")
            raise HTTPException(status_code=400, detail="Invalid MFA code")

        # enable MFA
        cur.execute("UPDATE users SET mfa_enabled=TRUE WHERE id=%s", (data.user_id,))
        conn.commit()

        from utils.security import create_access_token
        access_token = create_access_token({"sub": str(data.user_id), "role": role})

        return {"access_token": access_token, "token_type": "bearer"}

    finally:
        if cur: cur.close()
        if conn: conn.close()
