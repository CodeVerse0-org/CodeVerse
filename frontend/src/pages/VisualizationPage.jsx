import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ReactFlow, Controls, Background, ReactFlowProvider, useReactFlow, MarkerType } from "@xyflow/react";
import { ArrowLeft, Search, FileText } from "lucide-react";
import "@xyflow/react/dist/style.css";

import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";
import BubbleNode from "../components/BubbleNode";
import GraphLoader from "../components/GraphLoader";
import NodeDetailPanel from "../components/NodeDetailPanel";

const nodeTypes = { bubble: BubbleNode };

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
    nodes.forEach(n => g.setNode(n.id, { width: 160, height: 160 }));
    edges.forEach(e => g.setEdge(e.source, e.target));
    dagre.layout(g);
    const layoutedNodes = nodes.map(n => ({
      ...n,
      position: { x: g.node(n.id).x, y: g.node(n.id).y }
    }));
    self.postMessage({ nodes: layoutedNodes, edges });
  };
`;

const VisualizationContent = () => {
  const { fitView } = useReactFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repoName = searchParams.get("repo");
  const instId = searchParams.get("inst");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [displayData, setDisplayData] = useState({ nodes: [], edges: [] });
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], edges: [] });
  const [isDataReady, setIsDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [user, setUser] = useState(null);

  // SEARCH & SUGGESTIONS STATE
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
    return displayData.nodes.filter(n => 
      n.data.label.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6);
  }, [searchQuery, displayData.nodes]);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDataReady) {
      const timer = setTimeout(() => setIsSidebarOpen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isDataReady]);

  const fetchGraph = useCallback(async () => {
    if (!repoName || !instId) return;
    const token = localStorage.getItem("token");
    try {
      const userRes = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (userRes.ok) setUser(await userRes.json());
      const res = await fetch(`${API_URL}/api/repos/generate-graph?full_repo=${encodeURIComponent(repoName)}&installation_id=${instId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const nodes = (data.nodes || []).map(n => ({
        id: n.id, type: 'bubble',
        data: { 
          label: n.data.label.split('/').pop(),
          fullName: n.data.label,
          category: n.id.toLowerCase().includes('backend') ? 'backend' : 'frontend',
          imports: (data.dependencies || []).filter(d => d.source === n.id).map(d => d.target_full.split('/').pop()),
          imports_full: (data.dependencies || []).filter(d => d.source === n.id).map(d => d.target_full),
          codeSnippet: n.data.content || "// No source preview available"
        }
      }));
      const edges = (data.dependencies || []).map((dep, idx) => {
        const color = dep.source.toLowerCase().includes("backend") ? '#fb7185' : '#22d3ee';
        return {
          id: `e-${idx}`, source: dep.source, target: dep.target_full, label: "IMPORTS", animated: true,
          labelStyle: { fill: color, fontWeight: 900, fontSize: 7, textTransform: 'uppercase', letterSpacing: '1.5px' },
          labelBgPadding: [6, 4], labelBgBorderRadius: 2,
          labelBgStyle: { fill: '#000', fillOpacity: 1, stroke: color, strokeWidth: 1 },
          style: { stroke: color, strokeWidth: 2, opacity: 0.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: color, width: 15, height: 15 }
        };
      });
      setRawGraphData({ nodes, edges });
    } catch (err) { setLoading(false); }
  }, [repoName, instId, API_URL]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  useEffect(() => {
    if (!rawGraphData.nodes.length) return;
    setLoading(true); setIsDataReady(false);
    const filteredNodes = activeFilter === "all" ? rawGraphData.nodes : rawGraphData.nodes.filter(n => n.data.category === activeFilter);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = rawGraphData.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    worker.postMessage({ nodes: filteredNodes, edges: filteredEdges });
    worker.onmessage = (e) => {
      setDisplayData(e.data);
      setTimeout(() => {
        setIsDataReady(true); setLoading(false);
        setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
      }, 300);
    };
  }, [activeFilter, rawGraphData, worker, fitView]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <style>{`
        /* 1. SCROLLBARS */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #22d3ee; box-shadow: 0 0 10px #22d3ee; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.3); }

        /* 2. SHARP BUBBLE TEXT */
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

        /* 3. WIDE CENTERED SEARCH */
        .search-wrapper { position: relative; width: 450px; z-index: 1001; }
        .search-container {
          display: flex; align-items: center; background: rgba(0,0,0,0.85); 
          border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
          padding: 8px 18px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
        }
        .search-container:focus-within {
          border-color: #22d3ee; box-shadow: 0 0 25px rgba(34, 211, 238, 0.2);
          width: 480px; transform: translateX(-15px);
        }
        .search-input {
          background: transparent; border: none; outline: none; color: white;
          font-size: 12px; padding: 4px 12px; width: 100%; font-weight: 600; letter-spacing: 0.03em;
        }
        
        .suggestions-box {
          position: absolute; top: calc(100% + 10px); left: 0; right: 0;
          background: #080808; border: 1px solid rgba(34, 211, 238, 0.3);
          border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.7);
        }
        .suggestion-item {
          padding: 12px 18px; display: flex; align-items: center; gap: 12px;
          cursor: pointer; transition: 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .suggestion-item:hover { background: rgba(34, 211, 238, 0.15); }
        .suggestion-label { font-size: 12px; font-weight: 600; color: #fff; }
        .suggestion-cat { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #666; margin-left: auto; }

        .back-btn { position: absolute; top: 1.25rem; left: 1.25rem; z-index: 1000; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #000; border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; color: white; font-size: 10px; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .back-btn:hover { border-color: #22d3ee; color: #22d3ee; transform: translateX(4px); }
      `}</style>

      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>

          <header className="h-20 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl z-20">
            <div className="flex-1"></div>
<div className="absolute top-4 right-6 z-20 flex gap-3">

  <button
    className="px-5 py-2 text-xs font-bold bg-cyan-500 text-black rounded-lg"
  >
    FILE GRAPH
  </button>

  <button
    onClick={() =>
      navigate(`/function-visualization?repo=${repoName}&inst=${instId}`)
    }
    className="px-5 py-2 text-xs font-bold bg-gray-800 rounded-lg"
  >
    FUNCTION GRAPH
  </button>

</div>
            {!loading && (
              <div className="search-wrapper" ref={searchRef}>
                <div className="search-container">
                  <Search size={16} className="text-cyan-400" />
                  <input 
                    type="text" 
                    placeholder="SEARCH MODULES OR FILES..." 
                    className="search-input"
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                  />
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-box">
                    {suggestions.map(node => (
                      <div key={node.id} className="suggestion-item" onClick={() => jumpToNode(node)}>
                        <FileText size={14} className="text-cyan-500" />
                        <span className="suggestion-label">{node.data.label}</span>
                        <span className="suggestion-cat">{node.data.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 flex justify-end">
              {!loading && (
                <div className="bg-black/80 border border-white/10 p-1 rounded-xl flex gap-1">
                  {["all", "frontend", "backend"].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setActiveFilter(f)} 
                      className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                        activeFilter === f ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 relative bg-[#010203]">
            {(loading || !isDataReady) && <GraphLoader />}
            <div className={`w-full h-full transition-opacity duration-1000 ${isDataReady ? 'opacity-100' : 'opacity-0'}`}>
              <ReactFlow 
                nodes={displayData.nodes} edges={displayData.edges} nodeTypes={nodeTypes}
                onNodeMouseEnter={(_, n) => setHoveredNode(n)} onNodeMouseLeave={() => setHoveredNode(null)}
                onNodeClick={(_, n) => setSelectedNode(n)} onPaneClick={() => setSelectedNode(null)}
              >
                <Background color="#111" variant="dots" />
                <Controls position="bottom-left" style={{ filter: 'invert(1)' }} />
              </ReactFlow>
              <NodeDetailPanel activeNode={selectedNode || hoveredNode} selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
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