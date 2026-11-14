import React, { useState } from "react";
import { useGoogleLogin, TokenResponse } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { GoogleIcon, SpinnerIcon } from "../ui/Icons";

export interface GoogleSignInButtonProps {
  label?: string;
  connectingLabel?: string;
  dividerLabel?: string;
  showDivider?: boolean;
  disabled?: boolean;
  onSuccess?: (user: any) => void;
  onError?: (errorMessage: string) => void;
}

/**
 * Reusable Borderless Google OAuth 2.0 Sign-In Component.
 * Encapsulates @react-oauth/google popup flow and AuthContext token exchange
 * so Login, Register, and Public Onboarding portals share identical security and UX.
 */
export default function GoogleSignInButton({
  label,
  connectingLabel,
  dividerLabel,
  showDivider = true,
  disabled = false,
  onSuccess,
  onError,
}: GoogleSignInButtonProps): React.JSX.Element {
  const { loginWithGoogle } = useAuth() as {
    loginWithGoogle: (payload: TokenResponse) => Promise<{ success: boolean; user?: any; error?: string }>;
  };
  const { t } = useTranslation("auth");
  const [googleLoading, setGoogleLoading] = useState(false);

  const isGoogleConfigured = Boolean((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID);

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      setGoogleLoading(true);
      try {
        const result = await loginWithGoogle(tokenResponse);
        if (result.success) {
          onSuccess?.(result.user);
        } else {
          onError?.(result.error || t("googleFailed", "Google authentication failed."));
        }
      } catch (err: any) {
        onError?.(
          err?.response?.data?.detail ||
            err?.message ||
            t("googleFailed", "Google sign-in failed.")
        );
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      setGoogleLoading(false);
      const errCode = (errorResponse as any)?.error;
      if (errCode === "popup_closed_by_user") {
        return;
      }
      const errMsg =
        errorResponse?.error_description ||
        errCode ||
        t("googleClosed", "Google sign-in was closed or failed.");
      onError?.(errMsg);
    },
  });

  const resolvedLabel = label || t("continueWithGoogle", "Continue with Google");
  const resolvedConnecting = connectingLabel || t("connectingToGoogle", "Connecting to Google...");
  const resolvedDivider = dividerLabel || t("orContinueWith", "OR CONTINUE WITH CREDENTIALS");

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          try {
            if (typeof window !== "undefined" && window.location) {
              sessionStorage.setItem("spr_auth_return_url", window.location.href);
            }
          } catch {}
          handleGoogleSignIn();
        }}
        disabled={googleLoading || disabled || !isGoogleConfigured}
        title={
          !isGoogleConfigured
            ? t("googleNotConfigured", "Google Sign-In is not configured in this environment")
            : resolvedLabel
        }
        className="w-full theme-bg-app hover:theme-bg-elevated/40 disabled:opacity-50 theme-text-primary border-0 ring-0 font-semibold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
      >
        {googleLoading ? (
          <>
            <SpinnerIcon className="w-4 h-4 theme-accent shrink-0" />
            <span className="text-xs sm:text-sm theme-text-secondary">{resolvedConnecting}</span>
          </>
        ) : (
          <>
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm">{resolvedLabel}</span>
          </>
        )}
      </button>

      {showDivider && (
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full h-px theme-bg-app" />
          <span className="relative z-10 theme-bg-surface px-3 text-[10px] font-semibold tracking-wider theme-text-secondary uppercase text-center whitespace-nowrap">
            {resolvedDivider}
          </span>
          <div className="w-full h-px theme-bg-app" />
        </div>
      )}
    </div>
  );
}
