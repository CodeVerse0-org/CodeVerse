import React from "react";
import { Link } from "react-router-dom"; // Import Link for navigation
import { Box, Bell, User, Menu, ChevronDown } from "lucide-react";

const DeveloperNavbar = ({ toggleSidebar }) => {
  return (
    <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/80 backdrop-blur-xl sticky top-0 z-[100]">
      <div className="flex items-center gap-6">
        {/* Toggle Button */}
        <button 
          onClick={toggleSidebar} 
          className="text-gray-400 hover:text-cyan-400 transition-all p-2 hover:bg-cyan-500/10 rounded-xl cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Logo Section */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
           <div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)] group-hover:scale-110 transition-transform">
              <Box size={16} className="text-black fill-current" />
           </div>
           <div className="flex flex-col">
             <span className="font-black text-white text-sm tracking-[.15em] uppercase italic">CodeVerse</span>
  
           </div>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative p-2 hover:bg-white/5 rounded-full cursor-pointer transition-colors group">
          <Bell size={19} className="text-gray-400 group-hover:text-white" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-black animate-pulse"></span>
        </div>

        {/* PROFILE ACTION: Links to /profile */}
        <Link 
          to="/profilepage" 
          className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col items-end hidden md:flex">
           
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center border border-white/10 overflow-hidden">
              <User size={18} className="text-gray-300" />
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-600" />
        </Link>
      </div>
    </header>
  );
};

export default DeveloperNavbar;