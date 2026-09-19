import { fetchWithAuth } from '../utils/authService';

/**
 * Enterprise Academy Multi-Branch, Section & Period API Client
 */

/**
 * Universal error extractor for DRF API responses, custom exception wrappers, and field errors.
 */
export const extractApiErrorMessage = (err, fallback = 'Operation failed') => {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;

  const extractFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const msg = extractFromObject(item);
        if (msg) return msg;
      }
      return null;
    }
    if (obj.non_field_errors && Array.isArray(obj.non_field_errors) && obj.non_field_errors[0]) {
      return String(obj.non_field_errors[0]);
    }
    if (obj.error && typeof obj.error === 'string' && obj.error.trim()) return obj.error;
    if (obj.detail && typeof obj.detail === 'string' && obj.detail.trim()) return obj.detail;
    if (obj.message && typeof obj.message === 'string' && obj.message.trim()) return obj.message;

    // Check field-level errors (e.g. { institution: [...], name: [...] })
    for (const key of Object.keys(obj)) {
      if (['status_code', 'success', 'request_id', 'error_type'].includes(key)) continue;
      const val = obj[key];
      if (Array.isArray(val) && val[0]) {
        return key === 'details' ? extractFromObject(val) : `${key}: ${String(val[0])}`;
      }
      if (typeof val === 'string' && val.trim()) {
        return key === 'details' ? val : `${key}: ${val}`;
      }
      if (typeof val === 'object' && val !== null) {
        const nested = extractFromObject(val);
        if (nested) return nested;
      }
    }
    return null;
  };

  const extracted = (err.details ? extractFromObject(err.details) : null) || extractFromObject(err);
  return extracted || err.error || err.detail || err.message || fallback;
};

// ==========================================
// 1. ACADEMIC BRANCHES
// ==========================================

export const getBranches = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.branch_type && params.branch_type !== 'ALL') query.append('branch_type', params.branch_type);
  if (params.type && params.type !== 'ALL') query.append('branch_type', params.type);
  if (params.is_active && params.is_active !== 'ALL') query.append('is_active', params.is_active);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/academy/branches/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch branches (Status: ${response.status})`);
  }
  return await response.json();
};

export const getBranchDetails = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/branches/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch branch details (Status: ${response.status})`);
  }
  return await response.json();
};

export const getBranchStats = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/branches/${id}/stats/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch branch statistics (Status: ${response.status})`);
  }
  return await response.json();
};

export const getBranchMetrics = async () => {
  const response = await fetchWithAuth('/api/v1/academy/branches/metrics/');
  if (!response.ok) {
    throw new Error(`Failed to fetch branch metrics (Status: ${response.status})`);
  }
  return await response.json();
};

export const createBranch = async (data) => {
  const response = await fetchWithAuth('/api/v1/academy/branches/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to create branch'));
  }
  return await response.json();
};

export const updateBranch = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/academy/branches/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to update branch'));
  }
  return await response.json();
};

export const deleteBranch = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/branches/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to delete branch'));
  }
  return await response.json().catch(() => ({ status: 'success' }));
};

// ==========================================
// 2. CLASS SECTIONS
// ==========================================

export const getSections = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.class && params.class !== 'ALL') query.append('class', params.class);
  if (params.student_class && params.student_class !== 'ALL') query.append('class', params.student_class);
  if (params.branch && params.branch !== 'ALL') query.append('branch', params.branch);
  if (params.section_type && params.section_type !== 'ALL') query.append('section_type', params.section_type);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/academy/sections/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sections (Status: ${response.status})`);
  }
  return await response.json();
};

export const getSectionDetails = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/sections/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch section details (Status: ${response.status})`);
  }
  return await response.json();
};

export const getSectionMetrics = async () => {
  const response = await fetchWithAuth('/api/v1/academy/sections/metrics/');
  if (!response.ok) {
    throw new Error(`Failed to fetch section metrics (Status: ${response.status})`);
  }
  return await response.json();
};

export const createSection = async (data) => {
  const response = await fetchWithAuth('/api/v1/academy/sections/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to create section'));
  }
  return await response.json();
};

export const updateSection = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/academy/sections/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to update section'));
  }
  return await response.json();
};

export const deleteSection = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/sections/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to delete section'));
  }
  return await response.json().catch(() => ({ status: 'success' }));
};

// ==========================================
// 3. CLASS PERIOD SLOTS & ROUTINES
// ==========================================

export const getPeriodSlots = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.department && params.department !== 'ALL') query.append('department', params.department);
  if (params.class && params.class !== 'ALL') query.append('class', params.class);
  if (params.branch && params.branch !== 'ALL') query.append('branch', params.branch);
  if (params.teacher && params.teacher !== 'ALL') query.append('teacher', params.teacher);
  if (params.slot_type && params.slot_type !== 'ALL') query.append('slot_type', params.slot_type);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/academy/periods/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch period slots (Status: ${response.status})`);
  }
  return await response.json();
};

export const getPeriodSlotDetails = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/periods/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch period slot details (Status: ${response.status})`);
  }
  return await response.json();
};

export const createPeriodSlot = async (data) => {
  const response = await fetchWithAuth('/api/v1/academy/periods/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to create period slot'));
  }
  return await response.json();
};

export const updatePeriodSlot = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/academy/periods/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to update period slot'));
  }
  return await response.json();
};

export const deletePeriodSlot = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/periods/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to delete period slot'));
  }
  return await response.json().catch(() => ({ status: 'success' }));
};

export const reorderPeriodSlots = async (slots) => {
  const response = await fetchWithAuth('/api/v1/academy/periods/reorder/', {
    method: 'POST',
    body: JSON.stringify(slots),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to reorder period slots'));
  }
  return await response.json();
};

// ==========================================
// 4. ACADEMIC DEPARTMENTS
// ==========================================

export const getDepartments = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.institution && params.institution !== 'ALL') query.append('institution', params.institution);
  if (params.branch && params.branch !== 'ALL') query.append('branch', params.branch);
  if (params.is_active !== undefined && params.is_active !== 'ALL') query.append('is_active', params.is_active);
  if (params.has_quran_tracker !== undefined && params.has_quran_tracker !== 'ALL') query.append('has_quran_tracker', params.has_quran_tracker);
  if (params.page_size) query.append('page_size', params.page_size);
  if (params.all) query.append('all', 'true');

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/departments/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch departments (Status: ${response.status})`);
  }
  return await response.json();
};

export const getDepartmentDetails = async (id) => {
  const response = await fetchWithAuth(`/api/v1/departments/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch department details (Status: ${response.status})`);
  }
  return await response.json();
};

export const getDepartmentMetrics = async () => {
  const response = await fetchWithAuth('/api/v1/departments/metrics/');
  if (!response.ok) {
    throw new Error(`Failed to fetch department metrics (Status: ${response.status})`);
  }
  return await response.json();
};

export const createDepartment = async (data) => {
  const response = await fetchWithAuth('/api/v1/departments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to create department'));
  }
  return await response.json();
};

export const updateDepartment = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/departments/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to update department'));
  }
  return await response.json();
};

export const deleteDepartment = async (id) => {
  const response = await fetchWithAuth(`/api/v1/departments/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(err, 'Failed to delete department'));
  }
  return await response.json().catch(() => ({ status: 'success' }));
};

