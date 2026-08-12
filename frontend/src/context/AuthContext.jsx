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

    // 1. IF WE ARE INSIDE THE POPUP WINDOW RETURNING FROM GOOGLE:
    if ((googleCode || googleAccess || googleId) && window.opener && !isProcessingCode.current) {
      isProcessingCode.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);

      const payload = googleCode
        ? { code: googleCode, redirect_uri: window.location.origin }
        : { access_token: googleAccess, id_token: googleId };

      apiClient.post('/api/v1/auth/google/', payload)
        .then(res => {
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', payload: res.data }, window.location.origin);
          }
          window.close();
        })
        .catch(err => {
          console.error('Database/Backend Google Exchange Failed:', err?.response?.data || err?.message);
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: err?.response?.data || 'Backend database update failed'
            }, window.location.origin);
          }
          window.close();
        })
        .finally(() => {
          isProcessingCode.current = false;
        });
      return;
    }

    // 2. IF WE ARE IN MAIN WINDOW RETURNING VIA DIRECT REDIRECT (no opener):
    if ((googleCode || googleAccess || googleId) && !window.opener && !isProcessingCode.current) {
      isProcessingCode.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      const payload = googleCode
        ? { code: googleCode, redirect_uri: window.location.origin }
        : { access_token: googleAccess, id_token: googleId };

      apiClient.post('/api/v1/auth/google/', payload)
        .then(res => {
          const data = res.data;
          const newAccess = data.tokens?.access || data.access;
          const newRefresh = data.tokens?.refresh || data.refresh;
          const userData = data.user;

          if (newAccess) {
            authStore.saveTokens(newAccess, newRefresh);
            localStorage.setItem('access_token', newAccess);
            if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
            setAccessToken(newAccess);
          }
          if (userData) {
            authStore.saveUserProfile(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
          }
          window.location.href = '/';
        })
        .catch(err => {
          console.error('[AuthProvider] Direct Google Exchange Error:', err?.response?.data || err?.message);
        })
        .finally(() => {
          isProcessingCode.current = false;
          setIsLoading(false);
        });
      return;
    }

    // 3. IF WE ARE IN THE MAIN WINDOW: Listen for postMessage from popup window
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const payload = event.data.payload || {};
        const newAccess = payload.tokens?.access || payload.access;
        const newRefresh = payload.tokens?.refresh || payload.refresh;
        const userData = payload.user;

        if (newAccess) {
          authStore.saveTokens(newAccess, newRefresh);
          localStorage.setItem('access_token', newAccess);
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
          setAccessToken(newAccess);
        }
        if (userData) {
          authStore.saveUserProfile(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }

        window.location.href = '/';
      }

      if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        console.error('Google Login Error from Popup:', event.data.error);
      }
    };

    // 4. LISTEN FOR STORAGE SYNC EVENTS ACROSS TABS
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

    // 5. Normal initial token verification
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
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
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
