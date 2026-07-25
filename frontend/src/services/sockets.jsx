import { io } from "socket.io-client";

// Adjust the URL if your backend server runs on a different port (e.g., http://localhost:8000)
const SOCKET_URL =
  import.meta.env.VITE_API_URL || "https://codeverse-production-0f5b.up.railway.app";
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
});