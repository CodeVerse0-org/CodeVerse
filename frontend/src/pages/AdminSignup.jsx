import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const inputClass =
    "w-full rounded-md bg-gray-800 border border-gray-600 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-400 text-sm";

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
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];

  const strengthColor = () => {
    switch (strength) {
      case 1: return "bg-orange-500";
      case 2: return "bg-yellow-400";
      case 3: return "bg-lime-500";
      case 4: return "bg-green-500";
      default: return "bg-gray-700";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setServerError("");
    const newErrors = {};

    if (!email) newErrors.email = "Email is required";
    if (!firstName) newErrors.firstName = "First name is required";
    if (!lastName) newErrors.lastName = "Last name is required";
    if (!password) newErrors.password = "Password is required";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm password is required";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (strength < 4) newErrors.passwordStrength = "Password must be strong";
    if (!agreeTerms) newErrors.agreeTerms = "You must agree to the terms";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
          role: "admin",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");

      // Navigate to MFA setup with user_id
      navigate("/mfa-setup", { state: { user_id: data.user_id } });

    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-cyan-900 px-4">
      <div className="bg-gradient-to-tr from-cyan-800/50 to-black/50 rounded-lg shadow-xl max-w-md w-full p-6 text-white">
        <h1 className="text-3xl font-bold text-center mb-1">CodeVerse</h1>
        <p className="text-gray-400 text-center mb-2 text-sm">Visualize Your Codebase</p>
        <hr className="border-gray-500 mb-4" />
        <h2 className="text-xl font-semibold mb-4 text-center">Create Your Admin Account</h2>

        {serverError && <p className="text-red-500 text-center mb-2">{serverError}</p>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Name */}
          <div className="mb-4 flex gap-4">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md border border-cyan-500 bg-gray-800 text-white px-4 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                tabIndex={-1}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded ${strength > i ? strengthColor() : "bg-gray-600"}`} />
              ))}
              <span className="text-xs ml-2">{strengthLabel}</span>
            </div>
            {errors.passwordStrength && <p className="text-red-500 text-xs mt-1">{errors.passwordStrength}</p>}
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md border border-cyan-500 bg-gray-800 text-white px-4 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                tabIndex={-1}
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Agree terms */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mr-2"
            />
            <span className="text-xs text-gray-400">I agree to the Terms and Privacy Policy</span>
            {errors.agreeTerms && <p className="text-red-500 text-xs mt-1">{errors.agreeTerms}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!agreeTerms || strength < 4 || submitting}
            className="w-full bg-white text-black font-semibold py-2 rounded-md disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSignup;
