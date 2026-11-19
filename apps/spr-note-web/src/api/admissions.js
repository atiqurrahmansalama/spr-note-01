import { fetchWithAuth } from '../utils/authService';
import { API_BASE_URL } from '../config/api';

/**
 * Enterprise Admission Campaigns & Public Application API
 */

// ==========================================
// 1. INSTITUTIONAL ADMISSION TOKENS & QR
// ==========================================

export const getAdmissionTokens = async () => {
  const response = await fetchWithAuth('/api/v1/admissions/tokens/');
  if (!response.ok) {
    throw new Error(`Failed to fetch admission tokens (Status: ${response.status})`);
  }
  const data = await response.json();
  return data.results || data;
};

export const createAdmissionToken = async (payload) => {
  const response = await fetchWithAuth('/api/v1/admissions/tokens/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    let msg = err.error || err.detail;
    if (!msg && typeof err === 'object') {
      const firstKey = Object.keys(err)[0];
      if (firstKey) {
        const val = err[firstKey];
        msg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
      }
    }
    throw new Error(msg || 'Failed to create admission token');
  }
  return await response.json();
};

export const updateAdmissionToken = async (id, payload) => {
  const response = await fetchWithAuth(`/api/v1/admissions/tokens/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    let msg = err.error || err.detail;
    if (!msg && typeof err === 'object') {
      const firstKey = Object.keys(err)[0];
      if (firstKey) {
        const val = err[firstKey];
        msg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
      }
    }
    throw new Error(msg || 'Failed to update admission token');
  }
  return await response.json();
};

export const toggleAdmissionTokenActive = async (id) => {
  const response = await fetchWithAuth(`/api/v1/admissions/tokens/${id}/toggle-active/`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle token active status (Status: ${response.status})`);
  }
  return await response.json();
};

export const deleteAdmissionToken = async (id) => {
  const response = await fetchWithAuth(`/api/v1/admissions/tokens/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete admission token (Status: ${response.status})`);
  }
  return true;
};

// ==========================================
// 2. PUBLIC ADMISSION VERIFICATION & APPLY
// ==========================================

export const verifyPublicAdmissionToken = async (token) => {
  const targetUrl = API_BASE_URL
    ? `${API_BASE_URL}/api/v1/public/admission/verify/?token=${encodeURIComponent(token)}`
    : `/api/v1/public/admission/verify/?token=${encodeURIComponent(token)}`;

  const response = await fetch(targetUrl);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Invalid or expired admission link');
  }
  return await response.json();
};

export const submitOnlineAdmission = async (payload) => {
  const response = await fetchWithAuth('/api/v1/admissions/apply/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to submit online admission');
  }
  return await response.json();
};
