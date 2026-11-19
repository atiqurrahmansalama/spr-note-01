/**
 * Identity & Access Management (IAM) Core Types
 * ==============================================
 * Shared across SPR Note ecosystems and satellite applications.
 */

export interface RoleRecordLike {
  id?: number | string | null;
  name?: string | null;
  code?: string | null;
  description?: string | null;
  is_custom?: boolean;
}

export interface UserLike {
  id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  is_superuser?: boolean;
  is_academy_admin?: boolean;
  user_type?: string | null;
  role?: string | RoleRecordLike | null;
  role_info?: string | RoleRecordLike | null;
  role_id?: number | string | null;
  role_code?: string | null;
  role_name?: string | null;
  staff_profile?: {
    staff_type?: string | null;
    designation?: string | null;
  } | null;
}

export type RoleArchetype =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DIRECTOR'
  | 'HEADMASTER'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'STAFF'
  | 'STUDENT'
  | 'GUARDIAN'
  | 'ACCOUNTANT'
  | 'MODERATOR'
  | 'GUEST';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'approve'
  | 'configure';

export interface EffectiveDashboardRoleParams {
  roleSlug?: string;
  initialRole: string;
  isSuperAdmin: boolean;
  isMultiTenantAdmin?: boolean;
  isAcademyAdminFlag?: boolean;
  currentUser?: UserLike | null;
  roles?: RoleRecordLike[];
}

export interface TenantRoleAssignment {
  tenantId: string;
  userId: string | number;
  roleCode: string;
  grantedAt: string;
  expiresAt?: string | null;
}
