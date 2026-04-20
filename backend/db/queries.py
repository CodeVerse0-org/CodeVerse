from datetime import datetime
from db.connection import get_neo4j_driver

def get_file_summary_db(path: str, user_id: str):
    driver = get_neo4j_driver()
    query = """
    MATCH (f {id: $path})
    MATCH (r:Repository)-[:HAS_GRAPH]->(g:Graph)
    WHERE (r.user_id = $user_id OR r.user_id = toInteger($user_id))
      AND (g)-[:HAS_FILE|CONTAINS_FUNCTION]->(f)
    RETURN f.summary AS summary
    """
    with driver.session() as session:
        result = session.run(query, path=path, user_id=user_id)
        record = result.single()
        return record["summary"] if record else None

def save_file_summary_db(path: str, summary: str, user_id: str):
    driver = get_neo4j_driver()
    timestamp = datetime.now().isoformat()
    
    query = """
    MATCH (f {id: $path})
    MATCH (r:Repository)-[:HAS_GRAPH]->(g:Graph)
    WHERE (r.user_id = $user_id OR r.user_id = toInteger($user_id))
      AND (g)-[:HAS_FILE|CONTAINS_FUNCTION]->(f)
    SET f.summary = $summary,
        f.summary_generated_at = $timestamp
    RETURN f.id AS id, f.summary_generated_at AS timestamp
    """
    with driver.session() as session:
        try:
            result = session.run(
                query, 
                path=path, 
                summary=summary, 
                user_id=user_id, 
                timestamp=timestamp
            )
            record = result.single()
            if record:
                print(f"✅ Summary saved: {record['id']} at {record['timestamp']}")
                return record
            return None
        except Exception as e:
            print(f"❌ Neo4j Save Error: {e}")
            return None

def get_all_user_summaries(user_id: str):
    driver = get_neo4j_driver()
    query = """
    MATCH (r:Repository)-[:HAS_GRAPH]->(g:Graph)-[:HAS_FILE|CONTAINS_FUNCTION]->(f)
    WHERE (r.user_id = $user_id OR r.user_id = toInteger($user_id))
      AND f.summary IS NOT NULL
    RETURN 
        r.name AS repo_name, 
        f.id AS path, 
        coalesce(f.label, f.name, 'File') AS filename, 
        f.summary AS summary, 
        coalesce(f.summary_generated_at, g.timestamp) AS timestamp
    ORDER BY timestamp DESC
    """
    with driver.session() as session:
        try:
            result = session.run(query, user_id=user_id)
            return [dict(record) for record in result]
        except Exception as e:
            print(f"❌ Neo4j History Query Error: {e}")
            return []