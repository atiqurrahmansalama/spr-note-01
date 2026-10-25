/**
 * Centralized API Base URL Configuration.
 * 
 * Supports dynamic configuration via import.meta.env.VITE_API_BASE_URL.
 * When running in local development with Vite dev server proxy or same-origin deployment,
 * defaults to empty string so requests are cleanly routed through the relative path.
 */

export const getApiBaseUrl = (): string => {
  const envUrl =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.VITE_API_BASE_URL
      : typeof process !== 'undefined' && (process as any).env
      ? (process as any).env.VITE_API_BASE_URL
      : '';

  // In browser local development with Vite dev server (e.g. localhost / 127.0.0.1),
  // routing requests through Vite's built-in proxy ('') prevents CORS preflight drops,
  // origin mismatches (e.g. localhost:5174 vs 127.0.0.1:8000), and dynamic port binding issues.
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '';
    }
  }

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // Avoid dummy placeholder URLs
    if (!envUrl.includes('your-production-domain.com')) {
      return envUrl.trim().replace(/\/+$/, '');
    }
  }

  return '';
};

export const API_BASE_URL: string = getApiBaseUrl();

export default API_BASE_URL;
