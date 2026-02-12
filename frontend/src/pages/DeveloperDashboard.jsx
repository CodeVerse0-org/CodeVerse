import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Folder, Search, AlertCircle, RefreshCcw, Loader2 } from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  // --- Persistent Sidebar State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchRepos = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(r => ({
          id: r.repo_id,
          name: r.repo_name,
          fullName: r.full_name,
          url: r.html_url,
        }));
      }
      return [];
    } catch (err) {
      console.error("Fetch Repos Error:", err);
      return [];
    }
  }, [API_URL]);

  const initDashboard = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired");
        throw new Error("Server communication failed");
      }
      
      const userData = await res.json();
      setUser(userData);

      const repoData = await fetchRepos(token);
      setProjects(repoData);
    } catch (err) {
      setError(err.message);
      if (err.message === "Session expired") {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoadingData(false);
    }
  }, [API_URL, fetchRepos, navigate]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-12 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Developer Dashboard</h2>
          </header>

          <main className="flex-1 p-8 flex gap-8 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-6 text-left">
                <div>
                  <h1 className="text-2xl font-bold text-white">Welcome Back!</h1>
                  <p className="text-[11px] text-gray-500">Overview of your assigned projects and active repositories.</p>
                </div>
                <button className="bg-[#134e4e] text-cyan-100 px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#1a6b6b] transition-colors flex items-center gap-2">
                  <Plus size={16} /> Upload Local Projects
                </button>
              </div>

              <div className="relative mb-10">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search assigned projects..." 
                  className="w-full bg-black border border-white/10 rounded-md py-2 pl-10 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/30 transition-all" 
                />
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-md font-semibold text-white">Active Projects</h2>
                <button className="text-cyan-500 text-[11px] hover:underline">View all</button>
              </div>

              <div className="border border-white/5 rounded-md overflow-hidden bg-black/20 backdrop-blur-sm min-h-[300px] flex flex-col">
                {loadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="animate-spin text-cyan-500" size={24} />
                    <span className="text-[10px] uppercase tracking-tighter text-gray-500">Retrieving Repositories...</span>
                  </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-6 text-center">
                        <AlertCircle className="text-red-500/50" size={24} />
                        <p className="text-xs text-gray-500">{error}</p>
                        <button onClick={initDashboard} className="text-[10px] text-cyan-500 flex items-center gap-1 hover:text-cyan-400">
                            <RefreshCcw size={10} /> Try Again
                        </button>
                    </div>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-white/5 text-gray-500 uppercase">
                      <tr>
                        <th className="px-6 py-4 font-medium text-[10px] tracking-wider">Project Name</th>
                        <th className="px-6 py-4 font-medium text-[10px] tracking-wider text-center">Repository Path</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {projects.map((p) => (
                        <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-gray-300 font-medium">{p.name}</td>
                          <td className="px-6 py-4 text-gray-500 text-center font-mono">{p.fullName}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => navigate(`/visualization?repo=${p.fullName}`)} 
                              className="flex items-center gap-2 ml-auto px-4 py-1.5 bg-[#1a1a1a] border border-white/10 rounded text-[10px] hover:bg-cyan-900/20 hover:text-cyan-400 transition-all text-gray-400"
                            >
                              <Eye size={12} /> View Visualization
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {!loadingData && projects.length === 0 && !error && (
                  <div className="p-20 text-center flex flex-col items-center">
                    <Folder size={40} className="text-gray-800 mb-4" />
                    <p className="text-gray-600 text-[11px]">No active projects found.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-80 shrink-0 space-y-4">
              <div className="bg-black/40 border border-white/10 rounded-lg p-5 min-h-[220px] flex flex-col">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase text-center mb-4 tracking-widest border-b border-white/5 pb-2">Notifications</h3>
                {loadingData ? (
                     <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-700" size={16} />
                     </div>
                ) : (
                    <p className="text-[10px] text-gray-700 italic text-center mt-10">No new notifications</p>
                )}
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-lg p-5 min-h-[220px]">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase text-center mb-4 tracking-widest border-b border-white/5 pb-2">System Status</h3>
                <div className="mt-4 flex items-center justify-between text-[10px]">
                   <span className="text-gray-500">API Latency</span>
                   <span className="text-cyan-500">24ms</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px]">
                   <span className="text-gray-500">Auth Server</span>
                   <span className="text-green-500">Online</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DeveloperDashboard;