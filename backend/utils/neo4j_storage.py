import os
import neo4j
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

class Neo4jStorage:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD")
        self._driver = None

    @property
    def driver(self):
        if self._driver is None:
            if not self.uri or not self.password:
                return None
            try:
                # FIX: Removed the deprecated TRUST_ALL_CERTIFICATES
                # For AuraDB, simple encrypted=True is usually enough.
                self._driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.username, self.password),
                    encrypted=True,
                    max_connection_lifetime=30 * 60
                )
                self._driver.verify_connectivity()
                print("✅ Neo4j: Connection Verified")
            except Exception as e:
                print(f"❌ Neo4j Connection Error: {e}")
                self._driver = None
        return self._driver

    def get_snapshot_graph(self, repo_name, commit_sha):
        if not self.driver: return None
        try:
            with self.driver.session() as session:
                return session.execute_read(self._fetch_snapshot_graph, repo_name, commit_sha)
        except Exception:
            return None

    @staticmethod
    def _fetch_snapshot_graph(tx, repo_name, commit_sha):
        query = """
        MATCH (r:Repository {full_name: $repo})<-[:FOR_REPOSITORY]-(g:GraphSnapshot {commit_sha: $sha})
        -[:HAS_FILE]->(f:File)
        OPTIONAL MATCH (f)-[:IMPORTS]->(f2:File)
        RETURN f.path AS source, collect(f2.path) AS targets
        """
        records = tx.run(query, repo=repo_name, sha=commit_sha)
        nodes, edges = set(), []
        for record in records:
            source = record["source"]
            nodes.add(source)
            for target in record["targets"]:
                if target:
                    nodes.add(target)
                    edges.append({"source": source, "target": target})
        if not nodes: return None
        return {
            "nodes": [{"id": n, "label": n.split("/")[-1]} for n in nodes],
            "edges": edges
        }

    def save_snapshot(self, developer_id, repo_name, installation_id, snapshot_id, commit_sha, nodes, edges):
        if not self.driver: return
        try:
            with self.driver.session() as session:
                session.execute_write(
                    self._create_snapshot, developer_id, repo_name, 
                    installation_id, snapshot_id, commit_sha, nodes, edges
                )
            print(f"✅ Neo4j: Saved Snapshot {snapshot_id}")
        except Exception as e:
            print(f"❌ Neo4j Save Error: {e}")

    @staticmethod
    def _create_snapshot(tx, dev_id, repo, inst_id, snap_id, sha, nodes, edges):
        tx.run("MERGE (d:Developer {id: $dev_id})", dev_id=dev_id)
        tx.run("MERGE (r:Repository {full_name: $repo}) SET r.installation_id = $inst_id", repo=repo, inst_id=inst_id)
        tx.run("CREATE (g:GraphSnapshot {id: $snap_id, commit_sha: $sha, created_at: datetime()})", snap_id=snap_id, sha=sha)
        tx.run("MATCH (d:Developer {id: $dev_id}), (g:GraphSnapshot {id: $snap_id}) MERGE (d)-[:GENERATED]->(g)", dev_id=dev_id, snap_id=snap_id)
        tx.run("MATCH (r:Repository {full_name: $repo}), (g:GraphSnapshot {id: $snap_id}) MERGE (g)-[:FOR_REPOSITORY]->(r)", repo=repo, snap_id=snap_id)
        
        for node in nodes:
            tx.run("MATCH (g:GraphSnapshot {id: $snap_id}) CREATE (f:File {path: $path, label: $label}) MERGE (g)-[:HAS_FILE]->(f)", 
                   snap_id=snap_id, path=node["id"], label=node["label"])
        for edge in edges:
            tx.run("MATCH (g:GraphSnapshot {id: $snap_id})-[:HAS_FILE]->(a:File {path: $source}), (g)-[:HAS_FILE]->(b:File {path: $target}) MERGE (a)-[:IMPORTS]->(b)", 
                   snap_id=snap_id, source=edge["source"], target=edge["target"])

neo4j_store = Neo4jStorage()