import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function LoginView() {
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const [authErrorBanner, setAuthErrorBanner] = useState(null);

  const isGoogleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  // Email/Phone Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthErrorBanner(null);
    if (!usernameOrEmail || !password) {
      showToast('Please enter your email/phone and password.', 'warning');
      return;
    }

    setLoading(true);
    const result = await login(usernameOrEmail.trim(), password);
    setLoading(false);

    if (result.success) {
      showToast('Signed in successfully!', 'success');
      navigate('/');
    } else {
      setAuthErrorBanner(result.error || 'Authentication failed.');
      showToast(result.error || 'Authentication failed.', 'error');
    }
  };

  // Handle return from Google OAuth Redirect (when ux_mode: 'redirect')
  useEffect(() => {
    const handleGoogleRedirectHash = async () => {
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token')) return;

      const params = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');

      if (accessToken || idToken) {
        window.history.replaceState(null, '', window.location.pathname);
        setGoogleLoading(true);
        const result = await loginWithGoogle({
          access_token: accessToken,
          id_token: idToken,
        });
        setGoogleLoading(false);
        if (result.success) {
          showToast('Signed in with Google successfully!', 'success');
          navigate('/');
        } else {
          setAuthErrorBanner(result.error || 'Google authentication failed.');
          showToast(result.error || 'Google authentication failed.', 'error');
        }
      }
    };

    handleGoogleRedirectHash();
  }, []);

  // Google OAuth Trigger (Redirect Mode - Not blocked by adblockers/popups)
  const googleLoginTrigger = useGoogleLogin({
    ux_mode: 'redirect',
    redirect_uri: window.location.origin + '/login',
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      setAuthErrorBanner(null);
      setGoogleLoading(true);
      const result = await loginWithGoogle({
        access_token: tokenResponse.access_token,
        id_token: tokenResponse.id_token,
      });
      setGoogleLoading(false);

      if (result.success) {
        showToast('Signed in with Google successfully!', 'success');
        navigate('/');
      } else {
        const err = result.error || 'Google sign-in failed.';
        setAuthErrorBanner(err);
        showToast(err, 'error');
      }
    },
    onError: (error) => {
      setGoogleLoading(false);
      console.warn('Google OAuth redirect error:', error);
      const err = 'Google sign-in redirect failed.';
      setAuthErrorBanner(err);
      showToast(err, 'warning');
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100 selection:bg-sky-500 selection:text-zinc-950">
      
      {/* Login Card */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Header Stack */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-1.5 shadow-sm">
            <span className="font-mono text-xs font-bold tracking-tight text-white">Suffah Hifz LMS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Sign in to your account</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Enter your credentials to access portal
          </p>
        </div>

        {/* Auth Warning/Error Banner */}
        {authErrorBanner && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center justify-between gap-2">
            <span>{authErrorBanner}</span>
            <button
              type="button"
              onClick={() => setAuthErrorBanner(null)}
              className="text-amber-400 hover:text-amber-200 transition-colors p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Google Primary Social Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (!isGoogleConfigured) {
                console.warn('Google OAuth Client ID is not configured.');
                showToast('Google OAuth Client ID is not configured.', 'warning');
                return;
              }
              googleLoginTrigger();
            }}
            disabled={googleLoading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
            )}
            <span className="text-xs sm:text-sm">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-zinc-800/80" />
            <span className="absolute bg-zinc-900 px-3 text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
              OR CONTINUE WITH EMAIL
            </span>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Email or Phone Number</label>
            <input
              type="text"
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="name@suffahhifz.com or 01700000000"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600 font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-zinc-400">Password</label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.038 10.038 0 013.682-.763c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <label htmlFor="remember" className="text-xs text-zinc-400 cursor-pointer select-none">
              Remember me on this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading && (
              <svg className="animate-spin w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            <span>Sign In</span>
          </button>
        </form>

        {/* Switcher Footer */}
        <div className="pt-2 text-center text-xs text-zinc-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-400 hover:text-sky-300 font-medium underline underline-offset-4">
            Sign Up
          </Link>
        </div>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
