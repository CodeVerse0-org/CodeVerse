import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ChevronRight, Loader2, Database, Cloud } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

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

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
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

      if (data.mfa_required) {
        navigate("/mfa", { state: { user_id: data.user_id } });
      } else {
        localStorage.setItem("token", data.access_token);
        const payload = JSON.parse(atob(data.access_token.split(".")[1]));
        navigate(payload.role === "admin" ? "/adminDashboard" : "/developerDashboard");
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex selection:bg-cyan-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Left Side: Project Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10 border-r border-white/5 bg-black/20">
        <div className="mb-8">
          {/* <div className="text-cyan-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Core Infrastructure</div> */}
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

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">CodeVerse</h2>
            <p className="text-gray-500 text-sm font-bold mt-2 uppercase tracking-widest">Visualize Your Codebase</p>
          </div>

          {/* Role Tabs */}
          <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-xl">
            {["admin", "developer"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
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
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase text-center animate-in fade-in zoom-in">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {role.charAt(0).toUpperCase() + role.slice(1)} Login
            </h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-tighter">
              {role === "admin"
                ? "Sign in to manage your organization"
                : "Sign in to visualize and understand your codebases"}
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-3 text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Password</label>
                <button
                  type="button"
                  onClick={() => navigate("/reset-password")}
                  className="text-[9px] font-black uppercase text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-3 text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoginDisabled}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-gray-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
              
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate(role === "admin" ? "/adminSignUp" : "/developerSignUp")}
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
  );
};

export default Login;