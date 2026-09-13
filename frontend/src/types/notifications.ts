/**
 * Notification Ecosystem — Enterprise TypeScript Definitions
 * ==========================================================
 * Explicit type interfaces for Gateways, Templates, Trigger Rules,
 * In-App Notifications, Delivery Logs, Analytics, and Manual Broadcasts.
 */

export type GatewayType = 'SMS' | 'WHATSAPP' | 'SMTP_EMAIL' | 'TELEGRAM' | 'PUSH_FCM';

export type ProviderName =
  | 'SSL_WIRELESS'
  | 'GREENWEB'
  | 'TWILIO'
  | 'BULK_SMS_BD'
  | 'WHATSAPP_META'
  | 'SMTP_CUSTOM'
  | 'TELEGRAM_BOT'
  | 'GENERIC_REST';

export interface NotificationGateway {
  id: string;
  institution?: string;
  gateway_type: GatewayType;
  provider_name: ProviderName;
  api_key: string;
  api_secret_or_token?: string;
  sender_id_or_phone?: string;
  api_url?: string;
  port?: number;
  use_tls_ssl?: boolean;
  is_active: boolean;
  extra_headers_or_params?: Record<string, any>;
  balance_cache?: number | string | null;
  last_ping_status?: 'SUCCESS' | 'FAILED' | 'UNTESTED' | string;
  last_ping_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GatewayFormData {
  gateway_type: GatewayType;
  provider_name: ProviderName;
  api_key: string;
  api_secret_or_token: string;
  sender_id_or_phone: string;
  api_url: string;
  port: number;
  use_tls_ssl: boolean;
  is_active: boolean;
  extra_headers_or_params: Record<string, any>;
}

export type EventType =
  | 'STUDENT_ABSENT'
  | 'STUDENT_LATE'
  | 'GATE_BUNK_ALERT'
  | 'NEW_ADMISSION'
  | 'DAILY_REPORT_SAVED'
  | 'STAFF_LEAVE_ACTION'
  | 'GENERAL_BROADCAST'
  | 'CUSTOM';

export interface AvailableTag {
  tag: string;
  label: string;
  description?: string;
}

export interface NotificationTemplate {
  id: string;
  institution?: string;
  name: string;
  event_type: EventType;
  subject?: string;
  body: string;
  available_tags?: string[];
  is_system_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateFormData {
  name: string;
  event_type: EventType;
  subject: string;
  body: string;
  available_tags: string[];
}

export type TriggerChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'TELEGRAM' | 'PUSH_FCM';

export interface NotificationTriggerRule {
  id: string;
  institution?: string;
  event_type: EventType;
  channels: TriggerChannel[];
  is_enabled: boolean;
  template?: string | null;
  template_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';

export interface InAppNotification {
  id: string;
  institution?: string | null;
  recipient: string | number;
  recipient_username?: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  action_url?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export type DispatchChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'TELEGRAM' | 'PUSH_FCM';

export type DispatchStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SIMULATED';

export interface NotificationDispatchLog {
  id: string;
  institution?: string;
  channel: DispatchChannel;
  event_type?: string;
  recipient_identifier: string;
  recipient_user?: string | number | null;
  recipient_name?: string;
  message_title?: string;
  message_body: string;
  status: DispatchStatus;
  provider_response?: Record<string, any>;
  error_reason?: string;
  dispatched_at: string;
}

export interface DeliveryLogFilterParams {
  search?: string;
  channel?: string;
  status?: string;
  event_type?: string;
}

export interface DeliveryLogAnalytics {
  total_dispatched: number;
  delivered: number;
  failed: number;
  simulated: number;
  queued: number;
  channel_counts: {
    IN_APP?: number;
    SMS?: number;
    WHATSAPP?: number;
    EMAIL?: number;
    TELEGRAM?: number;
    PUSH_FCM?: number;
    [key: string]: number | undefined;
  };
}

export type BroadcastAudience = 'ALL' | 'STUDENTS' | 'CLASS' | 'TEACHERS' | 'STAFF';

export interface ManualBroadcastPayload {
  target_audience: BroadcastAudience;
  class_id?: string;
  channels: TriggerChannel[];
  title: string;
  message: string;
  notification_type?: NotificationType;
  action_url?: string;
}
