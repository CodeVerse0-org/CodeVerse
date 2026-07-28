import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";

import {
  useSearchParams,
  useNavigate,
  useParams,
  useLocation
} from "react-router-dom";

import {
  ReactFlow,
  Controls,
  Background,
  ReactFlowProvider,
  useReactFlow,
  MarkerType
} from "@xyflow/react";

import {
  ArrowLeft,
  Search,
  FileText
} from "lucide-react";

import "@xyflow/react/dist/style.css";

import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";
import BubbleNode from "../components/BubbleNode";
import GraphLoader from "../components/GraphLoader";
import NodeDetailPanel from "../components/NodeDetailPanel";

const nodeTypes = {
  bubble: BubbleNode
};

// ======================================================
// 1. GRAPH SWITCH NAVBAR COMPONENT
// ======================================================

export const GraphSwitchNavbar = ({ repo, inst }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname.includes(path);

  const goTo = (path) => {
    const queryParams = new URLSearchParams();
    if (repo && repo !== "undefined") queryParams.set("repo", repo);
    if (inst && inst !== "null" && inst !== "undefined") queryParams.set("inst", inst);

    const queryString = queryParams.toString();
    const targetUrl = queryString ? `${path}?${queryString}` : path;
    navigate(targetUrl);
  };

  return (
    <div className="flex gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
      {/* FILE GRAPH */}
      <button
        onClick={() => goTo("/visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/visualization") &&
          !isActive("/function") &&
          !isActive("/state") &&
          !isActive("/api")
            ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        FILE GRAPH
      </button>

      {/* FUNCTION GRAPH */}
      <button
        onClick={() => goTo("/function-visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/function-visualization")
            ? "bg-purple-500 text-black shadow-lg shadow-purple-500/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        FUNCTION GRAPH
      </button>

      {/* STATE GRAPH */}
      <button
        onClick={() => goTo("/state-visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/state-visualization")
            ? "bg-pink-500 text-black shadow-lg shadow-pink-500/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        STATE GRAPH
      </button>

      {/* API GRAPH */}
      <button
        onClick={() => goTo("/api-visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/api-visualization")
            ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        API GRAPH
      </button>
    </div>
  );
};

// ======================================================
// 2. DAGRE WEB WORKER INLINE SCRIPT
// ======================================================

const workerCode = `
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js');

  self.onmessage = function(e) {
    const { nodes, edges } = e.data;
    const g = new dagre.graphlib.Graph().setGraph({
      rankdir: "TB",
      nodesep: 220,
      ranksep: 280,
      marginx: 100,
      marginy: 100
    });

    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach(n => {
      g.setNode(n.id, {
        width: 160,
        height: 160
      });
    });

    edges.forEach(e => {
      if (e.source && e.target) {
        g.setEdge(e.source, e.target);
      }
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map(n => ({
      ...n,
      position: {
        x: g.node(n.id).x,
        y: g.node(n.id).y
      }
    }));

    self.postMessage({
      nodes: layoutedNodes,
      edges
    });
  };
`;

// ======================================================
// 3. MAIN VISUALIZATION CONTENT
// ======================================================

const VisualizationContent = () => {
  const { fitView } = useReactFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { owner, repo } = useParams();
  const instId = searchParams.get("inst");

  const fullRepoName =
    owner && repo
      ? `${owner}/${repo}`
      : searchParams.get("repo") || "";

  // STATES
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_state");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [displayData, setDisplayData] = useState({ nodes: [], edges: [] });
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], edges: [] });
  const [isDataReady, setIsDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [user] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // WORKER INITIALIZATION
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

  // SEARCH SUGGESTIONS
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return displayData.nodes
      .filter((n) =>
        n.data.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 6);
  }, [searchQuery, displayData.nodes]);

  const jumpToNode = (node) => {
    setSelectedNode(node);
    setSearchQuery("");
    setShowSuggestions(false);
    fitView({
      nodes: [node],
      duration: 1000,
      padding: 1.5
    });
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

  // FETCH GRAPH DATA
  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const cached = sessionStorage.getItem("file_graph");

      if (!cached) {
        console.warn("No file_graph found in sessionStorage.");
        setLoading(false);
        return;
      }

      const data = JSON.parse(cached);
      const nodesData = data.nodes || data.file_graph?.nodes || [];
      const edgesData =
        data.dependencies ||
        data.edges ||
        data.links ||
        data.file_graph?.dependencies ||
        data.file_graph?.edges ||
        [];

      const mappedNodes = nodesData.map((n) => ({
        id: String(n.id),
        type: "bubble",
        position: { x: 0, y: 0 },
        data: {
          label:
            n.data?.label ||
            n.name ||
            n.id?.split("/").pop() ||
            "Unknown",
          fullName: n.id,
          category:
            n.type ||
            n.data?.category ||
            (String(n.id).toLowerCase().includes("backend")
              ? "backend"
              : "frontend"),
          codeSnippet:
            n.data?.content || n.content || "// No content indexed",
          fileName: n.name || n.data?.label || "Source File",
          imports: []
        }
      }));

      const mappedEdges = edgesData
        .filter((e) => e.source && (e.target || e.target_full))
        .map((e, i) => {
          const sId = String(e.source);
          const color = sId.toLowerCase().includes("backend")
            ? "#fb7185"
            : "#22d3ee";

          return {
            id: `edge-${i}`,
            source: sId,
            target: String(e.target || e.target_full),
            label: "IMPORTS",
            animated: true,
            labelStyle: {
              fill: color,
              fontWeight: 900,
              fontSize: 7,
              textTransform: "uppercase"
            },
            style: {
              stroke: color,
              strokeWidth: 2,
              opacity: 0.8
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: color,
              width: 15,
              height: 15
            }
          };
        });

      setRawGraphData({ nodes: mappedNodes, edges: mappedEdges });

      worker.postMessage({ nodes: mappedNodes, edges: mappedEdges });

      worker.onmessage = (event) => {
        setDisplayData(event.data);
        setLoading(false);
        setIsDataReady(true);
        setTimeout(() => {
          fitView({ padding: 0.3, duration: 800 });
        }, 100);
      };
    } catch (err) {
      console.error("Fetch Graph Error:", err);
      setLoading(false);
    }
  }, [worker, fitView]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // CATEGORY FILTERING LOGIC
  useEffect(() => {
    if (!rawGraphData.nodes.length) return;
    setLoading(true);
    setIsDataReady(false);

    const filteredNodes =
      activeFilter === "all"
        ? rawGraphData.nodes
        : rawGraphData.nodes.filter((n) =>
            n.data.category
              .toLowerCase()
              .includes(activeFilter.toLowerCase())
          );

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = rawGraphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    worker.postMessage({
      nodes: filteredNodes,
      edges: filteredEdges
    });

    worker.onmessage = (e) => {
      setDisplayData(e.data);
      setTimeout(() => {
        setIsDataReady(true);
        setLoading(false);
        setTimeout(() => {
          fitView({ padding: 0.3, duration: 800 });
        }, 100);
      }, 300);
    };
  }, [activeFilter, rawGraphData, worker, fitView]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .bubble-node-container { 
          width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; 
          animation: float 6s ease-in-out infinite; will-change: transform;
        }
        .bouncy-sphere { 
          width: 135px; height: 135px; border: 3px solid; border-radius: 50%; 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          background: rgba(0, 0, 0, 0.7); box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
        }
        .bubble-content { 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          text-align: center; padding: 12px; z-index: 20;
          text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;
        }
      `}</style>

      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* HEADER 1: FILTERS & SEARCH */}
          <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black z-30">
            <div className="flex items-center gap-6">
              <button
                className="px-5 py-1.5 bg-black border border-white/10 rounded-full text-xs font-bold hover:border-cyan-400 flex items-center gap-2 transition-colors"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={14} />
                Back
              </button>

              {!loading && (
                <div className="relative w-[300px]" ref={searchRef}>
                  <div className="flex items-center bg-black border border-white/10 rounded-xl px-4 py-1.5">
                    <Search size={14} className="text-cyan-400" />
                    <input
                      type="text"
                      placeholder="SEARCH FILES..."
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
                    <div className="absolute top-full mt-2 w-full bg-[#080808] border border-cyan-500/20 rounded-xl overflow-hidden z-50">
                      {suggestions.map((node) => (
                        <div
                          key={node.id}
                          className="px-4 py-3 hover:bg-cyan-500/10 cursor-pointer flex items-center gap-3"
                          onClick={() => jumpToNode(node)}
                        >
                          <FileText size={14} className="text-cyan-500" />
                          <span className="text-sm text-white">
                            {node.data.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SWITCH NAVBAR INTEGRATED DIRECTLY IN HEADER */}
            <GraphSwitchNavbar repo={fullRepoName} inst={instId} />

            {!loading && (
              <div className="bg-black border border-white/10 p-1 rounded-xl flex gap-1">
                {["all", "frontend", "backend"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-4 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                      activeFilter === f
                        ? "bg-cyan-500 text-black"
                        : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* MAIN GRAPH CANVAS */}
          <main className="flex-1 relative bg-[#010203]">
            {(loading || !isDataReady) && <GraphLoader />}

            <div
              className={`w-full h-full transition-opacity duration-1000 ${
                isDataReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <ReactFlow
                nodes={displayData.nodes}
                edges={displayData.edges}
                nodeTypes={nodeTypes}
                onNodeMouseEnter={(_, n) => setHoveredNode(n)}
                onNodeMouseLeave={() => setHoveredNode(null)}
                onNodeClick={(_, n) => setSelectedNode(n)}
                onPaneClick={() => setSelectedNode(null)}
              >
                <Background color="#111" variant="dots" />
                <Controls
                  position="bottom-left"
                  style={{ filter: "invert(1)" }}
                />
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

export default function VisualizationPage() {
  return (
    <ReactFlowProvider>
      <VisualizationContent />
    </ReactFlowProvider>
  );
}