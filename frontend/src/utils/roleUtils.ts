/**
 * Single Source of Truth for User Role & Privilege Resolution
 * ===========================================================
 * Backend auth/profile payloads return `user.role` as an object
 * (`{ id, name, code, ... }`) while legacy or token
 * payloads may provide string codes, `role_info`, `role_code`, or `user_type`.
 *
 * All UI views, navigation guards, and dashboard widgets MUST resolve roles
 * exclusively through these helpers so objects never coerce to "[object Object]".
 */

export interface RoleRecordLike {
  id?: number | string | null;
  name?: string | null;
  code?: string | null;
}

export interface UserLike {
  id?: number | string;
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
  } | null;
}

const ADMIN_ARCHETYPE_CODES = new Set([
  'ADMIN',
  'DIRECTOR',
  'HEADMASTER',
  'PRINCIPAL',
]);

/**
 * Safely normalizes any role input (string code or `{ code }` object) into an
 * uppercase role code string without ever producing "[OBJECT OBJECT]".
 */
export function normalizeRoleCode(roleOrCode: unknown): string {
  if (!roleOrCode) return '';

  if (typeof roleOrCode === 'string') {
    const cleaned = roleOrCode.trim().toUpperCase();
    if (!cleaned || cleaned === '[OBJECT OBJECT]' || cleaned === '[OBJECT_OBJECT]' || cleaned === 'OBJECT_OBJECT') {
      return '';
    }
    return cleaned;
  }

  if (typeof roleOrCode === 'object') {
    const candidate = roleOrCode as RoleRecordLike;
    if (typeof candidate.code === 'string' && candidate.code.trim()) {
      return candidate.code.trim().toUpperCase();
    }
    if (typeof candidate.name === 'string' && candidate.name.trim()) {
      return candidate.name.trim().toUpperCase().replace(/[\s-]+/g, '_');
    }
  }

  return '';
}

/**
 * Extracts the canonical uppercase role code from a user object.
 */
export function extractRoleCode(user?: UserLike | null): string {
  if (!user || typeof user !== 'object') return '';

  const candidates: unknown[] = [
    user.role_code,
    typeof user.role === 'string' ? user.role : user.role?.code,
    typeof user.role_info === 'string' ? user.role_info : user.role_info?.code,
    user.user_type,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRoleCode(candidate);
    if (normalized) return normalized;
  }

  if (user.staff_profile?.staff_type === 'ADMIN') {
    return 'ADMIN';
  }

  return '';
}

/**
 * Extracts the numeric/string role primary key if available on the user object.
 */
export function extractRoleId(user?: UserLike | null): number | string | null {
  if (!user || typeof user !== 'object') return null;

  if (user.role_id != null && user.role_id !== '') {
    return user.role_id;
  }
  if (user.role && typeof user.role === 'object' && user.role.id != null) {
    return user.role.id;
  }
  if (user.role_info && typeof user.role_info === 'object' && user.role_info.id != null) {
    return user.role_info.id;
  }
  return null;
}

/**
 * Extracts a human-readable role display name from a user object and optional roles catalog.
 */
export function extractRoleName(user?: UserLike | null, roles: RoleRecordLike[] = []): string {
  const code = extractRoleCode(user);
  const roleId = extractRoleId(user);

  if (roles.length > 0) {
    const matched = roles.find(
      (r) =>
        (roleId != null && r.id != null && String(r.id) === String(roleId)) ||
        (r.code && code && r.code.trim().toUpperCase() === code)
    );
    if (matched?.name) return matched.name;
  }

  if (user && typeof user === 'object') {
    if (user.role && typeof user.role === 'object' && user.role.name) {
      return user.role.name;
    }
    if (user.role_info && typeof user.role_info === 'object' && user.role_info.name) {
      return user.role_info.name;
    }
    if (typeof user.role_name === 'string' && user.role_name.trim()) {
      return user.role_name.trim();
    }
  }

  if (!code) return 'User';

  return code
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Checks whether a user holds platform Super Admin privileges.
 */
export function isUserSuperAdmin(user?: UserLike | null, isMultiTenantAdmin = false): boolean {
  if (isMultiTenantAdmin) return true;
  if (!user || typeof user !== 'object') return false;
  if (user.is_superuser) return true;
  return extractRoleCode(user) === 'SUPER_ADMIN';
}

/**
 * Checks whether a user holds Institutional / Academy Administrator authority.
 */
export function isUserAcademyAdmin(
  user?: UserLike | null,
  isMultiTenantAdmin = false,
  isAcademyAdminFlag = false
): boolean {
  if (isUserSuperAdmin(user, isMultiTenantAdmin) || isAcademyAdminFlag) return true;
  if (!user || typeof user !== 'object') return false;
  if (user.is_academy_admin) return true;
  if (user.staff_profile?.staff_type === 'ADMIN') return true;
  return ADMIN_ARCHETYPE_CODES.has(extractRoleCode(user));
}

export interface EffectiveDashboardRoleParams {
  roleSlug?: string;
  initialRole: string;
  isSuperAdmin: boolean;
  isMultiTenantAdmin?: boolean;
  isAcademyAdminFlag?: boolean;
  currentUser?: UserLike | null;
  roles?: RoleRecordLike[];
}

/**
 * Resolves the effective dashboard role from a URL slug cleanly:
 * - Super Admin may preview ANY role (including Administrator / ADMIN and custom roles).
 * - Non-Super-Admin Academy Admins visiting `/dashboard/admin` keep their canonical assigned role.
 * - Regular users stay bounded to their assigned initialRole.
 */
export function resolveEffectiveDashboardRole({
  roleSlug,
  initialRole,
  isSuperAdmin,
  isMultiTenantAdmin = false,
  isAcademyAdminFlag = false,
  currentUser = null,
  roles = [],
}: EffectiveDashboardRoleParams): string {
  const normalizedInitial = normalizeRoleCode(initialRole) || 'ADMIN';
  if (!roleSlug) return normalizedInitial;

  const targetRoleCode = normalizeRoleCode(String(roleSlug).replace(/-/g, '_'));
  if (!targetRoleCode) return normalizedInitial;

  if (isSuperAdmin) {
    const matchedRole = roles.find((r) => normalizeRoleCode(r.code) === targetRoleCode);
    return matchedRole?.code ? normalizeRoleCode(matchedRole.code) : targetRoleCode;
  }

  if (targetRoleCode === normalizedInitial) {
    return normalizedInitial;
  }

  const academyAdminAllowed =
    targetRoleCode === 'ADMIN' &&
    isUserAcademyAdmin(currentUser, isMultiTenantAdmin, isAcademyAdminFlag);

  if (academyAdminAllowed) {
    return normalizedInitial;
  }

  return normalizedInitial;
}

