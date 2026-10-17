// Enterprise Activity Analytics & Audit Trail Types

export interface SessionTimeWindow {
  session_id: number | string;
  device_type: string;
  device_info: string;
  ip_address: string;
  from_time: string;
  to_time: string | null;
  duration_minutes: number;
  is_active: boolean;
}

export interface ActivityAuditLog {
  id: number | string;
  action_name: string;
  endpoint: string;
  http_method: string;
  ip_address: string;
  timestamp: string;
}

export interface UserActivityRecord {
  user_id: number | string;
  phone_number: string;
  user_type: string;
  name: string;
  total_active_duration_minutes: number;
  formatted_active_duration: string;
  sessions_count: number;
  last_active: string | null;
  time_windows: SessionTimeWindow[];
  activity_logs: ActivityAuditLog[];
}

export interface ActivityAnalyticsSummary {
  total_users_tracked: number;
  total_active_minutes_all_users: number;
}

export interface ActivityTimeFrame {
  from_time: string | null;
  to_time: string | null;
}

export interface ActivityMetrics {
  totalUsersTracked: number;
  totalActiveMinutes: number;
  avgSessionDuration: number;
  activeSessionsCount: number;
}

export type DatePreset = 'today' | '7d' | '30d' | 'all' | 'custom';
export type DeviceTypeFilter = 'ALL' | 'web' | 'android' | 'ios';

export interface ActivityFilterState {
  search: string;
  user_type: string;
  device_type: DeviceTypeFilter;
  datePreset: DatePreset;
  from_date: string;
  to_date: string;
}
