import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";

const GraphVisualizerPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const repoName = searchParams.get("repo");
  const timestamp = searchParams.get("timestamp");
  const graphTypeParam = searchParams.get("graphType") || "file";

  const [graphType, setGraphType] = useState(graphTypeParam);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const url = `http://localhost:8000/api/repos/graph-history/${repoName}?graph_type=${graphType}&timestamp=${timestamp}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      setGraphData({
        nodes: data.nodes || [],
        links: data.links || []
      });

    } catch (err) {
      console.error("Graph Fetch Error:", err);
    } finally {
      setLoading(false);
    }

  }, [repoName, timestamp, graphType]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return (
    <div className="h-screen flex flex-col bg-black text-white">

      <div className="p-4 flex items-center gap-4 border-b">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <div>
          <h2>{decodeURIComponent(repoName)}</h2>
          <p className="text-xs text-gray-400">{timestamp}</p>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex justify-center items-center bg-black/60">
            <Loader2 className="animate-spin" />
          </div>
        )}

        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node) => node.data?.label || node.id}
        />
      </div>
    </div>
  );
};

export default GraphVisualizerPage;