import React, { useState } from "react";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const isDisabled = !email;

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!email) return;

  const res = await fetch("http://localhost:8000/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    navigate("/verify-reset", { state: { email } });
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-teal-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl p-8 text-white">
        <h1 className="text-3xl font-semibold text-center">CodeVerse</h1>
        <p className="text-gray-400 text-center mt-1">
          Visualize Your Codebase
        </p>

        <div className="my-6 h-px bg-white/20" />

        <h2 className="text-xl font-semibold text-center">
          Reset Your Password
        </h2>
        <p className="text-sm text-gray-400 text-center mt-2">
          Confirm your email address and we’ll send a link to get back into your
          account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <Mail
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full rounded-lg py-3 font-semibold transition ${
              isDisabled
                ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Send Reset Link
          </button>
        </form>

        <p className="text-sm text-gray-400 text-center mt-6">
          Remember your password?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-teal-400 hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
