import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("developer");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const isLoginDisabled = !email || !password || submitting;

  const handleLogin = async () => {
    if (isLoginDisabled) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      // MFA is ALWAYS required
      if (data.user_id) {
        navigate("/mfa", { state: { user_id: data.user_id, role } });
        return;
      }

      throw new Error("MFA setup required but user ID missing");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-cyan-900 px-4">
      <div className="bg-gradient-to-tr from-cyan-800/50 to-black/50 border border-white/10 rounded-lg shadow-xl max-w-lg w-full p-6 text-white">
        <h1 className="text-3xl font-bold text-center mb-1">CodeVerse</h1>
        <p className="text-gray-400 text-center mb-6">Visualize Your Codebase</p>

        {/* Role Tabs */}
        <div className="flex mb-6 border border-white/20 rounded-md overflow-hidden">
          {["admin", "developer"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2 transition ${
                role === r
                  ? "bg-gray-600 text-black font-semibold"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {errorMessage && (
          <p className="text-red-500 text-xs mb-2">{errorMessage}</p>
        )}

        <h2 className="text-xl font-semibold mb-1">
          {role.charAt(0).toUpperCase() + role.slice(1)} Login
        </h2>
        <p className="text-gray-400 mb-4 text-sm">
          {role === "admin"
            ? "Sign in to manage your organization"
            : "Sign in to visualize and understand your codebases"}
        </p>

        {/* Email */}
        <div className="mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-md border border-cyan-500 bg-gray-800 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-400"
          />
        </div>

        {/* Password */}
        <div className="mb-2 relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            autoComplete="current-password"
            className="w-full rounded-md border border-cyan-500 bg-gray-800 text-white px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        {/* Forgot Password */}
        <div className="text-right mb-4">
          <button
            type="button"
            onClick={() => navigate("/reset-password")}
            className="text-cyan-400 text-sm hover:underline"
          >
            Forgot password?
          </button>
        </div>

        {/* Login Button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoginDisabled}
          className={`w-full font-semibold py-3 rounded-md mb-4 transition ${
            isLoginDisabled
              ? "bg-gray-500 text-gray-300 cursor-not-allowed"
              : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          {submitting ? "Logging in..." : "Login"}
        </button>

        <p className="text-gray-400 text-sm text-center">
          Don’t have an account?{" "}
          <button
            onClick={() =>
              navigate(role === "admin" ? "/adminSignUp" : "/developerSignUp")
            }
            className="text-cyan-400 hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
