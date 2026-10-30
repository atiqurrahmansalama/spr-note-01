import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGoogleLogin, TokenResponse } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/useTheme";
import { useTranslation } from "../../i18n/useTranslation";
import { SUPPORTED_LANGUAGES } from "../../i18n/constants";
import type { LanguageCode } from "../../i18n/types";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { getLastActiveRoute } from "../../utils/navigationHistory";
import {
  GoogleIcon,
  SpinnerIcon,
  EyeIcon,
  EyeOffIcon,
  CloseIcon,
  MailIcon,
  LockClosedIcon,
  SunIcon,
  MoonIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
} from "../../components/ui/Icons";
import { AuthActionResult } from "./types";
import apiClient from "../../api/axios";
import "./locales"; // Ensure auth locales are registered

export default function LoginView(): React.JSX.Element {
  const { login, loginWithGoogle, saveTokens } = useAuth();
  const { showToast } = useToast();
  const { modeId, setModeId } = useTheme();
  const { t, language, setLanguage, isRTL } = useTranslation("auth");
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [authErrorBanner, setAuthErrorBanner] = useState<string | null>(null);

  const isGoogleConfigured = Boolean((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID);

  // Cross-Device QR Sign-In Claim Handler
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const qrTicket = searchParams.get("qr_ticket");
    if (!qrTicket) return;

    let isCancelled = false;
    const claimQrTicket = async () => {
      setLoading(true);
      setAuthErrorBanner(null);
      // Clean query parameter immediately from URL so subsequent refreshes don't re-trigger
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        const response = await apiClient.get(`/api/v1/auth/qr/status/${qrTicket}/?action=claim`);
        if (isCancelled) return;
        const data = response.data;

        if (data.status === "authorized" && data.access) {
          saveTokens(data);
          showToast(t("qrSuccess", "Signed in via QR code successfully!"), "success");
          navigate(getLastActiveRoute("/dashboard"), { replace: true });
        } else {
          const errMsg = data.message || t("qrFailed", "QR session expired or invalid.");
          setAuthErrorBanner(errMsg);
          showToast(errMsg, "error");
        }
      } catch (err: any) {
        if (!isCancelled) {
          const errMsg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            t("qrFailed", "Failed to sign in via QR code.");
          setAuthErrorBanner(errMsg);
          showToast(errMsg, "error");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    claimQrTicket();
    return () => {
      isCancelled = true;
    };
  }, [navigate, saveTokens, showToast, t]);

  useEffect(() => {
    const savedError = sessionStorage.getItem("spr_auth_error");
    if (savedError) {
      setAuthErrorBanner(savedError);
      showToast(savedError, "error");
      sessionStorage.removeItem("spr_auth_error");
    }
  }, [showToast]);

  // Google OAuth 2.0 Identity Services Handler
  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      setGoogleLoading(true);
      setAuthErrorBanner(null);
      try {
        const result: AuthActionResult = await loginWithGoogle(tokenResponse);
        if (result.success) {
          showToast(t("googleSuccess", "Signed in with Google successfully!"), "success");
          navigate(getLastActiveRoute("/dashboard"), { replace: true });
        } else {
          setAuthErrorBanner(result.error || "Google authentication failed.");
          showToast(result.error || "Google authentication failed.", "error");
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Google sign-in failed.";
        setAuthErrorBanner(errorMsg);
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
        "Google sign-in was closed or failed.";
      if ((errorResponse as any)?.error !== "popup_closed_by_user") {
        setAuthErrorBanner(errorMsg);
        showToast(errorMsg, "error");
      }
    },
  });

  // Email/Phone Form Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setAuthErrorBanner(null);
    if (!usernameOrEmail.trim() || !password) {
      showToast(t("validationRequired", "Please enter your email/phone and password."), "warning");
      return;
    }

    setLoading(true);
    const result: AuthActionResult = await login(usernameOrEmail.trim(), password);
    setLoading(false);

    if (result.success) {
      showToast(t("loginSuccess", "Signed in successfully!"), "success");
      navigate(getLastActiveRoute("/dashboard"), { replace: true });
    } else {
      setAuthErrorBanner(result.error || "Authentication failed.");
      showToast(result.error || "Authentication failed.", "error");
    }
  };

  const toggleThemeMode = () => {
    setModeId(modeId === "dark" ? "light" : "dark");
  };

  const urlParams = new URLSearchParams(window.location.search);
  const isExchangingCode = urlParams.has("code") || urlParams.has("access_token");

  if (isExchangingCode) {
    return (
      <div className="min-h-screen theme-bg-app flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 theme-bg-surface border theme-border px-6 py-4 rounded-2xl shadow-2xl">
          <SpinnerIcon className="w-5 h-5 theme-accent" />
          <span className="text-sm font-medium theme-text-primary">
            {t("completingGoogleAuth", "Completing Google Authentication...")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen theme-bg-app flex flex-col justify-between p-4 sm:p-6 font-sans theme-text-primary selection:theme-bg-accent-soft relative overflow-hidden transition-colors duration-200"
    >
      {/* Ambient background glow for rich aesthetic */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full theme-bg-accent-soft opacity-40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full theme-bg-accent-soft opacity-30 blur-3xl"
      />

      {/* Top Utility Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft border theme-border flex items-center justify-center shadow-xs">
            <AcademicCapIcon className="w-4 h-4 theme-accent" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight theme-text-primary">
              {t("brandName", "Suffah Hifz LMS")}
            </span>
            <span className="text-[10px] theme-text-secondary">
              {t("brandBadge", "Academic Portal")}
            </span>
          </div>
        </div>

        {/* Language & Theme Controls */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative inline-flex items-center theme-bg-surface border theme-border rounded-xl p-0.5 shadow-xs">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as LanguageCode)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                  language === lang.code
                    ? "theme-bg-accent theme-accent-text shadow-xs"
                    : "theme-text-secondary hover:theme-text-primary"
                }`}
                title={lang.name}
              >
                {lang.badgeLabel}
              </button>
            ))}
          </div>

          {/* Theme Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleThemeMode}
            className="p-2 rounded-xl theme-bg-surface border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition shadow-xs cursor-pointer"
            title={modeId === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme Mode"
          >
            {modeId === "dark" ? (
              <SunIcon className="w-4 h-4 text-amber-400" />
            ) : (
              <MoonIcon className="w-4 h-4 theme-accent" />
            )}
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        <div className="theme-bg-surface border theme-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all duration-200 backdrop-blur-md">
          {/* Header Stack */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl theme-bg-accent-soft border theme-border-accent-soft shadow-xs mx-auto">
              <AcademicCapIcon className="w-6 h-6 theme-accent" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              {t("signInTitle", "Sign in to your account")}
            </h1>
            <p className="text-xs sm:text-sm theme-text-secondary max-w-xs mx-auto">
              {t("signInSubtitle", "Enter your institutional credentials to access your workspace")}
            </p>
          </div>

          {/* Auth Warning/Error Banner */}
          {authErrorBanner && (
            <div className="p-3.5 rounded-xl theme-bg-danger-soft border theme-border-danger theme-danger text-xs flex items-center justify-between gap-2 animate-fade-in">
              <span className="font-medium">{authErrorBanner}</span>
              <button
                type="button"
                onClick={() => setAuthErrorBanner(null)}
                aria-label="Dismiss error"
                className="hover:opacity-80 transition-opacity p-1 cursor-pointer shrink-0"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Google Primary Social Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleGoogleSignIn()}
              disabled={googleLoading || loading || !isGoogleConfigured}
              className="w-full theme-bg-sub hover:theme-bg-elevated disabled:opacity-50 theme-text-primary border theme-border hover:border-primary/40 font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {googleLoading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 theme-accent" />
                  <span className="text-xs sm:text-sm theme-text-secondary">
                    {t("connectingToGoogle", "Connecting to Google...")}
                  </span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold">
                    {t("continueWithGoogle", "Continue with Google")}
                  </span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t theme-border" />
              <span className="absolute theme-bg-surface px-3 text-[10px] font-semibold tracking-wider theme-text-secondary uppercase">
                {t("orContinueWith", "OR CONTINUE WITH CREDENTIALS")}
              </span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold theme-text-primary mb-1.5 text-left">
                {t("emailOrPhoneLabel", "Email or Phone Number")}
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border focus-within:theme-border-accent transition-all shadow-2xs">
                <MailIcon className="w-4 h-4 theme-text-secondary shrink-0" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={t("emailOrPhonePlaceholder", "name@suffahhifz.com or 01700000000")}
                  className="w-full bg-transparent border-none outline-none theme-text-primary placeholder:theme-text-muted text-sm"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold theme-text-primary">
                  {t("passwordLabel", "Password")}
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs theme-accent hover:underline font-medium transition cursor-pointer"
                >
                  {t("forgotPassword", "Forgot password?")}
                </button>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border focus-within:theme-border-accent transition-all shadow-2xs">
                <LockClosedIcon className="w-4 h-4 theme-text-secondary shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder", "••••••••")}
                  className="w-full bg-transparent border-none outline-none theme-text-primary placeholder:theme-text-muted text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="theme-text-secondary hover:theme-text-primary transition p-0.5 cursor-pointer shrink-0"
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded theme-bg-sub border theme-border text-accent focus:ring-accent cursor-pointer accent-current"
              />
              <label
                htmlFor="remember"
                className="text-xs theme-text-secondary cursor-pointer select-none font-medium"
              >
                {t("rememberMe", "Remember me on this device")}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-xl theme-bg-accent hover:opacity-95 active:scale-[0.99] theme-accent-text font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading && <SpinnerIcon className="w-4 h-4 theme-accent-text" />}
              <span>{loading ? t("signingIn", "Authenticating...") : t("signInButton", "Sign In")}</span>
            </button>
          </form>

          {/* Switcher Footer */}
          <div className="pt-1 text-center text-xs theme-text-secondary">
            {t("noAccountPrompt", "Don't have an account?")}{" "}
            <Link
              to="/register"
              className="theme-accent hover:underline font-semibold ml-1 inline-block"
            >
              {t("signUpLink", "Sign Up")}
            </Link>
          </div>

          {/* Enterprise Security Badge */}
          <div className="pt-2 border-t theme-border flex items-center justify-center gap-1.5 text-[11px] theme-text-secondary">
            <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <span>{t("securityBadge", "Protected by enterprise-grade 256-bit encryption")}</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto py-3 text-center text-[11px] theme-text-secondary">
        <span>© {new Date().getFullYear()} {t("brandName", "Suffah Hifz LMS")}. All rights reserved.</span>
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
