from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from schemas.auth import SignupRequest, LoginRequest
from db.connection import get_db
from utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from utils.email_utils import send_otp_email
import psycopg2
from datetime import datetime, timedelta
import random

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


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
                raise HTTPException(
                    status_code=500,
                    detail="Could not send verification email."
                )

            conn.commit()

            return {
                "message": "Verification code sent",
                "user_id": user_id,
                "email": data.email
            }

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

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

            user_id, password_hash, role, email_verified, mfa_enabled, _ = user

            if not verify_password(data.password, password_hash):
                raise HTTPException(status_code=400, detail="Invalid credentials")

            if not email_verified:
                raise HTTPException(status_code=403, detail="Verify email first")

            if mfa_enabled:
                return {
                    "mfa_required": True,
                    "user_id": user_id
                }

            access_token = create_access_token({
                "sub": str(user_id),
                "role": role,
                "mfa_verified": False
            })

            return {
                "mfa_required": False,
                "access_token": access_token,
                "token_type": "bearer"
            }

    finally:
        if conn:
            conn.close()


@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    mfa_verified = payload.get("mfa_verified", False)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT first_name, last_name, mfa_enabled FROM users WHERE id=%s",
                (user_id,)
            )
            user = cur.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            first_name, last_name, mfa_enabled = user

            if mfa_enabled and not mfa_verified:
                raise HTTPException(status_code=403, detail="MFA required")

            return {
                "first_name": first_name,
                "last_name": last_name
            }

    finally:
        if conn:
            conn.close()