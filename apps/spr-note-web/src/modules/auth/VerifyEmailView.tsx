import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { CheckIcon, CloseIcon, SpinnerIcon } from "../../components/ui/Icons";
import { AuthActionResult } from "./types";

export default function VerifyEmailView(): React.JSX.Element {
  const { token } = useParams<{ token: string }>();
  const { verifyEmail, resendVerification } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendEmail, setResendEmail] = useState<string>("");
  const [resending, setResending] = useState<boolean>(false);

  useEffect(() => {
    const runVerification = async (): Promise<void> => {
      if (!token) {
        setVerifying(false);
        setErrorMessage("Verification token missing.");
        return;
      }

      const result: AuthActionResult = await verifyEmail(token);
      setVerifying(false);

      if (result.success) {
        setSuccess(true);
        showToast(result.message || "Email verified successfully!", "success");
      } else {
        setSuccess(false);
        setErrorMessage(result.error || "Verification failed or link expired.");
      }
    };

    runVerification();
  }, [token, verifyEmail, showToast]);

  const handleResend = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      showToast("Please enter your email to resend link.", "warning");
      return;
    }

    setResending(true);
    const result: AuthActionResult = await resendVerification(resendEmail.trim());
    setResending(false);

    if (result.success) {
      showToast(result.message || "New verification link sent!", "success");
    } else {
      showToast(result.error || "Failed to resend verification email.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100 selection:bg-sky-500 selection:text-zinc-950">
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-md space-y-6 text-center">
        {/* Header Stack */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-1.5 shadow-sm">
            <span className="font-mono text-xs font-bold tracking-tight text-white">
              Suffah Hifz LMS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Email Verification
          </h1>
        </div>

        {verifying ? (
          <div className="py-8 space-y-4">
            <SpinnerIcon className="w-12 h-12 text-sky-400 mx-auto" />
            <p className="text-sm text-zinc-400 font-mono">Verifying token with server...</p>
          </div>
        ) : success ? (
          <div className="py-6 space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Account Verified!</h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Your email address has been confirmed. You now have full access to the portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all shadow-lg cursor-pointer"
            >
              Continue to Portal
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-5">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <CloseIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Verification Link Invalid</h2>
              <p className="text-xs sm:text-sm text-red-400 font-mono">{errorMessage}</p>
            </div>

            {/* Resend Link Form */}
            <form onSubmit={handleResend} className="pt-3 border-t border-zinc-800 space-y-3 text-left">
              <p className="text-xs text-zinc-400">Request a new verification link:</p>
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="name@suffahhifz.com"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {resending && <SpinnerIcon className="w-4 h-4 text-white" />}
                <span>Resend Verification Email</span>
              </button>
            </form>

            <div className="pt-2">
              <Link
                to="/login"
                className="text-xs text-sky-400 hover:text-sky-300 font-medium underline underline-offset-4"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
