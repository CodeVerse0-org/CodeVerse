import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext.jsx";
import {
  Bell,
  User,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";

export default function DeveloperNavbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const { notifications, unreadCount, markAllAsRead } = useNotification();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setShowProfileDropdown(false);
      }
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSyncRepo = (notif) => {
    setSyncingRepo(notif);
    setShowSyncModal(true);
    setDropdownOpen(false);
    // Navigation removed so user stays on current page
  };

  const handleMarkAllRead = async () => {
    setDropdownOpen(false); // Close dropdown immediately
    if (markAllAsRead) {
      await markAllAsRead();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <>
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/90 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center gap-6">
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-cyan-400 transition-all p-2 hover:bg-cyan-500/10 rounded-xl cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>

          <Link
            to="/developerDashboard"
            className="flex items-center gap-3 group"
          >
            <div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)] group-hover:scale-110 transition-transform">
              <Terminal size={16} className="text-black fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm tracking-[.15em] uppercase italic">
                CodeVerse
              </span>
              <span className="text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Developer Console
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`relative p-2 rounded-full cursor-pointer transition-colors ${
                dropdownOpen ? "bg-cyan-500/10" : "hover:bg-white/5"
              }`}
            >
              <Bell
                size={19}
                className={unreadCount > 0 ? "text-cyan-400" : "text-gray-400"}
              />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-black animate-pulse"></span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-4 w-85 bg-[#0a0f14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                    Developer Activity Feed
                  </span>
                  {notifications && notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {!notifications || notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-gray-600 text-xs tracking-widest uppercase">
                        System nominal • No pending alerts
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id || Math.random()}
                        className={`p-4 border-b border-white/5 transition-colors relative group ${
                          notif.isRead ? "bg-transparent" : "bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                            <RefreshCw size={16} className="text-cyan-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white text-[13px] font-bold leading-tight">
                              {notif.title || "Notification"}
                            </h4>
                            <p className="text-gray-500 text-[11px] mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-[10px] text-gray-600 font-mono italic">
                                {notif.created_at || "Just now"}
                              </span>
                              {notif.repoId && (
                                <button
                                  onClick={() => handleSyncRepo(notif)}
                                  className="text-[10px] font-black uppercase tracking-tighter bg-cyan-500 text-black px-3 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                >
                                  Sync Graph
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div
            className="relative pl-4 border-l border-white/10"
            ref={profileDropdownRef}
          >
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center border border-white/10">
                <User size={18} className="text-cyan-400" />
              </div>
              <span className="text-xs font-bold text-gray-300 hidden md:inline">
                {localStorage.getItem("user_fname") || "Developer"}
              </span>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-4 w-52 bg-[#0a0f14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="p-2 space-y-1">
                  <Link
                    to="/developersettings"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
                  >
                    <Settings size={16} /> Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SYNC MODAL POPUP */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0a0f14] border border-cyan-500/30 w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <div className="p-8 text-center relative">
              <div className="scanline absolute inset-0 opacity-10 pointer-events-none"></div>

              <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20 relative">
                <CheckCircle2
                  size={32}
                  className="text-cyan-400 relative z-10"
                />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">
                Sync Status
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-8">
                New graph is ready for update for{" "}
                <span className="text-cyan-400 font-bold">
                  {syncingRepo?.title || "repository"}
                </span>
                .
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full py-4 bg-cyan-500 hover:bg-white text-black font-black uppercase tracking-[.2em] text-xs rounded-2xl transition-all flex items-center justify-center gap-3 group cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}