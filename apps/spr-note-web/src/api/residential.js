import { fetchWithAuth } from '../utils/authService';

/**
 * Enterprise Residential Quarters & Dormitory API Client
 */

// ==========================================
// 1. RESIDENTIAL BUILDINGS
// ==========================================

export const getResidentialBuildings = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.branch_id && params.branch_id !== 'ALL') query.append('branch_id', params.branch_id);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/academy/residential-buildings/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch residential buildings (Status: ${response.status})`);
  }
  return await response.json();
};

export const createResidentialBuilding = async (data) => {
  const response = await fetchWithAuth('/api/v1/academy/residential-buildings/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to create building');
  }
  return await response.json();
};

export const updateResidentialBuilding = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/academy/residential-buildings/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to update building');
  }
  return await response.json();
};

export const deleteResidentialBuilding = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/residential-buildings/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete building (Status: ${response.status})`);
  }
  return true;
};

// ==========================================
// 2. DORMITORY ROOMS
// ==========================================

export const getDormitoryRooms = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.branch_id && params.branch_id !== 'ALL') query.append('branch_id', params.branch_id);
  if (params.building_id && params.building_id !== 'ALL') query.append('building_id', params.building_id);
  if (params.floor_number && params.floor_number !== 'ALL') query.append('floor_number', params.floor_number);
  if (params.room_type && params.room_type !== 'ALL') query.append('room_type', params.room_type);
  if (params.trash) query.append('trash', params.trash);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/academy/dormitory-rooms/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dormitory rooms (Status: ${response.status})`);
  }
  return await response.json();
};

export const createDormitoryRoom = async (data) => {
  const response = await fetchWithAuth('/api/v1/academy/dormitory-rooms/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to create room');
  }
  return await response.json();
};

export const updateDormitoryRoom = async (id, data) => {
  const response = await fetchWithAuth(`/api/v1/academy/dormitory-rooms/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to update room');
  }
  return await response.json();
};

export const deleteDormitoryRoom = async (id) => {
  const response = await fetchWithAuth(`/api/v1/academy/dormitory-rooms/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete room (Status: ${response.status})`);
  }
  return true;
};

// ==========================================
// 3. BED ALLOCATIONS
// ==========================================

export const getBedAllocations = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.room_id && params.room_id !== 'ALL') query.append('room_id', params.room_id);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/academy/bed-allocations/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bed allocations (Status: ${response.status})`);
  }
  return await response.json();
};

export const assignBed = async (bedId, payload) => {
  const response = await fetchWithAuth(`/api/v1/academy/bed-allocations/${bedId}/assign/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to assign bed');
  }
  return await response.json();
};

export const unassignBed = async (bedId, payload = {}) => {
  const response = await fetchWithAuth(`/api/v1/academy/bed-allocations/${bedId}/unassign/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to unassign bed');
  }
  return await response.json();
};
