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
import { ArrowLeft, Search, FileText } from "lucide-react";
import "@xyflow/react/dist/style.css";

import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";
import BubbleNode from "../components/BubbleNode";
import GraphLoader from "../components/GraphLoader";
import NodeDetailPanel from "../components/NodeDetailPanel";
import GraphSwitchNavbar from "../components/GraphSwitchNavbar";

const nodeTypes = { bubble: BubbleNode };

/* ---------------- STRICT 3-TIER DAGRE WORKER ---------------- */
const workerCode = `
importScripts('https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js');

self.onmessage = function(e) {
  console.log("🔍 [Dagre Worker] Received layout task:", e.data);
  const { nodes, edges } = e.data;
  if (!nodes || nodes.length === 0) {
    console.warn("⚠️ [Dagre Worker] No nodes provided to worker layout.");
    self.postMessage({ nodes: [], edges: [] });
    return;
  }

  const g = new dagre.graphlib.Graph().setGraph({
    rankdir: "TB",
    nodesep: 140,
    ranksep: 220,
    marginx: 100,
    marginy: 100
  });

  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => {
    const category = (n.data?.category || "").toLowerCase();
    let rank = "min";

    if (category.includes("api") || category.includes("endpoint")) {
      rank = "same"; 
    } else if (category.includes("backend") || category.includes("server") || category.includes("controller")) {
      rank = "max";  
    }

    g.setNode(n.id, {
      width: 180,
      height: 180,
      rank: rank
    });
  });

  edges.forEach((e) => {
    if (e.source && e.target && g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((n) => {
    const dagreNode = g.node(n.id);
    return {
      ...n,
      position: {
        x: dagreNode ? dagreNode.x - 80 : Math.random() * 300,
        y: dagreNode ? dagreNode.y - 80 : Math.random() * 300
      }
    };
  });

  self.postMessage({
    nodes: layoutedNodes,
    edges
  });
};
`;

const ApiVisualizationContent = () => {
  const { fitView } = useReactFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { owner, repo } = useParams();

  const fullRepoName = (owner && repo) 
    ? `${owner}/${repo}` 
    : searchParams.get("repo") || "";
    
  const instId = searchParams.get("inst");

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_state");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [rawNodes, setRawNodes] = useState([]);
  const [rawEdges, setRawEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const searchRef = useRef(null);

  const worker = useMemo(() => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  }, []);

  useEffect(() => {
    return () => {
      worker.terminate();
    };
  }, [worker]);

  useEffect(() => {
    localStorage.setItem("sidebar_state", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isDataReady) {
      const timer = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isDataReady]);

  const filteredNodes = useMemo(() => {
    if (activeFilter === "all") return rawNodes;
    return rawNodes.filter((n) => {
      const cat = (n.data?.category || "").toLowerCase();
      return cat === activeFilter.toLowerCase();
    });
  }, [rawNodes, activeFilter]);

  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return rawEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [filteredNodes, rawEdges]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return rawNodes
      .filter((n) => {
        const label = n.data?.label?.toLowerCase() || "";
        const file = n.data?.fileName?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return label.includes(query) || file.includes(query);
      })
      .slice(0, 6);
  }, [searchQuery, rawNodes]);

  const jumpToNode = (node) => {
    setSelectedNode(node);
    setSearchQuery("");
    setShowSuggestions(false);
    fitView({ nodes: [node], duration: 1000, padding: 1.5 });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to extract clean backend filename from route/ID/data
  const extractBackendFileName = (nodeData, id) => {
    if (nodeData?.fileName) return nodeData.fileName;
    if (nodeData?.file) return nodeData.file;
    if (nodeData?.handlerFile) return nodeData.handlerFile;
    if (nodeData?.controller) return nodeData.controller;

    // Smart extraction based on endpoint path
    const pathStr = nodeData?.endpoint || nodeData?.path || id || "";
    if (pathStr.includes("posts")) return "postRoutes.js";
    if (pathStr.includes("user") || pathStr.includes("avatar")) return "userRoutes.js";
    if (pathStr.includes("auth") || pathStr.includes("login")) return "authRoutes.js";
    if (pathStr.includes("upload") || pathStr.includes("image")) return "uploadRoutes.js";

    if (id && id.includes("/")) {
      const lastPart = id.split("/").pop();
      if (lastPart.includes(".")) return lastPart;
    }

    return "server.js";
  };

  const fetchApiGraph = useCallback(() => {
    try {
      let cachedRaw = sessionStorage.getItem("api_graph");

      if (!cachedRaw) {
        const allGraphs = sessionStorage.getItem("all_graphs");
        if (allGraphs) {
          const parsedAll = JSON.parse(allGraphs);
          cachedRaw = JSON.stringify(parsedAll.api_graph || {});
        }
      }

      if (!cachedRaw || cachedRaw === "{}") {
        setLoading(false);
        return;
      }

      const data = JSON.parse(cachedRaw);
      const inputNodes = data.nodes || [];
      const inputEdges = data.edges || data.dependencies || [];

      // Map nodes with parsed backend file names
      const mappedNodes = inputNodes.map((n) => {
        let rawCategory = (n.data?.category || n.type || "").toLowerCase();
        let category = "frontend";

        if (rawCategory.includes("api") || rawCategory.includes("endpoint") || n.data?.method || n.data?.httpMethod) {
          category = "api_endpoint";
        } else if (rawCategory.includes("backend") || rawCategory.includes("server") || rawCategory.includes("controller")) {
          category = "backend";
        } else {
          category = "frontend";
        }

        let endpointRoute = n.data?.endpoint || n.data?.path || n.data?.route || n.data?.label || "";
        if (!endpointRoute) {
          endpointRoute = n.id?.startsWith("/") ? n.id : n.id?.split("/").pop() || n.id;
        }

        // Extract backend filename
        const backendFileName = extractBackendFileName(n.data, n.id);

        return {
          id: String(n.id),
          type: "bubble",
          position: { x: 0, y: 0 },
          data: {
            label: category === "frontend" ? (n.data?.label || n.id) : backendFileName,
            endpointRoute: endpointRoute,
            fileName: backendFileName,
            fullName: n.id,
            category: category,
            httpMethod: n.data?.httpMethod || n.data?.method || (category === "api_endpoint" ? "GET" : ""),
            codeSnippet: n.data?.content || "// No snippet available",
            imports: []
          }
        };
      });

      const mappedEdges = inputEdges.map((e, i) => {
        const isHandledBy = e.label === "HANDLED_BY" || e.type === "HANDLED_BY";
        const labelText = isHandledBy ? "HANDLED_BY" : "CALLS_API";
        const edgeColor = isHandledBy ? "#10b981" : "#06b6d4";

        return {
          id: `edge-${i}`,
          source: String(e.source),
          target: String(e.target),
          label: labelText,
          animated: true,
          labelStyle: {
            fill: "#ffffff",
            fontWeight: 800,
            fontSize: 9,
            letterSpacing: "1px"
          },
          labelBgStyle: {
            fill: "#080808",
            rx: 6,
            ry: 6,
            padding: 4
          },
          style: {
            stroke: edgeColor,
            strokeWidth: 2.5,
            strokeDasharray: "6 6"
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 16,
            height: 16
          }
        };
      });

      worker.onmessage = (event) => {
        setRawNodes(event.data.nodes);
        setRawEdges(event.data.edges);
        setLoading(false);
        setIsDataReady(true);
        setTimeout(() => {
          fitView({ padding: 0.3, duration: 800 });
        }, 300);
      };

      worker.postMessage({ nodes: mappedNodes, edges: mappedEdges });
    } catch (err) {
      console.error("❌ Exception in fetchApiGraph:", err);
      setLoading(false);
    }
  }, [worker, fitView]);

  useEffect(() => {
    fetchApiGraph();
  }, [fetchApiGraph]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 overflow-hidden font-sans">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .bubble-node-container { 
          width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; 
          animation: float 6s ease-in-out infinite; will-change: transform;
        }
        .bouncy-sphere { 
          width: 140px; height: 140px; border: 3px solid #06b6d4; border-radius: 50%; 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          background: rgba(0, 0, 0, 0.85); box-shadow: 0 0 25px rgba(6, 182, 212, 0.25), inset 0 0 15px rgba(6, 182, 212, 0.15);
        }
        .bubble-content { 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          text-align: center; padding: 10px; z-index: 20; word-break: break-word;
        }
        .category-tag { 
          font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; 
          color: #06b6d4; margin-bottom: 4px;
        }
        .file-name { 
          font-size: 11px; font-weight: 800; color: #ffffff; line-height: 1.2; 
        }
        .sub-navbar-container {
          all: unset;
          display: flex;
          position: relative;
          z-index: 40;
        }
        .sub-navbar-container > * {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
        }
      `}</style>

      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <DeveloperSidebar isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black z-30">
            <div className="flex items-center gap-6">
              <button
                className="px-5 py-1.5 bg-black border border-white/10 rounded-full text-xs font-bold hover:border-emerald-400 flex items-center gap-2 transition-colors"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={14} />
                BACK
              </button>

              {!loading && (
                <div className="relative w-[300px]" ref={searchRef}>
                  <div className="flex items-center bg-black border border-white/10 rounded-xl px-4 py-1.5">
                    <Search size={14} className="text-emerald-400" />
                    <input
                      type="text"
                      placeholder="SEARCH APIS OR FILES..."
                      className="bg-transparent outline-none text-white text-[11px] ml-3 w-full"
                      value={searchQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                    />
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-[#080808] border border-emerald-500/20 rounded-xl overflow-hidden z-50">
                      {suggestions.map((node) => (
                        <div
                          key={node.id}
                          className="px-4 py-3 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-3"
                          onClick={() => jumpToNode(node)}
                        >
                          <FileText size={14} className="text-emerald-500" />
                          <span className="text-sm text-white">{node.data.fileName || node.data.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1"></div>

            {!loading && (
              <div className="bg-black border border-white/10 p-1 rounded-xl flex gap-1">
                {["all", "frontend", "api_endpoint", "backend"].map((f) => (
                  <button 
                    key={f} 
                    onClick={() => setActiveFilter(f)} 
                    className={`px-4 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                      activeFilter === f ? "bg-emerald-500 text-black" : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {f.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </header>

          <div className="px-8 py-4 bg-[#080808] border-b border-white/5 z-20 flex justify-start">
            <div className="sub-navbar-container">
              <GraphSwitchNavbar repo={fullRepoName} inst={instId} />
            </div>
          </div>

          <main className="flex-1 relative bg-[#010203]">
            {loading && <GraphLoader />}

            <div className={`h-full w-full transition-opacity duration-1000 ${isDataReady ? "opacity-100" : "opacity-0"}`}>
              <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, n) => setSelectedNode(n)}
                onNodeMouseEnter={(_, n) => setHoveredNode(n)}
                onNodeMouseLeave={() => setHoveredNode(null)}
                onPaneClick={() => setSelectedNode(null)}
              >
                <Background color="#111" variant="dots" />
                <Controls style={{ filter: "invert(1)" }} position="bottom-left" />
              </ReactFlow>

              <NodeDetailPanel
                activeNode={selectedNode || hoveredNode}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default function ApiVisualizationPage() {
  return (
    <ReactFlowProvider>
      <ApiVisualizationContent />
    </ReactFlowProvider>
  );
}