from neo4j import GraphDatabase
import os

driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"), 
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)

async def save_chat_message(user_id, repo_name, session_id, user_msg, ai_msg):
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

    with driver.session() as session:
        session.run(
            query,
            user_id=user_id,
            repo_name=repo_name,
            session_id=session_id,
            new_entry=new_entry
        )

async def get_user_repo_history(user_id, repo_name):
    query = """
    MATCH (u:User {id: $user_id})-[:HAS_SESSION]->(s:ChatSession)-[:FOR_REPO]->(r:Repository {name: $repo_name})
    RETURN s.id as sessionId, s.history_text as history, s.created_at as created_at
    ORDER BY s.created_at DESC
    """

    with driver.session() as session:
        result = session.run(query, user_id=user_id, repo_name=repo_name)

        sessions = [
            {
                "sessionId": record["sessionId"],
                "history": record["history"] or ""
            }
            for record in result
        ]

        return sessions
    
async def delete_chat_session(session_id: str):
    # We target 'id' as the property key based on your database check
    query = """
    MATCH (s {id: $session_id})
    OPTIONAL MATCH (s)-[:HAS_MESSAGE]->(m)
    DETACH DELETE s, m
    """
    try:
        with driver.session() as session:
            result = session.run(query, session_id=session_id)
            summary = result.consume()
            
            if summary.counters.nodes_deleted > 0:
                print(f"✅ Deleted session {session_id} and associated messages.")
                return True
            else:
                print(f"⚠️ No session found with id: {session_id}")
                return False
    except Exception as e:
        print(f"❌ Neo4j Deletion Error: {e}")
        return False