import { auth as authStore } from "./localStore";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return ""; // empty string uses Vite dev server proxy or current origin
};

const API_BASE_URL = getApiBaseUrl();

// Helper to make fetch request with relative proxy & absolute fallback
const fetchApi = async (path, options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Primary try with relative path (Vite proxy / same origin)
  try {
    const res = await fetch(cleanPath, options);
    if (res.ok || res.status < 500) return res;
  } catch {
    console.warn(`[authService] Proxy fetch to ${cleanPath} failed, attempting direct target...`);
  }

  // Fallback try 1: 127.0.0.1:8000
  try {
    const fallbackUrl = `http://127.0.0.1:8000${cleanPath}`;
    const res = await fetch(fallbackUrl, options);
    if (res.ok || res.status < 500) return res;
  } catch {
    console.warn(`[authService] Direct 127.0.0.1 fetch failed, trying localhost fallback...`);
  }

  // Fallback try 2: localhost:8000
  try {
    const localhostUrl = `http://localhost:8000${cleanPath}`;
    return await fetch(localhostUrl, options);
  } catch (err) {
    console.warn(`[authService] All API targets failed for ${cleanPath}:`, err.message);
    throw new Error("Server is offline or unreachable.");
  }
};

// Register User (Sign Up)
export const registerUser = async (userData) => {
  try {
    const response = await fetchApi('/api/register/', {
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
      let response = await fetchApi('/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });

      if (!response.ok && response.status === 404) {
        response = await fetchApi('/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameOrEmail, password }),
        });
      }

      const data = await response.json();

      if (response.ok) {
        authStore.saveAccessToken(data.access);
        authStore.saveRefreshToken(data.refresh);
        authStore.saveUser(data.user);
        import("./activityTracker").then(({ sendLoginLog, sendActivityLog }) => {
          sendLoginLog("LOGIN");
          sendActivityLog("ACTIVE");
        }).catch(() => {});
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

export const logoutUser = async () => {
  try {
    const { sendLoginLog, sendActivityLog } = await import("./activityTracker");
    await sendActivityLog("INACTIVE");
    await sendLoginLog("LOGOUT");
  } catch {
    // fallback
  }
  authStore.clear();
};

// Token Refresh Helper
export const refreshToken = async () => {
  const refresh = authStore.getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetchApi('/api/token/refresh/', {
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
    return fetchApi(url, { ...options, headers });
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    console.warn('[authService] Access token expired or invalid (401). Attempting auto refresh...');
    const newToken = await refreshToken();
    
    if (newToken) {
      response = await makeRequest(newToken);
    } else {
      authStore.clear();
      response = await makeRequest(null);
    }
  }

  return response;
};