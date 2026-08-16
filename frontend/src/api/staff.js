import apiClient from './axios';
import { fetchWithAuth } from '../utils/authService';

/**
 * Enterprise Multi-Tenant Teacher & Staff API Service Client
 * Fully integrated with Tenant Scoping & Silent JWT Refresh.
 */

// ==========================================
// 1. STAFF DIRECTORY & PROFILES
// ==========================================

export const getStaffList = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.staff_type && params.staff_type !== 'ALL') query.append('staff_type', params.staff_type);
  if (params.type && params.type !== 'ALL') query.append('staff_type', params.type);
  if (params.department && params.department !== 'ALL') query.append('department', params.department);
  if (params.employment_status && params.employment_status !== 'ALL') query.append('employment_status', params.employment_status);
  if (params.status && params.status !== 'ALL') query.append('employment_status', params.status);
  if (params.is_active !== undefined && params.is_active !== 'ALL') query.append('is_active', params.is_active);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/staff/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch staff directory (Status: ${response.status})`);
  }
  return await response.json();
};

export const getStaffMetrics = async () => {
  try {
    const response = await fetchWithAuth('/api/v1/staff/metrics/');
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[staff.js] Metrics fetch error, returning fallback:', err);
  }
  return {
    total_staff: 0,
    teaching_staff: 0,
    general_staff: 0,
    active_staff: 0,
    permanent_staff: 0,
    on_leave_today: 0,
  };
};

export const getStaffDetail = async (id) => {
  const response = await fetchWithAuth(`/api/v1/staff/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to load staff profile details (Status: ${response.status})`);
  }
  return await response.json();
};

export const createStaff = async (data) => {
  const response = await fetchWithAuth('/api/v1/staff/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.detail || err.error || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Failed to create staff profile');
    throw new Error(msg);
  }
  return await response.json();
};

export const updateStaff = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/staff/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.detail || err.error || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Failed to update staff profile');
    throw new Error(msg);
  }
  return await response.json();
};

export const deleteStaff = async (id) => {
  const response = await fetchWithAuth(`/api/v1/staff/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to soft-delete staff profile');
  }
  return response.status === 204 ? { status: 'success' } : await response.json();
};

export const inviteStaff = async (data) => {
  const response = await fetchWithAuth('/api/v1/staff/invite/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.detail || err.error || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Failed to invite staff member');
    throw new Error(msg);
  }
  return await response.json();
};

// ==========================================
// 2. TEACHER ACADEMIC ASSIGNMENTS
// ==========================================

export const getTeacherAssignments = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.teacher) query.append('teacher', params.teacher);
  if (params.assigned_class) query.append('assigned_class', params.assigned_class);
  if (params.assigned_group) query.append('assigned_group', params.assigned_group);
  if (params.session) query.append('session', params.session);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/staff/teachers/${qs}`);
  if (!response.ok) {
    throw new Error('Failed to load teacher class assignments');
  }
  return await response.json();
};

export const assignTeacherClass = async (data) => {
  const response = await fetchWithAuth('/api/v1/staff/teachers/assign-class/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.detail || err.error || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Failed to assign class to teacher');
    throw new Error(msg);
  }
  return await response.json();
};

export const getMyAssignedClasses = async () => {
  const response = await fetchWithAuth('/api/v1/staff/teachers/my-classes/');
  if (!response.ok) {
    throw new Error('Failed to fetch assigned classes');
  }
  return await response.json();
};

export const deleteTeacherAssignment = async (id) => {
  const response = await fetchWithAuth(`/api/v1/staff/teachers/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to remove class assignment');
  }
  return { status: 'success' };
};

// ==========================================
// 3. GENERAL STAFF DUTIES
// ==========================================

export const getStaffDuties = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.staff) query.append('staff', params.staff);
  if (params.priority && params.priority !== 'ALL') query.append('priority', params.priority);
  if (params.is_active !== undefined) query.append('is_active', params.is_active);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/staff/general/duties/${qs}`);
  if (!response.ok) {
    throw new Error('Failed to load staff duties');
  }
  return await response.json();
};

export const assignGeneralDuty = async (data) => {
  const response = await fetchWithAuth('/api/v1/staff/general/duties/assign-duty/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.detail || err.error || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Failed to assign operational duty');
    throw new Error(msg);
  }
  return await response.json();
};

export const deleteGeneralDuty = async (id) => {
  const response = await fetchWithAuth(`/api/v1/staff/general/duties/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to remove duty');
  }
  return { status: 'success' };
};

// ==========================================
// 4. ATTENDANCE & PUNCHES
// ==========================================

export const getStaffAttendance = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.date) query.append('date', params.date);
  if (params.start_date) query.append('start_date', params.start_date);
  if (params.end_date) query.append('end_date', params.end_date);
  if (params.staff) query.append('staff', params.staff);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.department && params.department !== 'ALL') query.append('department', params.department);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/staff/attendance/${qs}`);
  if (!response.ok) {
    throw new Error('Failed to fetch staff attendance sheet');
  }
  return await response.json();
};

export const bulkPunchAttendance = async (data) => {
  const response = await fetchWithAuth('/api/v1/staff/attendance/bulk-punch/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to save attendance punches');
  }
  return await response.json();
};

export const getMonthlyAttendanceSummary = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.year) query.append('year', params.year);
  if (params.month) query.append('month', params.month);
  if (params.staff) query.append('staff', params.staff);
  if (params.department) query.append('department', params.department);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/staff/attendance/monthly-summary/${qs}`);
  if (!response.ok) {
    throw new Error('Failed to load monthly attendance summary');
  }
  return await response.json();
};

// ==========================================
// 5. LEAVE DESK & APPROVALS
// ==========================================

export const getLeaveRequests = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.staff) query.append('staff', params.staff);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.leave_type && params.leave_type !== 'ALL') query.append('leave_type', params.leave_type);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/staff/leaves/${qs}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leave requests');
  }
  return await response.json();
};

export const applyLeave = async (data) => {
  const response = await fetchWithAuth('/api/v1/staff/leaves/apply/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.detail || err.error || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Failed to submit leave application');
    throw new Error(msg);
  }
  return await response.json();
};

export const actionLeaveRequest = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/staff/leaves/${id}/action/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to update leave status');
  }
  return await response.json();
};
