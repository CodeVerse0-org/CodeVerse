import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </BrowserRouter>,
);