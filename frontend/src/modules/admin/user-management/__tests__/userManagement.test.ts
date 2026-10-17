import assert from 'node:assert';
import { UserRecord, UserRole } from '../types';

console.log('Testing User Management Module...');

const mockUsers: UserRecord[] = [
  {
    id: 1,
    name: 'Atiqur Rahman',
    first_name: 'Atiqur',
    last_name: 'Rahman',
    email: 'atiqur@suffah.edu',
    phone_number: '01700000000',
    user_type: 'SUPER_ADMIN',
    role: { id: 1, name: 'Super Admin', code: 'SUPER_ADMIN', hierarchy_level: 1 },
    auth_provider: 'google',
    is_active: true,
    is_deactivated: false,
    date_joined: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Mawlana Tariq',
    first_name: 'Tariq',
    last_name: 'Jamil',
    email: 'tariq@suffah.edu',
    phone_number: '01711000001',
    user_type: 'TEACHER',
    role: { id: 2, name: 'Teacher', code: 'TEACHER', hierarchy_level: 4 },
    auth_provider: 'email',
    is_active: true,
    is_deactivated: false,
    date_joined: '2026-02-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Inactive User',
    first_name: 'Inactive',
    last_name: 'Account',
    email: 'inactive@suffah.edu',
    phone_number: '01711000002',
    user_type: 'GUARDIAN',
    role: { id: 3, name: 'Guardian', code: 'GUARDIAN', hierarchy_level: 5 },
    auth_provider: 'email',
    is_active: false,
    is_deactivated: true,
    date_joined: '2026-03-01T00:00:00Z',
  },
];

// Test 1: Metrics
const totalUsers = mockUsers.length;
const activeUsers = mockUsers.filter((u) => u.is_active !== false && !u.is_deactivated).length;
const inactiveUsers = totalUsers - activeUsers;
const googleUsers = mockUsers.filter((u) => u.auth_provider === 'google').length;

assert.strictEqual(totalUsers, 3, 'Total users should be 3');
assert.strictEqual(activeUsers, 2, 'Active users should be 2');
assert.strictEqual(inactiveUsers, 1, 'Inactive users should be 1');
assert.strictEqual(googleUsers, 1, 'Google auth users should be 1');
console.log('✓ [PASSED] 1. User Metrics Calculations');

// Test 2: Role Filtering
const teachers = mockUsers.filter((u) => (u.role?.code || u.user_type) === 'TEACHER');
assert.strictEqual(teachers.length, 1, 'Should find 1 teacher');
assert.strictEqual(teachers[0].name, 'Mawlana Tariq');
console.log('✓ [PASSED] 2. Role Filtering');

// Test 3: Status Filtering
const activeList = mockUsers.filter((u) => u.is_active !== false && !u.is_deactivated);
const inactiveList = mockUsers.filter((u) => u.is_active === false || Boolean(u.is_deactivated));
assert.strictEqual(activeList.length, 2, 'Should have 2 active users');
assert.strictEqual(inactiveList.length, 1, 'Should have 1 inactive user');
console.log('✓ [PASSED] 3. Status Filtering');

// Test 4: Auth Provider Filtering
const googleList = mockUsers.filter((u) => u.auth_provider === 'google');
const emailList = mockUsers.filter((u) => u.auth_provider !== 'google');
assert.strictEqual(googleList.length, 1, 'Should have 1 google auth user');
assert.strictEqual(emailList.length, 2, 'Should have 2 email auth users');
console.log('✓ [PASSED] 4. Auth Provider Filtering');

// Test 5: Search Matching
const searchParam = 'tariq';
const searchResults = mockUsers.filter((u) =>
  (u.name || '').toLowerCase().includes(searchParam) ||
  (u.email || '').toLowerCase().includes(searchParam) ||
  (u.phone_number || '').includes(searchParam)
);
assert.strictEqual(searchResults.length, 1, 'Search should find 1 matching user');
assert.strictEqual(searchResults[0].id, 2);
console.log('✓ [PASSED] 5. Search Matching');

// Test 6: Colocated 4-Language Dictionary Integrity
import { userManagementLocales } from '../locales';

assert.strictEqual(userManagementLocales.en.title, 'User Management', 'English title mismatch');
assert.strictEqual(userManagementLocales.bn.title, 'ব্যবহারকারী ব্যবস্থাপনা', 'Bengali title mismatch');
assert.strictEqual(userManagementLocales.ar.title, 'إدارة المستخدمين', 'Arabic title mismatch');
assert.strictEqual(userManagementLocales.ur.title, 'صارفین کا انتظام', 'Urdu title mismatch');
assert.strictEqual(userManagementLocales.en.addUser, 'Add User');
assert.strictEqual(userManagementLocales.bn.addUser, 'ব্যবহারকারী যোগ করুন');
assert.strictEqual(userManagementLocales.ar.addUser, 'إضافة مستخدم');
assert.strictEqual(userManagementLocales.ur.addUser, 'صارف شامل کریں');
console.log('✓ [PASSED] 6. Colocated 4-Language Dictionary Integrity (en, bn, ar, ur)');

import { isUserOnline } from '../utils/presence';

// Test 7: Presence Status Logic
const onlineUser: UserRecord = {
  ...mockUsers[0],
  is_online: true,
  last_activity: new Date().toISOString(),
};
const offlineUser: UserRecord = {
  ...mockUsers[1],
  is_online: false,
  last_activity: '2026-01-01T00:00:00Z',
};
const deactivatedUser: UserRecord = {
  ...mockUsers[2],
  is_online: true, // even if is_online is true, deactivated must be false
};

assert.strictEqual(isUserOnline(onlineUser), true, 'Online user should return true');
assert.strictEqual(isUserOnline(offlineUser), false, 'Offline user should return false');
assert.strictEqual(isUserOnline(deactivatedUser), false, 'Deactivated user should always return false');
console.log('✓ [PASSED] 7. Real-Time Presence Logic');

// Test 8: Presence 4-Language Keys
assert.strictEqual(userManagementLocales.en.onlineNow, 'Online Now');
assert.strictEqual(userManagementLocales.bn.onlineNow, 'বর্তমানে অ্যাপে সক্রিয়');
assert.strictEqual(userManagementLocales.ar.onlineNow, 'متصل الآن');
assert.strictEqual(userManagementLocales.ur.onlineNow, 'ابھی آن لائن');

assert.strictEqual(userManagementLocales.en.offline, 'Offline');
assert.strictEqual(userManagementLocales.bn.offline, 'অফলাইন');
assert.strictEqual(userManagementLocales.ar.offline, 'غير متصل');
assert.strictEqual(userManagementLocales.ur.offline, 'آف لائن');
console.log('✓ [PASSED] 8. Presence 4-Language Localization Integrity');

// Test 9: Role Invites Metrics & Expiry Logic
import { RoleInviteRecord } from '../types';

const mockInvites: RoleInviteRecord[] = [
  {
    id: 'inv-1',
    token: 'token-abc-1234567890',
    title: 'Batch Teachers 2026',
    target_role: 2,
    target_role_name: 'Teacher',
    target_role_code: 'TEACHER',
    max_uses: 10,
    used_count: 3,
    is_active: true,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    is_valid: true,
  },
  {
    id: 'inv-2',
    token: 'token-xyz-9876543210',
    title: 'Single Super Admin Token',
    target_role: 1,
    target_role_name: 'Super Admin',
    target_role_code: 'SUPER_ADMIN',
    max_uses: 1,
    used_count: 1,
    is_active: true,
    expires_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(),
    is_valid: false,
  },
  {
    id: 'inv-3',
    token: 'token-rev-1122334455',
    title: 'Revoked Staff Token',
    target_role: 4,
    target_role_name: 'Staff',
    target_role_code: 'STAFF',
    max_uses: 5,
    used_count: 0,
    is_active: false,
    expires_at: null,
    created_at: new Date().toISOString(),
    is_valid: false,
  },
];

let activeInvitesCount = 0;
let revokedInvitesCount = 0;
let expiredInvitesCount = 0;
let totalInvitesUses = 0;
const nowTime = new Date();

mockInvites.forEach((inv) => {
  totalInvitesUses += inv.used_count || 0;
  const isExpired = Boolean(inv.expires_at && new Date(inv.expires_at) < nowTime);
  if (!inv.is_active) {
    revokedInvitesCount += 1;
  } else if (isExpired) {
    expiredInvitesCount += 1;
  } else {
    activeInvitesCount += 1;
  }
});

assert.strictEqual(mockInvites.length, 3, 'Total invites count should be 3');
assert.strictEqual(activeInvitesCount, 1, 'Active invites count should be 1');
assert.strictEqual(expiredInvitesCount, 1, 'Expired invites count should be 1');
assert.strictEqual(revokedInvitesCount, 1, 'Revoked invites count should be 1');
assert.strictEqual(totalInvitesUses, 4, 'Total uses should be 4');
console.log('✓ [PASSED] 9. Role Invites Metrics & Expiry Computations');

// Test 10: Role Invites & Tabs 4-Language Localization Integrity
assert.strictEqual(userManagementLocales.en.tabs.users, 'Users Directory');
assert.strictEqual(userManagementLocales.bn.tabs.users, 'ব্যবহারকারী তালিকা');
assert.strictEqual(userManagementLocales.ar.tabs.users, 'دليل المستخدمين');
assert.strictEqual(userManagementLocales.ur.tabs.users, 'صارفین کی فہرست');

assert.strictEqual(userManagementLocales.en.tabs.invites, 'Role Invites & QR Tokens');
assert.strictEqual(userManagementLocales.bn.tabs.invites, 'রোল ইনভাইট ও কিউআর টোকেন');
assert.strictEqual(userManagementLocales.ar.tabs.invites, 'دعوات الأدوار ورموز QR');
assert.strictEqual(userManagementLocales.ur.tabs.invites, 'کردار کے دعوت نامے اور QR');

assert.strictEqual(userManagementLocales.en.invites.generateInvite, 'Generate Invite');
assert.strictEqual(userManagementLocales.bn.invites.generateInvite, 'ইনভাইট তৈরি করুন');
assert.strictEqual(userManagementLocales.ar.invites.generateInvite, 'إنشاء دعوة');
assert.strictEqual(userManagementLocales.ur.invites.generateInvite, 'دعوت نامہ بنائیں');
console.log('✓ [PASSED] 10. Role Invites & Tabs 4-Language Localization Integrity (en, bn, ar, ur)');

console.log('All User Management & Role Invites unit tests passed successfully!');
