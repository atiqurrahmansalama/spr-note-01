/**
 * HTTP Network & Authentication Utilities
 * =======================================
 * Resilient fetch wrapper with automatic token injection and tenant context.
 */

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
