import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, GitBranch, Users, Settings, User, LogOut } from "lucide-react";

const SidebarItem = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded cursor-pointer transition-all
    ${active ? "bg-[#0b3a42] text-white shadow-lg" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
  >
    {icon} {label}
  </div>
);

const Sidebar = ({ admin, isConnected }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <aside className="w-72 bg-black/70 border-r border-white/10 p-6 flex flex-col justify-between h-screen sticky top-0">
      <div>
        <div className="flex items-center gap-3 mb-10">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
              <User className="text-cyan-400" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold truncate text-white">{admin.name || "Admin"}</p>
            <p className={`text-[10px] font-bold uppercase ${isConnected ? "text-green-400" : "text-red-400"}`}>
              {isConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          <SidebarItem icon={<Home size={18} />} label="Dashboard" active={location.pathname === "/adminDashboard"} onClick={() => navigate("/adminDashboard")} />
          <SidebarItem icon={<GitBranch size={18} />} label="Repositories" active={location.pathname === "/repositories"} onClick={() => navigate("/repositories")} />
<SidebarItem icon={<Users size={18} />} label="Users and Access" active={location.pathname === "/users"} onClick={() => navigate("/users")} />
          <SidebarItem icon={<Settings size={18} />} label="Settings" active={location.pathname === "/settings"} onClick={() => navigate("/settings")} />
        </nav>
      </div>

      <button onClick={handleLogout} className="flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors">
        <LogOut size={18} /> Logout
      </button>
    </aside>
  );
};

export default Sidebar;