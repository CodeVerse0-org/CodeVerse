import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

// This exports a single, constant connection
export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  path: "/socket.io",
  autoConnect: true,
});