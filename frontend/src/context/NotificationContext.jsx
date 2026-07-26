import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { socket } from "../services/sockets";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Fetch initial notifications from DB
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchNotifications();

    // Get current logged-in user
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userData.id || userData.user_id;

    if (userId) {
      // Connect developer to their private socket room
      console.log(`🔌 Joining developer socket room: developer_${userId}`);
      socket.emit("join_developer", { userId: userId });
    }

    // Real-time Push Handler
    const handleRepoUpdated = (newNotif) => {
      console.log("🔔 NEW REPO COMMIT NOTIFICATION RECEIVED:", newNotif);
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    };

    socket.on("repo_updated", handleRepoUpdated);

    return () => {
      socket.off("repo_updated", handleRepoUpdated);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    const token = localStorage.getItem("token");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllAsRead, fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);