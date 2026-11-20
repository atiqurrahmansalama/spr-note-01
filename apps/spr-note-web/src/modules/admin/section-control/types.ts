/**
 * Section Control & Feature Flagging Type Definitions
 * Enterprise 4-Tier Precedence Evaluation System
 */

export type ScopeType = 'global' | 'role' | 'academy' | 'user' | 'audit';

export type InheritanceOrigin = 'GLOBAL' | 'ROLE' | 'GROUP' | 'ACADEMY' | 'ACADEMY_ROLE' | 'USER';

export interface SectionItem {
  id?: number | string;
  section_key: string;
  title: string;
  description?: string;
  widget_group?: string;
  is_enabled?: boolean;
  effective_enabled: boolean;
  inheritance_origin?: InheritanceOrigin;
  is_parent?: boolean;
  parent_key?: string | null;
  has_switch?: boolean;
  children?: SectionItem[];
}

export interface SectionCategory {
  id?: number | string;
  key: string;
  title: string;
  description?: string;
  sections: SectionItem[];
}

export interface AuditLogEntry {
  id: number | string;
  timestamp: string;
  raw_timestamp?: string;
  changed_by: string;
  scope_type: string;
  target_identifier?: string;
  section_key: string;
  previous_state: boolean | string | number | null;
  new_state: boolean | string | number | null;
}

export interface AcademyOption {
  id: number | string;
  name: string;
  code?: string;
  short_name?: string;
}

export interface RoleOption {
  id: number | string;
  code: string;
  name: string;
  label?: string;
}

export interface UserSearchResult {
  id: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  institution?: number | string | null;
  institution_id?: number | string | null;
  institution_name?: string;
  user_type?: string;
  role?: any;
  role_info?: any;
}

export interface BatchUpdateUpdateItem {
  section_key: string;
  is_enabled: boolean;
}

export interface BatchUpdatePayload {
  scope_type: string;
  scope: ScopeType;
  target_identifier: string;
  target_id: string;
  role?: string;
  user?: string;
  updates: BatchUpdateUpdateItem[];
}
