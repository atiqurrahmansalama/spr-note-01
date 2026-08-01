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
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameOrEmail, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else {
      return { success: false, message: data.detail || 'Login failed' };
    }
  } catch {
    return { success: false, message: 'Server connection failed' };
  }
};

// Authenticated Request Helper
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.reload();
  }
  return response;
};