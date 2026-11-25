/**
 * HTTP Network & Authentication Utilities
 * =======================================
 * Resilient fetch wrapper with automatic token injection, JWT refresh, and tenant context.
 */
import { readJSON, writeJSON } from './storageUtils';

export interface StoredAuthTokens {
  access: string;
  refresh: string;
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown> | null;

  constructor(message: string, status: number, data: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface AuthHttpClientConfig {
  tokenStorageKey: string;
  refreshEndpoint?: string;
  baseUrl?: string;
}

export interface AuthHttpRequestOptions extends RequestInit {
  skipAuth?: boolean;
  isMultipart?: boolean;
}

export function createAuthHttpClient(config: AuthHttpClientConfig) {
  const {
    tokenStorageKey,
    refreshEndpoint = '/api/v1/auth/token/refresh/',
    baseUrl = '',
  } = config;

  let refreshPromise: Promise<string | null> | null = null;

  const getTokens = (): StoredAuthTokens | null => {
    const parsed = readJSON<Partial<StoredAuthTokens> | null>(tokenStorageKey, null);
    if (parsed?.access && parsed?.refresh) {
      return { access: parsed.access, refresh: parsed.refresh };
    }
    return null;
  };

  const setTokens = (tokens: StoredAuthTokens | null): void => {
    if (!tokens) {
      try {
        localStorage.removeItem(tokenStorageKey);
      } catch {
        // ignore storage errors
      }
      return;
    }
    writeJSON(tokenStorageKey, tokens);
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    if (refreshPromise) return refreshPromise;
    const tokens = getTokens();
    if (!tokens?.refresh) return null;

    refreshPromise = (async () => {
      try {
        const res = await fetch(`${baseUrl}${refreshEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
        if (res.status === 401 || res.status === 400) {
          setTokens(null);
          return null;
        }
        if (!res.ok) {
          // Transient 5xx / 429 errors must NOT destroy valid local tokens
          return null;
        }
        const data = (await res.json()) as { access?: string; refresh?: string };
        if (!data.access) {
          setTokens(null);
          return null;
        }
        setTokens({ access: data.access, refresh: data.refresh || tokens.refresh });
        return data.access;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  const request = async <T>(path: string, options: AuthHttpRequestOptions = {}): Promise<T> => {
    const { skipAuth = false, isMultipart = false, headers: customHeaders, ...rest } = options;
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

    const execute = async (accessToken: string | null) => {
      const headers = new Headers(customHeaders);
      if (!isMultipart && !headers.has('Content-Type') && rest.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (!skipAuth && accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return fetch(url, { ...rest, headers });
    };

    const tokens = getTokens();
    let response = await execute(tokens?.access || null);

    if (response.status === 401 && !skipAuth && tokens?.refresh) {
      const nextAccess = await refreshAccessToken();
      if (nextAccess) {
        response = await execute(nextAccess);
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const payload = (data && typeof data === 'object' ? data : null) as Record<string, unknown> | null;
      const detail =
        (payload?.detail as string) ||
        (payload?.message as string) ||
        `Request failed (${response.status})`;
      throw new ApiError(detail, response.status, payload);
    }

    return data as T;
  };

  return { request, getTokens, setTokens };
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  let activeTenantId: string | null = null;

  if (typeof localStorage !== 'undefined') {
    token = localStorage.getItem('access_token') || localStorage.getItem('token');
    activeTenantId = localStorage.getItem('active_tenant_id');
  }

  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(activeTenantId && activeTenantId !== 'ALL' && activeTenantId !== 'null' && { 'X-Tenant-ID': activeTenantId }),
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}
