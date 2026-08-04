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

// Login User (Online ও Offline উভয়েই কাজ করে)
export const loginUser = async (usernameOrEmail, password) => {
  // 🌐 অনলাইনে থাকলে API-তে লগইন করার চেষ্টা করো
  if (navigator.onLine) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ API সফল: tokens ও user info LocalStorage-এ সেভ করো
        authStore.saveAccessToken(data.access);
        authStore.saveRefreshToken(data.refresh);
        authStore.saveUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.detail || 'Login failed' };
      }
    } catch {
      // API ব্যর্থ — অফলাইন fallback-এ যাও
      console.warn('[authService] Login API unreachable, checking cached session.');
    }
  }

  // 📴 অফলাইন fallback: LocalStorage-এ stored session আছে কিনা দেখো
  const cachedUser = authStore.getUser();
  const cachedToken = authStore.getAccessToken();

  if (cachedUser && cachedToken) {
    // Stored credentials আছে → offline mode-এ logged in থাকবে
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

// Authenticated Request Helper
export const fetchWithAuth = async (url, options = {}) => {
  const token = authStore.getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  if (response.status === 401) {
    // Token মেয়াদ শেষ — LocalStorage clear করো এবং reload
    authStore.clear();
    window.location.reload();
  }
  return response;
};