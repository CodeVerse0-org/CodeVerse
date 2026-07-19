import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext.jsx";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useNotification();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="bg-[#0D1117] border-b border-[#21262D] px-6 py-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-tr from-[#1F6FEB] to-[#58A6FF] rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-[#1F6FEB]/20">
          A
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          Code<span className="text-[#1F6FEB]">Verse</span>{" "}
          <span className="text-xs text-[#8B949E] uppercase font-mono px-2 py-0.5 bg-[#161B22] border border-[#21262D] rounded-md ml-1">
            Admin
          </span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 text-[#8B949E] hover:text-white transition-colors duration-200 bg-[#161B22] border border-[#21262D] rounded-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1F6FEB] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0D1117]">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-[#161B22] border border-[#21262D] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-[#21262D] flex justify-between items-center bg-[#0D1117]">
                <h3 className="font-semibold text-white">System Events</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#1F6FEB] hover:underline font-medium"
                  >
                    Clear badges
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#21262D]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#8B949E] text-sm bg-[#161B22]">
                    No system log updates.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 transition-colors duration-150 ${
                        notif.isRead ? "bg-[#161B22]" : "bg-[#1F242C]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-medium text-white">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-[#8B949E]">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B949E] leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-[#21262D] rounded-lg hover:bg-[#161B22] hover:border-[#8B949E] transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
