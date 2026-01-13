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
import pyotp
from datetime import datetime, timedelta
import random

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# =====================================================
# SIGNUP INITIATE → SEND EMAIL OTP
# =====================================================
@router.post("/signup-initiate")
def signup_initiate(data: SignupRequest):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        otp = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        cur.execute("""
            INSERT INTO users (
                email, first_name, last_name, password_hash, role,
                is_email_verified, email_otp, email_otp_expires,
                mfa_enabled, mfa_secret
            )
            VALUES (%s,%s,%s,%s,%s,FALSE,%s,%s,FALSE,NULL)
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

        user_id = cur.fetchone()[0]
        conn.commit()

        # SEND EMAIL OTP
        send_otp_email(data.email, otp)

        return {
            "message": "Verification code sent to email",
            "user_id": user_id,
            "email": data.email
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        if cur: cur.close()
        if conn: conn.close()


# =====================================================
# LOGIN (BLOCKED UNTIL EMAIL VERIFIED)
# =====================================================
@router.post("/login")
def login(data: LoginRequest):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

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
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before login"
            )

        # =============================
        # MFA REQUIRED FOR DEVELOPERS
        # =============================
        if role.lower() == "developer":
            if not mfa_enabled or not mfa_secret:
                mfa_secret = pyotp.random_base32()
                cur.execute("""
                    UPDATE users
                    SET mfa_secret=%s, mfa_enabled=TRUE
                    WHERE id=%s
                """, (mfa_secret, user_id))
                conn.commit()

            return {
                "mfa_required": True,
                "user_id": user_id
            }

        # =============================
        # ADMIN LOGIN (NO MFA)
        # =============================
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
        if cur: cur.close()
        if conn: conn.close()


# =====================================================
# MFA VERIFY → JWT
# =====================================================
@router.post("/mfa-verify")
def verify_mfa(user_id: int, token: str):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT mfa_secret, role
            FROM users WHERE id=%s
        """, (user_id,))

        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        mfa_secret, role = user
        totp = pyotp.TOTP(mfa_secret)

        if not totp.verify(token, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid MFA token")

        access_token = create_access_token({
            "sub": str(user_id),
            "role": role
        })

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    finally:
        if cur: cur.close()
        if conn: conn.close()


# =====================================================
# GET CURRENT USER
# =====================================================
@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        # UPDATED: Added 'id' to the SELECT statement
        cur.execute("""
            SELECT id, first_name, last_name, email
            FROM users WHERE id=%s
        """, (user_id,))

        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # UPDATED: Included "id" in the response dictionary
        return {
            "id": user[0],
            "first_name": user[1],
            "last_name": user[2],
            "email": user[3]
        }

    finally:
        if cur: cur.close()
        if conn: conn.close()