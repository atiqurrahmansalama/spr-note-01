export interface UserRoleInfo {
  id?: number | string;
  name?: string;
  code?: string;
  description?: string;
}

export interface UserProfile {
  id?: number | string;
  username?: string;
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  avatar_url?: string;
  role?: string | UserRoleInfo;
  role_info?: UserRoleInfo;
  user_type?: string;
  is_email_verified?: boolean;
  is_2fa_enabled?: boolean;
  has_google_linked?: boolean;
  google_sub_id?: string;
  passkeys_count?: number;
  branch?: string;
  campus?: string;
  institution_id?: string | number | null;
  institution_name?: string;
  institution_details?: {
    id: string | number;
    name: string;
    code?: string;
    slug?: string;
    logo_url?: string;
    [key: string]: any;
  } | null;
  staff_profile?: {
    id: string | number;
    employee_id?: string;
    staff_type?: string;
    designation?: string;
    rank_order?: number;
    employment_status?: string;
    institution_id?: string | number | null;
    department_id?: string | number | null;
  } | null;
  staff_id?: string | number | null;
  is_academy_admin?: boolean;
  is_staff?: boolean;
  date_joined?: string;
  last_login?: string;
  [key: string]: any;
}

export interface UserSession {
  id: number | string;
  device_name?: string;
  device_info?: string;
  device_type?: 'web' | 'mobile' | 'tablet' | string;
  ip_address?: string;
  login_at?: string;
  login_at_formatted?: string;
  last_activity_formatted?: string;
  last_active?: string;
  total_duration_minutes?: number;
  is_active?: boolean;
  is_current?: boolean;
}

export interface SecurityAuditLog {
  id: string | number;
  event_type: string;
  status: 'Success' | 'Failed' | 'Warning' | string;
  ip_address: string;
  location?: string;
  timestamp: string;
  user_agent?: string;
}

export interface PasskeyItem {
  id: number | string;
  name?: string;
  device_name?: string;
  created_at?: string;
  created_at_display?: string;
  last_used_at?: string;
  credential_id?: string;
  full_credential_id?: string;
  is_current_device?: boolean;
}

export interface MultiAccountItem {
  user: UserProfile;
  access?: string;
  refresh?: string;
  saved_at?: string;
}

export interface SecurityScoreMetric {
  score: number;
  level: 'critical' | 'moderate' | 'strong' | 'optimal';
  label: string;
  summary: string;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    statusType?: 'enabled' | 'verification';
    recommendation?: string;
    drawerKey?: string;
  }>;
}

export type ProfileDrawerKey =
  | 'profile-edit'
  | 'profile-password'
  | 'profile-sessions'
  | 'profile-logs'
  | 'profile-accounts'
  | 'profile-qr'
  | 'profile-2fa'
  | 'profile-passkeys'
  | 'profile-change-email';

