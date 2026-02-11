import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, LayoutDashboard, Box, Plus, User, Eye, Network,
  FileText, MessageSquare, History, Folder, Search, LogOut
} from "lucide-react";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ id: null, first_name: "", last_name: "", email: "" });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Fetch Developer Repositories ---
  const fetchRepos = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.map(r => ({
          id: r.repo_id,
          name: r.repo_name,
          fullName: r.full_name,
          url: r.html_url,
        })));
      }
    } catch (err) {
      console.error("Fetch Repos Error:", err);
    }
  }, [API_URL]);

  // --- Initialize Dashboard ---
  useEffect(() => {
    const initDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // 1. Fetch User Info
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Auth failed");
        const userData = await res.json();
        setUser(userData);

        // 2. Handle Pending Invite
        const pendingToken = localStorage.getItem("pendingInviteToken");
        if (pendingToken && userData.id) {
          const acceptRes = await fetch(`${API_URL}/api/invite/accept/${pendingToken}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_id: parseInt(userData.id, 10) }),
          });
          if (acceptRes.ok) {
            console.log("Invite accepted successfully!");
            localStorage.removeItem("pendingInviteToken");
          }
        }

        // 3. Fetch Repositories
        await fetchRepos();
      } catch (err) {
        console.error("Dashboard Init Error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [API_URL, fetchRepos, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030708] text-cyan-500 font-mono">
      <div className="animate-pulse">Loading Workspace...</div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#030708] text-gray-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-black border-r border-white/5 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 text-left">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-gray-900 overflow-hidden">
               {user.first_name ? (
                 <span className="text-cyan-500 font-bold">{user.first_name[0]}</span>
               ) : (
                 <User size={20} className="text-gray-400" />
               )}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-white truncate">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] text-gray-600 uppercase font-bold mb-2 px-3 text-left">Main Menu</p>
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active onClick={() => navigate("/developerDashboard")} />
            
            <p className="text-[10px] text-gray-600 uppercase font-bold mt-6 mb-2 px-3 text-left">Visualization Tools</p>
            <NavItem icon={<Network size={18} />} label="Visualization" onClick={() => navigate("/visualization")} />
            <NavItem icon={<FileText size={18} />} label="File Summaries" />
            <NavItem icon={<MessageSquare size={18} />} label="Chat Bot" />
            <NavItem icon={<History size={18} />} label="History" />
          </nav>
        </div>

        <button 
          onClick={() => { localStorage.clear(); navigate("/login"); }} 
          className="mt-auto p-6 flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black">
          <div className="flex items-center gap-2">
             <div className="w-5 h-5 bg-cyan-600 rounded-sm flex items-center justify-center">
                <Box size={12} className="text-black fill-current" />
             </div>
             <span className="font-bold text-white text-sm">CodeVerse</span>
          </div>
          <div className="flex items-center gap-5">
            <Bell size={18} className="text-gray-400" />
            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
              <User size={14} />
            </div>
          </div>
        </header>

        <div className="p-8 flex gap-6 overflow-y-auto">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-6 text-left">
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome Back!</h1>
                <p className="text-xs text-gray-500">Overview of your assigned projects and active repositories.</p>
              </div>
              <button className="bg-[#134e4e] text-cyan-100 px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#1a6b6b] transition-colors">
                <Plus size={16} className="inline mr-1"/> Upload Local Projects
              </button>
            </div>

            <div className="relative mb-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search assigned projects or paste public GitHub repo URL..." 
                className="w-full bg-black border border-white/10 rounded-md py-2 pl-10 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/30 transition-all" 
              />
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-md font-semibold text-white">Active Projects ({projects.length})</h2>
              <button className="text-cyan-500 text-[11px] hover:underline">View all</button>
            </div>

            <div className="border border-white/5 rounded-md overflow-hidden bg-black/20 backdrop-blur-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-white/5 text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Project Name</th>
                    <th className="px-6 py-4 font-medium text-center">Repository Path</th>
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
                          className="flex items-center gap-2 ml-auto px-4 py-1.5 bg-[#1a1a1a] border border-white/10 rounded text-[10px] hover:bg-cyan-900/20 hover:text-cyan-400 hover:border-cyan-800/50 transition-all text-gray-400"
                        >
                           <Eye size={12} /> View Visualization
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Folder size={40} className="text-gray-800 mb-4" />
                  <h3 className="text-sm font-semibold text-gray-500">Workspace Empty</h3>
                  <p className="text-[10px] text-gray-600 max-w-[200px] mt-2">Check your notifications for new repository invitations.</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-72 space-y-4">
            <div className="bg-black/40 border border-white/10 rounded-lg p-5 min-h-[220px] flex flex-col">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase text-center mb-4 tracking-widest border-b border-white/5 pb-2">Notifications</h3>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[10px] text-gray-700 italic">No new notifications</p>
              </div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-lg p-5 min-h-[220px] flex flex-col">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase text-center mb-4 tracking-widest border-b border-white/5 pb-2">Recent Activity</h3>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[10px] text-gray-700 italic">No recent history</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Internal Sidebar Nav Item ---
const NavItem = ({ icon, label, active, onClick }) => (
  <div 
    onClick={onClick} 
    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all ${active ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_15px_rgba(8,145,178,0.1)]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
  >
    {icon} 
    <span className="text-[13px] font-medium">{label}</span>
  </div>
);

export default DeveloperDashboard;
