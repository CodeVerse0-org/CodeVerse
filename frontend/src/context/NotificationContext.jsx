import React, { createContext, useContext, useState, useEffect } from "react";
import { socket } from "../services/sockets";

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  setNotifications: () => {},
  markAllAsRead: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Function to handle joining the correct room
    const registerSocketRooms = (user) => {
      if (user.role === "admin") {
        console.log(`🔌 Emitting join_admin for adminId: ${user.id}`);
        socket.emit("join_admin", { adminId: user.id });
      } else if (user.role === "developer") {
        console.log(`🔌 Emitting join_developer for userId: ${user.id}`);
        socket.emit("join_developer", { userId: user.id });
      }
    };

    if (token) {
      // 1. Instantly check if user data is cached in localStorage to prevent async lag
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        registerSocketRooms(user);
      }

      // 2. Fetch fresh profile details and establish/ensure room connection
      fetch("http://localhost:8000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((user) => {
          // Sync cache if needed
          localStorage.setItem("user", JSON.stringify(user));

          // If socket is already connected or reconnects later, register it
          registerSocketRooms(user);

          socket.on("connect", () => {
            registerSocketRooms(user);
          });
        })
        .catch((err) =>
          console.error("Error linking socket to user room:", err),
        );
    }

    // 3. Listen to targeted event spaces matching backend configurations
    const handleAdminNotification = (data) => {
      console.log("📩 Received admin_notification:", data);
      setNotifications((prev) => [
        {
          id: Date.now(),
          title: data.title,
          message: data.message || data.details,
          isRead: false,
          time: "Just now",
        },
        ...prev,
      ]);
    };

    const handleDeveloperNotification = (data) => {
      console.log("📩 Received repo_updated:", data);
      setNotifications((prev) => [
        {
          id: Date.now(),
          title: data.title,
          message: `${data.details || data.message} Please ask admin to regenerate the graph.`,
          isRead: false,
          time: "Just now",
        },
        ...prev,
      ]);
    };

    socket.on("admin_notification", handleAdminNotification);
    socket.on("repo_updated", handleDeveloperNotification);

    return () => {
      socket.off("connect");
      socket.off("admin_notification", handleAdminNotification);
      socket.off("repo_updated", handleDeveloperNotification);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, setNotifications, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
