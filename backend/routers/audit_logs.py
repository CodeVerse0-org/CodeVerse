from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from db.connection import get_db

# Import your existing user dependency instead of manual jwt decoding
from routers.auth import get_current_user  # Adjust import path if auth is located elsewhere (e.g., utils.auth)

router = APIRouter()

@router.get("/api/audit-logs")
def get_all_audit_logs(current_user: dict = Depends(get_current_user)):
    """
    Fetches audit logs visible ONLY to the logged-in admin:
    1. Actions performed directly by or for this admin.
    2. Actions performed by developers assigned to repositories managed by this admin.
    """
    admin_id = current_user.get("user_id") or current_user.get("id")
    if not admin_id:
        raise HTTPException(status_code=401, detail="User identification missing from token.")

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT
                    a.id, 
                    a.admin_id, 
                    a.actor_id, 
                    a.target_user_id, 
                    a.action, 
                    a.repository_id, 
                    a.repository_name, 
                    a.details, 
                    a.created_at,
                    u.first_name,
                    u.last_name,
                    u.role
                FROM audit_logs a
                LEFT JOIN users u ON a.actor_id = u.id
                WHERE 
                    a.admin_id = %s 
                    OR a.actor_id = %s
                    OR a.actor_id IN (
                        SELECT ur.user_id 
                        FROM user_repositories ur 
                        WHERE ur.admin_id = %s
                    )
                ORDER BY a.created_at DESC
                """,
                (admin_id, admin_id, admin_id)
            )
            rows = cur.fetchall()
            
            logs = []
            for row in rows:
                first_name = row[9]
                last_name = row[10]
                role = row[11]
                
                if first_name and last_name:
                    role_str = f" ({role.capitalize()})" if role else ""
                    actor_name = f"{first_name} {last_name}{role_str}"
                elif first_name:
                    role_str = f" ({role.capitalize()})" if role else ""
                    actor_name = f"{first_name}{role_str}"
                else:
                    actor_name = "System Level"

                logs.append({
                    "id": row[0],
                    "admin_id": row[1],
                    "actor_id": row[2],
                    "target_user_id": row[3],
                    "action": row[4],
                    "repository_id": row[5],
                    "repository_name": row[6],
                    "details": row[7],
                    "created_at": row[8].isoformat() if row[8] else None,
                    "actor_name": actor_name
                })
                
            return logs

    except Exception as e:
        print("❌ API Error fetching audit logs:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve runtime trace metrics.")
    finally:
        conn.close()