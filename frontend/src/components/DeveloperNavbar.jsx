import React from "react";
import { Box, Bell, User, Menu } from "lucide-react";

const DeveloperNavbar = ({ toggleSidebar }) => {
  return (
    <header className="h-10 border-b border-white/5 flex items-center justify-between px-6 bg-black sticky top-0 z-[100]">
      <div className="flex items-center gap-4">
        {/* Toggle Button - This triggers the logic in DeveloperDashboard */}
        <button 
          onClick={toggleSidebar} 
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded cursor-pointer"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
           <div className="w-5 h-5 bg-cyan-600 rounded-sm flex items-center justify-center">
              <Box size={12} className="text-black fill-current" />
           </div>
           <span className="font-bold text-white text-sm tracking-tight">CodeVerse</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Bell size={18} className="text-gray-400 cursor-pointer hover:text-white" />
        <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center border border-white/10">
          <User size={14} className="text-gray-300" />
        </div>
      </div>
    </header>
  );
};

export default DeveloperNavbar;