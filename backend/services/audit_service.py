from db.connection import get_db


def create_audit_log(
    admin_id,
    actor_id,
    action,
    target_user_id=None,
    repository_id=None,
    repository_name=None,
    details=None
):
    conn = get_db()

    try:
        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO audit_logs
                (
                    admin_id,
                    actor_id,
                    target_user_id,
                    action,
                    repository_id,
                    repository_name,
                    details
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
                """,
                (
                    admin_id,
                    actor_id,
                    target_user_id,
                    action,
                    repository_id,
                    repository_name,
                    details
                )
            )

            log_id = cur.fetchone()[0]

            conn.commit()

            print(f"✅ Audit log created: {log_id}")

            return log_id

    except Exception as e:
        conn.rollback()
        print("❌ Audit Log Error:", e)
        return None

    finally:
        conn.close()