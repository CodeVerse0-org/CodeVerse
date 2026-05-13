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
  useParams
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
import GraphSwitchNavbar from "../components/GraphSwitchNavbar";

const nodeTypes = {
  bubble: BubbleNode
};

// ======================================================
// DAGRE WORKER
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
// MAIN CONTENT
// ======================================================

const VisualizationContent = () => {
  const { fitView } = useReactFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { owner, repo } = useParams();
  const instId = searchParams.get("inst");

  const fullRepoName =
    (owner && repo)
      ? `${owner}/${repo}`
      : searchParams.get("repo") || "";

  // ======================================================
  // STATES
  // ======================================================

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [displayData, setDisplayData] = useState({
    nodes: [],
    edges: []
  });
  const [rawGraphData, setRawGraphData] = useState({
    nodes: [],
    edges: []
  });
  const [isDataReady, setIsDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // ======================================================
  // WEB WORKER
  // ======================================================

  const worker = useMemo(() => {
    const blob = new Blob(
      [workerCode],
      { type: "application/javascript" }
    );
    return new Worker(
      URL.createObjectURL(blob)
    );
  }, []);

  // ======================================================
  // SEARCH SUGGESTIONS
  // ======================================================

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return displayData.nodes
      .filter(n =>
        n.data.label
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
      .slice(0, 6);
  }, [searchQuery, displayData.nodes]);

  // ======================================================
  // JUMP TO NODE
  // ======================================================

  const jumpToNode = (node) => {
    setSelectedNode(node);
    setSearchQuery("");
    setShowSuggestions(false);
    fitView({
      nodes: [node],
      duration: 1000,
      padding: 1.5,
    });
  };

  // ======================================================
  // CLOSE SEARCH DROPDOWN
  // ======================================================

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener(
      "mousedown",
      handleClickOutside
    );
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  // ======================================================
  // FETCH GRAPH
  // ======================================================

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const cached =
        sessionStorage.getItem("file_graph");

      if (!cached) {
        console.error("No file_graph in session storage");
        setLoading(false);
        return;
      }

      const data = JSON.parse(cached);

      const nodesData =
        data.nodes ||
        data.file_graph?.nodes ||
        [];

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
            (String(n.id).toLowerCase().includes('backend') ? 'backend' : 'frontend'),
          codeSnippet:
            n.data?.content ||
            n.content ||
            "// No content indexed",
          fileName:
            n.name ||
            n.data?.label ||
            "Source File",
          imports: []
        }
      }));

      const mappedEdges = edgesData
        .filter(e =>
          e.source &&
          (e.target || e.target_full)
        )
        .map((e, i) => {
          const sId = String(e.source);
          const color = sId.toLowerCase().includes("backend") ? '#fb7185' : '#22d3ee';
          
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
              textTransform: 'uppercase' 
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

      setRawGraphData({
        nodes: mappedNodes,
        edges: mappedEdges
      });

      worker.postMessage({
        nodes: mappedNodes,
        edges: mappedEdges
      });

      worker.onmessage = (event) => {
        setDisplayData(event.data);
        setLoading(false);
        setIsDataReady(true);
        setTimeout(() => {
          fitView({
            padding: 0.3,
            duration: 800
          });
        }, 100);
      };
    }
    catch (err) {
      console.error("Fetch Error:", err);
      setLoading(false);
    }
  }, [worker, fitView]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (isDataReady) {
      const timer = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isDataReady]);

  useEffect(() => {
    if (!rawGraphData.nodes.length) return;
    setLoading(true);
    setIsDataReady(false);

    const filteredNodes =
      activeFilter === "all"
        ? rawGraphData.nodes
        : rawGraphData.nodes.filter(n =>
            n.data.category
              .toLowerCase()
              .includes(activeFilter.toLowerCase())
          );

    const nodeIds = new Set(
      filteredNodes.map(n => n.id)
    );

    const filteredEdges =
      rawGraphData.edges.filter(e =>
        nodeIds.has(e.source) &&
        nodeIds.has(e.target)
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
          fitView({
            padding: 0.3,
            duration: 800
          });
        }, 100);
      }, 300);
    };
  }, [
    activeFilter,
    rawGraphData,
    worker,
    fitView
  ]);

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
        .category-tag { 
          font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; 
          margin-bottom: 4px; text-shadow: 0 0 8px rgba(0,0,0,1);
        }
        .file-name { 
          font-size: 13px; font-weight: 800; color: #ffffff; line-height: 1.1; 
          text-shadow: 2px 2px 2px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8);
        }
        /* Force the buttons to be visible and non-absolute */
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

      <DeveloperNavbar
        toggleSidebar={() =>
          setIsSidebarOpen(!isSidebarOpen)
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar
          user={user}
          isOpen={isSidebarOpen}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* HEADER 1: FILTERS & SEARCH */}
          <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black z-30">
            <div className="flex items-center gap-6">
              <button
                className="px-5 py-1.5 bg-black border border-white/10 rounded-full text-xs font-bold hover:border-cyan-400 flex items-center gap-2"
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
                      {suggestions.map(node => (
                        <div
                          key={node.id}
                          className="px-4 py-3 hover:bg-cyan-500/10 cursor-pointer flex items-center gap-3"
                          onClick={() => jumpToNode(node)}
                        >
                          <FileText size={14} className="text-cyan-500" />
                          <span className="text-sm text-white">{node.data.label}</span>
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
                {["all", "frontend", "backend"].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setActiveFilter(f)} 
                    className={`px-4 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                      activeFilter === f ? 'bg-cyan-500 text-black' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* HEADER 2: GRAPH SWITCH BUTTONS (The "Missing" Buttons) */}
          <div className="px-8 py-4 bg-[#080808] border-b border-white/5 z-20 flex justify-start">
            <div className="sub-navbar-container">
              <GraphSwitchNavbar repo={fullRepoName} inst={instId} />
            </div>
          </div>

          {/* MAIN GRAPH */}
          <main className="flex-1 relative bg-[#010203]">
            {(loading || !isDataReady) &&
              <GraphLoader />
            }

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
                <Controls position="bottom-left" style={{ filter: "invert(1)" }} />
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

export default () => (
  <ReactFlowProvider>
    <VisualizationContent />
  </ReactFlowProvider>
);