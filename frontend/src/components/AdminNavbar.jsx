import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext.jsx";

export default function AdminNavbar() {
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1F6FEB] to-[#58A6FF] flex items-center justify-center font-bold text-white shadow-md shadow-[#1F6FEB]/20">
          A
        </div>

        <span className="text-xl font-bold tracking-tight text-white">
          Code
          <span className="text-[#1F6FEB]">Verse</span>

          <span className="ml-2 rounded-md border border-[#21262D] bg-[#161B22] px-2 py-0.5 text-xs uppercase font-mono text-[#8B949E]">
            Admin
          </span>
        </span>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">

        {/* Notification */}
        <div className="relative">

          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative rounded-lg border border-[#21262D] bg-[#161B22] p-2 text-[#8B949E] transition hover:text-white"
          >
            <svg
              className="h-5 w-5"
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
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0D1117] bg-[#1F6FEB] text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22] shadow-2xl">

              <div className="flex items-center justify-between border-b border-[#21262D] bg-[#0D1117] px-4 py-3">
                <h3 className="font-semibold text-white">
                  System Events
                </h3>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-[#1F6FEB] hover:underline"
                  >
                    Clear badges
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">

                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#8B949E]">
                    No system log updates.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`border-b border-[#21262D] p-4 ${
                        notif.isRead
                          ? "bg-[#161B22]"
                          : "bg-[#1F242C]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold text-white">
                          {notif.title}
                        </h4>

                        <span className="text-[10px] text-[#8B949E]">
                          {notif.time}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-[#8B949E]">
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
          className="rounded-lg border border-[#21262D] px-4 py-2 text-sm font-medium text-white transition hover:border-[#8B949E] hover:bg-[#161B22]"
        >
          Logout
        </button>

      </div>

    </nav>
  );
}