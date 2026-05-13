import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, Files, GitBranch, Share2 } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";

const GraphVisualizerPage = () => {
  const { owner, repo } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const repoName = `${owner}/${repo}`;
  const timestamp = searchParams.get("timestamp"); // Optional for history
  const [graphType, setGraphType] = useState("file"); // Default to file
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  // ... (imports remain the same)

// ... (imports remain the same)

const fetchGraph = useCallback(async () => {
  setLoading(true);

  try {
    const token = localStorage.getItem("token");

    const url = `http://localhost:8000/api/repos/graph-history/${owner}/${repo}?graph_type=${graphType}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Graph load failed");

    const data = await res.json();

    setGraphData({
      nodes: data.nodes || [],
      links: (data.dependencies || []).map(d => ({
        source: d.source,
        target: d.target_full || d.target
      }))
    });

  } catch (err) {
    console.error("Graph error:", err);
    setGraphData({ nodes: [], links: [] }); // safe fallback
  } finally {
    setLoading(false);
  }
}, [owner, repo, graphType]);
  return (
    <div className="h-screen flex flex-col bg-[#020408] text-white">
      {/* Header & Controls */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-[#0d1117]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="hover:text-cyan-500 transition-colors">
            <ArrowLeft />
          </button>
          <div>
            <h2 className="font-bold text-lg">{repoName}</h2>
            <p className="text-xs text-gray-400 capitalize">Viewing: {graphType} Graph</p>
          </div>
        </div>

        {/* Tab Switcher for 3 Graphs */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
          {[
            { id: "file", icon: <Files size={14}/>, label: "File" },
            { id: "function", icon: <GitBranch size={14}/>, label: "Function" },
            { id: "state", icon: <Share2 size={14}/>, label: "State" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setGraphType(tab.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                graphType === tab.id ? "bg-cyan-500 text-black" : "hover:bg-white/5 text-gray-400"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_#111_0%,_#000_100%)]">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col justify-center items-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="animate-spin text-cyan-500 mb-2" size={40} />
            <p className="text-cyan-500 animate-pulse">Loading {graphType} structure...</p>
          </div>
        )}

        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node) => node.data?.label || node.id}
          nodeColor={() => "#06b6d4"}
          linkColor={() => "#ffffff33"}
          nodeRelSize={6}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>
    </div>
  );
};

export default GraphVisualizerPage;