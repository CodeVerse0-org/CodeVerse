import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, User, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnected, setIsConnected] = useState(false); // Added for Sidebar status
  const [admin, setAdmin] = useState({ name: "", email: "" }); // Added for Sidebar Profile
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  // Inside UserManagement.jsx - Ensure the header is always present
const fetchData = async () => {
  setLoading(true);
  const token = localStorage.getItem("token"); // This token contains the Admin ID
  if (!token) return navigate("/login");
  
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // The '/manage' endpoint now automatically filters by the token's admin_id
    const usersRes = await fetch(`${API_URL}/api/invite/manage`, { headers });
    if (usersRes.ok) {
      const userData = await usersRes.json();
      setUsers(userData);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const handleRevoke = async (id, isInvite) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    try {
      const res = await fetch(`${API_URL}/api/invite/revoke/${id}?is_invite=${isInvite}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        {/* Pass the dynamic admin state here */}
        <Sidebar 
          admin={admin} 
          isConnected={isConnected} 
          isOpen={isSidebarOpen} 
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Access Management / Users</h2>
          </header>

          <main className="flex-1 p-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="max-w-[1600px] mx-auto">
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                <div>
                  <h1 className="text-4xl font-extrabold text-white flex items-center gap-4 tracking-tight">
                    User Access <User className="text-cyan-500" size={36} />
                  </h1>
                  <p className="text-sm text-gray-400 mt-2 font-medium">Manage developer permissions and active invitations.</p>
                </div>
                <button 
                  onClick={() => navigate("/invite-users")}
                  className="bg-[#134e4e] text-cyan-50 px-8 py-4 rounded-xl text-sm font-black hover:bg-[#1a6b6b] transition-all flex items-center gap-3 shadow-lg shadow-cyan-900/20 uppercase tracking-widest"
                >
                  <Plus size={20} /> Invite New User
                </button>
              </div>

              {/* Search & Stats Bar */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={22} />
                  <input 
                    type="text" 
                    placeholder="Search by name or email..." 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-14 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-base font-medium text-white"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="bg-black/40 border border-white/5 px-8 py-4 rounded-2xl flex items-center gap-6">
                   <div className="text-center border-r border-white/10 pr-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</p>
                      <p className="text-xl font-black text-cyan-400">{users.length}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active</p>
                      <p className="text-xl font-black text-green-500">{users.filter(u => u.status === 'Active').length}</p>
                   </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-black/20 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-md shadow-2xl">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-cyan-500" size={48} />
                    <p className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Syncing User Directory...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/[0.02] border-b border-white/5">
                      <tr>
                        <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-500">Developer</th>
                        <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-500">Access Scope</th>
                        <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-500">Status</th>
                        <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-500">Joined Date</th>
                        <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Security Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-black text-lg border border-cyan-500/10">
                                  {user.name?.charAt(0) || <User size={20}/>}
                               </div>
                               <div>
                                  <div className="font-black text-white text-lg tracking-tight">{user.name}</div>
                                  <div className="text-sm text-cyan-500/60 font-bold">{user.email}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-cyan-900/20 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-xl text-xs font-black tracking-tight uppercase">
                              {user.repo_count} Repositories
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <span className={`h-2.5 w-2.5 rounded-full ${user.status === "Active" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]"}`} />
                               <span className={`text-sm font-black uppercase tracking-tighter ${user.status === "Active" ? "text-green-400" : "text-yellow-500"}`}>
                                 {user.status}
                               </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-gray-400 text-sm font-bold font-mono uppercase">{user.date}</td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleRevoke(user.id, user.status === "Pending Invitation")}
                              className="inline-flex items-center gap-2 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-red-500/20 group"
                            >
                              <Trash2 size={16} className="group-hover:scale-110 transition-transform"/> 
                              {user.status === "Pending Invitation" ? "Remove Invite" : "Revoke Access"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UserManagement;