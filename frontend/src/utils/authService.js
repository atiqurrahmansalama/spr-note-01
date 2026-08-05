import { auth as authStore } from "./localStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Register User (Sign Up)
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    return response.ok ? { success: true, data } : { success: false, errors: data };
  } catch {
    return { success: false, message: 'Server connection failed' };
  }
};

// Login User
export const loginUser = async (usernameOrEmail, password) => {
  if (navigator.onLine) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });

      const data = await response.json();

      if (response.ok) {
        authStore.saveAccessToken(data.access);
        authStore.saveRefreshToken(data.refresh);
        authStore.saveUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.detail || 'Login failed' };
      }
    } catch {
      console.warn('[authService] Login API unreachable, checking cached session.');
    }
  }

  const cachedUser = authStore.getUser();
  const cachedToken = authStore.getAccessToken();

  if (cachedUser && cachedToken) {
    return {
      success: true,
      user: cachedUser,
      offlineMode: true,
    };
  }

  return {
    success: false,
    message: navigator.onLine
      ? 'Login failed'
      : 'You are offline. No saved session found.',
  };
};

// Token Refresh Helper
export const refreshToken = async () => {
  const refresh = authStore.getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.access) {
        authStore.saveAccessToken(data.access);
        return data.access;
      }
    }
  } catch (err) {
    console.warn('[authService] Token refresh failed:', err.message);
  }

  // Refresh token is also expired or invalid
  authStore.clear();
  return null;
};

// Authenticated Request Helper with Auto-Refresh & Fallback Retry
export const fetchWithAuth = async (url, options = {}) => {
  let token = authStore.getAccessToken();
  
  const makeRequest = async (authToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers,
    };
    return fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    console.warn('[authService] Access token expired or invalid (401). Attempting auto refresh...');
    const newToken = await refreshToken();
    
    if (newToken) {
      // Retry request with newly refreshed token
      response = await makeRequest(newToken);
    } else {
      // Refresh failed or no refresh token exists -> Clear expired tokens and retry without Authorization header
      authStore.clear();
      response = await makeRequest(null);
    }
  }

  return response;
};