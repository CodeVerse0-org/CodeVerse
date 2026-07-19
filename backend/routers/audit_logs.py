# routers/audit_logs.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from db.connection import get_db

router = APIRouter()

@router.get("/api/audit-logs")
def get_all_audit_logs():
    """
    Fetches historical entry updates from the system audit log registry table
    with fully resolved human-readable individual identity details.
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
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
                ORDER BY a.created_at DESC
                """
            )
            rows = cur.fetchall()
            
            logs = []
            for row in rows:
                first_name = row[9]
                last_name = row[10]
                role = row[11]
                
                # Format clear human-readable actor name
                if first_name and last_name:
                    actor_name = f"{first_name} {last_name} ({role.capitalize()})"
                elif first_name:
                    actor_name = f"{first_name} ({role.capitalize()})"
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