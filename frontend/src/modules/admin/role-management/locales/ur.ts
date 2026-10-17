export const ur = {
  title: 'کردار اور رسائی کا انتظام',
  subtitle: 'سسٹم کے اختیارات، کارروائی کے اجازت نامے اور کسٹم کرداروں کی تشکیل کریں',
  totalRolesBadge: '{{count}} کل کردار',

  // Metrics
  metrics: {
    totalRoles: 'کل کردار',
    systemRoles: 'سسٹم کے کردار',
    customRoles: 'کسٹم کردار',
    assignedUsers: 'متعین صارفین',
  },

  // Search & Filter
  searchPlaceholder: 'نام، کوڈ یا تفصیل سے کردار تلاش کریں...',
  allTypes: 'تمام کردار کی اقسام',
  typeSystem: 'سسٹم سے محفوظ',
  typeCustom: 'کسٹم کردار',
  allLevels: 'تمام اختیارات کے درجات',
  levelSuperAdmin: 'سطح 1 (سپر ایڈمن)',
  levelAdmin: 'سطح 2 (ایڈمن)',
  levelStaff: 'سطح 3-4 (عملہ)',
  levelTeacher: 'سطح 5 (استاد)',
  levelGuardian: 'سطح 10 (سرپرست)',

  // Columns & Labels
  roleName: 'کردار کا نام',
  roleCode: 'کردار کا کوڈ',
  hierarchyRank: 'اختیار کی سطح',
  levelBadge: 'سطح {{level}}',
  assignedUsers: 'صارفین',
  protection: 'حیثیت',
  protected: 'محفوظ',
  configurable: 'قابل ترتیب',
  googleDefault: 'گوگل ڈیفالٹ',
  actions: 'کارروائیاں',
  permissionsSummary: '{{count}} اجازت نامے',

  // Action Buttons
  createRole: 'کردار بنائیں',
  createRoleSubtitle: 'مخصوص اجازت ناموں کے ساتھ نیا کسٹم کردار بنائیں',
  editRole: 'کردار میں ترمیم کریں',
  cloneRole: 'کردار کی نقل بنائیں',
  deleteRole: 'کردار حذف کریں',
  viewDetails: 'اجازت نامے دیکھیں',
  setGoogleDefault: 'گوگل ڈیفالٹ مقرر کریں',
  exportCsv: 'سی ایس وی برآمد کریں',

  // Drawers & Form
  drawers: {
    createTitle: 'کسٹم کردار بنائیں',
    editTitle: 'کردار میں ترمیم: {{name}}',
    detailsTitle: 'کردار کا پروفائل اور اجازت نامے: {{name}}',
    basicInfoSection: 'بنیادی معلومات',
    permissionsSection: 'کارروائی کی اجازت کا میٹرکس',
  },

  // Form Fields
  fields: {
    name: 'کردار کا ظاہر ہونے والا نام',
    namePlaceholder: 'مثال: سینئر استاد',
    code: 'منفرد کردار کوڈ',
    codePlaceholder: 'مثال: SENIOR_USTADH',
    description: 'کردار کی تفصیل',
    descriptionPlaceholder: 'اس کردار کے دائرہ کار کی مختصر تفصیل لکھیں...',
    hierarchyLevel: 'اختیار کا درجہ (1 - 10)',
    hierarchyHelp: 'کم نمبر = زیادہ اختیار (1 = سپر ایڈمن، 2 = ایڈمن، 5 = استاد، 10 = سرپرست)۔',
    levelHighest: 'سطح 1 (سب سے زیادہ)',
    levelMedium: 'سطح 5 (درمیانہ)',
    levelLowest: 'سطح 10 (سب سے کم)',
  },

  // Permissions
  permissions: {
    can_create_student: 'طلباء بنائیں',
    can_create_student_desc: 'نئے طلباء کے ریکارڈ بنانے کی اجازت دیں',
    can_edit_student: 'طلباء میں ترمیم',
    can_edit_student_desc: 'طلباء کی تفصیلات میں ترمیم کرنے کی اجازت دیں',
    can_delete_report: 'رپورٹیں حذف کریں',
    can_delete_report_desc: 'روزانہ تشخیص کے نوٹس حذف کرنے کی اجازت دیں',
    can_export_reports: 'ڈیٹا برآمد کریں',
    can_export_reports_desc: 'پی ڈی ایف/ایکسل میں رپورٹ برآمد کرنے کی اجازت دیں',
    can_manage_users: 'صارفین کا انتظام',
    can_manage_users_desc: 'صارفین بنانے اور تفویض کرنے کی اجازت دیں',
  },

  // Modals
  deleteModal: {
    title: 'کردار حذف کریں',
    warningTitle: 'انتباہ: کردار کا خاتمہ',
    warningMessage: 'کیا آپ واقعی کردار "{{name}}" حذف کرنا چاہتے ہیں؟ اس عمل کو واپس نہیں لایا جا سکتا۔',
    assignedWarning: 'یہ کردار اس وقت {{count}} فعال صارفین کو تفویض ہے اور اسے حذف نہیں کیا جا سکتا۔',
    confirmButton: 'حذف کرنے کی تصدیق کریں',
    deleting: 'حذف ہو رہا ہے...',
    cancel: 'منسوخ کریں',
  },

  // Empty State & Fallbacks
  empty: {
    title: 'کوئی کردار نہیں ملا',
    filteredMessage: 'آپ کی تلاش یا فلٹر سے کوئی کردار مماثل نہیں ہے۔',
    defaultMessage: 'کوئی کسٹم کردار موجود نہیں ہے۔ اپنے ادارے کے لیے نیا کردار بنائیں۔',
  },

  // Toasts
  toasts: {
    roleCreated: 'کردار "{{name}}" کامیابی سے بن گیا!',
    roleUpdated: 'کردار "{{name}}" کامیابی سے اپ ڈیٹ ہو گیا!',
    roleCloned: 'کردار "{{name}}" کے طور پر نقل تیار ہو گئی!',
    roleDeleted: 'کردار "{{name}}" کامیابی سے حذف ہو گیا!',
    cannotDeleteSystem: 'سسٹم سے محفوظ کردار حذف نہیں کیے جا سکتے۔',
    cannotDeleteAssigned: 'فعال صارفین سے وابستہ کردار حذف نہیں کیا جا سکتا۔',
    googleDefaultUpdated: 'ڈیفالٹ گوگل کردار "{{name}}" پر سیٹ کر دیا گیا۔',
    loadError: 'سرور سے کردار لوڈ کرنے میں ناکامی ہوئی۔',
    validationError: 'براہ کرم تمام مطلوبہ خانے پُر کریں۔',
    codeExists: 'کردار کا کوڈ "{{code}}" پہلے سے موجود ہے۔ منفرد کوڈ منتخب کریں۔',
    exportSuccess: 'کردار کامیابی سے برآمد ہو گئے۔',
  },
};

export default ur;
