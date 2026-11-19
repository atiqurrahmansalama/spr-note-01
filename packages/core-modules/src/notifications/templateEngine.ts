/**
 * Notification Template Interpolation Engine
 * ==========================================
 * Safely parses and fills dynamic tokens (e.g., {{student_name}}, {{amount}})
 * with strict fallback mechanisms.
 */

import { NotificationTemplate } from './types';

/**
 * Replaces token occurrences formatted as {{token_name}} or {token_name} with provided variables.
 */
export function interpolateTemplate(
  templateString: string,
  variables: Record<string, unknown> = {},
  fallback = '—'
): string {
  if (!templateString) return '';

  return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, key1, key2) => {
    const key = key1 || key2;
    const value = variables[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
    return fallback;
  });
}

/**
 * Extracts all token names enclosed in {{token}} from a template string.
 */
export function extractTemplateTokens(templateString: string): string[] {
  if (!templateString) return [];
  const matches = templateString.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g);
  const tokens = new Set<string>();
  for (const match of matches) {
    const token = match[1] || match[2];
    if (token) tokens.add(token);
  }
  return Array.from(tokens);
}

/**
 * Built-in standard enterprise notification templates.
 */
export const CORE_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl_welcome',
    slug: 'user-welcome',
    title: 'Account Welcome & Onboarding',
    subjectTemplate: 'Welcome to {{institution_name}}, {{user_name}}!',
    bodyTemplate: 'Assalamu Alaikum {{user_name}},\n\nYour account has been successfully configured. You may log in using {{email}}.',
    defaultChannel: 'EMAIL',
    supportedChannels: ['EMAIL', 'IN_APP'],
    availableTokens: ['institution_name', 'user_name', 'email', 'login_url'],
    category: 'SYSTEM',
  },
  {
    id: 'tpl_attendance_alert',
    slug: 'student-absence-alert',
    title: 'Student Absence Notification',
    subjectTemplate: 'Absence Notice: {{student_name}} on {{date}}',
    bodyTemplate: 'Dear Guardian, {{student_name}} was marked absent for session {{session_name}} on {{date}}.',
    defaultChannel: 'SMS',
    supportedChannels: ['SMS', 'WHATSAPP', 'IN_APP', 'EMAIL'],
    availableTokens: ['student_name', 'date', 'session_name', 'guardian_name'],
    category: 'ATTENDANCE',
  },
  {
    id: 'tpl_fee_receipt',
    slug: 'payment-receipt',
    title: 'Payment Confirmation Receipt',
    subjectTemplate: 'Payment Receipt #{{receipt_number}}',
    bodyTemplate: 'Payment of {{amount}} {{currency}} received for {{student_name}} (Invoice #{{invoice_number}}). Thank you.',
    defaultChannel: 'SMS',
    supportedChannels: ['SMS', 'EMAIL', 'IN_APP'],
    availableTokens: ['receipt_number', 'amount', 'currency', 'student_name', 'invoice_number'],
    category: 'FINANCIAL',
  },
];
