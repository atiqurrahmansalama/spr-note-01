export const ar = {
  title: 'التحكم في الميزات والوحدات',
  subtitle: 'نظام تقييم الأسبقية المكون من 4 مستويات (المستخدم > المجموعة > الدور > الافتراضي العام)',
  categoriesBadge: '{{count}} فئات',
  sectionsBadge: '{{count}} ميزات ووحدات',

  header: {
    title: 'التحكم في الميزات والوحدات',
    subtitle: 'قم بتهيئة إمكانية رؤية الميزات والوصول إلى الوحدات ونطاقات التجاوز عبر مؤسستك.',
    sectionsCount: 'الميزات والوحدات',
  },

  search: {
    placeholder: 'تصفية الميزات والوحدات حسب العنوان أو المفتاح...',
  },

  status: {
    unsavedNotice: 'لديك {{count}} من التغييرات غير المحفوظة في هذا النطاق. انقر فوق "حفظ التغييرات" لتطبيقها.',
  },

  tabs: {
    global: 'الإعدادات العامة',
    role: 'تجاوزات الأدوار',
    group: 'تجاوزات المجموعات',
    user: 'تجاوزات المستخدمين',
    audit: 'سجلات التدقيق',
  },

  actions: {
    saveChanges: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ...',
    forceApply: 'حفظ وتجاوز الكل',
    forceApplyTitle: 'حفظ الإعدادات الافتراضية وتجاوز جميع تخصيصات الأدوار والمستخدمين فوراً.',
    applying: 'جارٍ الحفظ وتجاوز الكل...',
    resetOverrides: 'إعادة تعيين تجاوزات النطاق',
    resetting: 'جارٍ إعادة التعيين...',
    refreshLogs: 'تحديث السجلات',
    searchPlaceholder: 'البحث عن مفاتيح الميزات أو العناوين أو الأوصاف...',
    collapse: 'طي الوحدات الفرعية',
    expand: 'توسيع الوحدات الفرعية',
  },

  targets: {
    targetRole: 'الدور المستهدف:',
    targetGroup: 'المجموعة المستهدفة:',
    targetUser: 'البحث عن المستخدم المستهدف:',
    userSearchPlaceholder: 'البحث عن المستخدم بالاسم أو الهاتف أو البريد الإلكتروني...',
    selectedUserId: 'معرف المستخدم المحدد: #{{id}}',
    allGroups: 'جميع المجموعات',
    noPhone: 'لا يوجد هاتف',
    noRolesFound: 'لم يتم العثور على أدوار',
    noUsersFound: 'لم يتم العثور على مستخدمين',
    globalScopeBadge: 'سياسة الأساس العامة',
    globalScopeDesc: 'الإعدادات الافتراضية الأساسية لجميع المستخدمين والأدوار في مؤسستك.',
  },

  badges: {
    parentModule: 'الوحدة الرئيسية',
    unsaved: 'غير محفوظ',
    disabledByParent: 'معطل بواسطة الوحدة الرئيسية',
    globalDefault: 'افتراضي عام',
    roleOverride: 'تجاوز الدور',
    groupOverride: 'تجاوز المجموعة',
    userOverride: 'تجاوز المستخدم',
    categoryKey: 'مفتاح الفئة: {{key}}',
    keyLabel: 'المفتاح: {{key}}',
    subModules: 'وحدات فرعية',
  },

  audit: {
    title: 'سجل تدقيق تغييرات الميزات والوحدات',
    loading: 'جارٍ تحميل سجلات التدقيق...',
    empty: 'لم يتم تسجيل أي تغييرات في التدقيق حتى الآن.',
    emptyTitle: 'لم يتم العثور على سجلات تدقيق',
    noSearchResults: 'لم تتطابق أي سجلات تدقيق مع معايير البحث أو التصفية.',
    timestamp: 'الوقت والتاريخ',
    changedBy: 'تم التغيير بواسطة',
    scope: 'النطاق',
    target: 'الهدف',
    sectionKey: 'مفتاح الميزة',
    change: 'التغيير',
    allScopes: 'جميع النطاقات',
    filterByScope: 'تصفية حسب النطاق',
    searchPlaceholder: 'ابحث في سجلات التدقيق حسب المستخدم أو مفتاح الميزة أو الهدف...',
    stateEnabled: 'مفعل',
    stateDisabled: 'معطل',
    stateUnset: 'افتراضي / غير محدد',
    globalBaseline: 'الأساس العام',
    systemUser: 'النظام',
    paginationItemLabel: 'سجلات',
  },

  empty: {
    noSections: 'لم يتم العثور على فئات أو قواعد ميزات للنطاق المحدد.',
    noSearchResults: 'لم تتطابق أي ميزات مع "{{query}}". جرب عبارة بحث مختلفة.',
    clearSearch: 'مسح البحث',
  },

  toasts: {
    noChanges: 'لا توجد تغييرات لحفظها.',
    saveSuccess: 'تم حفظ قواعد الميزات والوحدات بنجاح!',
    saveError: 'فشل حفظ تحديثات قواعد الميزات.',
    serverError: 'خطأ في تحديث القواعد على الخادم.',
    resetConfirm: 'هل تريد إعادة تعيين جميع تجاوزات {{scope}} لـ "{{target}}" إلى الإعدادات الافتراضية؟',
    resetSuccess: 'تمت إعادة تعيين تجاوزات {{scope}} إلى الافتراضي',
    resetError: 'فشل في إعادة تعيين التجاوزات',
    globalResetBlocked: 'لا يمكن إعادة تعيين الإعدادات العامة الافتراضية. عدّل الميزات بشكل منفصل.',
    forceApplyPrompt: 'قم بتبديل الميزات أولاً، ثم انقر هنا لتطبيقها إجبارياً على الجميع.',
    loadAuditError: 'فشل تحميل سجلات التدقيق',
  },
};
