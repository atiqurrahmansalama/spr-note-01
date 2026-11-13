import { fetchWithAuth } from '../utils/authService';
import { API_BASE_URL } from '../config/api';

/**
 * Enterprise Staff Onboarding Campaigns & Public Application API
 */

function extractApiErrorMessage(errPayload, fallback) {
  if (!errPayload || typeof errPayload !== 'object') {
    return fallback;
  }
  if (typeof errPayload.message === 'string' && errPayload.message.trim()) {
    return errPayload.message.trim();
  }
  if (typeof errPayload.error === 'string' && errPayload.error.trim()) {
    return errPayload.error.trim();
  }
  if (typeof errPayload.detail === 'string' && errPayload.detail.trim()) {
    return errPayload.detail.trim();
  }

  // Unwrap custom_exception_handler `details` object or raw DRF field dictionary
  const fieldSource =
    errPayload.details && typeof errPayload.details === 'object'
      ? errPayload.details
      : errPayload;

  if (typeof fieldSource.error === 'string' && fieldSource.error.trim()) {
    return fieldSource.error.trim();
  }
  if (typeof fieldSource.detail === 'string' && fieldSource.detail.trim()) {
    return fieldSource.detail.trim();
  }

  const ignoredMetaKeys = new Set(['success', 'status_code', 'error_type', 'request_id']);
  const collectedMessages = [];
  for (const key of Object.keys(fieldSource)) {
    if (ignoredMetaKeys.has(key)) continue;
    const val = fieldSource[key];
    const textVal =
      Array.isArray(val) && val.length > 0
        ? String(val[0]).trim()
        : typeof val === 'string'
        ? val.trim()
        : '';
    if (textVal) {
      collectedMessages.push(textVal);
    }
  }

  if (collectedMessages.length > 0) {
    return collectedMessages.join(' ');
  }

  return fallback;
}

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
    throw new Error(extractApiErrorMessage(err, 'Failed to create staff onboarding token'));
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
    throw new Error(extractApiErrorMessage(err, 'Failed to update staff onboarding token'));
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
  const endpoint = `/api/v1/public/staff-onboard/verify/?token=${encodeURIComponent(token)}`;
  const response = await fetchWithAuth(endpoint);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Invalid or expired staff invitation link'));
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
    const message = extractApiErrorMessage(err, 'Failed to submit staff onboarding application');
    const apiError = new Error(message);

    const fieldSource =
      err?.details && typeof err.details === 'object'
        ? err.details
        : err;
    const fieldErrors = {};
    if (fieldSource && typeof fieldSource === 'object') {
      const ignoredMetaKeys = new Set(['success', 'status_code', 'error_type', 'request_id']);
      for (const [k, v] of Object.entries(fieldSource)) {
        if (ignoredMetaKeys.has(k)) continue;
        if (Array.isArray(v) && v.length > 0) {
          fieldErrors[k] = String(v[0]).trim();
        } else if (typeof v === 'string') {
          fieldErrors[k] = v.trim();
        }
      }
    }
    apiError.fieldErrors = fieldErrors;
    apiError.details = fieldSource;
    throw apiError;
  }
  return await response.json();
};
