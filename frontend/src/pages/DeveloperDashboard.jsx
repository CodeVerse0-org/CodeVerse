

// DeveloperDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  Search,
  Loader2,
  ChevronRight,
  BarChart3,
  Activity,
} from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const DeveloperDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const fetchRepos = useCallback(
    async (token) => {
      try {
        const res = await fetch(`${API_URL}/api/github/developer/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          return data.map((r) => ({
            id: r.id || r.repo_id,
            name: r.name || r.repo_name,
            fullName: r.full_name,
            url: r.html_url,
          }));
        }
        return [];
      } catch (err) {
        return [];
      }
    },
    [API_URL],
  );

  const initDashboard = useCallback(async () => {
    setLoadingData(true);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Session expired");
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      const repoData = await fetchRepos(token);
      setProjects(repoData);
      const repoIds = repoData.map((r) => r.id);
      localStorage.setItem("repoIds", JSON.stringify(repoIds));
    } catch (err) {
      if (err.message === "Session expired") navigate("/login");
    } finally {
      setLoadingData(false);
    }
  }, [API_URL, fetchRepos, navigate]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="h-screen flex flex-col bg-black text-gray-300 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Navbar with Sidebar Toggle */}
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar
          user={user}
          isOpen={isSidebarOpen}
          loading={loadingData}
        />

        <div className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar bg-black">
          <div className="max-w-7xl w-full mx-auto p-6 space-y-6 relative z-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black border border-white/5 p-6 rounded-2xl">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  DEVELOPER DASHBOARD
                </h1>
                <p className="text-gray-500 text-xs mt-0.5">
                  Manage and visualize connected repository architecture.
                </p>
              </div>

              {/* Quick Metrics Badges */}
              <div className="flex items-center gap-3">
                {/* Managed Repositories Metric with Tooltip */}
                <div className="relative group/tooltip bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase text-gray-500">
                      Managed
                    </p>
                    <p className="text-sm font-bold text-white">
                      {projects.length}
                    </p>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-[#0a0f14] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                    <p className="text-[10px] font-mono uppercase font-bold text-cyan-400 mb-1">
                      Repository Insights
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      You currently have{" "}
                      <span className="text-white font-bold">
                        {projects.length}
                      </span>{" "}
                      connected repositories active and registered in your
                      development scope.
                    </p>
                  </div>
                </div>

                {/* System Status Metric with Tooltip */}
                <div className="relative group/tooltip bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase text-gray-500">
                      Status
                    </p>
                    <p className="text-xs font-bold text-green-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      Nominal
                    </p>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-[#0a0f14] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                    <p className="text-[10px] font-mono uppercase font-bold text-green-400 mb-1">
                      System Health
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      All background API synchronization links, webhooks, and
                      dashboard communication pipelines are operating normally.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar Block */}
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Search connected repository name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            {/* Repository Data Table Card */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black shadow-xl">
              {loadingData ? (
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <Loader2
                    className="animate-spin text-cyan-400 mb-3"
                    size={24}
                  />
                  <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                    Syncing Repositories...
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/[0.02] border-b border-white/5 text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">
                          Repository Name
                        </th>
                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center">
                          Identity Path
                        </th>
                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((p) => (
                          <tr
                            key={p.id}
                            className="group hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-400 transition-all">
                                  <Folder size={16} className="text-cyan-400" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-white block">
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    ID: {p.id}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-center font-mono text-[11px]">
                              <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                {p.fullName}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  navigate(`/visualization/select`)
                                }
                                className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-cyan-500 hover:text-black transition-all inline-flex items-center gap-1.5 cursor-pointer group/btn"
                              >
                                View Analytics{" "}
                                <ChevronRight
                                  size={14}
                                  className="group-hover/btn:translate-x-0.5 transition-transform"
                                />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="3"
                            className="text-center py-16 text-gray-600 text-xs uppercase tracking-wider"
                          >
                            No repositories found in registry.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;