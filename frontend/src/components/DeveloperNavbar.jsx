import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext.jsx";

export default function DeveloperNavbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    markAllAsRead,
  } = useNotification();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0D1117] border-b border-[#21262D] px-6 py-4 flex items-center justify-between rounded-t-xl">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-tr from-[#3FB950] to-[#238636] rounded-lg flex items-center justify-center font-bold text-white">
          C
        </div>

        <span className="text-xl font-bold text-white">
          Code<span className="text-[#3FB950]">Verse</span>
        </span>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">

        {/* Notification */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-lg border border-[#21262D] bg-[#161B22] text-[#8B949E] hover:text-white transition"
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
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#3FB950] text-black text-[10px] font-bold flex items-center justify-center border-2 border-[#0D1117]">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl border border-[#21262D] bg-[#161B22] shadow-2xl overflow-hidden">

              <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262D]">
                <h3 className="font-semibold text-white">
                  Notifications
                </h3>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#3FB950] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">

                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#8B949E]">
                    No notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-[#21262D] ${
                        notif.isRead
                          ? "bg-[#161B22]"
                          : "bg-[#1F242C]"
                      }`}
                    >
                      <div className="flex justify-between">
                        <h4 className="text-sm font-semibold text-white">
                          {notif.title}
                        </h4>

                        <span className="text-[10px] text-[#8B949E]">
                          {notif.time}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[#8B949E]">
                        {notif.message}
                      </p>
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
          className="px-4 py-2 rounded-lg border border-[#21262D] text-white hover:bg-[#161B22] transition"
        >
          Logout
        </button>

      </div>
    </nav>
  );
}