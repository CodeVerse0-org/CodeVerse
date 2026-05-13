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
  Terminal
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

const DeveloperSidebar = ({ user, isOpen }) => {
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
    <aside className="w-80 bg-[#020405] border-r border-white/5 p-8 flex flex-col justify-between h-screen sticky top-0 z-30 shadow-2xl">
      <div>
        {/* Profile Section - Styled like Admin */}
        <div className="flex items-center gap-4 mb-12 p-2">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-cyan-900/20 flex items-center justify-center border border-cyan-500/20 shadow-inner overflow-hidden">
               {user?.first_name ? (
                 <span className="text-cyan-500 font-black text-xl uppercase">{user.first_name[0]}</span>
               ) : (
                 <User className="text-cyan-500" size={28} />
               )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#020405] ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
          </div>
          <div className="overflow-hidden">
            <p className="font-black text-lg truncate text-white tracking-tighter leading-tight">
              {user?.first_name || "Developer"}
            </p>
            {/* <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${isConnected ? "text-cyan-500/80" : "text-red-500/80"}`}>
              {isConnected ? "Dev Mode Active" : "Offline"}
            </p> */}
          </div>
        </div>

        {/* Navigation - Developer Routes */}
        <nav className="space-y-3">
          <SidebarItem 
            icon={<Home />} 
            label="Dashboard" 
            active={location.pathname === "/developerDashboard"} 
            onClick={() => navigate("/developerDashboard")} 
          />
          
          <div className="pt-4 pb-2 px-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Visualization</p>
          </div>

          <SidebarItem 
            icon={<Network />} 
            label="Visualization" 
            active={location.pathname.startsWith("/visualization")} 
            onClick={() => navigate("/visualization/select")} 
          />
          <SidebarItem 
            icon={<FileText />} 
            label="Summaries" 
            active={location.pathname === "/summaries-page"} 
            onClick={() => navigate("/summaries")} 
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
      <div className="pb-16"> 
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center gap-4 px-5 py-4 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300 font-bold text-sm group"
        >
          <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="uppercase tracking-widest text-xs">Logout</span>
        </button>
        
        {/* Visual Footer Detail */}
        <div className="mt-4 px-5 opacity-20 flex items-center gap-2">
            <Terminal size={12} className="text-white" />
            <div className="h-[1px] flex-1 bg-white" />
        </div>
      </div>
    </aside>
  );
};

export default DeveloperSidebar;