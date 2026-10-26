import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  MailIcon,
  CheckIcon,
  SpinnerIcon,
  ShieldIcon,
  ArrowLeftIcon,
  AlertCircleIcon,
} from "../../components/ui/Icons";
import { useTranslation } from "../../i18n";
import type { AuthActionResult } from "./types";

export default function ForgotPasswordView(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const { requestPasswordReset, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation("auth");

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam.trim());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("enterEmailError", "Please enter your registered email address."));
      showToast(t("enterEmailError", "Please enter your registered email address."), "warning");
      return;
    }

    setLoading(true);
    try {
      const result: AuthActionResult = await requestPasswordReset(trimmedEmail);
      if (result.success) {
        setSent(true);
        showToast(result.message || t("resetLinkSent", "Password reset link sent to your email."), "success");
      } else {
        setError(result.error || t("resetFailed", "Failed to send password reset link."));
        showToast(result.error || t("resetFailed", "Failed to send password reset link."), "error");
      }
    } catch {
      setError(t("serverError", "Server unreachable. Please check connection."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg-app flex items-center justify-center p-4 selection:theme-bg-accent selection:theme-accent-text">
      <div className="w-full max-w-md space-y-6">
        {/* Main Card Container */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
          
          {/* Brand Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs mx-auto">
              <ShieldIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              {sent ? t("checkYourEmail", "Check Your Email") : t("resetPasswordTitle", "Reset Your Password")}
            </h1>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              {sent
                ? t(
                    "resetLinkSentDesc",
                    "We have dispatched a secure password reset link to your email address."
                  )
                : t(
                    "forgotPasswordDesc",
                    "Enter your verified account email address below to receive password recovery instructions."
                  )}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl theme-bg-danger-soft border border-rose-500/20 theme-danger text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-5 text-center py-2 animate-fade-in">
              <div className="w-14 h-14 rounded-full theme-bg-success-soft border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-2xs">
                <CheckIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold theme-text-primary">
                  {t("recoveryDispatchedTo", "Recovery instructions sent to:")}
                </p>
                <p className="font-mono text-xs theme-accent font-semibold break-all">
                  {email}
                </p>
              </div>
              <p className="text-xs theme-text-secondary leading-relaxed">
                {t(
                  "checkSpamNotice",
                  "Please check your inbox (and spam or junk folder). The recovery link remains valid for 1 hour."
                )}
              </p>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="w-full py-2.5 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  {t("resendLink", "Send Another Link")}
                </button>
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl theme-text-secondary hover:theme-text-primary text-xs sm:text-sm transition-colors"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  <span>{isAuthenticated ? t("returnDashboard", "Return to Dashboard") : t("backToLogin", "Back to Sign In")}</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-text-primary mb-1.5">
                  {t("emailAddress", "Email Address")} <span className="theme-danger">*</span>
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border focus-within:theme-border-accent transition-all shadow-2xs">
                  <MailIcon className="w-4 h-4 theme-text-secondary shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-transparent border-none outline-none theme-text-primary placeholder:theme-text-muted text-sm font-medium"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl theme-bg-accent theme-accent-text hover:brightness-105 active:scale-[0.99] font-semibold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                <span>{loading ? t("dispatching", "Sending Reset Link...") : t("sendResetLink", "Send Password Reset Link")}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold theme-text-secondary hover:theme-accent transition-colors"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  <span>{isAuthenticated ? t("returnDashboard", "Return to Dashboard") : t("backToLogin", "Back to Sign In")}</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] theme-text-secondary">
          SPR Note Suite &bull; Enterprise Institutional Workspace
        </p>
      </div>
    </div>
  );
}
