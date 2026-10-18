export const en = {
  title: 'Activity & Session Analytics',
  subtitle: 'Monitor user engagement, device sessions, active time windows, and security audit logs',
  totalTrackedBadge: '{{count}} Tracked Accounts',
  refresh: 'Refresh Metrics',

  metrics: {
    totalUsers: 'Tracked Users',
    totalActiveTime: 'Total Active Time',
    avgSession: 'Avg Session Duration',
    activeSessions: 'Active Sessions Now',
  },

  filters: {
    searchPlaceholder: 'Search by user name, phone, or role...',
    allRoles: 'All Roles',
    allDevices: 'All Devices',
    deviceWeb: 'Web Browser',
    deviceAndroid: 'Android App',
    deviceIos: 'iOS App',
    presetToday: 'Today',
    preset7d: 'Last 7 Days',
    preset30d: 'Last 30 Days',
    presetAll: 'All Time',
    presetCustom: 'Custom Range',
    fromDate: 'From Date',
    toDate: 'To Date',
    role: 'Role',
    device: 'Device',
    timeHorizon: 'Time Frame',
    searchLabel: 'Search Activity',
    dateRange: 'Date Range',
    selectDateRange: 'Select Date Range...',
  },

  table: {
    user: 'User & Identity',
    sessions: 'Sessions',
    duration: 'Active Duration',
    lastActive: 'Last Active',
    actions: 'Actions',
    inspect: 'Inspect Activity & Logs',
    live: 'Online Now',
    mins: '{{count}} mins',
  },

  drawer: {
    title: 'User Activity & Audit Details: {{name}}',
    category: 'Activity Analytics',
    tabSessions: 'Session Windows ({{count}})',
    tabLogs: 'Audit Action Logs ({{count}})',
    device: 'Device & Platform',
    ip: 'IP Address',
    loginTime: 'Login Time',
    logoutTime: 'Logout / Inactive',
    duration: 'Duration',
    statusActive: 'Active Session',
    statusClosed: 'Ended',
    action: 'Action',
    endpoint: 'API Endpoint',
    method: 'Method',
    timestamp: 'Timestamp',
    noSessions: 'No session records found for this user in this time frame.',
    noLogs: 'No audit action logs recorded for this user.',
    close: 'Close',
  },

  empty: {
    title: 'No Activity Records Found',
    filtered: 'No user activity matched your filter criteria. Try adjusting your search query or filters.',
    default: 'No user session activity has been recorded in the system yet.',
  },

  export: {
    exportCsv: 'Export CSV',
    exportSuccess: 'Activity report exported successfully.',
  },

  toasts: {
    loadError: 'Failed to load user activity analytics data.',
  },
};

export default en;
