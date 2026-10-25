import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGoogleLogin, TokenResponse } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  GoogleIcon,
  SpinnerIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
} from "../../components/ui/Icons";
import { RegisterFormData, RegisterFieldErrors, AuthActionResult } from "./types";

interface PasswordStrengthProps {
  password: string;
}

// Password Strength Visualizer Helper Component
function PasswordStrengthIndicator({ password }: PasswordStrengthProps): React.JSX.Element | null {
  const checks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const score = Object.values(checks).filter(Boolean).length;

  const strengthColor =
    score <= 1
      ? "bg-red-500"
      : score === 2
      ? "bg-amber-500"
      : score === 3
      ? "bg-yellow-400"
      : "bg-emerald-400";

  const strengthLabel =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-[11px]">Password Strength:</span>
        <span
          className={`font-semibold text-[11px] ${
            score >= 3 ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {strengthLabel} ({score}/4)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
        <div
          className={`h-full transition-all duration-300 ${strengthColor}`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
        <div className={`flex items-center gap-1 ${checks.minLength ? "text-emerald-400" : "text-zinc-500"}`}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            {checks.minLength ? <CheckIcon className="w-3 h-3" /> : "·"}
          </span>
          <span>At least 8 characters</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasUpper ? "text-emerald-400" : "text-zinc-500"}`}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            {checks.hasUpper ? <CheckIcon className="w-3 h-3" /> : "·"}
          </span>
          <span>1 uppercase letter</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasNumber ? "text-emerald-400" : "text-zinc-500"}`}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            {checks.hasNumber ? <CheckIcon className="w-3 h-3" /> : "·"}
          </span>
          <span>1 number (0-9)</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasSpecial ? "text-emerald-400" : "text-zinc-500"}`}>
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            {checks.hasSpecial ? <CheckIcon className="w-3 h-3" /> : "·"}
          </span>
          <span>1 special symbol</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterView(): React.JSX.Element {
  const { register, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  const isGoogleConfigured = Boolean((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID);

  // Standard Google OAuth 2.0 Identity Services Popup
  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      setGoogleLoading(true);
      try {
        const result: AuthActionResult = await loginWithGoogle(tokenResponse);
        if (result.success) {
          showToast("Signed in with Google successfully!", "success");
          navigate("/dashboard");
        } else {
          showToast(result.error || "Google registration failed.", "error");
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Google sign-up failed.";
        showToast(errorMsg, "error");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.warn("[GoogleAuth] Popup notice:", errorResponse);
      const errorMsg =
        errorResponse?.error_description ||
        errorResponse?.error ||
        "Google sign-up was closed or failed.";
      if ((errorResponse as any)?.error !== "popup_closed_by_user") {
        showToast(errorMsg, "error");
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFieldErrors({});

    if (formData.password !== formData.confirm_password) {
      setFieldErrors({ confirm_password: ["Passwords do not match."] });
      showToast("Passwords do not match.", "warning");
      return;
    }

    setLoading(true);
    const result: AuthActionResult = await register({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone_number: formData.phone_number,
      password: formData.password,
    });
    setLoading(false);

    if (result.success) {
      showToast(
        "Registration successful! Please check your email to verify your account.",
        "success"
      );
      navigate("/login");
    } else {
      setFieldErrors(result.errors || {});
      const generalMsg =
        result.errors?.detail ||
        result.errors?.email?.[0] ||
        "Registration failed. Please check your details.";
      showToast(generalMsg, "error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100 selection:bg-sky-500 selection:text-zinc-950">
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl backdrop-blur-md space-y-6">
        {/* Header Stack */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-1.5 shadow-sm">
            <span className="font-mono text-xs font-bold tracking-tight text-white">
              Suffah Hifz LMS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Create an account
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Sign up to access the Suffah Hifz Management System
          </p>
        </div>

        {/* Google Sign-Up Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleGoogleSignIn()}
            disabled={googleLoading || loading || !isGoogleConfigured}
            className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-white font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed active:scale-98"
          >
            {googleLoading ? (
              <>
                <SpinnerIcon className="w-4 h-4 text-sky-400" />
                <span className="text-zinc-300">Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>Sign up with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              or sign up with email
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Abdullah"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Rahman"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Email Address *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@suffahhifz.com"
              className={`w-full px-4 py-2.5 rounded-xl bg-zinc-950 border text-white text-sm focus:outline-none transition-colors placeholder:text-zinc-600 ${
                fieldErrors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-800 focus:border-sky-500"
              }`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-400 mt-1 font-mono">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Phone Number (Optional)</label>
            <input
              type="text"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="01700000000"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {/* Real-time Password Strength Visualizer */}
            <PasswordStrengthIndicator password={formData.password} />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Confirm Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirm_password"
              required
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-xl bg-zinc-950 border text-white text-sm focus:outline-none transition-colors placeholder:text-zinc-600 ${
                fieldErrors.confirm_password
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-800 focus:border-sky-500"
              }`}
            />
            {fieldErrors.confirm_password && (
              <p className="text-xs text-red-400 mt-1 font-mono">{fieldErrors.confirm_password[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading && <SpinnerIcon className="w-4 h-4 text-zinc-950" />}
            <span>Create Account</span>
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-zinc-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-sky-400 hover:text-sky-300 font-medium underline underline-offset-4"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
