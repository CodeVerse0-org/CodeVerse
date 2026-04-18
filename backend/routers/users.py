from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, validator
import psycopg2
import re

# Correct imports based on your project structure
from db.connection import get_db 
from utils.security import decode_access_token, verify_password, hash_password

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# =====================================================
# REQUEST SCHEMAS (Validation)
# =====================================================
class NameUpdate(BaseModel):
    firstName: str
    lastName: str

class PasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str

    @validator('newPassword')
    def password_complexity(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r"[A-Z]", v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r"\d", v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError('Password must contain at least one special character')
        return v

# =====================================================
# UPDATE USER NAME (FIRST & LAST)
# =====================================================
@router.post("/update-name")
def update_user_name(data: NameUpdate, token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Execute update using your existing database column names
        cur.execute("""
            UPDATE users 
            SET first_name = %s, last_name = %s 
            WHERE id = %s
        """, (data.firstName, data.lastName, user_id))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="User record not found")
            
        conn.commit()
        return {"status": "success", "message": "Identity records updated in database"}
        
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    finally:
        if cur: cur.close()
        if conn: conn.close()

# =====================================================
# CHANGE PASSWORD (WITH SECURITY CHECKS)
# =====================================================
@router.post("/change-password")
def change_password(data: PasswordUpdate, token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # 1. Fetch current hashed password from DB
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
            
        db_password_hash = result[0]

        # 2. VERIFY: Compare entered current password with DB hash
        if not verify_password(data.currentPassword, db_password_hash):
            # This triggers the "Wrong Password" alert on your frontend
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="The current password you entered is incorrect."
            )

        # 3. PREVENT: Check if new password is same as old
        if data.currentPassword == data.newPassword:
            raise HTTPException(
                status_code=400, 
                detail="New password cannot be the same as the old password."
            )

        # 4. UPDATE: Hash new password and save
        hashed_new_password = hash_password(data.newPassword)
        cur.execute("""
            UPDATE users 
            SET password_hash = %s 
            WHERE id = %s
        """, (hashed_new_password, user_id))
        
        conn.commit()
        return {"status": "success", "message": "Security credentials updated"}

    except HTTPException as he:
        # Re-raise HTTP exceptions so FastAPI handles them
        raise he
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        if cur: cur.close()
        if conn: conn.close()