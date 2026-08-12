import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Password Strength Visualizer Helper Component
function PasswordStrengthIndicator({ password }) {
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
      ? 'bg-red-500'
      : score === 2
      ? 'bg-amber-500'
      : score === 3
      ? 'bg-yellow-400'
      : 'bg-emerald-400';

  const strengthLabel =
    score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-[11px]">Password Strength:</span>
        <span className={`font-semibold text-[11px] ${score >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
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
        <div className={`flex items-center gap-1 ${checks.minLength ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span>{checks.minLength ? '✓' : '○'}</span>
          <span>At least 8 characters</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasUpper ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span>{checks.hasUpper ? '✓' : '○'}</span>
          <span>1 uppercase letter</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasNumber ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span>{checks.hasNumber ? '✓' : '○'}</span>
          <span>1 number (0-9)</span>
        </div>
        <div className={`flex items-center gap-1 ${checks.hasSpecial ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span>{checks.hasSpecial ? '✓' : '○'}</span>
          <span>1 special symbol</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterView() {
  const { register, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const isGoogleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

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
          showToast('Signed up with Google successfully!', 'success');
          navigate('/');
        } else {
          showToast(result.error || 'Google sign-up failed.', 'error');
        }
      }
    };

    handleGoogleRedirectHash();
  }, []);

  const googleSignUpTrigger = useGoogleLogin({
    ux_mode: 'redirect',
    redirect_uri: window.location.origin + '/register',
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      const result = await loginWithGoogle({
        access_token: tokenResponse.access_token,
        id_token: tokenResponse.id_token,
      });
      setGoogleLoading(false);

      if (result.success) {
        showToast('Signed up with Google successfully!', 'success');
        navigate('/');
      } else {
        const err = result.error || 'Google sign-up failed.';
        showToast(err, 'error');
      }
    },
    onError: (error) => {
      setGoogleLoading(false);
      console.warn('Google OAuth redirect error:', error);
      showToast('Google sign-up redirect failed.', 'warning');
    },
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (formData.password !== formData.confirm_password) {
      setFieldErrors({ confirm_password: ['Passwords do not match.'] });
      showToast('Passwords do not match.', 'warning');
      return;
    }

    setLoading(true);
    const result = await register({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone_number: formData.phone_number,
      password: formData.password,
    });
    setLoading(false);

    if (result.success) {
      showToast('Registration successful! Please check your email to verify your account.', 'success');
      navigate('/login');
    } else {
      setFieldErrors(result.errors || {});
      const generalMsg = result.errors?.detail || result.errors?.email?.[0] || 'Registration failed. Please check your details.';
      showToast(generalMsg, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100 selection:bg-sky-500 selection:text-zinc-950">
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Header Stack */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-1.5 shadow-sm">
            <span className="font-mono text-xs font-bold tracking-tight text-white">Suffah Hifz LMS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Create an account</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Sign up to access the Suffah Hifz Management System
          </p>
        </div>

        {/* Google Sign-Up Action */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (!isGoogleConfigured) {
                console.warn('Google OAuth Client ID is not configured.');
                showToast('Google OAuth Client ID is not configured.', 'warning');
                return;
              }
              googleSignUpTrigger();
            }}
            disabled={googleLoading}
            className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-white font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting Google..." : "Sign up with Google"}</span>
          </button>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">or sign up with email</span>
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
                fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-sky-500'
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
                type={showPassword ? 'text' : 'password'}
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
            {/* Real-time Password Strength Visualizer */}
            <PasswordStrengthIndicator password={formData.password} />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">Confirm Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirm_password"
              required
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-xl bg-zinc-950 border text-white text-sm focus:outline-none transition-colors placeholder:text-zinc-600 ${
                fieldErrors.confirm_password ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-sky-500'
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
            {loading && (
              <svg className="animate-spin w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            <span>Create Account</span>
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium underline underline-offset-4">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
