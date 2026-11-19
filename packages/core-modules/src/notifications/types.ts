/**
 * Notifications & Messaging Core Types
 * =====================================
 * Multi-channel broadcast, templating, and dispatch interfaces.
 */

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NotificationDeliveryStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';

export interface NotificationRecipient {
  userId: string | number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  pushToken?: string;
  tenantId?: string;
}

export interface NotificationTemplate {
  id: string;
  slug: string;
  title: string;
  subjectTemplate?: string;
  bodyTemplate: string;
  defaultChannel: NotificationChannel;
  supportedChannels: NotificationChannel[];
  availableTokens: string[];
  category: 'ACADEMIC' | 'FINANCIAL' | 'ATTENDANCE' | 'SYSTEM' | 'GENERAL';
}

export interface NotificationPayload {
  id: string;
  tenantId: string;
  recipient: NotificationRecipient;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationDeliveryStatus;
  subject?: string;
  body: string;
  templateSlug?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  sentAt?: string | null;
  readAt?: string | null;
}
