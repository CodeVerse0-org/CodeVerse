import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Controls,
  Background,
  ReactFlowProvider,
  useReactFlow,
  MarkerType
} from "@xyflow/react";
import { ArrowLeft } from "lucide-react";
import "@xyflow/react/dist/style.css";

import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";
import GraphLoader from "../components/GraphLoader";
import NodeDetailPanel from "../components/NodeDetailPanel";

/* ---------------- WORKER ---------------- */
const workerCode = `
importScripts('https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js');

self.onmessage = function(e) {
  const { nodes, edges } = e.data;

  const g = new dagre.graphlib.Graph().setGraph({
    rankdir: "LR",
    nodesep: 120,
    ranksep: 250,
    marginx: 50,
    marginy: 50
  });

  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(n => g.setNode(n.id, { width: 200, height: 80 }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const layoutedNodes = nodes.map(n => ({
    ...n,
    position: {
      x: g.node(n.id).x,
      y: g.node(n.id).y
    }
  }));

  self.postMessage({ nodes: layoutedNodes, edges });
};
`;

/* ---------------- NODE STYLE ---------------- */
const nodeStyles = {
  backend: {
    background: "#1a0b0e",
    color: "#fb7185",
    border: "2px solid #fb7185",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "11px",
    fontWeight: "900",
    width: 200,
    textAlign: "center"
  },
  frontend: {
    background: "#0b161a",
    color: "#22d3ee",
    border: "2px solid #22d3ee",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "11px",
    fontWeight: "900",
    width: 200,
    textAlign: "center"
  }
};

const StateVisualizationContent = () => {
  const { fitView } = useReactFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { owner, repo } = useParams();

  const fullRepoName =
    owner && repo ? `${owner}/${repo}` : searchParams.get("repo") || "";

  const instId = searchParams.get("inst");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [displayData, setDisplayData] = useState({ nodes: [], edges: [] });
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);

  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const worker = useMemo(() => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  }, []);

  /* ---------------- FETCH GRAPH ---------------- */
  const fetchGraph = useCallback(async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/repos/generate-state-graph?full_repo=${encodeURIComponent(
          fullRepoName
        )}${instId ? `&installation_id=${instId}` : ""}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();

      const nodes = (data.nodes || []).map((n) => {
        const isState =
          n.data.type === "redux_state" || n.data.type === "prop";

        return {
          id: String(n.id),
          data: {
            label: n.data.label || "unknown",
            fullName: n.id,
            category: isState ? "backend" : "frontend",

            // 🔥 SINGLE SOURCE OF TRUTH
            content: n.data.content || "// Source code not available",
            summary: n.data.summary || "No AI analysis available."
          },
          style: nodeStyles[isState ? "backend" : "frontend"]
        };
      });

      const edges = (data.dependencies || []).map((d, i) => ({
        id: `e-${i}`,
        source: String(d.source),
        target: String(d.target),
        label: d.label || "FLOW",
        animated: true,
        style: { stroke: "#22d3ee", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#22d3ee" }
      }));

      setRawGraphData({ nodes, edges });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [API_URL, fullRepoName, instId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  /* ---------------- LAYOUT ---------------- */
  useEffect(() => {
    if (!rawGraphData.nodes.length) return;

    const filteredNodes =
      activeFilter === "all"
        ? rawGraphData.nodes
        : rawGraphData.nodes.filter(
            (n) => n.data.category === activeFilter
          );

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = rawGraphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    worker.postMessage({ nodes: filteredNodes, edges: filteredEdges });

    worker.onmessage = (e) => {
      setDisplayData(e.data);
      setIsDataReady(true);
      setLoading(false);
      setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
    };
  }, [activeFilter, rawGraphData, worker, fitView]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300">

      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">

        <DeveloperSidebar isOpen={isSidebarOpen} />

        <div className="flex-1 relative">

          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-50 text-white"
          >
            <ArrowLeft /> Back
          </button>

          {loading && <GraphLoader />}

          <ReactFlow
            nodes={displayData.nodes}
            edges={displayData.edges}

            onNodeClick={(_, node) =>
              setSelectedNode({
                ...node,
                data: {
                  ...node.data,
                  content: node.data.content
                }
              })
            }

            onNodeMouseEnter={(_, node) =>
              setHoveredNode({
                ...node,
                data: {
                  ...node.data,
                  content: node.data.content
                }
              })
            }

            onNodeMouseLeave={() => setHoveredNode(null)}
            onPaneClick={() => setSelectedNode(null)}
          >
            <Background />
            <Controls />
          </ReactFlow>

          <NodeDetailPanel
            activeNode={selectedNode || hoveredNode}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
          />
        </div>
      </div>
    </div>
  );
};

export default function StateVisualization() {
  return (
    <ReactFlowProvider>
      <StateVisualizationContent />
    </ReactFlowProvider>
  );
}