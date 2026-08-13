import { auth as authStore } from "./localStore";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (
    envUrl &&
    !envUrl.includes("your-production-domain.com") &&
    !envUrl.includes("127.0.0.1") &&
    !envUrl.includes("localhost")
  ) {
    return envUrl.replace(/\/+$/, "");
  }
  return "";
};

const API_BASE_URL = getApiBaseUrl();

// Helper to make fetch request with relative proxy & fast resolution
const fetchApi = async (path, options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
  
  try {
    const res = await fetch(targetUrl, options);
    if (res.ok || res.status < 500) return res;
  } catch (err) {
    console.warn(`[authService] Fetch to ${targetUrl} failed:`, err);
  }

  if (API_BASE_URL) {
    try {
      const res = await fetch(cleanPath, options);
      if (res.ok || res.status < 500) return res;
    } catch {
      // ignore
    }
  }

  throw new Error("Server is offline or unreachable.");
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
      const payload = {
        username: usernameOrEmail,
        phone_number: usernameOrEmail,
        email: usernameOrEmail,
        password: password,
      };

      let response = await fetchApi('/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok && (response.status === 404 || response.status === 400)) {
        response = await fetchApi('/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        authStore.saveAccessToken(data.access);
        authStore.saveRefreshToken(data.refresh);

        let userObj = data.user || {};
        try {
          const profileRes = await fetchApi('/api/v1/user/profile/', {
            headers: { 'Authorization': `Bearer ${data.access}` },
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            userObj = { ...userObj, ...profileData };
          }
        } catch (err) {
          console.warn('[authService] Profile fetch warning:', err.message);
        }

        authStore.saveUser(userObj);
        window.dispatchEvent(new CustomEvent("spr_auth_updated"));

        import("./activityTracker").then(({ sendLoginLog, sendActivityLog }) => {
          sendLoginLog("LOGIN");
          sendActivityLog("ACTIVE");
        }).catch(() => {});
        return { success: true, user: userObj };
      } else {
        let errStr = "Invalid username or password. Please try again.";
        if (data.detail) {
          errStr = data.detail;
        } else if (data.non_field_errors) {
          errStr = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : data.non_field_errors;
        } else if (data.phone_number) {
          errStr = Array.isArray(data.phone_number) ? data.phone_number.join(" ") : data.phone_number;
        } else if (data.username) {
          errStr = Array.isArray(data.username) ? data.username.join(" ") : data.username;
        } else if (data.password) {
          errStr = Array.isArray(data.password) ? data.password.join(" ") : data.password;
        } else if (typeof data === "string") {
          errStr = data;
        }
        return { success: false, message: errStr };
      }
    } catch (err) {
      console.warn('[authService] Login API unreachable:', err.message);
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
    } else if (response.status === 400 || response.status === 401 || response.status === 403) {
      authStore.clear();
    }
  } catch (err) {
    console.warn('[authService] Token refresh failed (network/server error):', err.message);
  }

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