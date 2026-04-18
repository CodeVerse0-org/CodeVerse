import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  GitBranch, 
  Users, 
  Settings, 
  User, 
  LogOut, 
  UserPlus 
} from "lucide-react";

const SidebarItem = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200 group
    ${active 
      ? "bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
      : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
  >
    <span className={`${active ? "text-cyan-400" : "group-hover:text-cyan-400"} transition-colors`}>
      {React.cloneElement(icon, { size: 22 })}
    </span> 
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </div>
);

const Sidebar = ({ admin, isConnected, isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Maintain consistency with toggle logic used in dashboards
  if (isOpen === false) return null;

  return (
    <aside className="w-80 bg-[#020405] border-r border-white/5 p-8 flex flex-col justify-between h-screen sticky top-0 z-30 shadow-2xl">
      <div>
        {/* Profile Section */}
        <div className="flex items-center gap-4 mb-12 p-2">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-cyan-900/20 flex items-center justify-center border border-cyan-500/20 shadow-inner">
              <User className="text-cyan-500" size={28} />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#020405] ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
          </div>
          <div className="overflow-hidden">
            <p className="font-black text-lg truncate text-white tracking-tighter leading-tight">
              {admin.name || "Admin"}
            </p>
            <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${isConnected ? "text-green-500/80" : "text-red-500/80"}`}>
              {isConnected ? "System Online" : "System Offline"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-3">
          <SidebarItem 
            icon={<Home />} 
            label="Dashboard" 
            active={location.pathname === "/adminDashboard"} 
            onClick={() => navigate("/adminDashboard")} 
          />
          <SidebarItem 
            icon={<GitBranch />} 
            label="Repositories" 
            active={location.pathname === "/repositories"} 
            onClick={() => navigate("/repositories")} 
          />
          <SidebarItem 
            icon={<Users />} 
            label="Users & Access" 
            active={location.pathname === "/Users"} 
            onClick={() => navigate("/Users")} 
          />
          <SidebarItem 
            icon={<UserPlus />} 
            label="Invite Users" 
            active={location.pathname === "/invite-users"} 
            onClick={() => navigate("/invite-users")} 
          />
          <SidebarItem 
            icon={<Settings />} 
            label="Settings" 
            active={location.pathname === "/settings"} 
            onClick={() => navigate("/settings")} 
          />
        </nav>
      </div>

      {/* Logout moved up via padding-bottom */}
      <div className="pb-16"> 
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center gap-4 px-5 py-4 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300 font-bold text-sm group"
        >
          <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="uppercase tracking-widest text-xs">Logout</span>
        </button>
        
        {/* Visual Footer */}
        <div className="mt-4 px-5 opacity-20">
           <div className="h-[1px] w-full bg-white" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;