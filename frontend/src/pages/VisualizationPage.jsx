import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ReactFlow, MiniMap, Controls, Background, ReactFlowProvider, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LayoutDashboard, Box, Network, User, CheckCircle2, AlertTriangle, Filter, Loader2 } from "lucide-react";
import dagre from "dagre";

const VisualizationPageContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true); // New state for initial load
  const [selectedRepo, setSelectedRepo] = useState(searchParams.get("repo") || "");
  const [showGraph, setShowGraph] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], edges: [] });
  const [displayData, setDisplayData] = useState({ nodes: [], edges: [] });
  const [activeFilter, setActiveFilter] = useState("all"); 
  const [installationId, setInstallationId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const getCategory = (path) => {
    const p = path.toLowerCase();
    if (p.includes("backend") || p.includes("server") || p.includes("api") || p.includes("controller") || p.includes("model")) return "backend";
    if (p.includes("frontend") || p.includes("client") || p.includes("src") || p.includes("component") || p.includes("context")) return "frontend";
    return "frontend"; 
  };

  const getLayoutedElements = (nodes, edges) => {
    const g = new dagre.graphlib.Graph().setGraph({ rankdir: "LR", nodesep: 80, ranksep: 250 });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach(n => g.setNode(n.id, { width: 200, height: 60 }));
    edges.forEach(e => g.setEdge(e.source, e.target));
    dagre.layout(g);
    
    return nodes.map(n => {
      const nodeWithPos = g.node(n.id);
      const isBackend = n.category === "backend";
      return {
        ...n,
        position: { x: nodeWithPos.x - 100, y: nodeWithPos.y - 30 },
        style: { 
          background: '#0a0a0a', 
          color: isBackend ? '#fb7185' : '#22d3ee', 
          border: `2px solid ${isBackend ? '#fb7185' : '#22d3ee'}`, 
          borderRadius: '8px', 
          fontSize: '11px', 
          width: 200, 
          textAlign: 'center',
          fontWeight: '600',
          padding: '12px',
          boxShadow: `0 0 15px ${isBackend ? 'rgba(251, 113, 133, 0.1)' : 'rgba(34, 211, 238, 0.1)'}`
        }
      };
    });
  };

  useEffect(() => {
    if (rawGraphData.nodes.length === 0) return;

    let filteredNodes = rawGraphData.nodes;
    if (activeFilter !== "all") {
      filteredNodes = rawGraphData.nodes.filter(n => n.category === activeFilter);
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = rawGraphData.edges.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const layouted = getLayoutedElements(filteredNodes, filteredEdges);
    setDisplayData({ nodes: layouted, edges: filteredEdges });
  }, [activeFilter, rawGraphData]);

  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setProgress(prev => (prev < 94 ? prev + 1 : prev));
      }, 200);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const fetchRepos = useCallback(async () => {
    setLoadingProjects(true); // Start loading
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        const found = data.find(r => r.installation_id);
        if (found) setInstallationId(found.installation_id);
      }
    } catch (err) { 
      console.error("Fetch error:", err); 
    } finally {
      setLoadingProjects(false); // Stop loading regardless of success/fail
    }
  }, [API_URL]);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  const generateGraph = async () => {
    if (!selectedRepo || !installationId) return;
    setIsGenerating(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/repos/generate-graph?full_repo=${encodeURIComponent(selectedRepo)}&installation_id=${installationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Server Error");
      const data = await res.json();

      const nodes = (data.nodes || []).map(n => ({
        id: n.id,
        category: getCategory(n.id),
        data: { label: n.data.label },
      }));

      const edges = (data.dependencies || []).map((dep, idx) => {
        const isBackend = dep.source.toLowerCase().includes("backend") || dep.source.toLowerCase().includes("server");
        const color = isBackend ? '#fb7185' : '#22d3ee';
        return {
          id: `e-${idx}`,
          source: dep.source,
          target: dep.target_full,
          animated: true,
          label: "imports",
          labelStyle: { fill: '#444', fontSize: 9, fontWeight: 700 },
          style: { stroke: color, strokeWidth: 2, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: color, width: 20, height: 20 }
        };
      });

      setRawGraphData({ nodes, edges });
      setActiveFilter("all");
      setProgress(100);
      
      setTimeout(() => {
        setShowGraph(true);
        setIsGenerating(false);
      }, 500);
    } catch (err) {
      alert(`Analysis failed: ${err.message}`);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#030708] text-gray-300 font-sans">
      <style>{`
        .react-flow__controls {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }
        .react-flow__controls-button {
          background: transparent !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        .react-flow__controls-button svg {
          fill: #000 !important;
        }
        .react-flow__minimap {
          background-color: #0a0a0a !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #0a0a0a 25%, #1a1a1a 50%, #0a0a0a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <aside className="w-64 bg-black border-r border-white/5 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <User className="text-gray-400" />
          <p className="font-bold text-sm text-white">Developer</p>
        </div>
        <nav className="space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => navigate("/developerDashboard")} />
          <NavItem icon={<Network size={18} />} label="Visualization" active />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-white/5 flex items-center px-6 bg-black justify-between">
          <div className="flex items-center">
            <Box size={16} className="text-cyan-500 mr-2" />
            <span className="font-bold text-white tracking-tighter uppercase">CodeVerse</span>
          </div>
          
          {showGraph && (
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 gap-1">
              <FilterButton active={activeFilter === "all"} onClick={() => setActiveFilter("all")} label="All" />
              <FilterButton active={activeFilter === "frontend"} onClick={() => setActiveFilter("frontend")} label="Frontend" />
              <FilterButton active={activeFilter === "backend"} onClick={() => setActiveFilter("backend")} label="Backend" />
            </div>
          )}
        </header>

        <main className="flex-1 p-8 flex flex-col overflow-hidden relative">
          {!showGraph ? (
            <div className="flex-1 flex gap-8">
              <div className="w-1/3 border border-white/5 rounded-xl bg-black/40 overflow-y-auto custom-scrollbar">
                {loadingProjects ? (
                  /* SKELETON LOADER */
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Loader2 size={14} className="animate-spin text-cyan-500" />
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">Fetching Repositories</span>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-12 w-full skeleton rounded-md border border-white/5"></div>
                    ))}
                  </div>
                ) : (
                  projects.map(repo => (
                    <div 
                      key={repo.full_name} 
                      onClick={() => setSelectedRepo(repo.full_name)} 
                      className={`p-4 border-b border-white/5 flex justify-between cursor-pointer transition-all ${selectedRepo === repo.full_name ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-l-cyan-500' : 'hover:bg-white/5'}`}
                    >
                      <span className="text-xs font-mono">{repo.full_name}</span>
                      {selectedRepo === repo.full_name && <CheckCircle2 size={14} />}
                    </div>
                  ))
                )}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center border border-white/5 rounded-xl bg-black/40 p-10">
                {isGenerating ? (
                  <div className="w-64 text-center">
                    <h2 className="text-lg font-bold text-white mb-4 animate-pulse">Scanning Codebase...</h2>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
                      <Network size={64} className={`relative ${selectedRepo ? 'text-cyan-500 animate-pulse' : 'text-gray-800'}`} />
                    </div>
                    <button 
                      onClick={generateGraph} 
                      disabled={!selectedRepo || !installationId || loadingProjects} 
                      className="mt-8 bg-cyan-600 px-12 py-3 rounded text-white text-xs font-black uppercase tracking-widest disabled:opacity-20 hover:bg-cyan-500 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
                    >
                      Generate Graph
                    </button>
                    {!selectedRepo && !loadingProjects && (
                      <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-tighter">Please select a repository from the left</p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-white/10 rounded-xl bg-[#030303] relative overflow-hidden shadow-2xl">
              <ReactFlow 
                nodes={displayData.nodes} 
                edges={displayData.edges} 
                fitView
                minZoom={0.1}
                maxZoom={1.5}
              >
                <Background color="#1a1a1a" gap={30} size={1} />
                <MiniMap 
                  maskColor="rgba(0, 0, 0, 0.7)"
                  nodeColor={(n) => (n.category === 'backend' ? '#fb7185' : '#22d3ee')}
                  nodeStrokeWidth={3}
                  nodeBorderRadius={2}
                />
                <Controls position="bottom-left" showInteractive={false} />
              </ReactFlow>

              <button 
                onClick={() => setShowGraph(false)} 
                className="absolute top-4 right-4 z-50 bg-black border border-white/10 px-4 py-2 text-[10px] font-bold uppercase rounded text-gray-400 hover:text-white hover:border-white transition-all active:scale-95"
              >
                Back to Selection
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${active ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
  >
    {label}
  </button>
);

const NavItem = ({ icon, label, active, onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${active ? 'bg-cyan-950/30 text-cyan-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-[13px] font-medium">{label}</span>
  </div>
);

const VisualizationPage = () => (
  <ReactFlowProvider>
    <VisualizationPageContent />
  </ReactFlowProvider>
);

export default VisualizationPage;