export interface ActionPermissions {
  can_create_student: boolean;
  can_edit_student: boolean;
  can_delete_report: boolean;
  can_export_reports: boolean;
  can_manage_users: boolean;
  [key: string]: boolean;
}

export interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  hierarchy_level: number;
  color_theme?: string;
  is_system_role?: boolean;
  is_google_default?: boolean;
  user_count?: number;
  action_permissions: ActionPermissions;
  created_at?: string;
  updated_at?: string;
}

export interface RoleFormData {
  name: string;
  code: string;
  description: string;
  hierarchy_level: number;
  color_theme: string;
  action_permissions: ActionPermissions;
}

export type RoleTypeFilter = 'ALL' | 'SYSTEM' | 'CUSTOM';

export interface RoleFilters {
  searchQuery: string;
  typeFilter: RoleTypeFilter;
  hierarchyFilter: string;
}

export interface RoleMetrics {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  totalUsersAssigned: number;
}

export interface RoleDrawerParams {
  mode: 'create' | 'edit';
  role?: RoleRecord;
}
