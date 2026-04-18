import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# -------------------------
# PostgreSQL CONNECTION
# -------------------------
def get_db():
    import psycopg2
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST"),
        port=os.getenv("POSTGRES_PORT")
    )

# -------------------------
# NEO4J (AURA SAFE VERSION)
# -------------------------
def get_neo4j_driver():
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")

    if not uri or not user or not password:
        raise ValueError("❌ Missing Neo4j environment variables")

    try:
        # ✅ Using +ssc in your .env was the key to passing the SSL block
        driver = GraphDatabase.driver(
            uri,
            auth=(user, password),
            connection_timeout=60.0,
            max_connection_lifetime=300.0,
        )

        # 🔥 Verify connectivity to the INSTANCE first
        driver.verify_connectivity()
        
        # ✅ FIX: Use database=None to let Aura resolve the 'Home' database
        # This prevents the 'DatabaseNotFound' error for 'neo4j'
        with driver.session(database=None) as session:
            result = session.run("RETURN 1 AS ok").single()
            if not result or result["ok"] != 1:
                raise Exception("Neo4j test query failed")

        print("✅ Neo4j connected successfully to Home database")
        return driver

    except Exception as e:
        print(f"❌ Neo4j connection failed: {e}")
        raise