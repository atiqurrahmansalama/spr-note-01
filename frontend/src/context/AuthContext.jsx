import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { auth as authStore } from '../utils/localStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authStore.getUserProfile());
  const [accessToken, setAccessToken] = useState(() => authStore.getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(accessToken && user);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check for Google OAuth redirect hash parameters
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const googleAccess = params.get('access_token');
        const googleId = params.get('id_token');
        if (googleAccess || googleId) {
          window.history.replaceState(null, '', window.location.pathname);
          try {
            const res = await apiClient.post('/api/v1/auth/google/', {
              access_token: googleAccess,
              id_token: googleId,
            });
            const data = res.data;
            if (data.tokens?.access) {
              authStore.saveTokens(data.tokens.access, data.tokens.refresh);
              setAccessToken(data.tokens.access);
            }
            if (data.user) {
              authStore.saveUserProfile(data.user);
              setUser(data.user);
            }
          } catch (e) {
            console.warn('[AuthProvider] Google OAuth redirect token exchange error:', e);
          }
          setIsLoading(false);
          return;
        }
      }

      // 2. Normal initial token verification
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
