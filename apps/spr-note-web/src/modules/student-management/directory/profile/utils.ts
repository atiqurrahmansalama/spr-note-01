export const isImageFile = (url: string = '', title: string = ''): boolean => {
  const clean = `${title} ${url}`.toLowerCase();
  return (
    /\.(jpg|jpeg|png|svg|webp|gif|bmp|jfif|heic)(\?|$)/i.test(clean) ||
    clean.includes('image/')
  );
};

export const isPdfFile = (url: string = '', title: string = ''): boolean => {
  const clean = `${title} ${url}`.toLowerCase();
  return /\.pdf(\?|$)/i.test(clean);
};

export const isOfficeFile = (url: string = '', title: string = ''): boolean => {
  const clean = `${title} ${url}`.toLowerCase();
  return /\.(doc|docx|xls|xlsx|csv|ppt|pptx)(\?|$)/i.test(clean);
};

export const getDocUrl = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  const clean = rawUrl
    .replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i, '')
    .trim();
  return clean.startsWith('/') ? clean : `/${clean}`;
};

export const calculateAge = (dobString?: string): string | number => {
  if (!dobString) return '--';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '--';
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const getDocExtension = (fileUrl: string = '', title: string = ''): string => {
  const fromTitle = title?.split('.').pop()?.toLowerCase();
  const fromUrl = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase();
  return fromTitle || fromUrl || 'file';
};

export interface SubjectModule {
  code: string;
  name: string;
  type: string;
}

export const getClassSubjects = (className: string = '', departmentType: string = ''): SubjectModule[] => {
  const clean = `${className} ${departmentType}`.toLowerCase();
  if (clean.includes('hifz') || clean.includes('quran') || clean.includes('juz') || clean.includes('para')) {
    return [
      { code: 'HIFZ', name: 'Hifzul Quran', type: 'Core' },
      { code: 'TAJW', name: 'Tajweed & Makhraj', type: 'Recitation' },
      { code: 'DOUR', name: 'Daily Sabaq & Dour', type: 'Revision' },
      { code: 'TAFS', name: 'Surah Meaning & Duas', type: 'Islamic' },
      { code: 'ADAB', name: 'Akhlaq & Islamic Manners', type: 'Character' },
    ];
  }
  if (clean.includes('nazera') || clean.includes('noorani') || clean.includes('play') || clean.includes('kg') || clean.includes('nursery')) {
    return [
      { code: 'NOOR', name: 'Noorani Qaida & Haroof', type: 'Foundation' },
      { code: 'NAZR', name: 'Quran Nazera Reading', type: 'Reading' },
      { code: 'MASL', name: 'Essential Masail & Namaz', type: 'Practical' },
      { code: 'LANG', name: 'Language & Alphabets', type: 'Language' },
      { code: 'MATH', name: 'Basic Numeracy & Count', type: 'Numeracy' },
    ];
  }
  return [
    { code: 'GEN', name: 'General Islamic Studies', type: 'Core' },
    { code: 'LANG', name: 'Language & Literature', type: 'Language' },
    { code: 'MATH', name: 'Mathematics & Science', type: 'General' },
    { code: 'ETHIC', name: 'Moral Ethics & Tarbiyah', type: 'Character' },
  ];
};
