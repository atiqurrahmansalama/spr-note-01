export const ur = {
  title: 'کردار اور رسائی کا انتظام',
  subtitle: 'ادارے کے کردار بنائیں اور منظم کریں؛ تمام اختیارات فیچر اور ماڈیول کنٹرول سے ترتیب دیں',
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

  // Columns & Labels
  roleName: 'کردار کا نام',
  roleCode: 'کردار کا کوڈ',
  assignedUsers: 'صارفین',
  protection: 'حیثیت',
  protected: 'محفوظ',
  configurable: 'قابل ترتیب',
  googleDefault: 'گوگل ڈیفالٹ',
  actions: 'کارروائیاں',
  featureControlNotice:
    'اس کردار کے لیے تمام ماڈیولز، صفحات اور ڈیش بورڈ ویجٹس کی اجازتیں ایپ مینجمنٹ -> فیچر اور ماڈیول کنٹرول کے اندر مرکزی طور پر منظم کی جاتی ہیں۔',
  manageInFeatureControl: 'فیچر کنٹرول میں رسائی کا انتظام کریں',

  // Action Buttons
  createRole: 'کردار بنائیں',
  createRoleSubtitle: 'ادارہ جاتی رسائی کے لیے نیا کسٹم کردار بنائیں',
  editRole: 'کردار میں ترمیم کریں',
  cloneRole: 'کردار کی نقل بنائیں',
  deleteRole: 'کردار حذف کریں',
  viewDetails: 'تفصیلات دیکھیں',
  setGoogleDefault: 'گوگل ڈیفالٹ مقرر کریں',
  exportCsv: 'سی ایس وی برآمد کریں',

  // Drawers & Form
  drawers: {
    createTitle: 'کسٹم کردار بنائیں',
    editTitle: 'کردار میں ترمیم: {{name}}',
    detailsTitle: 'کردار کا پروفائل: {{name}}',
    basicInfoSection: 'بنیادی معلومات',
    featureControlSection: 'فیچر اور ماڈیول کنٹرول',
  },

  // Form Fields
  fields: {
    name: 'کردار کا ظاہر ہونے والا نام',
    namePlaceholder: 'مثال: سینئر استاد',
    code: 'منفرد کردار کوڈ',
    codePlaceholder: 'مثال: SENIOR_USTADH',
    description: 'کردار کی تفصیل',
    descriptionPlaceholder: 'اس کردار کے دائرہ کار کی مختصر تفصیل لکھیں...',
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
