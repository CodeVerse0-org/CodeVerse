import asyncio
from db.connection import Neo4jConnection

def _sync_execute_query(query, params):
    """
    Synchronous helper to execute Neo4j queries.
    This is wrapped in a thread to prevent blocking the async event loop.
    """
    driver = Neo4jConnection.get_driver()
    # database=None allows Aura to use the default 'neo4j' DB
    with driver.session(database=None) as session:
        result = session.run(query, **params)
        # For read queries, we need to consume the result while the session is open
        if "RETURN" in query.upper():
            return [dict(record) for record in result]
        return result.consume()

async def save_chat_message(user_id, repo_name, session_id, user_msg, ai_msg):
    """
    Saves a message pair to the ChatSession history.
    """
    new_entry = f"\nUser: {user_msg}\nAssistant: {ai_msg}"

    query = """
    MERGE (u:User {id: $user_id})
    MERGE (r:Repository {name: $repo_name})
    MERGE (s:ChatSession {id: $session_id})
    MERGE (u)-[:HAS_SESSION]->(s)
    MERGE (s)-[:FOR_REPO]->(r)
    
    ON CREATE SET 
        s.history_text = $new_entry,
        s.created_at = timestamp()
    
    ON MATCH SET 
        s.history_text = COALESCE(s.history_text, '') + $new_entry,
        s.created_at = timestamp()
    """
    
    params = {
        "user_id": user_id,
        "repo_name": repo_name,
        "session_id": session_id,
        "new_entry": new_entry
    }

    await asyncio.to_thread(_sync_execute_query, query, params)

async def get_user_repo_history(user_id, repo_name):
    """
    Retrieves all chat sessions for a specific user and repository.
    """
    query = """
    MATCH (u:User {id: $user_id})-[:HAS_SESSION]->(s:ChatSession)-[:FOR_REPO]->(r:Repository {name: $repo_name})
    RETURN s.id as sessionId, s.history_text as history, s.created_at as created_at
    ORDER BY s.created_at DESC
    """
    
    params = {"user_id": user_id, "repo_name": repo_name}
    
    results = await asyncio.to_thread(_sync_execute_query, query, params)
    
    return [
        {"sessionId": r["sessionId"], "history": r["history"] or ""}
        for r in results
    ]

async def delete_chat_session(session_id: str):
    """
    Deletes a specific chat session and its related messages.
    """
    query = """
    MATCH (s:ChatSession {id: $session_id})
    DETACH DELETE s
    """
    
    params = {"session_id": session_id}
    
    try:
        summary = await asyncio.to_thread(_sync_execute_query, query, params)
        # Check if any nodes were actually deleted
        return summary.counters.nodes_deleted > 0
    except Exception as e:
        print(f"❌ Neo4j Deletion Error: {e}")
        return False