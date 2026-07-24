import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { socket } from "../services/sockets";

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAllAsRead: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    //---------------------------------------------------
    // Join Socket Rooms
    //---------------------------------------------------

    const registerSocketRooms = (user) => {
      if (user.role === "admin") {
        console.log("Joining Admin Room:", user.id);

        socket.emit("join_admin", {
          adminId: user.id,
        });
      }

      if (user.role === "developer") {
        console.log("Joining Developer Room:", user.id);

        socket.emit("join_developer", {
          userId: user.id,
        });
      }
    };

    //---------------------------------------------------
    // Load Existing Notifications
    //---------------------------------------------------

    fetch("http://localhost:8000/notifications", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const formatted = data.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          time: new Date(n.created_at).toLocaleString(),
        }));

        setNotifications(formatted);
      })
      .catch(console.error);

    //---------------------------------------------------
    // Load User
    //---------------------------------------------------

    const cachedUser = localStorage.getItem("user");

    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);

        registerSocketRooms(user);
      } catch {
        localStorage.removeItem("user");
      }
    }

    //---------------------------------------------------
    // Refresh User
    //---------------------------------------------------

    fetch("http://localhost:8000/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((user) => {
        localStorage.setItem("user", JSON.stringify(user));

        if (socket.connected) {
          registerSocketRooms(user);
        }

        socket.off("connect");

        socket.on("connect", () => {
          registerSocketRooms(user);
        });
      })
      .catch(console.error);

    //---------------------------------------------------
    // ADMIN SOCKET EVENT
    //---------------------------------------------------

    const handleAdminNotification = (data) => {
      console.log("Admin Notification:", data);

      const newNotification = {
        id: Date.now(),
        title: data.title,
        message: data.message,
        isRead: false,
        time: "Just now",
      };

      setNotifications((prev) => [
        newNotification,
        ...prev,
      ]);
    };

    //---------------------------------------------------
    // DEVELOPER SOCKET EVENT
    //---------------------------------------------------

    const handleDeveloperNotification = (data) => {
      console.log("Developer Notification:", data);

      const newNotification = {
        id: Date.now(),
        title: data.title,
        message:
          data.details ||
          data.message ||
          "Repository Updated",
        isRead: false,
        time: "Just now",
      };

      setNotifications((prev) => [
        newNotification,
        ...prev,
      ]);
    };

    //---------------------------------------------------
    // SOCKET LISTENERS
    //---------------------------------------------------

    socket.on(
      "admin_notification",
      handleAdminNotification
    );

    socket.on(
      "repo_updated",
      handleDeveloperNotification
    );

    //---------------------------------------------------
    // CLEANUP
    //---------------------------------------------------

    return () => {
      socket.off("connect");

      socket.off(
        "admin_notification",
        handleAdminNotification
      );

      socket.off(
        "repo_updated",
        handleDeveloperNotification
      );
    };
  }, []);

  //---------------------------------------------------
  // Unread Count
  //---------------------------------------------------

  const unreadCount = notifications.filter(
    (n) => !n.isRead
  ).length;

  //---------------------------------------------------
  // Mark All Read
  //---------------------------------------------------

  const markAllAsRead = () => {
    const token = localStorage.getItem("token");

    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
      }))
    );

    fetch("http://localhost:8000/notifications/read-all", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(console.error);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () =>
  useContext(NotificationContext);