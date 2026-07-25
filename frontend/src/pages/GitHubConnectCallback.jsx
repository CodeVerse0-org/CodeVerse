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

  // ✅ Check if HTTP status is 200-299 BEFORE calling res.json()
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Server Error (${res.status}):`, errorText);
    throw new Error(`Server returned status ${res.status}`);
  }

  const data = await res.json();
  navigate("/adminDashboard", { replace: true });
} catch (err) {
  console.error("Fetch Error:", err);
  navigate("/adminDashboard", { replace: true });
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