from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from schemas.auth import SignupRequest, LoginRequest
from db.connection import get_db
from utils.security import hash_password, verify_password, create_access_token, decode_access_token
import psycopg2
import pyotp

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# -------------------
# Signup endpoint
# -------------------
@router.post("/signup")
def signup(data: SignupRequest):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO users (email, first_name, last_name, password_hash, role, mfa_enabled, mfa_secret)
            VALUES (%s, %s, %s, %s, %s, FALSE, NULL)
            RETURNING id
            """,
            (
                data.email.lower(),
                data.first_name,
                data.last_name,
                hash_password(data.password),
                data.role.lower()
            ),
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return {"user_id": user_id, "mfa_required": True}
    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# -------------------
# Login endpoint
# -------------------
@router.post("/login")
def login(data: LoginRequest):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, password_hash, role, mfa_enabled, mfa_secret
            FROM users
            WHERE email=%s AND role=%s
            """,
            (data.email.lower(), data.role.lower())
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        user_id, password_hash, role, mfa_enabled, mfa_secret = user

        if not verify_password(data.password, password_hash):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        # Enforce MFA for developers every login
        if role.lower() == "developer":
            if not mfa_enabled or not mfa_secret:
                # First-time MFA setup: generate secret
                mfa_secret = pyotp.random_base32()
                cur.execute(
                    "UPDATE users SET mfa_secret=%s, mfa_enabled=TRUE WHERE id=%s",
                    (mfa_secret, user_id)
                )
                conn.commit()
            return {"mfa_required": True, "user_id": user_id}

        # For admin, normal login with token
        access_token = create_access_token({"sub": str(user_id), "role": role})
        return {
            "mfa_required": False,
            "user_id": user_id,
            "access_token": access_token,
            "token_type": "bearer"
        }

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# -------------------
# MFA verification endpoint
# -------------------
@router.post("/mfa-verify")
def verify_mfa(user_id: int, code: str):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT mfa_secret, role FROM users WHERE id=%s",
            (user_id,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        mfa_secret, role = user

        totp = pyotp.TOTP(mfa_secret)
        if not totp.verify(code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid MFA code")

        # MFA passed, generate JWT
        access_token = create_access_token({"sub": str(user_id), "role": role})
        return {"access_token": access_token, "token_type": "bearer"}

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# -------------------
# Get current user
# -------------------
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
        cur.execute(
            "SELECT first_name, last_name, email FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        first_name, last_name, email = user
        return {"first_name": first_name, "last_name": last_name, "email": email}

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

