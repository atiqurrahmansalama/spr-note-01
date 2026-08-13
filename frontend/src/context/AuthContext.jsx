import { createContext, useContext, useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { auth as authStore } from '../utils/localStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authStore.getUserProfile());
  const [accessToken, setAccessToken] = useState(() => authStore.getAccessToken());
  const [isLoading, setIsLoading] = useState(true);
  const isProcessingCode = useRef(false);

  const isAuthenticated = Boolean(accessToken && user);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleCode = urlParams.get('code');

    const hash = window.location.hash;
    const hashParams = hash ? new URLSearchParams(hash.replace('#', '?')) : null;
    const googleAccess = hashParams?.get('access_token');
    const googleId = hashParams?.get('id_token');

    // 1. IF RETURNING FROM GOOGLE VIA DIRECT SAME-WINDOW REDIRECT:
    if ((googleCode || googleAccess || googleId) && !isProcessingCode.current) {
      isProcessingCode.current = true;
      setIsLoading(true);
      const payload = googleCode
        ? { code: googleCode, redirect_uri: window.location.origin }
        : { access_token: googleAccess, id_token: googleId };

      apiClient.post('/api/v1/auth/google/', payload)
        .then(res => {
          saveTokens(res.data);
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = '/';
        })
        .catch(err => {
          console.error('[AuthProvider] Direct Google Exchange Error:', err?.response?.data || err?.message);
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = '/login';
        })
        .finally(() => {
          isProcessingCode.current = false;
          setIsLoading(false);
        });
      return;
    }

    // 2. LISTEN FOR STORAGE SYNC EVENTS ACROSS TABS
    const handleStorageChange = (e) => {
      if (e.key === 'auth_sync_event') {
        const token = authStore.getAccessToken() || localStorage.getItem('access_token');
        const userDataStr = localStorage.getItem('user');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;

        if (token) {
          setAccessToken(token);
          if (userData) {
            setUser(userData);
            authStore.saveUserProfile(userData);
          }
          window.location.href = '/';
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 3. Normal initial token verification
    const initAuth = async () => {
      const token = authStore.getAccessToken();
      if (token) {
        setAccessToken(token);
        try {
          const res = await apiClient.get('/api/v1/user/profile/');
          if (res.data) {
            setUser(res.data);
            authStore.saveUserProfile(res.data);
          }
        } catch {
          console.warn('[AuthProvider] Initial token verification failed.');
        }
      }
      setIsLoading(false);
    };

    initAuth();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const saveTokens = (data) => {
    if (!data) return;
    const access = data.access || data.tokens?.access;
    const refresh = data.refresh || data.tokens?.refresh;
    const userData = data.user;

    if (access) {
      authStore.saveTokens(access, refresh);
      localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      setAccessToken(access);
    }
    if (userData) {
      authStore.saveUserProfile(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else if (access) {
      setUser(user || true);
    }
  };

  // Standard Email/Phone Login
  const login = async (usernameOrEmail, password) => {
    setIsLoading(true);
    try {
      const payload = {
        username: usernameOrEmail,
        phone_number: usernameOrEmail,
        email: usernameOrEmail,
        password,
      };

      let res;
      try {
        res = await apiClient.post('/api/v1/auth/token/', payload);
      } catch {
        res = await apiClient.post('/token/', payload);
      }

      if (res.data && res.data.access) {
        const { access, refresh, user: userData } = res.data;
        authStore.saveAccessToken(access);
        authStore.saveRefreshToken(refresh);
        setAccessToken(access);

        let finalUser = userData || {};
        try {
          const profRes = await apiClient.get('/api/v1/user/profile/');
          if (profRes.data) {
            finalUser = { ...finalUser, ...profRes.data };
          }
        } catch {
          // fallback
        }

        setUser(finalUser);
        authStore.saveUserProfile(finalUser);
        return { success: true, user: finalUser };
      }
      return { success: false, error: 'Login failed' };
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Invalid credentials. Please check your username and password.';
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth2 Token Exchange
  const loginWithGoogle = async (googlePayload) => {
    setIsLoading(true);
    try {
      const payload = typeof googlePayload === 'string'
        ? { id_token: googlePayload }
        : {
            id_token: googlePayload.id_token || googlePayload.credential,
            access_token: googlePayload.access_token,
            credential: googlePayload.credential,
          };

      const res = await apiClient.post('/api/v1/auth/google/', payload);
      if (res.data && res.data.access) {
        const { access, refresh, user: userData } = res.data;
        authStore.saveAccessToken(access);
        authStore.saveRefreshToken(refresh);
        setAccessToken(access);

        setUser(userData);
        authStore.saveUserProfile(userData);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Google OAuth exchange failed' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Google sign-in was cancelled or failed.';
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Standard User Sign Up / Register
  const register = async (registerData) => {
    try {
      const res = await apiClient.post('/api/v1/auth/register/', registerData);
      return { success: true, data: res.data };
    } catch (err) {
      const errors = err.response?.data || { detail: 'Registration failed' };
      return { success: false, errors };
    }
  };

  // Email Verification
  const verifyEmail = async (token) => {
    try {
      const res = await apiClient.post('/api/v1/auth/verify-email/', { token });
      if (user) {
        const updated = { ...user, is_email_verified: true };
        setUser(updated);
        authStore.saveUserProfile(updated);
      }
      return { success: true, message: res.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Email verification failed.';
      return { success: false, error: errorMsg };
    }
  };

  // Resend Email Verification
  const resendVerification = async (email) => {
    try {
      const res = await apiClient.post('/api/v1/auth/resend-verification/', { email });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to resend verification email.';
      return { success: false, error: errorMsg };
    }
  };

  // Request Password Reset Link
  const requestPasswordReset = async (email) => {
    try {
      const res = await apiClient.post('/api/v1/auth/password-reset/', { email });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send reset link.';
      return { success: false, error: errorMsg };
    }
  };

  // Confirm Password Reset with Token
  const confirmPasswordReset = async (token, newPassword) => {
    try {
      const res = await apiClient.post('/api/v1/auth/password-reset-confirm/', {
        token,
        new_password: newPassword,
      });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Password reset failed.';
      return { success: false, error: errorMsg };
    }
  };

  // Active Sessions
  const fetchActiveSessions = async () => {
    try {
      const res = await apiClient.get('/api/v1/auth/sessions/');
      return { success: true, sessions: res.data };
    } catch {
      return { success: false, sessions: [] };
    }
  };

  const revokeSession = async (sessionId = null, revokeOthers = false) => {
    try {
      const res = await apiClient.post('/api/v1/auth/sessions/revoke/', {
        session_id: sessionId,
        revoke_others: revokeOthers,
      });
      return { success: true, message: res.data.message };
    } catch {
      return { success: false, error: 'Failed to revoke session' };
    }
  };

  // Logout
  const logout = async () => {
    const refreshToken = authStore.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post('/api/v1/auth/logout/', { refresh: refreshToken });
      } catch {
        // ignore logout errors
      }
    }
    authStore.clearTokens();
    setAccessToken(null);
    setUser(null);
  };

  const value = {
    user,
    setUser,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    saveTokens,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    confirmPasswordReset,
    fetchActiveSessions,
    revokeSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
