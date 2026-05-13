import React from "react";
import { Link } from "react-router-dom";
import { Box, Bell, User, Menu, ChevronDown } from "lucide-react";

const AdminNavbar = ({ toggleSidebar, adminName }) => {
  return (
    <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/80 backdrop-blur-xl sticky top-0 z-[100]">
      <div className="flex items-center gap-6">
        {/* Toggle Button for the Admin Sidebar */}
        <button 
          onClick={toggleSidebar} 
          className="text-gray-400 hover:text-cyan-400 transition-all p-2 hover:bg-cyan-500/10 rounded-xl cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Logo Section - Links to Admin Dashboard */}
        <Link to="/adminDashboard" className="flex items-center gap-3 group">
           <div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)] group-hover:scale-110 transition-transform">
              <Box size={16} className="text-black fill-current" />
           </div>
           <div className="flex flex-col">
             <span className="font-black text-white text-sm tracking-[.15em] uppercase italic">CodeVerse</span>
             <span className="text-[8px] text-cyan-500 font-bold tracking-widest uppercase -mt-1">Admin Panel</span>
           </div>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative p-2 hover:bg-white/5 rounded-full cursor-pointer transition-colors group">
          <Bell size={19} className="text-gray-400 group-hover:text-white" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-black animate-pulse"></span>
        </div>

        {/* Admin Profile Action */}
        <Link 
          to="/settings" 
          className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity"
        >
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-xs font-bold text-white leading-none">{adminName || "System Admin"}</span>
            <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Root Access</span>
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

export default AdminNavbar;