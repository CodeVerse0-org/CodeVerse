// AdminSignup.jsx
import React, { useState, useMemo } from "react";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import GraphBackground from "../components/GraphBackground";
import { AuthNavbar } from "../components/AuthNavbar";

const AdminSignup = () => {
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

  // Stabilize the background so it doesn't reset on keystrokes
  const memoizedBG = useMemo(() => <GraphBackground />, []);

  // Password requirement validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[\W]/.test(password);

  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (hasMinLength) strength++;
    if (hasUpperCase) strength++;
    if (hasNumber) strength++;
    if (hasSpecialChar) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Insufficient", "Weak", "Fair", "Good", "Strong"];

  const strengthColor = () => {
    switch (strength) {
      case 1:
        return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
      case 2:
        return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]";
      case 3:
        return "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]";
      case 4:
        return "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]";
      default:
        return "bg-white/10";
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Regex allowing standard letters, spaces, hyphens, and apostrophes (Min 2 chars)
    const nameRegex = /^[A-Za-z\s'-]{2,30}$/;

    // First Name Validation
    if (!firstName.trim()) {
      newErrors.firstName = "First name required";
    } else if (!nameRegex.test(firstName.trim())) {
      newErrors.firstName = "Only letters allowed (min 2 chars)";
    }

    // Last Name Validation
    if (!lastName.trim()) {
      newErrors.lastName = "Last name required";
    } else if (!nameRegex.test(lastName.trim())) {
      newErrors.lastName = "Only letters allowed (min 2 chars)";
    }

    // Email Validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Invalid email protocol";
    }

    // Password Validation
    if (!password) {
      newErrors.password = "Security credential required";
    } else if (password.length < 8) {
      newErrors.password = "Minimum 8 characters required";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (strength < 4 && password) {
      newErrors.passwordStrength = "Security threshold not met";
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = "Consent is mandatory";
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
          email: email.toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
          role: "admin",
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || "Access Denied: Signup failed");

      navigate("/verify-email", {
        state: { email: email.toLowerCase(), user_id: data.user_id },
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ErrorMsg = ({ msg }) =>
    msg ? (
      <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter mt-1 ml-1 animate-pulse">
        {msg}
      </p>
    ) : null;

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex flex-col selection:bg-cyan-500/30 relative">
      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: #111827 #020405;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #020405;
        }
        ::-webkit-scrollbar-thumb {
          background: #111827;
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #1f2937;
        }
      `}</style>

      {memoizedBG}

      <div className="w-full">
        <AuthNavbar />
      </div>

      <div className="flex w-full h-[calc(100vh-80px)] relative z-10 items-center">
        <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10 border-r border-white/5 bg-black/40 backdrop-blur-sm h-full">
          <div className="mb-8">
            <div className="text-cyan-500 font-black text-xs uppercase tracking-[0.4em] mb-4">
              Core Infrastructure
            </div>
            <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
              CODE<span className="text-cyan-500">VERSE</span>
            </h1>
            <p className="text-gray-500 mt-6 text-xl font-medium max-w-md leading-relaxed">
              The next generation of codebase visualization and administrative
              control.
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
              <ShieldCheck className="text-cyan-500" size={20} />
              <span>Enterprise Grade Security</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
              <Lock className="text-cyan-500" size={20} />
              <span>End-to-End Encryption</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 z-10 overflow-y-auto custom-scrollbar backdrop-blur-[2px] h-full">
          <div className="w-full max-w-md space-y-5 bg-black/40 p-7 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl my-auto relative">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer p-1"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                Admin Account
              </h2>
              <p className="text-gray-500 text-xs font-bold mt-0.5 uppercase tracking-widest">
                Create Your Account
              </p>
            </div>

            {serverError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase text-center animate-in fade-in zoom-in">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                    First Name
                  </label>
                  <div className="relative group">
                    <User
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                        errors.firstName
                          ? "text-red-500"
                          : "text-gray-600 group-focus-within:text-cyan-500"
                      }`}
                      size={15}
                    />
                    <input
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setErrors({ ...errors, firstName: "" });
                      }}
                      className={`w-full bg-white/[0.03] border rounded-xl px-10 py-2.5 text-xs outline-none transition-all text-white ${
                        errors.firstName
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-white/10 focus:border-cyan-500/50"
                      }`}
                    />
                  </div>
                  <ErrorMsg msg={errors.firstName} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setErrors({ ...errors, lastName: "" });
                    }}
                    className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-xs outline-none transition-all text-white ${
                      errors.lastName
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-white/10 focus:border-cyan-500/50"
                    }`}
                  />
                  <ErrorMsg msg={errors.lastName} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                  Email
                </label>
                <div className="relative group">
                  <Mail
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      errors.email
                        ? "text-red-500"
                        : "text-gray-600 group-focus-within:text-cyan-500"
                    }`}
                    size={15}
                  />
                  <input
                    type="email"
                    placeholder="admin@codeverse.io"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({ ...errors, email: "" });
                    }}
                    className={`w-full bg-white/[0.03] border rounded-xl px-10 py-2.5 text-xs outline-none transition-all text-white ${
                      errors.email
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-white/10 focus:border-cyan-500/50"
                    }`}
                  />
                </div>
                <ErrorMsg msg={errors.email} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      errors.password
                        ? "text-red-500"
                        : "text-gray-600 group-focus-within:text-cyan-500"
                    }`}
                    size={15}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({
                        ...errors,
                        password: "",
                        passwordStrength: "",
                      });
                    }}
                    className={`w-full bg-white/[0.03] border rounded-xl px-10 py-2.5 text-xs outline-none transition-all text-white ${
                      errors.password
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-white/10 focus:border-cyan-500/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <ErrorMsg msg={errors.password || errors.passwordStrength} />

                <div className="pt-1.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                      Password Strength
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${
                        strength === 4 ? "text-cyan-500" : "text-gray-500"
                      }`}
                    >
                      {strengthLabels[strength]}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mb-2.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                          strength > i ? strengthColor() : "bg-white/5"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white/[0.02] border border-white/5 p-2.5 rounded-xl backdrop-blur-sm">
                    <div
                      className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${
                        hasMinLength ? "text-cyan-400" : "text-gray-500"
                      }`}
                    >
                      {hasMinLength ? (
                        <Check size={12} className="text-cyan-400" />
                      ) : (
                        <X size={12} className="text-gray-600" />
                      )}
                      <span>Min 8 Characters</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${
                        hasUpperCase ? "text-cyan-400" : "text-gray-500"
                      }`}
                    >
                      {hasUpperCase ? (
                        <Check size={12} className="text-cyan-400" />
                      ) : (
                        <X size={12} className="text-gray-600" />
                      )}
                      <span>One Uppercase</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${
                        hasNumber ? "text-cyan-400" : "text-gray-500"
                      }`}
                    >
                      {hasNumber ? (
                        <Check size={12} className="text-cyan-400" />
                      ) : (
                        <X size={12} className="text-gray-600" />
                      )}
                      <span>One Number</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${
                        hasSpecialChar ? "text-cyan-400" : "text-gray-500"
                      }`}
                    >
                      {hasSpecialChar ? (
                        <Check size={12} className="text-cyan-400" />
                      ) : (
                        <X size={12} className="text-gray-600" />
                      )}
                      <span>One Special Char</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                  Confirm Password
                </label>
                <div className="relative group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors({ ...errors, confirmPassword: "" });
                    }}
                    className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-xs outline-none transition-all text-white ${
                      errors.confirmPassword
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-white/10 focus:border-cyan-500/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
                <ErrorMsg msg={errors.confirmPassword} />
              </div>

              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      setErrors({ ...errors, agreeTerms: "" });
                    }}
                    className={`w-4 h-4 rounded border bg-white/5 checked:bg-cyan-500 transition-all cursor-pointer ${
                      errors.agreeTerms ? "border-red-500" : "border-white/10"
                    }`}
                  />
                  <label
                    htmlFor="terms"
                    className="text-[10px] font-bold text-gray-500 uppercase tracking-tight cursor-pointer"
                  >
                    I accept the{" "}
                    <span className="text-white underline decoration-cyan-500/50 underline-offset-4">
                      Security Protocols
                    </span>
                  </label>
                </div>
                <ErrorMsg msg={errors.agreeTerms} />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-gray-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={15} />{" "}
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Create Account <ChevronRight size={15} />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                  Already registered?{" "}
                  <Link
                    to="/login"
                    className="text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;