import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const GitHubConnectCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const processed = useRef(false);

  useEffect(() => {
    const finalizeGitHub = async () => {
      // Prevent double execution in React Strict Mode
      if (processed.current) return;

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Extract installation_id from URL: ?installation_id=12345&setup_action=install
      const params = new URLSearchParams(location.search);
      const installationId = params.get("installation_id");

      if (!installationId) {
        console.error("No installation_id found in URL parameters");
        navigate("/github-connect");
        return;
      }

      processed.current = true;

      try {
        const res = await fetch(`${API_URL}/api/github/finalize?installation_id=${installationId}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "GitHub finalization failed");
        }

        // Successfully connected and DB updated
        navigate("/adminDashboard");
      } catch (err) {
        console.error(err);
        // On error, let the user try connecting again
        navigate("/github-connect");
      }
    };

    finalizeGitHub();
  }, [navigate, location, API_URL]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
      <p className="text-center text-lg">Finalizing GitHub connection...</p>
    </div>
  );
};

export default GitHubConnectCallback;