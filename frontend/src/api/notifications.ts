import { fetchWithAuth } from '../utils/authService';
import type {
  NotificationGateway,
  NotificationTemplate,
  NotificationTriggerRule,
  NotificationDispatchLog,
  DeliveryLogAnalytics,
  ManualBroadcastPayload,
  InAppNotification,
} from '@/types/notifications';

/**
 * Enterprise Multi-Tenant Notification API Client (TypeScript)
 */

function extractErrorMessage(errData: any, fallback: string): string {
  if (!errData) return fallback;
  if (typeof errData.error === 'string' && errData.error.trim()) return errData.error;
  if (typeof errData.message === 'string' && errData.message.trim()) return errData.message;
  if (typeof errData.detail === 'string' && errData.detail.trim()) return errData.detail;
  if (Array.isArray(errData.message) && errData.message.length > 0) return String(errData.message[0]);
  if (Array.isArray(errData.non_field_errors) && errData.non_field_errors.length > 0) return String(errData.non_field_errors[0]);

  if (typeof errData === 'object') {
    for (const key of Object.keys(errData)) {
      const val = errData[key];
      if (Array.isArray(val) && val.length > 0) return `${key}: ${val[0]}`;
      if (typeof val === 'string' && val.trim()) return `${key}: ${val}`;
    }
  }

  return fallback;
}

// ==========================================
// 1. IN-APP NOTIFICATIONS
// ==========================================

export const getInAppNotifications = async (): Promise<InAppNotification[]> => {
  const response = await fetchWithAuth('/api/v1/notifications/in-app/');
  if (!response.ok) {
    throw new Error(`Failed to fetch in-app notifications (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const response = await fetchWithAuth('/api/v1/notifications/in-app/unread-count/');
    if (response.ok) {
      const data = await response.json();
      return data.unread_count || 0;
    }
  } catch (err) {
    console.warn('[notifications.ts] Unread count fetch error:', err);
  }
  return 0;
};

export const markNotificationAsRead = async (id: string | number): Promise<any> => {
  const response = await fetchWithAuth(`/api/v1/notifications/in-app/${id}/mark-read/`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to mark notification as read (Status: ${response.status})`);
  }
  return await response.json();
};

export const markAllNotificationsAsRead = async (): Promise<any> => {
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

export const getGateways = async (): Promise<NotificationGateway[]> => {
  const response = await fetchWithAuth('/api/v1/notifications/gateways/');
  if (!response.ok) {
    throw new Error(`Failed to fetch gateways (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
};

export const createGateway = async (payload: Partial<NotificationGateway>): Promise<NotificationGateway> => {
  const response = await fetchWithAuth('/api/v1/notifications/gateways/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to create gateway (Status: ${response.status})`));
  }
  return await response.json();
};

export const updateGateway = async (
  id: string,
  payload: Partial<NotificationGateway>
): Promise<NotificationGateway> => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to update gateway (Status: ${response.status})`));
  }
  return await response.json();
};

export const deleteGateway = async (id: string): Promise<boolean> => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete gateway (Status: ${response.status})`);
  }
  return true;
};

export const testPingGateway = async (
  id: string,
  targetRecipient: string = ''
): Promise<{ status: string; message: string; response?: any }> => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/test-ping/`, {
    method: 'POST',
    body: JSON.stringify({ target_recipient: targetRecipient }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Ping test failed (Status: ${response.status})`));
  }
  return await response.json();
};

export const getGatewayBalance = async (id: string): Promise<{ balance: number | string; currency?: string }> => {
  const response = await fetchWithAuth(`/api/v1/notifications/gateways/${id}/balance/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch balance (Status: ${response.status})`);
  }
  return await response.json();
};

// ==========================================
// 3. MESSAGE TEMPLATES
// ==========================================

export const getTemplates = async (): Promise<NotificationTemplate[]> => {
  const response = await fetchWithAuth('/api/v1/notifications/templates/');
  if (!response.ok) {
    throw new Error(`Failed to fetch templates (Status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
};

export const createTemplate = async (
  payload: Partial<NotificationTemplate>
): Promise<NotificationTemplate> => {
  const response = await fetchWithAuth('/api/v1/notifications/templates/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to save template (Status: ${response.status})`));
  }
  return await response.json();
};

export const updateTemplate = async (
  id: string,
  payload: Partial<NotificationTemplate>
): Promise<NotificationTemplate> => {
  const response = await fetchWithAuth(`/api/v1/notifications/templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to update template (Status: ${response.status})`));
  }
  return await response.json();
};

export const deleteTemplate = async (id: string): Promise<boolean> => {
  const response = await fetchWithAuth(`/api/v1/notifications/templates/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete template (Status: ${response.status})`);
  }
  return true;
};

export const seedDefaultTemplates = async (): Promise<{ status: string; message: string; templates: NotificationTemplate[] }> => {
  const response = await fetchWithAuth('/api/v1/notifications/templates/seed-defaults/', {
    method: 'POST',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to seed default templates (Status: ${response.status})`));
  }
  return await response.json();
};

// ==========================================
// 4. AUTOMATED TRIGGER RULES
// ==========================================

export const getTriggerRulesMatrix = async (): Promise<NotificationTriggerRule[]> => {
  const response = await fetchWithAuth('/api/v1/notifications/triggers/matrix/');
  if (!response.ok) {
    throw new Error(`Failed to fetch trigger rules matrix (Status: ${response.status})`);
  }
  const data = await response.json();
  return data.matrix || [];
};

export const batchUpdateTriggerRules = async (
  rules: Partial<NotificationTriggerRule>[]
): Promise<{ status: string; message: string; matrix: NotificationTriggerRule[] }> => {
  const response = await fetchWithAuth('/api/v1/notifications/triggers/batch-update/', {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to update trigger rules (Status: ${response.status})`));
  }
  return await response.json();
};

// ==========================================
// 5. DELIVERY AUDIT LOGS & ANALYTICS
// ==========================================

export interface DeliveryLogFilterParams {
  search?: string;
  channel?: string;
  status?: string;
  event_type?: string;
}

export const getDeliveryLogs = async (params: DeliveryLogFilterParams = {}): Promise<NotificationDispatchLog[]> => {
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
  return Array.isArray(data) ? data : data.results || [];
};

export const getDeliveryLogAnalytics = async (): Promise<DeliveryLogAnalytics> => {
  try {
    const response = await fetchWithAuth('/api/v1/notifications/logs/analytics/');
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[notifications.ts] Analytics fetch error:', err);
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

export const retryDeliveryLog = async (id: string): Promise<{ status: string; message: string; result?: any }> => {
  const response = await fetchWithAuth(`/api/v1/notifications/logs/${id}/retry/`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to retry delivery (Status: ${response.status})`));
  }
  return await response.json();
};

// ==========================================
// 6. MANUAL BROADCAST DESK
// ==========================================

export const sendManualBroadcast = async (
  payload: ManualBroadcastPayload
): Promise<{ status: string; message: string; dispatched_count: number; channels: string[] }> => {
  const response = await fetchWithAuth('/api/v1/notifications/broadcast/send/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, `Failed to send broadcast (Status: ${response.status})`));
  }
  return await response.json();
};
