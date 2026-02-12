import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Network, FileText, MessageSquare, History, LogOut, User 
} from "lucide-react";

const NavItem = ({ icon, label, active, onClick }) => (
  <div 
    onClick={onClick} 
    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all ${
      active 
        ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-800/20 shadow-[0_0_15px_rgba(8,145,178,0.1)]' 
        : 'text-gray-500 hover:bg-white/5 hover:text-white'
    }`}
  >
    {icon} 
    <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>
  </div>
);

const DeveloperSidebar = ({ user, isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/visualization") {
      return location.pathname.startsWith("/visualization");
    }
    return location.pathname === path;
  };

  return (
    <aside 
      className={`bg-black border-white/5 flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out z-50 shrink-0 overflow-hidden ${
        isOpen 
          ? 'w-64 opacity-100 border-r' 
          : 'w-0 opacity-0 pointer-events-none border-r-0'
      }`}
    >
      {/* We wrap the content in a fixed-width container (w-64) 
          so the text doesn't "squish" or wrap during the width transition.
      */}
      <div className="w-64 flex flex-col h-full">
        <div className="p-6"> 
          <div className="flex items-center gap-3 mb-10 text-left">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-gray-900 overflow-hidden shrink-0">
               {user?.first_name ? (
                 <span className="text-cyan-500 font-bold uppercase">{user.first_name[0]}</span>
               ) : (
                 <User size={20} className="text-gray-400" />
               )}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-white truncate">
                {user?.first_name || "Developer"} {user?.last_name || ""}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || "loading..."}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] text-gray-600 uppercase font-bold mb-2 px-3 text-left tracking-wider">
              Main Menu
            </p>
            <NavItem 
              icon={<LayoutDashboard size={18} />} 
              label="Dashboard" 
              active={isActive("/developerDashboard")} 
              onClick={() => navigate("/developerDashboard")} 
            />
            
            <p className="text-[10px] text-gray-600 uppercase font-bold mt-6 mb-2 px-3 text-left tracking-wider">
              Visualization Tools
            </p>
          
            <NavItem 
              icon={<Network size={18} />} 
              label="Visualization" 
              active={location.pathname.startsWith("/visualization")} 
              onClick={() => navigate("/visualization/select")} 
            />
            <NavItem icon={<FileText size={18} />} label="File Summaries" active={isActive("/summaries")} onClick={() => navigate("/summaries")} />
            <NavItem icon={<MessageSquare size={18} />} label="Chat Bot" active={isActive("/chatbot")} onClick={() => navigate("/chatbot")} />
            <NavItem icon={<History size={18} />} label="History" active={isActive("/history")} onClick={() => navigate("/history")} />
          </nav>
        </div>

        <button 
          onClick={() => { 
              localStorage.removeItem("token"); 
              navigate("/login"); 
          }} 
          className="mt-auto p-6 flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-sm border-t border-white/5 w-64 active:bg-red-500/5"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
};

export default DeveloperSidebar;