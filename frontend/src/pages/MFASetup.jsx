import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocation, useNavigate } from "react-router-dom";

const MFASetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id } = location.state || {};

  const [qrCode, setQrCode] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Generate QR code on mount
  useEffect(() => {
    if (!user_id) return navigate("/login");

    fetch(`${API_URL}/mfa/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.otpauth_url) {
          QRCode.toDataURL(data.otpauth_url).then(setQrCode);
        }
      })
      .catch(console.error);
  }, [user_id, navigate]);

  const handleVerify = async () => {
    if (token.trim().length !== 6) {
      setMessage("Enter 6-digit code.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, token: token.trim() }),
      });

      const data = await res.json();
      if (!res.ok && data.detail) throw new Error(data.detail);

      localStorage.setItem("token", data.access_token);

      // Decode JWT to check role
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const role = payload.role;

      if (role === "developer") {
        navigate("/developerDashboard");
        return;
      }

      // Admin: check GitHub connection
      const statusRes = await fetch(`${API_URL}/api/github/status?user_id=${user_id}`, {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      const statusData = await statusRes.json();

      if (statusData.connected) {
        navigate("/adminDashboard");
      } else {
        navigate("/github-connect", { state: { user_id } });
      }

    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-5xl border border-white/10 rounded-2xl px-14 py-14 text-white bg-black">
        <h1 className="text-4xl font-semibold text-center">CodeVerse</h1>
        <p className="text-gray-400 text-center mt-2">Set Up Multi-Factor Authentication</p>

        {qrCode && (
          <div className="flex justify-center mt-10">
            <img src={qrCode} alt="QR Code" className="w-44 h-44" />
          </div>
        )}

        <div className="mt-10 max-w-sm mx-auto">
          <input
            type="text"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/20 text-white focus:ring-2 focus:ring-teal-600"
            disabled={loading}
          />
          <button
            onClick={handleVerify}
            className={`w-full mt-4 py-2 rounded-lg font-semibold ${
              loading ? "bg-gray-700 cursor-not-allowed text-gray-300" : "bg-white text-black hover:bg-gray-100"
            }`}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
          {message && <p className="mt-2 text-sm text-center text-gray-300">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default MFASetup;