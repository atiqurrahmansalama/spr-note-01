import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";

export default function LoginView() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!identifier.trim() || !password) {
      setErrorMsg("Please enter both username/phone and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginUser(identifier.trim(), password);

      if (res.success && res.user) {
        showToast("Signed in successfully!", "success");
        const role = (res.user.role || res.user.user_type || "").toUpperCase();

        // Role-Based Redirection
        if (role === "SUPER_ADMIN" || role === "ADMIN") {
          navigate("/user-management", { replace: true });
        } else if (role === "GUARDIAN" || role === "STUDENT") {
          navigate("/student-reports", { replace: true });
        } else {
          // TEACHER or default -> Dashboard
          navigate("/", { replace: true });
        }
      } else {
        setErrorMsg(res.message || "Invalid username or password. Please try again.");
        showToast("Authentication failed", "error");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid username or password. Please try again.");
      showToast("Server connection error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full theme-bg-app flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 theme-bg-accent-soft rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="w-full max-w-md theme-bg-surface border theme-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 animate-fade-in">
        
        {/* App Branding Stack */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-sm shadow-md">
              SPR
            </div>
          </div>

          <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
            Suffah Hifz Management System
          </span>
          <h1 className="text-xl sm:text-2xl font-bold theme-text-primary tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-xs theme-text-secondary">
            Enter your credentials to access your enterprise dashboard
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 theme-danger text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
            <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Login Input Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* Username / Phone / Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold theme-text-secondary block">
              Identifier
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 p-1 theme-text-secondary pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Phone number, email or username"
                className="w-full theme-bg-sub border theme-border theme-text-primary pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold theme-text-secondary block">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 p-1 theme-text-secondary pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full theme-bg-sub border theme-border theme-text-primary pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.948A10.14 10.14 0 0112 3c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.692-4.692a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs theme-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded theme-bg-sub border theme-border theme-accent accent-[var(--accent-main)] cursor-pointer"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => showToast("Please contact your administrator to reset password.", "info")}
              className="text-xs theme-accent hover:underline cursor-pointer font-medium"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs sm:text-sm py-3 rounded-xl transition-all shadow-lg shadow-[var(--accent-main)]/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] mt-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Quick Fill Demo Credentials */}
        <div className="pt-3 border-t theme-border text-center">
          <button
            type="button"
            onClick={() => {
              setIdentifier("01700000000");
              setPassword("admin123");
              showToast("Filled demo admin credentials!", "info");
            }}
            className="text-[11px] theme-text-secondary hover:theme-text-primary font-mono theme-bg-sub border theme-border px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Quick Fill Admin:</span>
            <span className="theme-accent font-semibold">01700000000 / admin123</span>
          </button>
        </div>
      </div>


      {/* Footer Notice */}

      <p className="text-xs theme-text-secondary opacity-60 text-center mt-6 tracking-wide">
        Suffah Hifz Management System v1.0 • Cryptographic Verified System
      </p>
    </div>
  );
}
