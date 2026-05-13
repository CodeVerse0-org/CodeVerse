import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

class Neo4jConnection:
    _driver = None

    @classmethod
    def get_driver(cls):
        if cls._driver is None:
            uri = os.getenv("NEO4J_URI")
            user = os.getenv("NEO4J_USER")
            password = os.getenv("NEO4J_PASSWORD")

            if not uri or not user or not password:
                raise ValueError("❌ Missing Neo4j environment variables")

            try:
                # Optimized for Aura (SSL + Connection Management)
                cls._driver = GraphDatabase.driver(
                    uri,
                    auth=(user, password),
                    connection_timeout=60.0,
                    max_connection_lifetime=300.0,
                    max_connection_pool_size=50 # Prevents exhaustion
                )
                cls._driver.verify_connectivity()
                print("✅ Neo4j Singleton Driver Initialized")
            except Exception as e:
                print(f"❌ Neo4j Connection Error: {e}")
                raise
        return cls._driver
# This creates a shortcut so your old code doesn't break
get_neo4j_driver = Neo4jConnection.get_driver

# PostgreSQL remains the same
def get_db():
    import psycopg2
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST"),
        port=os.getenv("POSTGRES_PORT")
    )