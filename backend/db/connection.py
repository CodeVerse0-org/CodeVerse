import os

import psycopg2

from neo4j import GraphDatabase

from dotenv import load_dotenv



load_dotenv()





class Neo4jConnection:

    _driver = None



    @classmethod

    def get_driver(cls):

        if cls._driver is None:

            cls._driver = GraphDatabase.driver(

                os.getenv("NEO4J_URI"),

                auth=(

                    os.getenv("NEO4J_USER"),

                    os.getenv("NEO4J_PASSWORD"),

                ),

                connection_timeout=60,

                max_connection_pool_size=50,

                max_connection_lifetime=300,

            )



            cls._driver.verify_connectivity()

            print("✅ Neo4j Connected")



        return cls._driver





get_neo4j_driver = Neo4jConnection.get_driver





def get_db():

    database_url = os.getenv("PSYCOPG2_DATABASE_URL")



    if not database_url:

        raise Exception("PSYCOPG2_DATABASE_URL not found.")



    return psycopg2.connect(database_url)