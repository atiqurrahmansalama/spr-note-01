/**
 * Authentication, Authorization & 11-Tier RBAC Type Definitions
 * 100% Zero hardcoded strings - Fully extensible custom roles with enterprise default templates
 */

export type DefaultRoleCode =
  | 'SUPER_ADMIN'
  | 'ACADEMY_OWNER'
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'ACADEMIC_COORDINATOR'
  | 'SECTION_SUPERVISOR'
  | 'TEACHER'
  | 'ASSISTANT_TEACHER'
  | 'ACCOUNTANT'
  | 'GUARDIAN'
  | 'STUDENT';

export type RoleCode = DefaultRoleCode | (string & {});

export interface RoleActionPermission {
  id?: string;
  roleId: string;
  canCreateStudent: boolean;
  canEditStudent: boolean;
  canDeleteStudent: boolean;
  canEnterMarks: boolean;
  canPublishResults: boolean;
  canManageAttendance: boolean;
  canManageTeachers: boolean;
  canManageClasses: boolean;
  canManageBilling: boolean;
  canExportReports: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  customPermissions?: Record<string, boolean>;
}

export interface UserRole {
  id: string;
  code: RoleCode;
  name: string;
  description?: string;
  hierarchyLevel: number;
  colorTheme?: string;
  isSystemRole: boolean;
  institutionId?: string | null;
  permissions?: RoleActionPermission;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  phone?: string;
  avatarUrl?: string;
  role: RoleCode;
  roleObject?: UserRole;
  institutionId?: string | null;
  branchId?: string | null;
  isSuperuser: boolean;
  isActive: boolean;
  isStaff: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface SecuritySession {
  id: string;
  userId: string;
  deviceType: string;
  browser: string;
  ipAddress: string;
  location?: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Record<string, boolean>;
}
