import axios from 'axios';
import { auth as authStore } from '../utils/localStore';
import { API_BASE_URL } from '../config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token and X-Tenant-ID
apiClient.interceptors.request.use(
  (config) => {
    const token = authStore.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeTenantId = localStorage.getItem('active_tenant_id');
    if (activeTenantId && activeTenantId !== 'ALL' && activeTenantId !== 'null' && activeTenantId !== 'undefined') {
      config.headers['X-Tenant-ID'] = activeTenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Automatic Silent Token Refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/token/refresh/') &&
      !originalRequest.url.includes('/auth/google/') &&
      !originalRequest.url.includes('/token/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = authStore.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        authStore.clearTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const refreshEndpoint = '/api/v1/auth/token/refresh/';
        const response = await axios.post(refreshEndpoint, { refresh: refreshToken });

        if (response.status === 200 && response.data.access) {
          const newAccessToken = response.data.access;
          authStore.saveAccessToken(newAccessToken);

          if (response.data.refresh) {
            authStore.saveRefreshToken(response.data.refresh);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        
        // Only clear tokens and redirect to login if the server explicitly rejected the refresh token (e.g. 400, 401, 403).
        // Avoid logging out on temporary network/connection drop.
        const status = refreshErr.response?.status;
        if (status && (status === 400 || status === 401 || status === 403)) {
          authStore.clearTokens();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
