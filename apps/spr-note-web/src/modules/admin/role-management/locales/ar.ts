export const ar = {
  title: 'إدارة الأدوار وصلاحيات الوصول',
  subtitle: 'إنشاء وتنظيم الأدوار المؤسسية؛ وإدارة جميع الصلاحيات عبر التحكم بالميزات والوحدات',
  totalRolesBadge: '{{count}} إجمالي الأدوار',

  // Metrics
  metrics: {
    totalRoles: 'إجمالي الأدوار',
    systemRoles: 'أدوار النظام',
    customRoles: 'أدوار مخصصة',
    assignedUsers: 'المستخدمون المعينون',
  },

  // Search & Filter
  searchPlaceholder: 'البحث عن الأدوار بالاسم أو الرمز أو الوصف...',
  allTypes: 'جميع أنواع الأدوار',
  typeSystem: 'محمي بواسطة النظام',
  typeCustom: 'أدوار مخصصة',

  // Columns & Labels
  roleName: 'اسم الدور',
  roleCode: 'رمز الدور',
  assignedUsers: 'المستخدمون',
  protection: 'الحالة',
  protected: 'محمي',
  configurable: 'قابل للتعديل',
  googleDefault: 'افتراضي جوجل',
  actions: 'الإجراءات',
  featureControlNotice:
    'تُدار جميع صلاحيات الوحدات والصفحات وعناصر لوحة التحكم لهذا الدور مركزياً من خلال إدارة التطبيقات -> التحكم بالميزات والوحدات.',
  manageInFeatureControl: 'إدارة الصلاحيات في التحكم بالميزات',

  // Action Buttons
  createRole: 'إنشاء دور',
  createRoleSubtitle: 'تعريف دور مخصص جديد للتحكم في الوصول المؤسسي',
  editRole: 'تعديل الدور',
  cloneRole: 'استنساخ الدور',
  deleteRole: 'حذف الدور',
  viewDetails: 'عرض التفاصيل',
  setGoogleDefault: 'تعيين كافتراضي لجوجل',
  exportCsv: 'تصدير CSV',

  // Drawers & Form
  drawers: {
    createTitle: 'إنشاء دور مخصص',
    editTitle: 'تعديل الدور: {{name}}',
    detailsTitle: 'ملف الدور: {{name}}',
    basicInfoSection: 'المعلومات الأساسية',
    featureControlSection: 'التحكم بالميزات والوحدات',
  },

  // Form Fields
  fields: {
    name: 'اسم العرض للدور',
    namePlaceholder: 'مثال: أستاذ أول',
    code: 'الرمز الفريد للدور',
    codePlaceholder: 'مثال: SENIOR_USTADH',
    description: 'وصف الدور',
    descriptionPlaceholder: 'صف باختصار نطاق العمل لهذا الدور...',
  },

  // Modals
  deleteModal: {
    title: 'حذف الدور',
    warningTitle: 'تحذير: حذف الدور',
    warningMessage: 'هل أنت متأكد من رغبتك في حذف الدور "{{name}}"؟ لا يمكن التراجع عن هذا الإجراء.',
    assignedWarning: 'هذا الدور معين حالياً لـ {{count}} من المستخدمين النشطين ولا يمكن حذفه.',
    confirmButton: 'تأكيد الحذف',
    deleting: 'جارٍ الحذف...',
    cancel: 'إلغاء',
  },

  // Empty State & Fallbacks
  empty: {
    title: 'لم يتم العثور على أي أدوار',
    filteredMessage: 'لا توجد أدوار تطابق معايير البحث أو التصفية الخاصة بك.',
    defaultMessage: 'لم يتم تعريف أي أدوار مخصصة. أنشئ أدواراً مخصصة لإدارة الصلاحيات في مؤسستك.',
  },

  // Toasts
  toasts: {
    roleCreated: 'تم إنشاء الدور "{{name}}" بنجاح!',
    roleUpdated: 'تم تحديث الدور "{{name}}" بنجاح!',
    roleCloned: 'تم استنساخ الدور باسم "{{name}}" بنجاح!',
    roleDeleted: 'تم حذف الدور "{{name}}" بنجاح!',
    cannotDeleteSystem: 'لا يمكن حذف الأدوار المحمية بواسطة النظام.',
    cannotDeleteAssigned: 'لا يمكن حذف دور معين لمستخدمين نشطين.',
    googleDefaultUpdated: 'تم تحديث دور جوجل الافتراضي إلى "{{name}}".',
    loadError: 'فشل تحميل الأدوار من الخادم.',
    validationError: 'يرجى ملء جميع الحقول المطلوبة.',
    codeExists: 'رمز الدور "{{code}}" موجود بالفعل. يرجى اختيار رمز فريد.',
    exportSuccess: 'تم تصدير الأدوار بنجاح.',
  },
};

export default ar;
