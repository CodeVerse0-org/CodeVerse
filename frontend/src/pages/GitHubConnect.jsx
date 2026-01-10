import React from "react";
import { useNavigate } from "react-router-dom";

const GitHubConnect = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

 const handleConnect = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/github/install-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.url) throw new Error("Failed to get install URL");
  window.location.href = data.url;
};


  const handleSkip = () => navigate("/adminDashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="max-w-xl w-full bg-black border border-white/10 rounded-2xl p-10 text-white text-center">
        <h1 className="text-3xl font-semibold">Connect GitHub</h1>
        <p className="text-gray-400 mt-3">
          Connect your GitHub organization to enable repository access.
        </p>
        <div className="mt-10 space-y-4">
          <button
            onClick={handleConnect}
            className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100"
          >
            Connect GitHub App
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-3 border border-white/20 rounded-lg text-gray-300 hover:bg-white/5"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubConnect;
