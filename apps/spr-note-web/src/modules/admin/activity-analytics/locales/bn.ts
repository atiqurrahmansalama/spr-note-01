export const bn = {
  title: 'অ্যাক্টিভিটি ও সেশন অ্যানালিটিক্স',
  subtitle: 'ব্যবহারকারীদের সক্রিয়তা, ডিভাইস সেশন, ব্যবহারের সময়কাল এবং সিকিউরিটি অডিট লগ পর্যবেক্ষণ করুন',
  totalTrackedBadge: '{{count}} টি অ্যাকাউন্ট ট্র্যাকড',
  refresh: 'মেট্রিক্স রিফ্রেশ করুন',

  metrics: {
    totalUsers: 'মোট ব্যবহারকারী',
    totalActiveTime: 'সর্বমোট সক্রিয় সময়',
    avgSession: 'গড় সেশন সময়কাল',
    activeSessions: 'বর্তমান সক্রিয় সেশন',
  },

  filters: {
    searchPlaceholder: 'নাম, ফোন অথবা ভূমিকা দিয়ে অনুসন্ধান করুন...',
    allRoles: 'সকল ভূমিকা',
    allDevices: 'সকল ডিভাইস',
    deviceWeb: 'ওয়েব ব্রাউজার',
    deviceAndroid: 'অ্যান্ড্রয়েড অ্যাপ',
    deviceIos: 'আইওএস অ্যাপ',
    presetToday: 'আজকে',
    preset7d: 'বিগত ৭ দিন',
    preset30d: 'বিগত ৩০ দিন',
    presetAll: 'সর্বকালীন',
    presetCustom: 'নির্দিষ্ট সময়কাল',
    fromDate: 'শুরুর তারিখ',
    toDate: 'শেষের তারিখ',
    role: 'ভূমিকা',
    device: 'ডিভাইস',
    timeHorizon: 'সময়কাল',
    searchLabel: 'অনুসন্ধান',
    dateRange: 'তারিখের পরিসীমা',
    selectDateRange: 'তারিখ নির্বাচন করুন...',
  },

  table: {
    user: 'ব্যবহারকারী ও পরিচয়',
    sessions: 'সেশন সংখ্যা',
    duration: 'সক্রিয় সময়কাল',
    lastActive: 'সর্বশেষ সক্রিয়',
    actions: 'পদক্ষেপ',
    inspect: 'অ্যাক্টিভিটি ও লগ পর্যবেক্ষণ',
    live: 'বর্তমানে অ্যাপে সক্রিয়',
    mins: '{{count}} মিনিট',
  },

  drawer: {
    title: 'ব্যবহারকারী সক্রিয়তা ও অডিট বিবরণ: {{name}}',
    category: 'অ্যাক্টিভিটি অ্যানালিটিক্স',
    tabSessions: 'সেশন উইন্ডো ({{count}})',
    tabLogs: 'অডিট অ্যাকশন লগ ({{count}})',
    device: 'ডিভাইস ও প্ল্যাটফর্ম',
    ip: 'আইপি অ্যাড্রেস',
    loginTime: 'লগইন সময়',
    logoutTime: 'লগআউট / সমাপ্তি',
    duration: 'সময়কাল',
    statusActive: 'চলমান সেশন',
    statusClosed: 'সমাপ্ত',
    action: 'অ্যাকশন',
    endpoint: 'এপিআই এন্ডপয়েন্ট',
    method: 'মেথড',
    timestamp: 'টাইমস্ট্যাম্প',
    noSessions: 'এই ব্যবহারকারীর জন্য কোনো সেশন তথ্য পাওয়া যায়নি।',
    noLogs: 'এই ব্যবহারকারীর কোনো অডিট লগ নেই।',
    close: 'বন্ধ করুন',
  },

  empty: {
    title: 'কোনো সক্রিয়তার রেকর্ড পাওয়া যায়নি',
    filtered: 'ফিল্টারের সাথে মিলে এমন কোনো সক্রিয়তা পাওয়া যায়নি। ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।',
    default: 'সিস্টেমে এখনও কোনো ব্যবহারকারীর সেশন বা সক্রিয়তা রেকর্ড হয়নি।',
  },

  export: {
    exportCsv: 'সিএসভি এক্সপোর্ট',
    exportSuccess: 'অ্যাক্টিভিটি রিপোর্ট সফলভাবে এক্সপোর্ট হয়েছে।',
  },

  toasts: {
    loadError: 'অ্যাক্টিভিটি অ্যানালিটিক্স ডেটা লোড করতে ব্যর্থ হয়েছে।',
  },
};

export default bn;
