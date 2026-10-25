import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { CloseIcon, CheckIcon, SpinnerIcon, MailIcon } from "../../components/ui/Icons";
import { ForgotPasswordModalProps, AuthActionResult } from "./types";

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps): React.JSX.Element | null {
  const { requestPasswordReset } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email.trim()) {
      showToast("Please enter your registered email address.", "warning");
      return;
    }

    setLoading(true);
    const result: AuthActionResult = await requestPasswordReset(email.trim());
    setLoading(false);

    if (result.success) {
      setSent(true);
      showToast(result.message || "Password reset link sent to your email.", "success");
    } else {
      showToast(result.error || "Failed to send reset link.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="theme-bg-surface border theme-border rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 theme-text-primary animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h2 className="text-lg font-bold tracking-tight theme-text-primary">Reset Password</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4 text-center py-3">
            <div className="w-12 h-12 rounded-full theme-bg-success-soft border theme-border-success theme-success mx-auto flex items-center justify-center">
              <CheckIcon className="w-6 h-6" />
            </div>
            <p className="text-sm theme-text-primary">
              We have sent a secure password reset link to <strong className="theme-accent">{email}</strong>.
            </p>
            <p className="text-xs theme-text-secondary">
              Please check your inbox (and spam folder). The link will expire in 1 hour.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border font-medium text-sm transition-colors mt-2 cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              Enter your registered email address below and we will send you a link to reset your account password.
            </p>

            <div>
              <label className="block text-xs font-semibold theme-text-primary mb-1.5">Email Address</label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border focus-within:theme-border-accent transition-all shadow-2xs">
                <MailIcon className="w-4 h-4 theme-text-secondary shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@suffahhifz.com"
                  className="w-full bg-transparent border-none outline-none theme-text-primary placeholder:theme-text-muted text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl theme-bg-accent hover:opacity-95 theme-accent-text font-semibold text-xs sm:text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {loading && <SpinnerIcon className="w-4 h-4 theme-accent-text" />}
                <span>Send Reset Link</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
