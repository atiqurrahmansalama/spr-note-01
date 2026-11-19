import { KeyCategory, KeyTaxonomyItem, CustomKeyDefinition } from './types';

const CUSTOM_KEYS_STORAGE_KEY = 'spr_custom_print_keys_v1';

/**
 * Enterprise Category Metadata Dictionary
 * Translates raw schema category slugs into clean, human-readable titles and descriptions.
 */
export const KEY_CATEGORY_METADATA: Record<KeyCategory | string, { label: string; description: string }> = {
  student: {
    label: 'Student Information',
    description: 'Name, Roll, ID, Photo, DOB, Blood Group & Profile',
  },
  academic: {
    label: 'Academic & Classroom',
    description: 'Class, Section, Department, Session, Teacher & Shift',
  },
  exam: {
    label: 'Examination & Evaluation',
    description: 'Exam Title, Marks, Grade, GPA, Merit Position & Summary',
  },
  guardian: {
    label: 'Guardian & Contacts',
    description: 'Father Name, Mother Name, Guardian Phone & Emergency Contact',
  },
  hifz: {
    label: 'Quran & Hifz Progress',
    description: 'Current Juz, Surah, Sabaq Pages, Sabqi & Manzil',
  },
  finance: {
    label: 'Financial & Vouchers',
    description: 'Fee Voucher, Amount, Due Date, Payment Status & Salary',
  },
  staff: {
    label: 'Staff & Human Resources',
    description: 'Staff Name, Designation, Employee ID & Joining Date',
  },
  institution: {
    label: 'Institutional Branding',
    description: 'Institution Name, Logo, Address, Contact & Tagline',
  },
  system: {
    label: 'System & Verification',
    description: 'Issue Date, Print Time, Serial No & QR Code',
  },
  signatures: {
    label: 'Signatures & Authorities',
    description: 'Principal, Controller, and Official Seal Lines',
  },
  subjects: {
    label: 'Subject Routine & Schedules',
    description: 'Subject Names, Codes, Timings & Exam Dates',
  },
  grading_scale: {
    label: 'Grading Scale & Policies',
    description: 'Mark boundaries, letter grades, and GPA scale matrix',
  },
  custom: {
    label: 'Custom Variables',
    description: 'User-defined dynamic template parameters',
  },
  general: {
    label: 'General Variables',
    description: 'Universal document variables and data fields',
  },
};

/**
 * Dynamically builds a rich KeyTaxonomyItem from raw key name or schema definition
 */
export function createDynamicKeyItem(
  key: string,
  label?: string,
  category: KeyCategory = 'general',
  example: string = '',
  description?: string
): KeyTaxonomyItem {
  const cleanKey = key.replace(/[{}]/g, '').trim();
  const humanLabel =
    label ||
    cleanKey
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    key: cleanKey,
    label: humanLabel,
    category,
    example: example || `[${humanLabel}]`,
    description: description || `Dynamic ${category} document variable`,
  };
}

/**
 * Retrieves all user-created custom keys from localStorage
 */
export function getCustomUserKeys(): CustomKeyDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load custom user keys', e);
  }
  return [];
}

/**
 * Saves a new custom key
 */
export function saveCustomUserKey(item: {
  key: string;
  label: string;
  defaultValue?: string;
  category?: KeyCategory;
}): CustomKeyDefinition[] {
  const cleanKey = item.key
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleanKey) return getCustomUserKeys();

  const current = getCustomUserKeys();
  const existingIdx = current.findIndex((k) => k.key === cleanKey);
  const updatedItem: CustomKeyDefinition = {
    key: cleanKey,
    label: item.label || cleanKey,
    defaultValue: item.defaultValue || '',
    category: item.category || 'custom',
    createdAt: new Date().toISOString(),
  };

  let nextList: CustomKeyDefinition[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = updatedItem;
  } else {
    nextList = [...current, updatedItem];
  }

  try {
    localStorage.setItem(CUSTOM_KEYS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error('Failed to save custom key', e);
  }

  return nextList;
}

/**
 * Deletes a custom key
 */
export function deleteCustomUserKey(key: string): CustomKeyDefinition[] {
  const current = getCustomUserKeys();
  const nextList = current.filter((k) => k.key !== key);
  try {
    localStorage.setItem(CUSTOM_KEYS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error('Failed to delete custom key', e);
  }
  return nextList;
}

/**
 * Returns dynamic custom user keys
 */
export function getAllTaxonomyKeys(): KeyTaxonomyItem[] {
  return getCustomUserKeys().map((c) => ({
    key: c.key,
    label: c.label,
    category: (c.category || 'custom') as KeyCategory,
    example: c.defaultValue || '[Custom Value]',
    description: 'Custom institution-defined key',
    isCustom: true,
  }));
}

/**
 * Formats a key identifier into template placeholder format: `{{key}}`
 */
export function formatPlaceholderToken(key: string): string {
  const clean = key.replace(/[{}]/g, '').trim();
  return `{{${clean}}}`;
}
