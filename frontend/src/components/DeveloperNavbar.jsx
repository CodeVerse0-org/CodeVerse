// components/DeveloperNavbar.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext.jsx";
import { RefreshCw, Bell } from "lucide-react";

export default function DeveloperNavbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotification();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleSyncRepo = (repoId) => {
    setDropdownOpen(false);
    // Redirect developer to visualization page with sync trigger
    navigate(`/visualization/graph/${repoId}?sync=true`);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0D1117] border-b border-[#21262D] px-6 py-4 flex items-center justify-between rounded-t-xl">
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-8 h-8 bg-gradient-to-tr from-[#3FB950] to-[#238636] rounded-lg flex items-center justify-center font-bold text-white">
          C
        </div>
        <span className="text-xl font-bold text-white">
          Code<span className="text-[#3FB950]">Verse</span>
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-lg border border-[#21262D] bg-[#161B22] text-[#8B949E] hover:text-white transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#3FB950] text-black text-[10px] font-bold flex items-center justify-center border-2 border-[#0D1117]">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-88 rounded-xl border border-[#21262D] bg-[#161B22] shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262D]">
                <h3 className="font-semibold text-white text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#3FB950] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#21262D]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#8B949E]">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id || Math.random()}
                      className={`p-4 ${notif.isRead ? "bg-[#161B22]" : "bg-[#1F242C]"}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                        <span className="text-[10px] text-[#8B949E] whitespace-nowrap">
                          {notif.time || "Just now"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[#8B949E] leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Sync Button Action */}
                      {notif.repoId && (
                        <button
                          onClick={() => handleSyncRepo(notif.repoId)}
                          className="mt-3 w-full py-1.5 px-3 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition"
                        >
                          <RefreshCw size={12} className="animate-spin-slow" />
                          Sync Graph Now
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg border border-[#21262D] text-white hover:bg-[#161B22] text-xs font-semibold transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}