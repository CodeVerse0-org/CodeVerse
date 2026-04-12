import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Database, ChevronRight, Layout, Search, Trash2, Calendar } from "lucide-react";
import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/repos/history`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error("Failed to load vault history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [API_URL]);

  // Inside HistoryPage.jsx -> handleOpenGraph function
const handleOpenGraph = (item) => {
  const route = item.graph_type === "file" ? "visualization" : "function-visualization";
  
  const params = new URLSearchParams({
    repo: item.repo_name,
    timestamp: item.timestamp,
    graph_type: item.graph_type, // Add this line
    history: "true"
  });

  navigate(`/${route}?${params.toString()}`);
};

  const filteredHistory = history.filter(item => 
    item.repo_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans">
      <DeveloperNavbar />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar isOpen={true} />
        
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <Clock className="text-cyan-400" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Snapshot Vault</h1>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em]">Neo4j Historical Intelligence</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
              <input 
                type="text"
                placeholder="SEARCH REPOSITORIES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* History List */}
          <div className="grid gap-3">
            {loading ? (
              <div className="py-20 text-center animate-pulse text-gray-600 font-black tracking-widest text-xs uppercase">
                Accessing Encrypted Records...
              </div>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleOpenGraph(item)}
                  className="group relative flex items-center justify-between p-5 bg-[#0a0c0f] border border-white/5 rounded-2xl hover:border-cyan-500/40 hover:bg-white/[0.03] transition-all cursor-pointer overflow-hidden"
                >
                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-14 h-14 flex items-center justify-center bg-black rounded-xl border border-white/10 group-hover:border-cyan-500/30 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
                      <Database size={22} className="text-gray-500 group-hover:text-cyan-400" />
                    </div>
                    
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                        {item.repo_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded-md border uppercase ${
                          item.graph_type === 'file' 
                            ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-500' 
                            : 'bg-rose-500/5 border-rose-500/20 text-rose-500'
                        }`}>
                          <Layout size={10} /> {item.graph_type}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                          <Calendar size={10} /> {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 italic">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right hidden sm:block">
                      <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Snapshot ID</div>
                      <div className="text-[10px] font-mono text-gray-500">{item.id.substring(0, 8)}...</div>
                    </div>
                    <ChevronRight className="text-gray-700 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" size={20} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                <Database size={48} className="text-gray-800 mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No records found in the vault</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.2); }
      `}</style>
    </div>
  );
};

export default HistoryPage;