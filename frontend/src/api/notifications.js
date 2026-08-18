import { fetchWithAuth } from '../utils/authService';

/**
 * Enterprise Multi-Tenant Notification API Client
 */

// ==========================================
// 1. IN-APP NOTIFICATIONS
// ==========================================

export const getInAppNotifications = async () => {
  const response = await fetchWithAuth('/api/v1/notifications/in-app/');
  if (!response.ok) {
    throw new Error(`Failed to fetch in-app notifications (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || []);
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await fetchWithAuth('/api/v1/notifications/in-app/unread-count/');
    if (response.ok) {
      const data = await response.json();
      return data.unread_count || 0;
    }
  } catch (err) {
    console.warn('[notifications.js] Unread count fetch error:', err);
  }
  return 0;
};

export const markNotificationAsRead = async (id) => {
  const response = await fetchWithAuth(`/api/v1/notifications/in-app/${id}/mark-read/`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to mark notification as read (Status: ${response.status})`);
  }
  return await response.json();
};

export const markAllNotificationsAsRead = async () => {
  const response = await fetchWithAuth('/api/v1/notifications/in-app/mark-all-read/', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to mark all as read (Status: ${response.status})`);
  }
  return await response.json();
};


// ==========================================
// 2. NOTIFICATION GATEWAYS & CREDENTIALS
// ==========================================

export const getGateways = async () => {
  const response = await fetchWithAuth('/api/v1/notifications/gateways/');
  if (!response.ok) {
    throw new Error(`Failed to fetch gateways (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || []);
};

export const createGateway = async (payload) => {
  const response = await fetchWithAuth('/api/v1/notifications/gateways/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || errData.error || `Failed to create gateway (Status: ${response.status})`);
  }
  return await response.json();
};

export const updateGateway = async (id, payload) => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || errData.error || `Failed to update gateway (Status: ${response.status})`);
  }
  return await response.json();
};

export const deleteGateway = async (id) => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete gateway (Status: ${response.status})`);
  }
  return true;
};

export const testPingGateway = async (id, targetRecipient = '') => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/test-ping/`, {
    method: 'POST',
    body: JSON.stringify({ target_recipient: targetRecipient }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Ping test failed (Status: ${response.status})`);
  }
  return await response.json();
};

export const getGatewayBalance = async (id) => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/balance/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch balance (Status: ${response.status})`);
  }
  return await response.json();
};


// ==========================================
// 3. MESSAGE TEMPLATES
// ==========================================

export const getTemplates = async () => {
  const response = await fetchWithAuth('/api/v1/notifications/templates/');
  if (!response.ok) {
    throw new Error(`Failed to fetch templates (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || []);
};

export const createTemplate = async (payload) => {
  const response = await fetchWithAuth('/api/v1/notifications/templates/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || errData.name?.[0] || `Failed to save template (Status: ${response.status})`);
  }
  return await response.json();
};

export const updateTemplate = async (id, payload) => {
  const response = await fetchWithAuth(`/api/v1/notifications/templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || errData.name?.[0] || `Failed to update template (Status: ${response.status})`);
  }
  return await response.json();
};

export const deleteTemplate = async (id) => {
  const response = await fetchWithAuth(`/api/v1/notifications/templates/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete template (Status: ${response.status})`);
  }
  return true;
};

export const seedDefaultTemplates = async () => {
  const response = await fetchWithAuth('/api/v1/notifications/templates/seed-defaults/', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to seed default templates (Status: ${response.status})`);
  }
  return await response.json();
};


// ==========================================
// 4. AUTOMATED TRIGGER RULES
// ==========================================

export const getTriggerRulesMatrix = async () => {
  const response = await fetchWithAuth('/api/v1/notifications/triggers/matrix/');
  if (!response.ok) {
    throw new Error(`Failed to fetch trigger rules matrix (Status: ${response.status})`);
  }
  const data = await response.json();
  return data.matrix || [];
};

export const batchUpdateTriggerRules = async (rules) => {
  const response = await fetchWithAuth('/api/v1/notifications/triggers/batch-update/', {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to update trigger rules (Status: ${response.status})`);
  }
  return await response.json();
};


// ==========================================
// 5. DELIVERY AUDIT LOGS & ANALYTICS
// ==========================================

export const getDeliveryLogs = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.channel && params.channel !== 'ALL') query.append('channel', params.channel);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.event_type && params.event_type !== 'ALL') query.append('event_type', params.event_type);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/notifications/logs/${qs}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch delivery logs (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.results || []);
};

export const getDeliveryLogAnalytics = async () => {
  try {
    const response = await fetchWithAuth('/api/v1/notifications/logs/analytics/');
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[notifications.js] Analytics fetch error:', err);
  }
  return {
    total_dispatched: 0,
    delivered: 0,
    failed: 0,
    simulated: 0,
    queued: 0,
    channel_counts: { IN_APP: 0, SMS: 0, WHATSAPP: 0, EMAIL: 0 },
  };
};

export const retryDeliveryLog = async (id) => {
  const response = await fetchWithAuth(`/api/v1/notifications/logs/${id}/retry/`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to retry delivery (Status: ${response.status})`);
  }
  return await response.json();
};


// ==========================================
// 6. MANUAL BROADCAST DESK
// ==========================================

export const sendManualBroadcast = async (payload) => {
  const response = await fetchWithAuth('/api/v1/notifications/broadcast/send/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message?.[0] || `Failed to send broadcast (Status: ${response.status})`);
  }
  return await response.json();
};
