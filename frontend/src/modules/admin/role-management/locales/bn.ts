export const bn = {
  title: 'ভূমিকা ও অ্যাক্সেস নিয়ন্ত্রণ',
  subtitle: 'প্রতিষ্ঠানের ভূমিকা তৈরি ও পরিচালনা করুন; সমস্ত অনুমতি ফিচার ও মডিউল কন্ট্রোল থেকে নির্ধারণ করুন',
  totalRolesBadge: '{{count}} মোট ভূমিকা',

  // Metrics
  metrics: {
    totalRoles: 'মোট ভূমিকা',
    systemRoles: 'সিস্টেম ভূমিকা',
    customRoles: 'কাস্টম ভূমিকা',
    assignedUsers: 'নির্ধারিত ব্যবহারকারী',
  },

  // Search & Filter
  searchPlaceholder: 'নাম, কোড অথবা বিবরণ দিয়ে ভূমিকা খুঁজুন...',
  allTypes: 'সকল ভূমিকার ধরন',
  typeSystem: 'সিস্টেম সুরক্ষিত',
  typeCustom: 'কাস্টম ভূমিকা',

  // Columns & Labels
  roleName: 'ভূমিকার নাম',
  roleCode: 'ভূমিকা কোড',
  assignedUsers: 'ব্যবহারকারী',
  protection: 'স্ট্যাটাস',
  protected: 'সুরক্ষিত',
  configurable: 'পরিবর্তনযোগ্য',
  googleDefault: 'গুগল ডিফল্ট',
  actions: 'পদক্ষেপ',
  featureControlNotice:
    'এই ভূমিকার সকল মডিউল, পেজ এবং ড্যাশবোর্ড উইজেটের অনুমতি অ্যাপ ম্যানেজমেন্টের ফিচার ও মডিউল কন্ট্রোল থেকে এককভাবে পরিচালিত হয়।',
  manageInFeatureControl: 'ফিচার কন্ট্রোলে অ্যাক্সেস নির্ধারণ করুন',

  // Action Buttons
  createRole: 'ভূমিকা তৈরি করুন',
  createRoleSubtitle: 'প্রতিষ্ঠানিক অ্যাক্সেসের জন্য একটি নতুন কাস্টম ভূমিকা সংজ্ঞায়িত করুন',
  editRole: 'ভূমিকা সম্পাদনা',
  cloneRole: 'ভূমিকা ক্লোন করুন',
  deleteRole: 'ভূমিকা মুছুন',
  viewDetails: 'বিস্তারিত দেখুন',
  setGoogleDefault: 'গুগল ডিফল্ট নির্ধারণ করুন',
  exportCsv: 'সিএসভি এক্সপোর্ট',

  // Drawers & Form
  drawers: {
    createTitle: 'কাস্টম ভূমিকা তৈরি করুন',
    editTitle: 'ভূমিকা সম্পাদনা: {{name}}',
    detailsTitle: 'ভূমিকা প্রোফাইল: {{name}}',
    basicInfoSection: 'মৌলিক তথ্য',
    featureControlSection: 'ফিচার ও মডিউল কন্ট্রোল',
  },

  // Form Fields
  fields: {
    name: 'ভূমিকা প্রদর্শনী নাম',
    namePlaceholder: 'যেমন: সিনিয়র উস্তাদ',
    code: 'অনন্য ভূমিকা কোড',
    codePlaceholder: 'যেমন: SENIOR_USTADH',
    description: 'ভূমিকার বিবরণ',
    descriptionPlaceholder: 'এই ভূমিকার কর্মক্ষেত্রের সংক্ষিপ্ত বিবরণ লিখুন...',
  },

  // Modals
  deleteModal: {
    title: 'ভূমিকা মুছুন',
    warningTitle: 'সতর্কতা: ভূমিকা মুছে ফেলা হচ্ছে',
    warningMessage: 'আপনি কি নিশ্চিত যে "{{name}}" ভূমিকাটি মুছে ফেলতে চান? এই পদক্ষেপটি পূর্বাবস্থায় ফেরানো যাবে না।',
    assignedWarning: 'এই ভূমিকাটি বর্তমানে {{count}} জন সক্রিয় ব্যবহারকারীর সাথে যুক্ত এবং এটি মুছে ফেলা যাবে না।',
    confirmButton: 'মুছে ফেলা নিশ্চিত করুন',
    deleting: 'মুছে ফেলা হচ্ছে...',
    cancel: 'বাতিল',
  },

  // Empty State & Fallbacks
  empty: {
    title: 'কোনো ভূমিকা পাওয়া যায়নি',
    filteredMessage: 'আপনার সার্চ বা ফিল্টারের সাথে কোনো ভূমিকা মেলেনি। ফিল্টার পরিবর্তন করে চেষ্টা করুন।',
    defaultMessage: 'কোনো কাস্টম ভূমিকা সংজ্ঞায়িত নেই। আপনার প্রতিষ্ঠানের জন্য নতুন ভূমিকা তৈরি করুন।',
  },

  // Toasts
  toasts: {
    roleCreated: '"{{name}}" ভূমিকা সফলভাবে তৈরি হয়েছে!',
    roleUpdated: '"{{name}}" ভূমিকা সফলভাবে হালনাগাদ হয়েছে!',
    roleCloned: '"{{name}}" নামে ভূমিকা সফলভাবে ক্লোন হয়েছে!',
    roleDeleted: '"{{name}}" ভূমিকা সফলভাবে মুছে ফেলা হয়েছে!',
    cannotDeleteSystem: 'সিস্টেম সুরক্ষিত ভূমিকা মুছে ফেলা যাবে না।',
    cannotDeleteAssigned: 'সক্রিয় ব্যবহারকারী যুক্ত থাকা ভূমিকা মুছে ফেলা যাবে না।',
    googleDefaultUpdated: 'ডিফল্ট গুগল ভূমিকা "{{name}}" হিসেবে হালনাগাদ হয়েছে।',
    loadError: 'সার্ভার থেকে ভূমিকা লোড করতে ব্যর্থ হয়েছে।',
    validationError: 'দয়া করে প্রয়োজনীয় সকল ফিল্ড পূরণ করুন।',
    codeExists: '"{{code}}" কোডের ভূমিকা ইতিপূর্বে বিদ্যমান। অন্য কোড দিন।',
    exportSuccess: 'ভূমিকা সফলভাবে এক্সপোর্ট হয়েছে।',
  },
};

export default bn;
