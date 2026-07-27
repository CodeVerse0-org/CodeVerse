// DeveloperSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Network,
  FileText,
  MessageSquare,
  History,
  LogOut,
  User,
  Settings,
  Terminal,
  Loader2,
} from "lucide-react";

const SidebarItem = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group
    ${
      active
        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        : "text-gray-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
    }`}
  >
    <span
      className={`${active ? "text-cyan-400" : "group-hover:text-cyan-400"} transition-colors`}
    >
      {React.cloneElement(icon, { size: 18 })}
    </span>
    <span className="text-xs font-bold tracking-wider uppercase">{label}</span>
  </div>
);

const DeveloperSidebar = ({ user, isOpen, loading }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Visibility toggle to match dashboard logic
  if (isOpen === false) return null;

  const isConnected = !!user; // Connected if user data exists

  return (
    <aside className="w-72 bg-[#020405] border-r border-white/5 p-6 flex flex-col justify-between h-full sticky top-14 z-30 shadow-2xl shrink-0">
      <div className="space-y-6">
        {/* Profile Section - Styled like Admin */}
        <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-cyan-900/20 flex items-center justify-center border border-cyan-500/20">
              {user?.first_name ? (
                <span className="text-cyan-400 font-black text-sm uppercase">
                  {user.first_name[0]}
                </span>
              ) : (
                <User className="text-cyan-400" size={18} />
              )}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#020405] ${isConnected ? "bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-cyan-500 animate-pulse"}`}
            />
          </div>
          <div className="overflow-hidden flex-1">
            {loading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span className="text-[10px] font-mono text-gray-400 tracking-wider">
                  Loading...
                </span>
              </div>
            ) : (
              <p className="font-bold text-xs truncate text-white tracking-tight">
                {user?.first_name || "Developer"}
              </p>
            )}
          </div>
        </div>

        {/* Navigation - Developer Routes */}
        <nav className="space-y-1.5">
          <SidebarItem
            icon={<Home />}
            label="Dashboard"
            active={location.pathname === "/developerDashboard"}
            onClick={() => navigate("/developerDashboard")}
          />
          <SidebarItem
            icon={<Network />}
            label="Visualization"
            active={location.pathname.startsWith("/visualization")}
            onClick={() => navigate("/visualization/select")}
          />
          <SidebarItem
            icon={<Terminal />}
            label="Analyze Repo"
            active={location.pathname === "/analyze-repo"}
            onClick={() => navigate("/analyze-repo")}
          />
          <SidebarItem
            icon={<MessageSquare />}
            label="Chatbot"
            active={location.pathname === "/chatbot-selection"}
            onClick={() => navigate("/chatbot-selection")}
          />
          <SidebarItem
            icon={<History />}
            label="History"
            active={location.pathname === "/history"}
            onClick={() => navigate("/history")}
          />
          <SidebarItem
            icon={<Settings />}
            label="Settings"
            active={location.pathname === "/developersettings"}
            onClick={() => navigate("/developersettings")}
          />
        </nav>
      </div>

      {/* Logout / Footer Section */}
      <div className="pt-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold text-xs group cursor-pointer"
        >
          <LogOut
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default DeveloperSidebar;
