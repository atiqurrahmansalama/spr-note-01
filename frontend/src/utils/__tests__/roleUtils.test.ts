/**
 * Unit Tests for Single Source of Truth Role Resolution (`roleUtils.ts`)
 * Verifies that nested backend role objects never coerce to "[OBJECT OBJECT]".
 */

import assert from 'node:assert/strict';
import {
  normalizeRoleCode,
  extractRoleCode,
  extractRoleId,
  extractRoleName,
  isUserSuperAdmin,
  isUserAcademyAdmin,
  resolveEffectiveDashboardRole,
} from '../roleUtils';

// 1. Nested backend role object must extract clean uppercase code & name, never [OBJECT OBJECT]
const secondAdminUser = {
  id: 42,
  first_name: 'Atiqur',
  last_name: 'Rahman',
  user_type: 'ADMIN',
  is_superuser: false,
  is_academy_admin: true,
  role: {
    id: 2,
    code: 'ADMIN',
    name: 'Administrator',
  },
};

assert.strictEqual(extractRoleCode(secondAdminUser), 'ADMIN');
assert.strictEqual(extractRoleId(secondAdminUser), 2);
assert.strictEqual(extractRoleName(secondAdminUser), 'Administrator');
assert.strictEqual(isUserSuperAdmin(secondAdminUser, false), false);
assert.strictEqual(isUserAcademyAdmin(secondAdminUser, false, false), true);

// 2. Corrupt string guard & object normalization
assert.strictEqual(normalizeRoleCode('[object Object]'), '');
assert.strictEqual(normalizeRoleCode('[OBJECT OBJECT]'), '');
assert.strictEqual(normalizeRoleCode({ code: 'TEACHER', name: 'Teacher' }), 'TEACHER');
assert.strictEqual(normalizeRoleCode({ name: 'Hostel Super' }), 'HOSTEL_SUPER');

// 3. Teacher with role object resolves to TEACHER (not [OBJECT OBJECT] or ADMIN)
const teacherUser = {
  id: 99,
  user_type: 'TEACHER',
  is_superuser: false,
  role: {
    id: 3,
    code: 'TEACHER',
    name: 'Hifz Teacher / Ustadh',
  },
};

assert.strictEqual(extractRoleCode(teacherUser), 'TEACHER');
assert.strictEqual(extractRoleName(teacherUser), 'Hifz Teacher / Ustadh');
assert.strictEqual(isUserAcademyAdmin(teacherUser, false, false), false);

// 4. Super Admin via nested role object when user_type differs
const superViaRoleObj = {
  id: 1,
  is_superuser: false,
  role: {
    id: 1,
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
  },
};

assert.strictEqual(isUserSuperAdmin(superViaRoleObj, false), true);
assert.strictEqual(extractRoleCode(superViaRoleObj), 'SUPER_ADMIN');

// 5. Fallback via staff_profile when user.role is absent
const staffAdminFallback = {
  id: 77,
  role: null,
  user_type: '',
  staff_profile: { staff_type: 'ADMIN' },
};
assert.strictEqual(extractRoleCode(staffAdminFallback), 'ADMIN');
assert.strictEqual(isUserAcademyAdmin(staffAdminFallback), true);

// 6. Super Admin MUST be able to select Administrator (/dashboard/admin) without snapping back to SUPER_ADMIN
const rolesCatalog = [
  { id: 1, code: 'SUPER_ADMIN', name: 'Super Admin' },
  { id: 2, code: 'ADMIN', name: 'Administrator' },
  { id: 3, code: 'TEACHER', name: 'Teacher' },
  { id: 4, code: 'PRINCIPAL', name: 'Principal' },
];

assert.strictEqual(
  resolveEffectiveDashboardRole({
    roleSlug: 'admin',
    initialRole: 'SUPER_ADMIN',
    isSuperAdmin: true,
    isMultiTenantAdmin: true,
    currentUser: superViaRoleObj,
    roles: rolesCatalog,
  }),
  'ADMIN'
);
assert.strictEqual(
  resolveEffectiveDashboardRole({
    roleSlug: 'teacher',
    initialRole: 'SUPER_ADMIN',
    isSuperAdmin: true,
    currentUser: superViaRoleObj,
    roles: rolesCatalog,
  }),
  'TEACHER'
);
assert.strictEqual(
  resolveEffectiveDashboardRole({
    roleSlug: 'super-admin',
    initialRole: 'SUPER_ADMIN',
    isSuperAdmin: true,
    currentUser: superViaRoleObj,
    roles: rolesCatalog,
  }),
  'SUPER_ADMIN'
);
// Non-superadmin custom Academy Admin keeps own role when visiting /dashboard/admin
assert.strictEqual(
  resolveEffectiveDashboardRole({
    roleSlug: 'admin',
    initialRole: 'PRINCIPAL',
    isSuperAdmin: false,
    isAcademyAdminFlag: true,
    currentUser: { id: 88, user_type: 'PRINCIPAL', is_academy_admin: true },
    roles: rolesCatalog,
  }),
  'PRINCIPAL'
);
// Non-admin Teacher cannot switch into /dashboard/admin
assert.strictEqual(
  resolveEffectiveDashboardRole({
    roleSlug: 'admin',
    initialRole: 'TEACHER',
    isSuperAdmin: false,
    currentUser: teacherUser,
    roles: rolesCatalog,
  }),
  'TEACHER'
);

console.log('roleUtils.test.ts: All assertions passed.');

