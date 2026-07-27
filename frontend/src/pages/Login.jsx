// Login.jsx
import React, { useState, useMemo } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ChevronRight,
  Loader2,
  Database,
  Cloud,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GraphBackground from "../components/GraphBackground";
import { AuthNavbar } from "../components/AuthNavbar";

const Login = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("developer");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  console.log("BACKEND URL:", API_URL);
  const isLoginDisabled = !email || !password || submitting;

  // useMemo ensures this component is only created once and doesn't "flash" on state changes
  const memoizedBG = useMemo(() => <GraphBackground />, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // MFA flow remains exactly the same
      if (data.mfa_required) {
        navigate("/mfa", {
          state: {
            user_id: data.user_id,
          },
        });
        return;
      }

      // Save JWT
      localStorage.setItem("token", data.access_token);

      const payload = JSON.parse(atob(data.access_token.split(".")[1]));

      // Check if user came from an invitation
      const pendingInviteToken = localStorage.getItem("pendingInviteToken");

      // Developer + Pending Invite
      if (payload.role === "developer" && pendingInviteToken) {
        navigate(`/accept-invite/${pendingInviteToken}`);
        return;
      }

      // Normal Login
      navigate(
        payload.role === "admin" ? "/adminDashboard" : "/developerDashboard",
      );
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex flex-col selection:bg-cyan-500/30 relative">
      {/* Background remains stable because it is outside the conditional rendering blocks */}
      {memoizedBG}

      {/* Shared Navbar with full width layout context */}
      <div className="w-full">
        <AuthNavbar />
      </div>

      <div className="flex w-full h-[calc(100vh-80px)] relative z-10 items-center">
        {/* Left Side: Project Branding (Stable Layout) */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10 border-r border-white/5 bg-black/40 backdrop-blur-sm h-full">
          <div className="mb-8">
            <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
              CODE<span className="text-cyan-500">VERSE</span>
            </h1>
            <p className="text-gray-500 mt-6 text-xl font-medium max-w-md leading-relaxed">
              Visualize Your Codebase
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
              <Database className="text-cyan-500" size={20} />
              <span>CodeBase Visualization of Github Repository</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
              <Cloud className="text-cyan-500" size={20} />
              <span>Real-time AI Generated Summaries</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Container (Shifted upward for balanced vertical centering) */}
        <div className="flex-1 flex items-center justify-center p-6 z-10 backdrop-blur-[2px] h-full">
          <div className="w-full max-w-[390px] space-y-5 bg-black/40 p-7 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl transition-all duration-500 relative -mt-6">
            {/* Back Arrow button with no background shape, only blue colored arrow icon */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer p-1"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                CodeVerse
              </h2>
              <p className="text-gray-500 text-xs font-bold mt-0.5 uppercase tracking-widest">
                Visualize Your Codebase
              </p>
            </div>

            {/* Role Tabs */}
            <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-xl">
              {["admin", "developer"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                    role === r
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase text-center">
                {errorMessage}
              </div>
            )}

            <div className="space-y-0.5">
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                {role.charAt(0).toUpperCase() + role.slice(1)} Login
              </h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tighter transition-opacity duration-300">
                {role === "admin"
                  ? "Sign in to manage your organization"
                  : "Sign in to visualize and understand your codebases"}
              </p>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                  Email
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors"
                    size={15}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-2 text-xs outline-none focus:border-cyan-500/50 transition-all text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/reset-password")}
                    className="text-[9px] font-black uppercase text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors"
                    size={15}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-2 text-xs outline-none focus:border-cyan-500/50 transition-all text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="pt-1 space-y-2.5">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoginDisabled}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-gray-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={15} />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login
                      <ChevronRight size={15} />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                  Don’t have an account?{" "}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        role === "admin" ? "/adminSignUp" : "/developerSignUp",
                      )
                    }
                    className="text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
