import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

 useEffect(() => {
  const acceptAndLogin = async () => {
    const jwt = localStorage.getItem("token");

    if (!jwt) {
      localStorage.setItem("pendingInviteToken", token);
      navigate("/login");
      return;
    }

    // ✅ Decode JWT to check role
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    if (payload.role === "admin") {
      alert("Please logout from Admin and login as Developer to accept.");
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/invite/accept/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`, // Back-end will auto-identify the user
        },
      });

      if (res.ok) {
        alert("Success! Repositories linked.");
        navigate("/developerDashboard");
      } else {
        alert("Failed to accept invite.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (token) acceptAndLogin();
}, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Processing invitation...
      </div>
    );
  }

  return null;
};

export default AcceptInvite;