import asyncio
from db.connection import Neo4jConnection


def normalize_repo_name(repo_name: str) -> str:
    """Consistently normalizes repository identifiers (lowercased, stripped, no trailing slashes)."""
    if not repo_name:
        return ""
    cleaned = str(repo_name).strip().lower()
    return cleaned.strip("/")


def _sync_execute_query(query: str, params: dict):
    # Retrieve the active driver instance
    driver = Neo4jConnection.get_driver()
    with driver.session(database=None) as session:
        result = session.run(query, **params)
        
        if "RETURN" in query.upper():
            return [dict(record) for record in result]
        
        return result.consume()


async def save_chat_message(user_id: str, repo_name: str, session_id: str, user_msg: str, ai_msg: str):
    clean_user = str(user_id).strip()
    clean_repo = normalize_repo_name(repo_name)
    clean_session = str(session_id).strip()
    
    scoped_session_id = f"{clean_user}::{clean_repo}::{clean_session}"
    new_entry = f"\nUser: {user_msg}\nAssistant: {ai_msg}"

    query = """
    MERGE (u:User {id: $user_id})
    MERGE (r:Repository {name: $repo_name})
    
    MERGE (s:ChatSession {id: $scoped_session_id})
    ON CREATE SET 
        s.raw_session_id = $raw_session_id,
        s.history_text = $new_entry,
        s.created_at = timestamp(),
        s.owner_id = $user_id,
        s.repo_name = $repo_name
    ON MATCH SET 
        s.history_text = COALESCE(s.history_text, '') + $new_entry,
        s.updated_at = timestamp()

    MERGE (u)-[:HAS_SESSION]->(s)
    MERGE (s)-[:FOR_REPO]->(r)
    """

    params = {
        "user_id": clean_user,
        "repo_name": clean_repo,
        "scoped_session_id": scoped_session_id,
        "raw_session_id": clean_session,
        "new_entry": new_entry,
    }

    try:
        await asyncio.to_thread(_sync_execute_query, query, params)
    except Exception as e:
        print(f"❌ Neo4j Save Message Error: {e}")


async def get_user_repo_history(user_id: str, repo_name: str):
    clean_user = str(user_id).strip()
    clean_repo = normalize_repo_name(repo_name)
    
    query = """
    MATCH (u:User {id: $user_id})-[:HAS_SESSION]->(s:ChatSession)-[:FOR_REPO]->(r:Repository {name: $repo_name})
    RETURN s.raw_session_id AS sessionId, s.history_text AS history, s.created_at AS created_at
    ORDER BY s.created_at DESC
    """

    params = {
        "user_id": clean_user,
        "repo_name": clean_repo
    }

    try:
        results = await asyncio.to_thread(_sync_execute_query, query, params)
    except Exception as e:
        print(f"❌ Neo4j Fetch History Error: {e}")
        # Safe fallback: return empty list so the frontend doesn't crash with 500
        return []

    seen = set()
    unique_sessions = []
    
    for r in results:
        sid = r.get("sessionId") or ""
        if sid and sid not in seen:
            seen.add(sid)
            unique_sessions.append({
                "sessionId": sid,
                "history": r.get("history") or "",
                "created_at": r.get("created_at")
            })

    return unique_sessions


async def delete_chat_session(session_id: str, user_id: str, repo_name: str) -> bool:
    clean_user = str(user_id).strip()
    clean_repo = normalize_repo_name(repo_name)
    clean_session = str(session_id).strip()
    scoped_session_id = f"{clean_user}::{clean_repo}::{clean_session}"

    query = """
    MATCH (u:User {id: $user_id})-[:HAS_SESSION]->(s:ChatSession {id: $scoped_session_id})
    DETACH DELETE s
    """

    params = {
        "user_id": clean_user,
        "scoped_session_id": scoped_session_id
    }

    try:
        summary = await asyncio.to_thread(_sync_execute_query, query, params)
        return summary.counters.nodes_deleted > 0
    except Exception as e:
        print(f"❌ Neo4j Deletion Error: {e}")
        return False