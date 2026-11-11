import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/useTranslation";
import { PublicPortalShell } from "../../components/layout";
import {
  GoogleSignInButton,
  PortalInputField,
  isValidLoginIdentifier,
} from "../../components/auth";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { getLastActiveRoute } from "../../utils/navigationHistory";
import {
  AcademicCapIcon,
  CheckIcon,
  CloseIcon,
  LockClosedIcon,
  MailIcon,
  ShieldCheckIcon,
  SpinnerIcon,
} from "../../components/ui/Icons";
import { AuthActionResult } from "./types";
import apiClient from "../../api/axios";
import "./locales"; // Ensure auth locales are registered

export default function LoginView(): React.JSX.Element {
  const { login, saveTokens } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const rememberId = useId();
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [usernameOrEmail, setUsernameOrEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [authErrorBanner, setAuthErrorBanner] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ usernameOrEmail: boolean; password: boolean }>({
    usernameOrEmail: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

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

  // Deferred post-interaction validation (only displayed after blur or submit attempt)
  const identifierError = !isValidLoginIdentifier(usernameOrEmail)
    ? t("invalidEmailOrPhone", "Please enter a valid email address or phone number.")
    : null;
  const passwordError = !password
    ? t("passwordRequired", "Please enter your password.")
    : null;

  const showIdentifierError = Boolean((touched.usernameOrEmail || submitAttempted) && identifierError);
  const showPasswordError = Boolean((touched.password || submitAttempted) && passwordError);

  // Email/Phone Form Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitAttempted(true);
    setAuthErrorBanner(null);

    if (identifierError) {
      showToast(identifierError, "warning");
      identifierInputRef.current?.focus();
      return;
    }

    if (passwordError) {
      showToast(passwordError, "warning");
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    const result: AuthActionResult = await login(usernameOrEmail.trim(), password);
    setLoading(false);

    if (result.success) {
      showToast(t("loginSuccess", "Signed in successfully!"), "success");
      navigate(getLastActiveRoute("/dashboard"), { replace: true });
    } else {
      const errMsg = result.error || t("authFailed", "Authentication failed.");
      setAuthErrorBanner(errMsg);
      showToast(errMsg, "error");
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const isExchangingCode = urlParams.has("code") || urlParams.has("access_token");

  if (isExchangingCode) {
    return (
      <PublicPortalShell maxWidth="md">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 theme-bg-surface border-0 ring-0 px-6 py-4 rounded-3xl shadow-2xl">
            <SpinnerIcon className="w-5 h-5 theme-accent shrink-0" />
            <span className="text-sm font-medium theme-text-primary">
              {t("completingGoogleAuth", "Completing Google Authentication...")}
            </span>
          </div>
        </div>
      </PublicPortalShell>
    );
  }

  return (
    <PublicPortalShell maxWidth="md">
      {/* Main Borderless Enterprise Login Card */}
      <div className="theme-bg-surface border-0 ring-0 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all duration-200 backdrop-blur-md">
        {/* Header Stack */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl theme-bg-accent-soft border-0 shadow-xs mx-auto">
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
          <div
            role="alert"
            className="p-3.5 rounded-2xl theme-bg-danger-soft theme-danger border-0 text-xs flex items-center justify-between gap-2 animate-fade-in"
          >
            <span className="font-medium text-start">{authErrorBanner}</span>
            <button
              type="button"
              onClick={() => setAuthErrorBanner(null)}
              aria-label={t("dismissError", "Dismiss error")}
              className="hover:opacity-80 transition-opacity p-1 cursor-pointer shrink-0 border-0"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Shared Reusable Google Social Sign-In */}
        <GoogleSignInButton
          disabled={loading}
          onSuccess={() => {
            setAuthErrorBanner(null);
            showToast(t("googleSuccess", "Signed in with Google successfully!"), "success");
            navigate(getLastActiveRoute("/dashboard"), { replace: true });
          }}
          onError={(errMsg) => {
            setAuthErrorBanner(errMsg);
            showToast(errMsg, "error");
          }}
        />

        {/* Credentials Form */}
        <form method="POST" noValidate onSubmit={handleSubmit} className="space-y-4">
          <PortalInputField
            name="usernameOrEmail"
            type="text"
            label={t("emailOrPhoneLabel", "Email or Phone Number")}
            value={usernameOrEmail}
            onChange={(val) => {
              setUsernameOrEmail(val);
              if (authErrorBanner) setAuthErrorBanner(null);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, usernameOrEmail: true }))}
            placeholder={t("emailOrPhonePlaceholder", "name@suffahhifz.com or 01700000000")}
            autoComplete="username"
            required
            disabled={loading}
            icon={<MailIcon className="w-4 h-4" />}
            error={identifierError}
            showError={showIdentifierError}
            inputRef={identifierInputRef}
          />

          <PortalInputField
            name="password"
            type="password"
            label={t("passwordLabel", "Password")}
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (authErrorBanner) setAuthErrorBanner(null);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            placeholder={t("passwordPlaceholder", "••••••••")}
            autoComplete="current-password"
            required
            disabled={loading}
            icon={<LockClosedIcon className="w-4 h-4" />}
            labelRight={
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs theme-accent hover:underline font-medium transition cursor-pointer border-0"
              >
                {t("forgotPassword", "Forgot password?")}
              </button>
            }
            error={passwordError}
            showError={showPasswordError}
            inputRef={passwordInputRef}
            showPasswordLabel={t("showPassword", "Show password")}
            hidePasswordLabel={t("hidePassword", "Hide password")}
          />

          {/* Borderless Accessible Remember Me Toggle */}
          <div className="flex items-center pt-1">
            <label
              htmlFor={rememberId}
              className="inline-flex items-center gap-2.5 cursor-pointer select-none"
            >
              <span className="relative inline-flex items-center justify-center">
                <input
                  id={rememberId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className={`w-4 h-4 rounded-md border-0 transition-colors flex items-center justify-center shadow-2xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
                    rememberMe
                      ? "theme-bg-accent theme-accent-text"
                      : "theme-bg-app theme-text-secondary"
                  }`}
                >
                  {rememberMe && <CheckIcon className="w-3 h-3" />}
                </span>
              </span>
              <span className="text-xs theme-text-secondary font-medium">
                {t("rememberMe", "Remember me on this device")}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl theme-bg-accent hover:opacity-95 active:scale-[0.99] theme-accent-text font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 border-0"
          >
            {loading && <SpinnerIcon className="w-4 h-4 theme-accent-text shrink-0" />}
            <span>
              {loading ? t("signingIn", "Authenticating...") : t("signInButton", "Sign In")}
            </span>
          </button>
        </form>

        {/* Switcher Footer */}
        <div className="pt-1 text-center text-xs theme-text-secondary">
          {t("noAccountPrompt", "Don't have an account?")}{" "}
          <Link
            to="/register"
            className="theme-accent hover:underline font-semibold ms-1 inline-block"
          >
            {t("signUpLink", "Sign Up")}
          </Link>
        </div>

        {/* Borderless Enterprise Security Badge */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] theme-text-secondary">
          <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span>{t("securityBadge", "Protected by enterprise-grade 256-bit encryption")}</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </PublicPortalShell>
  );
}
