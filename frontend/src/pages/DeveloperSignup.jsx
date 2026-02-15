import React, { useState } from "react";
import { Eye, EyeOff, User, Mail, Lock, ShieldCheck, ChevronRight, Loader2, Code2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const DeveloperSignup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[\W]/.test(pass)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Insufficient", "Weak", "Fair", "Good", "Strong"];
  
  const strengthColor = () => {
    switch (strength) {
      case 1: return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
      case 2: return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]";
      case 3: return "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]";
      case 4: return "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]";
      default: return "bg-white/10";
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName.trim()) newErrors.firstName = "First name required";
    if (!lastName.trim()) newErrors.lastName = "Last name required";
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password required";
    } else if (password.length < 8) {
      newErrors.password = "Minimum 8 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (strength < 4 && password) {
      newErrors.passwordStrength = "Security threshold not met";
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = "Consent required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup-initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
          role: "developer",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");

      navigate("/verify-email", {
        state: { email: email.toLowerCase(), user_id: data.user_id },
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ErrorMsg = ({ msg }) => msg ? (
    <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter mt-1 ml-1 animate-pulse">
      {msg}
    </p>
  ) : null;

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex selection:bg-cyan-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Left Side: Branding/Visual */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10 border-r border-white/5 bg-black/20">
        <div className="mb-8">
          <div className="text-cyan-500 font-black text-xs uppercase tracking-[0.4em] mb-4"></div>
          <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
            CODE<span className="text-cyan-500">VERSE</span>
          </h1>
          <p className="text-gray-500 mt-6 text-xl font-medium max-w-md leading-relaxed">
            Access codebase visualizations
          </p>
        </div>
        <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                <Code2 className="text-cyan-500" size={20} />
                <span>Advanced Graph Visualizations</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                <ShieldCheck className="text-cyan-500" size={20} />
                <span>Secure Multi-Factor Access</span>
            </div>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 z-10 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Developer Account</h2>
            <p className="text-gray-500 text-sm font-bold mt-2 uppercase tracking-widest">Join the CodeVerse Workspace</p>
          </div>

          {serverError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase text-center animate-in fade-in zoom-in">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">First Name</label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.firstName ? 'text-red-500' : 'text-gray-600 group-focus-within:text-cyan-500'}`} size={16} />
                  <input
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => {setFirstName(e.target.value); setErrors({...errors, firstName: ""})}}
                    className={`w-full bg-white/[0.03] border rounded-xl px-11 py-3 text-sm outline-none transition-all ${errors.firstName ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                  />
                </div>
                <ErrorMsg msg={errors.firstName} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => {setLastName(e.target.value); setErrors({...errors, lastName: ""})}}
                  className={`w-full bg-white/[0.03] border rounded-xl px-5 py-3 text-sm outline-none transition-all ${errors.lastName ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                />
                <ErrorMsg msg={errors.lastName} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Work Email</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-500' : 'text-gray-600 group-focus-within:text-cyan-500'}`} size={16} />
                <input
                  type="email"
                  placeholder="jane.s@company.io"
                  value={email}
                  onChange={(e) => {setEmail(e.target.value); setErrors({...errors, email: ""})}}
                  className={`w-full bg-white/[0.03] border rounded-xl px-11 py-3 text-sm outline-none transition-all ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                />
              </div>
              <ErrorMsg msg={errors.email} />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Password</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-500' : 'text-gray-600 group-focus-within:text-cyan-500'}`} size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {setPassword(e.target.value); setErrors({...errors, password: "", passwordStrength: ""})}}
                  className={`w-full bg-white/[0.03] border rounded-xl px-11 py-3 text-sm outline-none transition-all ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <ErrorMsg msg={errors.password || errors.passwordStrength} />
              
              {/* Strength Meter */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Password Strength</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${strength === 4 ? "text-cyan-500" : "text-gray-500"}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${strength > i ? strengthColor() : "bg-white/5"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Confirm Password</label>
              <div className="relative group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {setConfirmPassword(e.target.value); setErrors({...errors, confirmPassword: ""})}}
                  className={`w-full bg-white/[0.03] border rounded-xl px-5 py-3 text-sm outline-none transition-all ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                />
              </div>
              <ErrorMsg msg={errors.confirmPassword} />
            </div>

            {/* Terms */}
            <div className="flex flex-col gap-1 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => {setAgreeTerms(e.target.checked); setErrors({...errors, agreeTerms: ""})}}
                  className={`w-4 h-4 rounded border bg-white/5 checked:bg-cyan-500 transition-all cursor-pointer ${errors.agreeTerms ? 'border-red-500' : 'border-white/10'}`}
                />
                <label htmlFor="terms" className="text-[10px] font-bold text-gray-500 uppercase tracking-tight cursor-pointer">
                  I agree to the <span className="text-white underline decoration-cyan-500/50 underline-offset-4">Developer Terms</span>
                </label>
              </div>
              <ErrorMsg msg={errors.agreeTerms} />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-gray-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <><Loader2 className="animate-spin" size={16} /> Initializing...</>
                ) : (
                  <>Create Developer Account <ChevronRight size={16} /></>
                )}
              </button>
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                 Already registered? <Link to="/login" className="text-cyan-500 hover:text-cyan-400 transition-colors">Sign In</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeveloperSignup;