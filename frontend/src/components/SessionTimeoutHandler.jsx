import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { AlertCircle, LogOut, ShieldCheck } from "lucide-react";

const SessionTimeoutHandler = ({ timeoutLimit = 120000 }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const navigate = useNavigate();
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);

  // 🔐 Logout function
  const logoutUser = () => {
    localStorage.clear();
    setShowPopup(false);
    navigate("/login");
  };

  // 🔄 Reset inactivity timer
  const resetTimer = () => {
    if (showPopup) return;

    clearTimeout(timerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownRef.current);

    timerRef.current = setTimeout(() => {
      setShowPopup(true);
      setCountdown(30);

      // ⏳ Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            logoutUser();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // ⏱ Final logout backup
      warningTimerRef.current = setTimeout(logoutUser, 30000);

    }, timeoutLimit - 30000);
  };

  // 👂 Activity listeners (RUN ONLY ONCE)
  useEffect(() => {
    const events = ["mousemove", "mousedown", "click", "keypress", "scroll"];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, true)
    );

    resetTimer();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer, true)
      );

      clearTimeout(timerRef.current);
      clearTimeout(warningTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  // ❌ No popup → render nothing
  if (!showPopup) return null;

  // 🚀 PORTAL RENDER (FIXES YOUR ISSUE COMPLETELY)
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020408]/90 backdrop-blur-md">
      
      <div className="bg-[#0d1117] border border-cyan-500/30 p-8 rounded-2xl max-w-sm w-full text-center shadow-[0_0_60px_rgba(6,182,212,0.25)]">
        
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400">
            <AlertCircle size={32} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Session Expiring
        </h2>

        <p className="text-slate-400 text-sm mb-4">
          You have been inactive. You will be logged out in:
        </p>

        {/* 🔥 Countdown UI */}
        <div className="text-3xl font-bold text-cyan-400 mb-6">
          {countdown}s
        </div>

        <div className="flex flex-col gap-3">
          
          <button
            onClick={() => {
              setShowPopup(false);
              resetTimer();
            }}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-[#020408] font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <ShieldCheck size={18} /> Keep Me Logged In
          </button>

          <button
            onClick={logoutUser}
            className="w-full py-3 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={16} /> Logout Now
          </button>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default SessionTimeoutHandler;