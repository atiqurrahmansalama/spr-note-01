import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { EyeIcon, EyeOffIcon, SpinnerIcon } from "../../components/ui/Icons";
import { AuthActionResult } from "./types";

export default function ResetPasswordView(): React.JSX.Element {
  const { token } = useParams<{ token: string }>();
  const { confirmPasswordReset } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      showToast("Passwords do not match.", "warning");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      showToast("Password must be at least 8 characters long.", "warning");
      return;
    }

    if (!token) {
      setError("Password reset token is missing.");
      showToast("Password reset token is missing.", "error");
      return;
    }

    setLoading(true);
    const result: AuthActionResult = await confirmPasswordReset(token, newPassword);
    setLoading(false);

    if (result.success) {
      showToast(result.message || "Password reset successful! You can now log in.", "success");
      navigate("/login");
    } else {
      setError(result.error || "Failed to reset password.");
      showToast(result.error || "Failed to reset password.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100 selection:bg-sky-500 selection:text-zinc-950">
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-md space-y-6">
        {/* Header Stack */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-1.5 shadow-sm">
            <span className="font-mono text-xs font-bold tracking-tight text-white">
              Suffah Hifz LMS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Set new password
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Enter your new secure password below to regain access.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">New Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Confirm New Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading && <SpinnerIcon className="w-4 h-4 text-zinc-950" />}
            <span>Update Password</span>
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-zinc-400">
          <Link
            to="/login"
            className="text-sky-400 hover:text-sky-300 font-medium underline underline-offset-4"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
