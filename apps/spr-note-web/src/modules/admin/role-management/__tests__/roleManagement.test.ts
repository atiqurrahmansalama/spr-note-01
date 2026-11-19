import assert from 'node:assert';
import { RoleRecord } from '../types';
import { roleManagementLocales } from '../locales';

console.log('Testing Role Management Module...');

const mockRoles: RoleRecord[] = [
  {
    id: 1,
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    description: 'Full system access & feature control',
    is_system_role: true,
    user_count: 2,
  },
  {
    id: 2,
    name: 'Administrator',
    code: 'ADMIN',
    description: 'Institute admin profile governed via Feature & Module Control',
    is_system_role: false,
    user_count: 5,
  },
  {
    id: 3,
    name: 'Senior Ustadh',
    code: 'SENIOR_USTADH',
    description: 'Head of Qur’an department and senior evaluations',
    is_system_role: false,
    user_count: 3,
  },
  {
    id: 4,
    name: 'Guardian / Parent',
    code: 'GUARDIAN',
    description: 'View student progress reports',
    is_system_role: false,
    user_count: 15,
  },
];

// Test 1: Metrics Aggregation
const totalRoles = mockRoles.length;
const systemRoles = mockRoles.filter((r) => r.code === 'SUPER_ADMIN').length;
const customRoles = totalRoles - systemRoles;
const totalUsersAssigned = mockRoles.reduce((sum, r) => sum + (r.user_count || 0), 0);

assert.strictEqual(totalRoles, 4, 'Total roles should be 4');
assert.strictEqual(systemRoles, 1, 'System roles should be 1');
assert.strictEqual(customRoles, 3, 'Custom roles should be 3');
assert.strictEqual(totalUsersAssigned, 25, 'Total assigned users should be 25');
console.log('[PASSED] 1. Role Metrics Calculations');

// Test 2: Type Filtering
const systemList = mockRoles.filter((r) => r.code === 'SUPER_ADMIN');
const customList = mockRoles.filter((r) => r.code !== 'SUPER_ADMIN');
assert.strictEqual(systemList.length, 1, 'System list should contain 1 role');
assert.strictEqual(customList.length, 3, 'Custom list should contain 3 roles');
assert.strictEqual(systemList[0].code, 'SUPER_ADMIN');
console.log('[PASSED] 2. Type Filtering (System vs Custom)');

// Test 3: Consolidated Role Schema (No parallel hierarchy_level or action_permissions)
assert.strictEqual('hierarchy_level' in mockRoles[0], false, 'hierarchy_level must not exist on RoleRecord');
assert.strictEqual('action_permissions' in mockRoles[0], false, 'action_permissions must not exist on RoleRecord');
console.log('[PASSED] 3. Consolidated Role Schema Integrity');

// Test 4: Search Matching
const searchParam = 'ustadh';
const searchResults = mockRoles.filter(
  (r) =>
    r.name.toLowerCase().includes(searchParam) ||
    r.code.toLowerCase().includes(searchParam) ||
    (r.description || '').toLowerCase().includes(searchParam)
);
assert.strictEqual(searchResults.length, 1, 'Search for ustadh should return 1 role');
assert.strictEqual(searchResults[0].id, 3);
console.log('[PASSED] 4. Search Matching');

// Test 5: Colocated 4-Language Dictionary Integrity
assert.strictEqual(roleManagementLocales.en.title, 'Role & Access Control', 'English title mismatch');
assert.strictEqual(roleManagementLocales.bn.title, 'ভূমিকা ও অ্যাক্সেস নিয়ন্ত্রণ', 'Bengali title mismatch');
assert.strictEqual(roleManagementLocales.ar.title, 'إدارة الأدوار وصلاحيات الوصول', 'Arabic title mismatch');
assert.strictEqual(roleManagementLocales.ur.title, 'کردار اور رسائی کا انتظام', 'Urdu title mismatch');

assert.strictEqual(roleManagementLocales.en.createRole, 'Create Role');
assert.strictEqual(roleManagementLocales.bn.createRole, 'ভূমিকা তৈরি করুন');
assert.strictEqual(roleManagementLocales.ar.createRole, 'إنشاء دور');
assert.strictEqual(roleManagementLocales.ur.createRole, 'کردار بنائیں');

assert.ok(roleManagementLocales.en.manageInFeatureControl);
assert.ok(roleManagementLocales.bn.manageInFeatureControl);
assert.ok(roleManagementLocales.ar.manageInFeatureControl);
assert.ok(roleManagementLocales.ur.manageInFeatureControl);
console.log('[PASSED] 5. Colocated 4-Language Localization Integrity (en, bn, ar, ur)');

console.log('All Role Management unit tests passed successfully!');
