from db.connection import get_neo4j_driver

def get_file_summary_db(path: str):
    """
    Fetches the summary for a specific node using its unique ID.
    """
    driver = get_neo4j_driver()
    # We use the full path/ID sent from the frontend to be precise
    query = """
    MATCH (f:File {id: $path}) 
    RETURN f.summary AS summary
    """
    with driver.session() as session:
        result = session.run(query, path=path)
        record = result.single()
        return record["summary"] if record else None

def save_file_summary_db(path: str, summary: str):
    driver = get_neo4j_driver()
    # We match ONLY on 'id' because fullName and name are null in your DB
    query = """
    MATCH (f:File {id: $path})
    SET f.summary = $summary
    RETURN f.id AS id
    """
    with driver.session() as session:
        result = session.run(query, path=path, summary=summary)
        record = result.single()
        if record:
            print(f"✅ Success! Summary saved to: {record['id']}")
        else:
            print(f"❌ Failed! Could not find node with ID: {path}")