import os
import psycopg2
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Existing PostgreSQL connection for Users/Auth
def get_db():
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST"),
        port=os.getenv("POSTGRES_PORT")
    )

# NEW: Neo4j connection for Repository Visualization
def get_neo4j_driver():
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")
    
    driver = GraphDatabase.driver(uri, auth=(user, password))
    
    # ADD THIS LINE to catch the error early:
    try:
        driver.verify_connectivity()
        print("✅ Neo4j Handshake Successful")
    except Exception as e:
        print(f"❌ Neo4j Handshake Failed: {e}")
        
    return driver