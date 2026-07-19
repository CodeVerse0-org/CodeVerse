from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, validator
import psycopg2
import re

# Correct imports based on your project structure
from db.connection import get_db 
from utils.security import decode_access_token, verify_password, hash_password
from services.audit_service import create_audit_log

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
        
        # Fetch current names and role before changing them for granular diff logging
        cur.execute("""
            SELECT first_name, last_name, role 
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user_row = cur.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User record not found")
            
        old_first, old_last, role = user_row
        
        # Execute update using your existing database column names
        cur.execute("""
            UPDATE users 
            SET first_name = %s, last_name = %s 
            WHERE id = %s
        """, (data.firstName, data.lastName, user_id))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="User record not found")
        
        # Track the specific items changed
        changes = []
        if old_first != data.firstName:
            changes.append(f"First Name: '{old_first}' → '{data.firstName}'")
        if old_last != data.lastName:
            changes.append(f"Last Name: '{old_last}' → '{data.lastName}'")
            
        # Fallback text string detail context if no change was truly detected
        change_details = ", ".join(changes) if changes else "No structural field modifications detected."
        
        # Create descriptive profile update log entry
        create_audit_log(
            admin_id=int(user_id) if role == "admin" else None,
            actor_id=int(user_id),
            action="PROFILE_UPDATED",
            details=f"{old_first} {old_last} updated profile. {change_details}"
        )
            
        conn.commit()
        return {"status": "success", "message": "Identity records updated in database"}
        
    except HTTPException as he:
        if conn: conn.rollback()
        raise he
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

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # 1. Fetch current details from DB including role, first_name, and last_name
        cur.execute("""
            SELECT password_hash, role, first_name, last_name 
            FROM users 
            WHERE id = %s
        """, (user_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
            
        db_password_hash, role, first_name, last_name = result

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
        
        # Create natural language security credential update log
        create_audit_log(
            admin_id=int(user_id) if role == "admin" else None,
            actor_id=int(user_id),
            action="PASSWORD_CHANGED",
            details=f"{first_name} {last_name} changed account password"
        )
        
        conn.commit()
        return {"status": "success", "message": "Security credentials updated"}

    except HTTPException as he:
        if conn: conn.rollback()
        raise he
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        if cur: cur.close()
        if conn: conn.close()