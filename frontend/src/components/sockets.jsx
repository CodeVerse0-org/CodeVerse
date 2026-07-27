// sockets.jsx
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL || "https://codeverse-production-0f5b.up.railway.app";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  withCredentials: true,
});