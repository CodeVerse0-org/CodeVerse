import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleAccept = async () => {
    const jwt = localStorage.getItem("token");

    // User not logged in
    if (!jwt) {
      localStorage.setItem("pendingInviteToken", token);
      alert(
        "Please login with your Developer account to accept this invitation.",
      );
      navigate("/login");
      return;
    }

    // Decode JWT safely
    let payload;
    try {
      payload = JSON.parse(atob(jwt.split(".")[1]));
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.setItem("pendingInviteToken", token);
      alert("Your session has expired. Please login again.");
      navigate("/login");
      return;
    }

    // Admin cannot accept
    if (payload.role === "admin") {
      alert(
        "Please login using a Developer account to accept this invitation.",
      );
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/invite/accept/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Failed to accept invitation.");
        setLoading(false);
        return;
      }

      localStorage.removeItem("pendingInviteToken");

      alert("Invitation accepted successfully!");

      navigate("/developerDashboard");
    } catch (err) {
      console.error(err);
      alert("Something went wrong while accepting the invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    const jwt = localStorage.getItem("token");

    if (!jwt) {
      navigate("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]));

      if (payload.role === "developer") {
        navigate("/developerDashboard");
      } else {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-[#111] border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Repository Invitation</h1>

        <p className="text-gray-300 mb-8">
          You have been invited to join a repository on{" "}
          <strong>CodeVerse</strong>.
          <br />
          <br />
          Would you like to accept this invitation?
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleReject}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
          >
            Reject
          </button>

          <button
            onClick={handleAccept}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition"
          >
            {loading ? "Processing..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
