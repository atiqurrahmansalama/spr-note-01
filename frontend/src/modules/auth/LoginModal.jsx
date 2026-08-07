import { useState } from 'react';
import { loginUser, registerUser } from '../../utils/authService';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState('signin');
  
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');

  const [regData, setRegData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'TEACHER'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await loginUser(loginInput, password);
    if (result.success) {
      onLoginSuccess(result.user);
      onClose();
    } else {
      setError(result.message || 'Invalid username/email or password');
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await registerUser(regData);

    if (result.success) {
      setSuccess('Account created successfully! Please Sign In.');
      setTab('signin');
      setLoginInput(regData.username);
    } else {
      let errorMessage = 'Registration failed.';

      if (result.errors) {
        const errObj = result.errors.details || result.errors;
        if (typeof errObj === 'object') {
          const firstKey = Object.keys(errObj)[0];
          const firstErr = Array.isArray(errObj[firstKey]) ? errObj[firstKey][0] : errObj[firstKey];
          errorMessage = `${firstKey.toUpperCase()}: ${firstErr}`;
        } else {
          errorMessage = String(errObj);
        }
      } else if (result.message) {
        errorMessage = result.message;
      }

      setError(errorMessage);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="theme-bg-surface border theme-border rounded-2xl p-6 w-full max-w-md shadow-2xl transition-all">
        <div className="flex theme-bg-app p-1 rounded-xl mb-6 border theme-border">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signin' ? 'theme-bg-accent theme-accent-text shadow-md' : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup' ? 'theme-bg-accent theme-accent-text shadow-md' : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4">
            {success}
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium theme-text-secondary mb-1 uppercase tracking-wider">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                placeholder="enter username or email..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium theme-text-secondary mb-1 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 theme-bg-elevated hover:opacity-80 theme-text-secondary py-2.5 rounded-xl text-xs font-medium border theme-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text py-2.5 rounded-xl text-xs font-semibold shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] theme-text-secondary mb-1 uppercase">First Name</label>
                <input
                  type="text"
                  value={regData.first_name}
                  onChange={(e) => setRegData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  placeholder="e.g. Atiqur"
                />
              </div>
              <div>
                <label className="block text-[10px] theme-text-secondary mb-1 uppercase">Last Name</label>
                <input
                  type="text"
                  value={regData.last_name}
                  onChange={(e) => setRegData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                  placeholder="e.g. Rahman"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] theme-text-secondary mb-1 uppercase">Username</label>
              <input
                type="text"
                required
                value={regData.username}
                onChange={(e) => setRegData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                placeholder="unique username..."
              />
            </div>

            <div>
              <label className="block text-[10px] theme-text-secondary mb-1 uppercase">Email Address</label>
              <input
                type="email"
                required
                value={regData.email}
                onChange={(e) => setRegData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-[10px] theme-text-secondary mb-1 uppercase">Password</label>
              <input
                type="password"
                required
                value={regData.password}
                onChange={(e) => setRegData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                placeholder="at least 6 characters..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 theme-bg-elevated hover:opacity-80 theme-text-secondary py-2.5 rounded-xl text-xs font-medium border theme-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text py-2.5 rounded-xl text-xs font-semibold shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Register'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
