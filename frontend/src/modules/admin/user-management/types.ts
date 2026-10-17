/**
 * SPR Note — Enterprise User Management Type Definitions
 * =====================================================
 * Strict TypeScript interfaces for Users, Roles, Sessions, Filters, and Operations.
 */

export interface ActionPermissions {
  can_create_student?: boolean;
  can_edit_student?: boolean;
  can_delete_report?: boolean;
  can_export_reports?: boolean;
  can_manage_users?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserRole {
  id?: number | string | null;
  name: string;
  code: string;
  description?: string;
  hierarchy_level?: number;
  color_theme?: string;
  is_system_role?: boolean;
  action_permissions?: ActionPermissions;
}

export interface UserRecord {
  id: number | string;
  institution?: number | string | null;
  institution_name?: string;
  phone_number?: string | null;
  email?: string | null;
  name?: string;
  first_name?: string;
  last_name?: string;
  name_bn?: string;
  user_type?: string;
  role?: UserRole | null;
  role_info?: UserRole | null;
  auth_provider?: 'email' | 'google' | string;
  is_email_verified?: boolean;
  avatar_url?: string | null;
  assigned_group?: string | null;
  is_active: boolean;
  is_deactivated?: boolean;
  is_online?: boolean;
  last_activity?: string | null;
  date_joined?: string;
  formatted_created_at?: string;
  last_login?: string | null;
}


export interface UserSessionRecord {
  id: number | string;
  user?: number | string;
  ip_address?: string;
  device_type?: string;
  device_info?: string;
  user_agent?: string;
  last_activity?: string;
  is_active?: boolean;
  is_current?: boolean;
}

export type UserStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type UserAuthProviderFilter = 'ALL' | 'GOOGLE' | 'EMAIL';

export interface UserFilterState {
  role: string;
  status: UserStatusFilter;
  provider: UserAuthProviderFilter;
  search: string;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  googleUsers: number;
  systemRoles: number;
}

export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password?: string;
  user_type: string;
  is_active: boolean;
}

// ── Role Invite & QR Management Interfaces ──────────────────────────────────
export interface RoleInviteRecord {
  id: string;
  token: string;
  title: string;
  target_role: number | string;
  target_role_name: string;
  target_role_code: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_by?: number | string;
  created_by_name?: string;
  created_at: string;
  is_valid?: boolean;
}

export interface RoleInviteFormData {
  title: string;
  target_role: number | string;
  max_uses: number;
  expires_at?: string | null;
  expiryPreset?: string;
  is_active?: boolean;
}

export type RoleInviteStatusFilter = 'ALL' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface RoleInviteFilterState {
  role: string;
  status: RoleInviteStatusFilter;
  search: string;
}

export interface RoleInviteMetrics {
  totalInvites: number;
  activeInvites: number;
  revokedInvites: number;
  expiredInvites: number;
  totalUses: number;
}

