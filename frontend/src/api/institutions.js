import { fetchWithAuth } from '../utils/authService';

/**
 * Enterprise Multi-Tenant Institutions API Client
 * Standardized on fetchWithAuth with automatic token refresh,
 * header injection (Bearer + X-Tenant-ID), and resilient error handling.
 */

export const getInstitutions = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.type && params.type !== 'ALL') query.append('type', params.type);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/institutions/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch institutions directory (Status: ${response.status})`);
  }
  return await response.json();
};

export const getInstitutionDetails = async (id) => {
  const response = await fetchWithAuth(`/api/v1/institutions/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch institution details (Status: ${response.status})`);
  }
  return await response.json();
};

export const getCurrentInstitution = async () => {
  const response = await fetchWithAuth('/api/v1/institutions/current/');
  if (!response.ok) {
    throw new Error(`Failed to fetch active institution profile (Status: ${response.status})`);
  }
  return await response.json();
};

export const updateCurrentInstitution = async (data) => {
  const response = await fetchWithAuth('/api/v1/institutions/current/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.detail || 'Failed to update institution branding');
  }
  return await response.json();
};

export const getInstitutionMetrics = async () => {
  try {
    const response = await fetchWithAuth('/api/v1/institutions/metrics/');
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[institutions.js] Metrics fetch error, returning fallback zero counters:', err);
  }
  return {
    total_institutions: 0,
    verified_institutions: 0,
    total_active_students: 0,
    total_staff: 0,
  };
};

export const registerInstitution = async (data) => {
  const response = await fetchWithAuth('/api/v1/institutions/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData.error || errData.detail || (typeof errData === 'object' ? Object.values(errData).flat().join(', ') : 'Failed to register institution');
    throw new Error(msg);
  }
  return await response.json();
};

export const createInstitution = async (data) => {
  const response = await fetchWithAuth('/api/v1/institutions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create institution');
  }
  return await response.json();
};

export const updateInstitution = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/institutions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update institution');
  }
  return await response.json();
};

export const deleteInstitution = async (id, payload = {}) => {
  const response = await fetchWithAuth(`/api/v1/institutions/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(payload.password ? { 'X-Admin-Password': payload.password } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.detail || 'Failed to delete institution');
  }
  return true;
};

