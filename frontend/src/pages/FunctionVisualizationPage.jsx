import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ReactFlow, Controls, Background, ReactFlowProvider, useReactFlow, MarkerType } from "@xyflow/react";
import { ArrowLeft, Search, Code2 } from "lucide-react";
import "@xyflow/react/dist/style.css";

import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";
import BubbleNode from "../components/BubbleNode"; 
import GraphLoader from "../components/GraphLoader";
import NodeDetailPanel from "../components/NodeDetailPanel";

const nodeTypes = { bubble: BubbleNode };

// --- WORKER: Adjusted for large bubble dimensions ---
const workerCode = `
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js');
  self.onmessage = function(e) {
    const { nodes, edges } = e.data;
    const g = new dagre.graphlib.Graph().setGraph({ 
      rankdir: "TB", 
      nodesep: 250,  // Increased spacing between bubbles
      ranksep: 300,  // Increased vertical spacing
      marginx: 100,
      marginy: 100
    });
    g.setDefaultEdgeLabel(() => ({}));
    
    // Tell Dagre the bubbles are large (180x180) to prevent overlapping
    nodes.forEach(n => g.setNode(n.id, { width: 200, height: 200 }));
    edges.forEach(e => g.setEdge(e.source, e.target));
    
    dagre.layout(g);
    
    const layoutedNodes = nodes.map(n => ({
      ...n,
      position: { x: g.node(n.id).x, y: g.node(n.id).y }
    }));
    self.postMessage({ nodes: layoutedNodes, edges });
  };
`;

const FunctionVisualizationContent = () => {
  const { fitView } = useReactFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const repoName = searchParams.get("repo");
  const instId = searchParams.get("inst");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const worker = useMemo(() => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  }, []);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return nodes.filter(n => 
      n.data.label.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6);
  }, [searchQuery, nodes]);

  const jumpToNode = (node) => {
    setSelectedNode(node);
    setSearchQuery("");
    setShowSuggestions(false);
    fitView({ nodes: [node], duration: 1000, padding: 1.5 });
  };

  const fetchFunctionGraph = useCallback(async () => {
    if (!repoName || !instId) return;
    
    // Reset state for new repository
    setLoading(true);
    setIsDataReady(false);
    setNodes([]); 
    setEdges([]);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_URL}/api/repos/generate-function-graph?full_repo=${encodeURIComponent(repoName)}&installation_id=${instId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();
      if (!data.nodes) throw new Error("No nodes found");

      const mappedNodes = data.nodes.map((n) => ({
        id: n.id,
        type: "bubble", // Uses your BubbleNode.jsx
        data: {
          label: n.data.label,
          fullName: n.id,
          // Determines the bubble color (Rose for backend, Cyan for others)
          category: n.id.toLowerCase().includes("backend") ? "backend" : "function",
          codeSnippet: n.data.content || "// Implementation not found",
          fileName: n.data.file || "Source File",
          imports: (data.dependencies || [])
            .filter(d => d.source === n.id)
            .map(d => d.target.split('.').pop())
        }
      }));

      const mappedEdges = (data.dependencies || []).map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: "#22d3ee", strokeWidth: 2, opacity: 0.4, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#22d3ee" }
      }));

      worker.postMessage({ nodes: mappedNodes, edges: mappedEdges });

      worker.onmessage = (event) => {
        setNodes(event.data.nodes);
        setEdges(event.data.edges);
        setLoading(false);
        setIsDataReady(true);
        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 200);
      };

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [repoName, instId, API_URL, worker, fitView]);

  useEffect(() => {
    fetchFunctionGraph();
  }, [fetchFunctionGraph]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      {/* --- CSS: Replicating the "File Level" Bubble Aesthetic --- */}
      <style>{`
        .bubble-node-container { 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
        }
        .bouncy-sphere {
          width: 140px; height: 140px; border-radius: 50%; border: 2px solid;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          position: relative; cursor: pointer; transition: all 0.4s ease;
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .sphere-shine {
          position: absolute; top: 15%; left: 15%; width: 30%; height: 30%;
          background: rgba(255,255,255,0.2); border-radius: 50%; filter: blur(8px);
        }
        .bubble-content { 
          text-align: center; display: flex; flex-direction: column; gap: 4px; padding: 10px;
        }
        .category-tag { font-size: 8px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
        .file-name { font-size: 11px; font-weight: 700; color: white; word-break: break-all; max-width: 110px; }
        .custom-handle { width: 8px !important; height: 8px !important; border: none !important; }
        
        /* Search Styling */
        .search-wrapper { position: relative; width: 450px; z-index: 1001; }
        .search-container {
          display: flex; align-items: center; background: rgba(0,0,0,0.85); 
          border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
          padding: 8px 18px; backdrop-filter: blur(12px);
        }
        .search-input { background: transparent; border: none; outline: none; color: white; font-size: 12px; width: 100%; }
        .back-btn { 
          position: absolute; top: 1.25rem; left: 1.25rem; z-index: 1000; 
          display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; 
          background: #000; border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; font-size: 10px; font-weight: 800; 
        }
      `}</style>

      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> BACK
          </button>

          <header className="h-20 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl z-20">
            <div className="flex-1"></div>
            
            {/* Search Bar */}
            {!loading && (
              <div className="search-wrapper" ref={searchRef}>
                <div className="search-container">
                  <Search size={16} className="text-cyan-400" />
                  <input 
                    type="text" 
                    placeholder="LOCATING LOGIC..." 
                    className="search-input px-3"
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#080808] border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl">
                    {suggestions.map(node => (
                      <div key={node.id} className="p-3 hover:bg-cyan-500/10 flex items-center gap-3 cursor-pointer" onClick={() => jumpToNode(node)}>
                        <Code2 size={14} className="text-cyan-500" />
                        <span className="text-xs font-bold text-white">{node.data.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex-1 flex justify-end gap-3">
              <button onClick={() => navigate(`/visualization?repo=${repoName}&inst=${instId}`)} className="px-4 py-2 text-[10px] font-black bg-white/5 rounded-lg hover:bg-white/10 transition-colors">FILE GRAPH</button>
              <button className="px-4 py-2 text-[10px] font-black bg-cyan-500 text-black rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)]">FUNCTION GRAPH</button>
            </div>
          </header>

          <main className="flex-1 relative bg-[#010203]">
            {loading && <GraphLoader />}
            
            <div className={`w-full h-full transition-opacity duration-1000 ${isDataReady ? 'opacity-100' : 'opacity-0'}`}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeMouseEnter={(_, n) => setHoveredNode(n)}
                onNodeMouseLeave={() => setHoveredNode(null)}
                onNodeClick={(_, n) => setSelectedNode(n)}
                onPaneClick={() => setSelectedNode(null)}
                fitView
              >
                <Background color="#111" variant="dots" />
                <Controls position="bottom-left" style={{ filter: 'invert(1)' }} />
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
    <FunctionVisualizationContent />
  </ReactFlowProvider>
);