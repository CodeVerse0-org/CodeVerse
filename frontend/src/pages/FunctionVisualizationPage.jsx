import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { ReactFlow, Controls, Background, ReactFlowProvider, useReactFlow, MarkerType } from "@xyflow/react";
import { ArrowLeft, Search, Code2 } from "lucide-react";
import "@xyflow/react/dist/style.css";

import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";
import BubbleNode from "../components/BubbleNode";
import GraphLoader from "../components/GraphLoader";
import NodeDetailPanel from "../components/NodeDetailPanel";
import GraphSwitchNavbar from "../components/GraphSwitchNavbar";

const nodeTypes = { bubble: BubbleNode };

const workerCode = `
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js');
  self.onmessage = function(e) {
    const { nodes, edges } = e.data;
    const g = new dagre.graphlib.Graph().setGraph({
      rankdir: "TB",
      nodesep: 250,
      ranksep: 300,
      marginx: 100,
      marginy: 100
    });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach(n => { g.setNode(n.id, { width: 200, height: 200 }); });
    edges.forEach(e => { if (e.source && e.target) { g.setEdge(e.source, e.target); } });
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
  const { owner, repo } = useParams();
  const fullRepoName = (owner && repo) ? `${owner}/${repo}` : searchParams.get("repo") || "";
  const instId = searchParams.get("inst");

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_state");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const worker = useMemo(() => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  }, []);

  useEffect(() => { return () => worker.terminate(); }, [worker]);
  useEffect(() => { localStorage.setItem("sidebar_state", JSON.stringify(isSidebarOpen)); }, [isSidebarOpen]);
  
  useEffect(() => {
    if (isDataReady) {
      const timer = setTimeout(() => { setIsSidebarOpen(false); }, 800);
      return () => clearTimeout(timer);
    }
  }, [isDataReady]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return nodes.filter(n => n.data.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6);
  }, [searchQuery, nodes]);

  const jumpToNode = (node) => {
    setSelectedNode(node);
    setSearchQuery("");
    setShowSuggestions(false);
    fitView({ nodes: [node], duration: 1000, padding: 1.5 });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFunctionGraph = useCallback(async () => {
    try {
      const cached = sessionStorage.getItem("function_graph");
      if (!cached) { setLoading(false); return; }

      const data = JSON.parse(cached);
      const nodesData = data.nodes || [];
      const edgesData = data.dependencies || [];

      const mappedNodes = nodesData.map((n) => {
        const rawFile = n?.data?.file || "";
        const fileName = rawFile.split("/").pop();
        const funcName = n?.data?.functionName || n?.data?.label || "Unnamed";
        
        // Ensure the UI displays the required format: (FileName (FunctionName))
        const displayLabel = `(${fileName} (${funcName}))`;

        return {
          id: String(n.id),
          type: "bubble",
          position: { x: 0, y: 0 },
          data: {
            label: displayLabel,
            fullName: n.id,
            category: "function",
            codeSnippet: n?.data?.content || "// No source available",
            fileName: fileName,
            imports: edgesData.filter((d) => d.source === n.id).map((d) => (d.target || "").split("/").pop())
          }
        };
      });

      const mappedEdges = edgesData
        .filter(e => e.source && e.target)
        .map((e, i) => ({
          id: `edge-${i}`,
          source: String(e.source),
          target: String(e.target),
          animated: true,
          style: { stroke: "#22d3ee", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#22d3ee" }
        }));

      worker.onmessage = (event) => {
        setNodes(event.data.nodes || []);
        setEdges(event.data.edges || []);
        setLoading(false);
        setIsDataReady(true);
        setTimeout(() => { fitView({ padding: 0.4, duration: 800 }); }, 300);
      };

      worker.postMessage({ nodes: mappedNodes, edges: mappedEdges });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [worker, fitView]);

  useEffect(() => { fetchFunctionGraph(); }, [fetchFunctionGraph]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <style>{`
        .bubble-node-container { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .bouncy-sphere { width: 140px; height: 140px; border-radius: 50%; border: 2px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; cursor: pointer; transition: all 0.4s ease; animation: float 6s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .sphere-shine { position: absolute; top: 15%; left: 15%; width: 30%; height: 30%; background: rgba(255,255,255,0.2); border-radius: 50%; filter: blur(8px); }
        .bubble-content { text-align: center; display: flex; flex-direction: column; gap: 4px; padding: 10px; }
        .category-tag { font-size: 8px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
        .file-name { font-size: 11px; font-weight: 700; color: white; word-break: break-all; max-width: 110px; }
        .custom-handle { width: 8px !important; height: 8px !important; border: none !important; }
        .search-wrapper { position: relative; width: 450px; z-index: 1001; }
        .search-container { display: flex; align-items: center; background: rgba(0,0,0,0.85); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 8px 18px; backdrop-filter: blur(12px); }
        .search-input { background: transparent; border: none; outline: none; color: white; font-size: 12px; width: 100%; }
        .back-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #000; border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; font-size: 10px; font-weight: 800; }
        .sub-navbar-container { all: unset; display: flex; position: relative; z-index: 40; }
        .sub-navbar-container > * { position: relative !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; }
      `}</style>

      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar isOpen={isSidebarOpen} />
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black z-30">
            <div className="flex items-center gap-6">
              <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={14} /> BACK</button>
              {!loading && (
                <div className="search-wrapper" ref={searchRef}>
                  <div className="search-container">
                    <Search size={16} className="text-cyan-400" />
                    <input type="text" placeholder="LOCATING LOGIC..." className="search-input px-3" value={searchQuery} onFocus={() => setShowSuggestions(true)} onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }} />
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
            </div>
            <div className="flex-1"></div>
          </header>

          <div className="px-8 py-4 bg-[#080808] border-b border-white/5 z-20 flex justify-start">
            <div className="sub-navbar-container">
              <GraphSwitchNavbar repo={fullRepoName} inst={instId} />
            </div>
          </div>

          <main className="flex-1 relative bg-[#010203]">
            {loading && <GraphLoader />}
            <div className={`w-full h-full transition-opacity duration-1000 ${isDataReady ? "opacity-100" : "opacity-0"}`}>
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
    <FunctionVisualizationContent />
  </ReactFlowProvider>
);