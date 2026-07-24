import { io } from "socket.io-client";

// Adjust the URL if your backend server runs on a different port (e.g., http://localhost:8000)
const SOCKET_URL = "http://localhost:8000";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
});