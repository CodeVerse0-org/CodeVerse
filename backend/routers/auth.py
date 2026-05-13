from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import OAuth2PasswordBearer
from schemas.auth import SignupRequest, LoginRequest
from typing import Optional
from db.connection import get_db
from utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from utils.email_utils import send_otp_email
import psycopg2
import pyotp
from datetime import datetime, timedelta
import random

router = APIRouter()

# ✅ CRITICAL CHANGE: Added auto_error=False to stop FastAPI from auto-rejecting missing tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

@router.post("/signup-initiate")
def signup_initiate(data: SignupRequest):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            otp = str(random.randint(100000, 999999))
            expires_at = datetime.utcnow() + timedelta(minutes=10)

            cur.execute("""
                INSERT INTO users (
                    email, first_name, last_name, password_hash, role,
                    is_email_verified, email_otp, email_otp_expires,
                    mfa_enabled, mfa_secret
                )
                VALUES (%s, %s, %s, %s, %s, FALSE, %s, %s, FALSE, NULL)
                RETURNING id
            """, (
                data.email.lower(),
                data.first_name,
                data.last_name,
                hash_password(data.password),
                data.role.lower(),
                otp,
                expires_at
            ))

            user_id = cur.fetchone()
            
            try:
                send_otp_email(data.email, otp)
            except Exception as e:
                conn.rollback()
                print(f"❌ Email Dispatch Failed: {e}")
                raise HTTPException(
                    status_code=500, 
                    detail="Authentication server could not send verification email."
                )

            conn.commit()
            return {
                "message": "Verification code sent to email",
                "user_id": user_id,
                "email": data.email
            }

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()


@router.post("/login")
def login(data: LoginRequest):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, password_hash, role, is_email_verified,
                       mfa_enabled, mfa_secret
                FROM users
                WHERE email=%s AND role=%s
            """, (data.email.lower(), data.role.lower()))

            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=400, detail="Invalid credentials")

            user_id, password_hash, role, email_verified, mfa_enabled, mfa_secret = user

            if not verify_password(data.password, password_hash):
                raise HTTPException(status_code=400, detail="Invalid credentials")

            if not email_verified:
                raise HTTPException(status_code=403, detail="Please verify your email before login")

            if mfa_enabled:
                return {
                    "mfa_required": True,
                    "user_id": user_id,
                    "message": "Two-factor authentication required"
                }

            access_token = create_access_token({
                "sub": str(user_id),
                "role": role
            })

            return {
                "mfa_required": False,
                "user_id": user_id,
                "access_token": access_token,
                "token_type": "bearer"
            }
    finally:
        if conn:
            conn.close()

@router.post("/mfa-verify")
def verify_mfa(user_id: int, token: str):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT mfa_secret, role FROM users WHERE id=%s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="MFA not set up for this user")

            mfa_secret, role = user
            totp = pyotp.TOTP(mfa_secret)

            if not totp.verify(token, valid_window=1):
                raise HTTPException(status_code=400, detail="Invalid MFA token")

            access_token = create_access_token({"sub": str(user_id), "role": role})

            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
    finally:
        if conn:
            conn.close()

@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme)):
    # Since auto_error is False, we check manually for strict routes
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, first_name, last_name, email, role FROM users WHERE id=%s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return {
                "id": user[0], 
                "first_name": user[1], 
                "last_name": user[2], 
                "email": user[3], 
                "role": user[4]
            }
    finally:
        if conn:
            conn.close()

# ✅ CRITICAL CHANGE: Updated get_optional_user logic
def get_optional_user(token: Optional[str] = Depends(oauth2_scheme)):
    """
    Returns user data if token is present/valid, otherwise returns Guest.
    This replaces the 401 with a fallback 'public_user' identity.
    """
    # Check for empty tokens or string versions of null sent by frontend
    if not token or token in ["null", "undefined", "None"]:
        return {"id": "public_user", "role": "guest"}
    
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role", "user")
        return {"id": user_id, "role": role, "token": token}
    except Exception:
        # If token exists but is invalid/expired, still treat as guest
        return {"id": "public_user", "role": "guest"}