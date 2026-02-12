import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const VerifyResetOTP = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const validatePassword = (pwd) => {
    // Min 8 chars, 1 uppercase, 1 number, 1 special char
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pwd);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!validatePassword(password)) {
      setError(
        "Password must be at least 8 characters and include one uppercase letter, one number, and one special character."
      );
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:8000/auth/reset-password/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: state.email, otp, password }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Password reset successful!");
        navigate("/login");
      } else {
        // Handle specific backend errors
        if (res.status === 404) {
          setError("This email is not registered.");
        } else if (res.status === 400) {
          setError(data.detail || "Invalid OTP.");
        } else {
          setError(data.detail || "Failed to reset password.");
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={handleReset} className="space-y-4 w-96">
        <h2 className="text-xl font-bold text-center">Reset Password</h2>

        {error && <div className="bg-red-600 p-2 rounded text-center">{error}</div>}

        <input
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        />

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        />

        <button className="w-full bg-teal-500 py-3 rounded">Reset Password</button>
      </form>
    </div>
  );
};

export default VerifyResetOTP;
