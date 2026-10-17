export const ar = {
  title: 'إدارة الأدوار وصلاحيات الوصول',
  subtitle: 'تكوين مستويات الصلاحيات وأذونات الإجراءات وتعريف الأدوار المخصصة',
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
  allLevels: 'جميع مستويات الصلاحية',
  levelSuperAdmin: 'المستوى 1 (مدير فائق)',
  levelAdmin: 'المستوى 2 (مدير)',
  levelStaff: 'المستوى 3-4 (موظفون)',
  levelTeacher: 'المستوى 5 (معلم)',
  levelGuardian: 'المستوى 10 (ولي أمر)',

  // Columns & Labels
  roleName: 'اسم الدور',
  roleCode: 'رمز الدور',
  hierarchyRank: 'مستوى الصلاحية',
  levelBadge: 'المستوى {{level}}',
  assignedUsers: 'المستخدمون',
  protection: 'الحالة',
  protected: 'محمي',
  configurable: 'قابل للتعديل',
  googleDefault: 'افتراضي جوجل',
  actions: 'الإجراءات',
  permissionsSummary: '{{count}} صلاحيات',

  // Action Buttons
  createRole: 'إنشاء دور',
  createRoleSubtitle: 'تعريف دور مخصص جديد مع أذونات محددة',
  editRole: 'تعديل الدور',
  cloneRole: 'استنساخ الدور',
  deleteRole: 'حذف الدور',
  viewDetails: 'عرض الصلاحيات',
  setGoogleDefault: 'تعيين كافتراضي لجوجل',
  exportCsv: 'تصدير CSV',

  // Drawers & Form
  drawers: {
    createTitle: 'إنشاء دور مخصص',
    editTitle: 'تعديل الدور: {{name}}',
    detailsTitle: 'ملف الدور والصلاحيات: {{name}}',
    basicInfoSection: 'المعلومات الأساسية',
    permissionsSection: 'مصفوفة أذونات الإجراءات',
  },

  // Form Fields
  fields: {
    name: 'اسم العرض للدور',
    namePlaceholder: 'مثال: أستاذ أول',
    code: 'الرمز الفريد للدور',
    codePlaceholder: 'مثال: SENIOR_USTADH',
    description: 'وصف الدور',
    descriptionPlaceholder: 'صف باختصار نطاق العمل لهذا الدور...',
    hierarchyLevel: 'رتبة التسلسل الهرمي للصلاحية (1 - 10)',
    hierarchyHelp: 'الرقم الأقل = صلاحية أعلى (1 = مدير فائق، 2 = مدير، 5 = معلم، 10 = ولي أمر).',
    levelHighest: 'المستوى 1 (الأعلى)',
    levelMedium: 'المستوى 5 (متوسط)',
    levelLowest: 'المستوى 10 (الأدنى)',
  },

  // Permissions
  permissions: {
    can_create_student: 'إنشاء الطلاب',
    can_create_student_desc: 'السماح بإنشاء سجلات طلاب جديدة',
    can_edit_student: 'تعديل الطلاب',
    can_edit_student_desc: 'السماح بتعديل بيانات الطالب',
    can_delete_report: 'حذف التقارير',
    can_delete_report_desc: 'السماح بحذف ملاحظات التقييم اليومية',
    can_export_reports: 'تصدير البيانات',
    can_export_reports_desc: 'السماح بتصدير التقارير إلى PDF أو Excel',
    can_manage_users: 'إدارة المستخدمين',
    can_manage_users_desc: 'السماح بإنشاء المستخدمين وتعيينهم',
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
