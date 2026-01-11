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
        // redirect to login if not logged in
        localStorage.setItem("pendingInviteToken", token);
        navigate("/login");
        return;
      }

      try {
        // Automatically accept invite after login
        const res = await fetch(`${API_URL}/api/invite/accept/${token}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ user_id: parseInt(JSON.parse(atob(jwt.split(".")[1])).sub, 10) }),
        });

        const data = await res.json();
        console.log("Invite response:", data);

        alert("Invite accepted! Repositories are now synced.");
        navigate("/developerDashboard");
      } catch (err) {
        console.error("Invite accept error:", err);
        alert("Failed to accept invite.");
      } finally {
        setLoading(false);
      }
    };

    if (token) acceptAndLogin();
  }, [token, navigate, API_URL]);

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
