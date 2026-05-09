import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Box, Bell, User, Menu, ChevronDown, RefreshCw, X, CheckCircle2, Loader2 } from "lucide-react";
import { io } from "socket.io-client";

const DeveloperNavbar = ({ toggleSidebar }) => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState(null); // Track which repo is being synced
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  const socket = useRef(null);
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

  useEffect(() => {
    const repoIds = JSON.parse(localStorage.getItem("repoIds")) || [];

    socket.current = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
    });

    socket.current.on("connect", () => {
      socket.current.emit("join_repos", { repoIds });
    });

    socket.current.on("repo_updated", (data) => {
      // Logic: Adds notification and it stays until "Sync Now" is clicked
      setNotifications((prev) => [
        {
          id: Date.now(),
          repoName: data.repoName,
          repoId: data.repoId,
          message: `Repo Updated: ${data.repoName}`,
          details: `${data.pusher} pushed new code to the branch.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleSyncClick = (notification) => {
    setSyncingRepo(notification);
    setShowSyncModal(true);
    setShowDropdown(false);
    
    // Simulate graph generation/syncing process
    setTimeout(() => {
      // Remove notification only after sync is "started/done"
      setNotifications(notifications.filter((n) => n.id !== notification.id));
    }, 2000);
  };

  const clearNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <>
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center gap-6">
          <button onClick={toggleSidebar} className="text-gray-400 hover:text-cyan-400 transition-all p-2 hover:bg-cyan-500/10 rounded-xl cursor-pointer">
            <Menu size={20} />
          </button>

          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)] group-hover:scale-110 transition-transform">
              <Box size={16} className="text-black fill-current" />
            </div>
            <span className="font-black text-white text-sm tracking-[.15em] uppercase italic">CodeVerse</span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className={`relative p-2 rounded-full cursor-pointer transition-colors ${showDropdown ? "bg-cyan-500/10" : "hover:bg-white/5"}`}
            >
              <Bell size={19} className={notifications.length > 0 ? "text-cyan-400" : "text-gray-400"} />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-black animate-pulse"></span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-4 w-85 bg-[#0a0f14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Activity Feed</span>
                  {notifications.length > 0 && (
                    <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{notifications.length} Pending</span>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-gray-600 text-xs tracking-widest uppercase">System nominal • No updates</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors relative group">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                            <RefreshCw size={16} className="text-cyan-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white text-[13px] font-bold leading-tight">{n.message}</h4>
                            <p className="text-gray-500 text-[11px] mt-1 leading-relaxed">{n.details}</p>
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-[10px] text-gray-600 font-mono italic">{n.time}</span>
                              <button 
                                onClick={() => handleSyncClick(n)}
                                className="text-[10px] font-black uppercase tracking-tighter bg-cyan-500 text-black px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                              >
                                Sync Now
                              </button>
                            </div>
                          </div>
                          <button onClick={() => clearNotification(n.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-rose-500 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <Link to="/profilepage" className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center border border-white/10">
              <User size={18} className="text-gray-300" />
            </div>
            <ChevronDown size={14} className="text-gray-600" />
          </Link>
        </div>
      </header>

      {/* SYNC MODAL POPUP */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0a0f14] border border-cyan-500/30 w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <div className="p-8 text-center relative">
              <div className="scanline absolute inset-0 opacity-10 pointer-events-none"></div>
              
              <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20 relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                <RefreshCw size={32} className="text-cyan-400 animate-spin-slow relative z-10" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">
                Repository Updated
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                New changes detected in <span className="text-cyan-400 font-bold">{syncingRepo?.repoName}</span>. 
                Generating updated architecture graph and re-indexing source files...
              </p>

              <div className="space-y-3">
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="w-full py-4 bg-cyan-500 hover:bg-white text-black font-black uppercase tracking-[.2em] text-xs rounded-2xl transition-all flex items-center justify-center gap-3 group"
                >
                  <CheckCircle2 size={16} />
                  Proceed to Visualization
                </button>
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold uppercase tracking-widest text-[10px] rounded-2xl transition-all"
                >
                  Close Overlay
                </button>
              </div>
            </div>
            
            {/* Loading Bar Decoration */}
            <div className="h-1 w-full bg-white/5">
              <div className="h-full bg-cyan-500 animate-progress"></div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes progress { 
          0% { width: 0%; } 
          50% { width: 70%; }
          100% { width: 100%; } 
        }
        .animate-progress { animation: progress 2s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default DeveloperNavbar;