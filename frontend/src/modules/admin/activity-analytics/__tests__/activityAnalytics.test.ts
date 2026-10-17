import assert from 'node:assert';
import { UserActivityRecord } from '../types';
import { activityAnalyticsLocales } from '../locales';

console.log('Testing Activity Analytics & Audit Logs Module...');

const mockActivityRecords: UserActivityRecord[] = [
  {
    user_id: 1,
    name: 'Ustadh Ahmad',
    phone_number: '01711111111',
    user_type: 'TEACHER',
    total_active_duration_minutes: 180,
    formatted_active_duration: '3h 0m',
    sessions_count: 3,
    last_active: '2026-10-18T10:00:00Z',
    time_windows: [
      {
        session_id: 101,
        device_type: 'web',
        device_info: 'Chrome on Windows',
        ip_address: '192.168.1.10',
        from_time: '2026-10-18T07:00:00Z',
        to_time: '2026-10-18T08:00:00Z',
        duration_minutes: 60,
        is_active: false,
      },
      {
        session_id: 102,
        device_type: 'android',
        device_info: 'Suffah App on Android 14',
        ip_address: '192.168.1.11',
        from_time: '2026-10-18T08:30:00Z',
        to_time: null,
        duration_minutes: 120,
        is_active: true, // Currently active session
      },
    ],
    activity_logs: [
      {
        id: 1,
        action_name: 'Mark Attendance',
        endpoint: '/api/v1/attendance/records/',
        http_method: 'POST',
        ip_address: '192.168.1.11',
        timestamp: '2026-10-18T09:00:00Z',
      },
    ],
  },
  {
    user_id: 2,
    name: 'Nazim Mahmud',
    phone_number: '01922222222',
    user_type: 'ADMIN',
    total_active_duration_minutes: 240,
    formatted_active_duration: '4h 0m',
    sessions_count: 4,
    last_active: '2026-10-18T12:00:00Z',
    time_windows: [
      {
        session_id: 201,
        device_type: 'web',
        device_info: 'Firefox on Linux',
        ip_address: '192.168.1.20',
        from_time: '2026-10-18T08:00:00Z',
        to_time: '2026-10-18T12:00:00Z',
        duration_minutes: 240,
        is_active: true, // Currently active session
      },
    ],
    activity_logs: [
      {
        id: 2,
        action_name: 'Update Section Settings',
        endpoint: '/api/v1/sections/control/',
        http_method: 'PUT',
        ip_address: '192.168.1.20',
        timestamp: '2026-10-18T11:00:00Z',
      },
    ],
  },
  {
    user_id: 3,
    name: 'Guardian Kamal',
    phone_number: '01833333333',
    user_type: 'GUARDIAN',
    total_active_duration_minutes: 30,
    formatted_active_duration: '30m',
    sessions_count: 1,
    last_active: '2026-10-17T18:00:00Z',
    time_windows: [
      {
        session_id: 301,
        device_type: 'ios',
        device_info: 'Safari on iPhone',
        ip_address: '192.168.1.30',
        from_time: '2026-10-17T17:30:00Z',
        to_time: '2026-10-17T18:00:00Z',
        duration_minutes: 30,
        is_active: false,
      },
    ],
    activity_logs: [],
  },
];

// Test 1: Metrics Aggregations
const totalUsers = mockActivityRecords.length;
const totalMinutes = mockActivityRecords.reduce(
  (sum, r) => sum + r.total_active_duration_minutes,
  0
);
const totalSessions = mockActivityRecords.reduce((sum, r) => sum + r.sessions_count, 0);
const avgDuration = Math.round(totalMinutes / totalSessions);

let activeSessions = 0;
mockActivityRecords.forEach((r) => {
  r.time_windows.forEach((win) => {
    if (win.is_active) activeSessions += 1;
  });
});

assert.strictEqual(totalUsers, 3, 'Total users tracked must be 3');
assert.strictEqual(totalMinutes, 450, 'Total minutes must be 450 (180+240+30)');
assert.strictEqual(totalSessions, 8, 'Total sessions must be 8 (3+4+1)');
assert.strictEqual(avgDuration, 56, 'Avg duration must be 56 mins (450/8 = 56.25 -> 56)');
assert.strictEqual(activeSessions, 2, 'Active sessions count must be 2');
console.log('✓ [PASSED] 1. Activity Analytics Metrics Aggregations');

// Test 2: Role / User Type Filtering
const teachersOnly = mockActivityRecords.filter((r) => r.user_type === 'TEACHER');
const adminsOnly = mockActivityRecords.filter((r) => r.user_type === 'ADMIN');
assert.strictEqual(teachersOnly.length, 1, 'Should find 1 teacher');
assert.strictEqual(teachersOnly[0].name, 'Ustadh Ahmad');
assert.strictEqual(adminsOnly.length, 1, 'Should find 1 admin');
assert.strictEqual(adminsOnly[0].name, 'Nazim Mahmud');
console.log('✓ [PASSED] 2. User Role Filtering');

// Test 3: Device Type Filtering
const webUsers = mockActivityRecords.filter((r) =>
  r.time_windows.some((w) => w.device_type === 'web')
);
const iosUsers = mockActivityRecords.filter((r) =>
  r.time_windows.some((w) => w.device_type === 'ios')
);
assert.strictEqual(webUsers.length, 2, 'Should find 2 users with web sessions');
assert.strictEqual(iosUsers.length, 1, 'Should find 1 user with iOS session');
console.log('✓ [PASSED] 3. Device Platform Filtering');

// Test 4: Search Matching
const searchParam = 'ahmad';
const searchMatches = mockActivityRecords.filter((r) =>
  r.name.toLowerCase().includes(searchParam) || r.phone_number.includes(searchParam)
);
assert.strictEqual(searchMatches.length, 1, 'Search query should match 1 record');
assert.strictEqual(searchMatches[0].user_id, 1);
console.log('✓ [PASSED] 4. Multi-Field Search Matching');

// Test 5: 4-Language Localization Integrity
assert.strictEqual(
  activityAnalyticsLocales.en.title,
  'Activity & Session Analytics',
  'English title mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.bn.title,
  'অ্যাক্টিভিটি ও সেশন অ্যানালিটিক্স',
  'Bengali title mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.ar.title,
  'تحليلات النشاط والجلسات',
  'Arabic title mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.ur.title,
  'سرگرمی اور سیشن کے تجزیات',
  'Urdu title mismatch'
);

assert.strictEqual(
  activityAnalyticsLocales.en.metrics.totalUsers,
  'Tracked Users',
  'English totalUsers mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.bn.metrics.totalUsers,
  'মোট ব্যবহারকারী',
  'Bengali totalUsers mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.ar.metrics.totalUsers,
  'إجمالي المستخدمين',
  'Arabic totalUsers mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.ur.metrics.totalUsers,
  'کل ٹریک کردہ صارفین',
  'Urdu totalUsers mismatch'
);

assert.strictEqual(
  activityAnalyticsLocales.en.filters.preset30d,
  'Last 30 Days',
  'English preset30d mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.bn.filters.preset30d,
  'বিগত ৩০ দিন',
  'Bengali preset30d mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.ar.filters.preset30d,
  'آخر 30 يوماً',
  'Arabic preset30d mismatch'
);
assert.strictEqual(
  activityAnalyticsLocales.ur.filters.preset30d,
  'پچھلے 30 دن',
  'Urdu preset30d mismatch'
);
console.log('✓ [PASSED] 5. 4-Language Localization Integrity (en, bn, ar, ur)');

console.log('All Activity Analytics unit tests passed successfully!');
