import { fetchWithAuth } from '../utils/authService';
import { API_BASE_URL } from '../config/api';

/**
 * Enterprise Staff Onboarding Campaigns & Public Application API
 */

// ==========================================
// 1. INSTITUTIONAL STAFF ONBOARDING TOKENS & QR
// ==========================================

export const getStaffOnboardingTokens = async () => {
  const response = await fetchWithAuth('/api/v1/staff-onboarding/tokens/');
  if (!response.ok) {
    throw new Error(`Failed to fetch staff onboarding tokens (Status: ${response.status})`);
  }
  const data = await response.json();
  return data.results || data;
};

export const createStaffOnboardingToken = async (payload) => {
  const response = await fetchWithAuth('/api/v1/staff-onboarding/tokens/', {
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
    throw new Error(msg || 'Failed to create staff onboarding token');
  }
  return await response.json();
};

export const updateStaffOnboardingToken = async (id, payload) => {
  const response = await fetchWithAuth(`/api/v1/staff-onboarding/tokens/${id}/`, {
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
    throw new Error(msg || 'Failed to update staff onboarding token');
  }
  return await response.json();
};

export const toggleStaffOnboardingTokenActive = async (id) => {
  const response = await fetchWithAuth(`/api/v1/staff-onboarding/tokens/${id}/toggle-active/`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle token active status (Status: ${response.status})`);
  }
  return await response.json();
};

export const deleteStaffOnboardingToken = async (id) => {
  const response = await fetchWithAuth(`/api/v1/staff-onboarding/tokens/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete staff onboarding token (Status: ${response.status})`);
  }
  return true;
};

// ==========================================
// 2. PUBLIC STAFF TOKEN VERIFICATION & APPLY
// ==========================================

export const verifyPublicStaffToken = async (token) => {
  const targetUrl = API_BASE_URL
    ? `${API_BASE_URL}/api/v1/public/staff-onboard/verify/?token=${encodeURIComponent(token)}`
    : `/api/v1/public/staff-onboard/verify/?token=${encodeURIComponent(token)}`;

  const response = await fetch(targetUrl);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Invalid or expired staff invitation link');
  }
  return await response.json();
};

export const submitStaffOnboarding = async (payload) => {
  const response = await fetchWithAuth('/api/v1/staff-onboarding/apply/', {
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
    throw new Error(msg || 'Failed to submit staff onboarding application');
  }
  return await response.json();
};
