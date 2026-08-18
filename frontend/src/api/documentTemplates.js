import { fetchWithAuth } from '../utils/authService';

/**
 * Fetch all document templates for active tenant, optionally filtered by document_type.
 * @param {string} [type] - 'ID_CARD' | 'ADMISSION_SLIP' | 'TESTIMONIAL_CERTIFICATE' | 'REPORT_BANNER'
 */
export async function getDocumentTemplates(type = '') {
  let url = '/api/v1/document-templates/';
  if (type) {
    url += `?type=${encodeURIComponent(type)}`;
  }
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch document templates.');
  }
  return res.json();
}

/**
 * Fetch templates and current default by document type.
 * @param {string} type - 'ID_CARD' | 'ADMISSION_SLIP' | 'TESTIMONIAL_CERTIFICATE' | 'REPORT_BANNER'
 */
export async function getDocumentTemplatesByType(type) {
  const url = `/api/v1/document-templates/by-type/?type=${encodeURIComponent(type)}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch ${type} templates.`);
  }
  return res.json();
}

/**
 * Get sample student & institution preview payload for live visual studio.
 */
export async function getDocumentSampleData() {
  const res = await fetchWithAuth('/api/v1/document-templates/sample-data/');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load sample preview data.');
  }
  return res.json();
}

/**
 * Get single document template by UUID.
 */
export async function getDocumentTemplateById(id) {
  const res = await fetchWithAuth(`/api/v1/document-templates/${id}/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch template.');
  }
  return res.json();
}

/**
 * Create a new custom document template preset.
 */
export async function createDocumentTemplate(data) {
  const res = await fetchWithAuth('/api/v1/document-templates/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.template_name?.[0] || 'Failed to create template.');
  }
  return res.json();
}

/**
 * Update an existing template config.
 */
export async function updateDocumentTemplate(id, data) {
  const res = await fetchWithAuth(`/api/v1/document-templates/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update template.');
  }
  return res.json();
}

/**
 * Soft delete a template.
 */
export async function deleteDocumentTemplate(id) {
  const res = await fetchWithAuth(`/api/v1/document-templates/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete template.');
  }
  return true;
}

/**
 * Set a template as active default for its type.
 */
export async function setDefaultDocumentTemplate(id) {
  const res = await fetchWithAuth(`/api/v1/document-templates/${id}/set-default/`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to set template as default.');
  }
  return res.json();
}
