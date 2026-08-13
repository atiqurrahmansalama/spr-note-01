/**
 * Centralized API Base URL Configuration.
 * 
 * Supports dynamic configuration via import.meta.env.VITE_API_BASE_URL.
 * When running in local development with Vite dev server proxy or same-origin deployment,
 * defaults to empty string so requests are cleanly routed through the relative path.
 */

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // Avoid dummy placeholder URLs
    if (!envUrl.includes('your-production-domain.com')) {
      return envUrl.trim().replace(/\/+$/, '');
    }
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
