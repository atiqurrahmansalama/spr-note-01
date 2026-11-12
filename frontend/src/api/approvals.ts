/**
 * SPR Note — Unified Approvals API Client
 * =======================================
 * Endpoints for managing approval queues, reviewing details, and executing approval/rejection actions.
 */

import { fetchWithAuth } from '@/utils/authService';

function extractApiErrorMessage(errorData: any, fallback: string): string {
  if (!errorData) return fallback;
  if (typeof errorData === 'string') return errorData;
  if (errorData.detail) return String(errorData.detail);
  if (errorData.error) return String(errorData.error);
  if (errorData.message) return String(errorData.message);
  return fallback;
}

export interface ApprovalDecisionPayload {
  overrides?: Record<string, any>;
  admin_remarks?: string;
  rejection_reason?: string;
  effective_date?: string;
}

export async function getApprovals(params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, String(val));
    }
  });

  const res = await fetchWithAuth(`/api/v1/approvals/?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(errorData, 'Failed to load approvals queue.'));
  }
  return res.json();
}

export async function getApprovalSummary() {
  const res = await fetchWithAuth('/api/v1/approvals/summary/');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(errorData, 'Failed to load approval summary.'));
  }
  return res.json();
}

export async function getApprovalDetail(id: string) {
  const res = await fetchWithAuth(`/api/v1/approvals/${encodeURIComponent(id)}/`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(errorData, 'Failed to load approval request details.'));
  }
  return res.json();
}

export async function approveApprovalRequest(id: string, payload: ApprovalDecisionPayload = {}) {
  const res = await fetchWithAuth(`/api/v1/approvals/${encodeURIComponent(id)}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(errorData, 'Failed to approve request.'));
  }
  return res.json();
}

export async function rejectApprovalRequest(id: string, payload: ApprovalDecisionPayload = {}) {
  const res = await fetchWithAuth(`/api/v1/approvals/${encodeURIComponent(id)}/reject/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(errorData, 'Failed to reject request.'));
  }
  return res.json();
}

