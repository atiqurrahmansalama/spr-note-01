export interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  color_theme?: string;
  is_system_role?: boolean;
  is_google_default?: boolean;
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoleFormData {
  name: string;
  code: string;
  description: string;
  color_theme: string;
}

export type RoleTypeFilter = 'ALL' | 'SYSTEM' | 'CUSTOM';

export interface RoleFilters {
  searchQuery: string;
  typeFilter: RoleTypeFilter;
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
