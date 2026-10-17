export const ar = {
  title: 'تحليلات النشاط والجلسات',
  subtitle: 'مراقبة تفاعل المستخدمين، جلسات الأجهزة، النوافذ الزمنية النشطة، وسجلات التدقيق الأمني',
  totalTrackedBadge: '{{count}} حسابات متبعة',
  refresh: 'تحديث المقاييس',

  metrics: {
    totalUsers: 'إجمالي المستخدمين',
    totalActiveTime: 'إجمالي الوقت النشط',
    avgSession: 'متوسط مدة الجلسة',
    activeSessions: 'الجلسات النشطة الآن',
  },

  filters: {
    searchPlaceholder: 'البحث بالاسم، الهاتف، أو الدور...',
    allRoles: 'جميع الأدوار',
    allDevices: 'جميع الأجهزة',
    deviceWeb: 'متصفح الويب',
    deviceAndroid: 'تطبيق أندرويد',
    deviceIos: 'تطبيق iOS',
    presetToday: 'اليوم',
    preset7d: 'آخر 7 أيام',
    preset30d: 'آخر 30 يوماً',
    presetAll: 'كل الأوقات',
    presetCustom: 'نطاق مخصص',
    fromDate: 'من تاريخ',
    toDate: 'إلى تاريخ',
    role: 'الدور',
    device: 'الجهاز',
    timeHorizon: 'الإطار الزمني',
  },

  table: {
    user: 'المستخدم والهوية',
    sessions: 'الجلسات',
    duration: 'المدة النشطة',
    lastActive: 'آخر نشاط',
    actions: 'الإجراءات',
    inspect: 'فحص النشاط والسجلات',
    live: 'متصل الآن',
    mins: '{{count}} دقيقة',
  },

  drawer: {
    title: 'تفاصيل نشاط وتدقيق المستخدم: {{name}}',
    category: 'تحليلات النشاط',
    tabSessions: 'نوافذ الجلسات ({{count}})',
    tabLogs: 'سجلات التدقيق ({{count}})',
    device: 'الجهاز والمنصة',
    ip: 'عنوان IP',
    loginTime: 'وقت الدخول',
    logoutTime: 'الخروج / غير نشط',
    duration: 'المدة',
    statusActive: 'جلسة نشطة',
    statusClosed: 'منتهية',
    action: 'الإجراء',
    endpoint: 'نقطة نهاية API',
    method: 'البروتوكول',
    timestamp: 'الطابع الزمني',
    noSessions: 'لم يتم العثور على سجلات جلسات لهذا المستخدم في هذه الفترة.',
    noLogs: 'لا توجد سجلات تدقيق مسجلة لهذا المستخدم.',
    close: 'إغلاق',
  },

  empty: {
    title: 'لم يتم العثور على سجلات نشاط',
    filtered: 'لم يطابق أي نشاط معايير التصفية. يرجى تجربة تغيير التاريخ أو الدور.',
    default: 'لم يتم تسجيل أي نشاط جلسات للمستخدمين في النظام بعد.',
  },

  export: {
    exportCsv: 'تصدير CSV',
    exportSuccess: 'تم تصدير تقرير النشاط بنجاح.',
  },

  toasts: {
    loadError: 'فشل في تحميل بيانات تحليلات النشاط.',
  },
};

export default ar;
