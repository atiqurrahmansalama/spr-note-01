/**
 * SPR Note — Routine & Academic Period Store
 * ===========================================
 * Configurable Period Categories, Ordinal Period Sequences, and Attendance Flags.
 */

import { readJSON, writeJSON } from '../coreStore';
import type { PeriodCategory, PeriodSequence } from './types';

export const DEFAULT_PERIOD_CATEGORIES: PeriodCategory[] = [
  {
    id: 'TEACHING_PERIOD',
    code: 'TEACHING_PERIOD',
    name: 'Academic Teaching Period',
    badge: 'Teaching Period',
    description: 'Standard classroom lecture and syllabus teaching period',
    affects_class_attendance: true,
    is_active: true,
    order: 1,
  },
  {
    id: 'BREAK_TIFFIN',
    code: 'BREAK_TIFFIN',
    name: 'Break / Tiffin Interval',
    badge: 'Break / Tiffin',
    description: 'Food, meal, snacks, and tiffin recess interval',
    affects_class_attendance: false,
    is_active: true,
    order: 2,
  },
  {
    id: 'PRAYER_BREAK',
    code: 'PRAYER_BREAK',
    name: 'Salah / Prayer Break',
    badge: 'Prayer Break',
    description: 'Congregational prayer break for Zuhr, Asr, or Maghrib',
    affects_class_attendance: false,
    is_active: true,
    order: 3,
  },
  {
    id: 'MUTALA_SESSION',
    code: 'MUTALA_SESSION',
    name: 'Mutala / Self Study Session',
    badge: 'Mutala Session',
    description: 'Dedicated revision, memorization, and self-study session',
    affects_class_attendance: true,
    is_active: true,
    order: 4,
  },
];

export function getOrdinalPeriodLabel(numOrStr?: string | number | null): string {
  if (!numOrStr) return '1st Period';
  if (typeof numOrStr === 'string') {
    const trimmed = numOrStr.trim();
    if (/^\d+(st|nd|rd|th)\s+period$/i.test(trimmed)) {
      return trimmed;
    }
    // UUID / Hash protection: do NOT parse UUIDs as numbers!
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(trimmed) || trimmed.length > 20) {
      return '1st Period';
    }
    const match = trimmed.match(
      /^(?:period[_\-\s]*|slot[_\-\s]*|p)?(\d+)(?:st|nd|rd|th)?(?:\s*period)?$/i
    );
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      const suffix = s[(v - 20) % 10] || s[v] || s[0];
      return `${n}${suffix} Period`;
    }
    const anyMatch = trimmed.match(/\b(\d+)(?:st|nd|rd|th)?\b/);
    if (anyMatch && anyMatch[1]) {
      const n = parseInt(anyMatch[1], 10);
      if (n > 0 && n <= 50) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        const suffix = s[(v - 20) % 10] || s[v] || s[0];
        return `${n}${suffix} Period`;
      }
    }
  }
  const n = typeof numOrStr === 'number' ? numOrStr : parseInt(numOrStr, 10) || 1;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${n}${suffix} Period`;
}

export const DEFAULT_PERIOD_SEQUENCES: PeriodSequence[] = [
  { id: 'period_seq_1', name: '1st Period', code: 'PERIOD_1', badge: '1st Period', order: 1, description: 'First morning academic period', is_active: true },
  { id: 'period_seq_2', name: '2nd Period', code: 'PERIOD_2', badge: '2nd Period', order: 2, description: 'Second morning academic period', is_active: true },
  { id: 'period_seq_3', name: '3rd Period', code: 'PERIOD_3', badge: '3rd Period', order: 3, description: 'Third morning academic period', is_active: true },
  { id: 'period_seq_4', name: '4th Period', code: 'PERIOD_4', badge: '4th Period', order: 4, description: 'Fourth academic period / noon slot', is_active: true },
  { id: 'period_seq_5', name: '5th Period', code: 'PERIOD_5', badge: '5th Period', order: 5, description: 'Fifth academic period / post-noon slot', is_active: true },
  { id: 'period_seq_6', name: '6th Period', code: 'PERIOD_6', badge: '6th Period', order: 6, description: 'Sixth academic period / evening study slot', is_active: true },
  { id: 'period_seq_7', name: '7th Period', code: 'PERIOD_7', badge: '7th Period', order: 7, description: 'Seventh academic period', is_active: true },
  { id: 'period_seq_8', name: '8th Period', code: 'PERIOD_8', badge: '8th Period', order: 8, description: 'Eighth academic period', is_active: true },
  { id: 'period_seq_9', name: '9th Period', code: 'PERIOD_9', badge: '9th Period', order: 9, description: 'Ninth academic period', is_active: true },
  { id: 'period_seq_10', name: '10th Period', code: 'PERIOD_10', badge: '10th Period', order: 10, description: 'Tenth academic period', is_active: true },
  { id: 'period_seq_11', name: '11th Period', code: 'PERIOD_11', badge: '11th Period', order: 11, description: 'Eleventh academic period', is_active: true },
  { id: 'period_seq_12', name: '12th Period', code: 'PERIOD_12', badge: '12th Period', order: 12, description: 'Twelfth academic period', is_active: true },
];

export const periodCategoriesStore = {
  getCategories: (tenantId?: string | null): PeriodCategory[] => {
    const key = `spr_period_categories_${tenantId || 'default'}`;
    const stored = readJSON(key, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_PERIOD_CATEGORIES;
    }
    let hasChanges = false;
    const merged = stored.map((item: any) => {
      const def = DEFAULT_PERIOD_CATEGORIES.find((d) => d.id === item.id || d.code === item.code);
      if (def && item.affects_class_attendance === undefined) {
        hasChanges = true;
        return { ...item, affects_class_attendance: def.affects_class_attendance };
      }
      return item;
    });

    DEFAULT_PERIOD_CATEGORIES.forEach((def) => {
      const exists = merged.some((c) => c.id === def.id || c.code === def.code);
      if (!exists) {
        merged.push(def);
        hasChanges = true;
      }
    });
    if (hasChanges) {
      writeJSON(key, merged);
    }
    return merged;
  },

  saveCategories: (tenantId: string | null | undefined, categories: PeriodCategory[]): PeriodCategory[] => {
    const key = `spr_period_categories_${tenantId || 'default'}`;
    writeJSON(key, categories);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_period_categories_updated', { detail: categories }));
    }
    return categories;
  },

  addCategory: (tenantId: string | null | undefined, catData: Partial<PeriodCategory>): PeriodCategory => {
    const list = periodCategoriesStore.getCategories(tenantId);
    const code = (catData.code || catData.name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 30);
    const newCategory: PeriodCategory = {
      ...catData,
      id: catData.id || code || `cat_${Date.now()}`,
      code: code || `CAT_${Date.now()}`,
      name: catData.name || code,
      badge: catData.badge || catData.name || code,
      description: catData.description || '',
      affects_class_attendance:
        catData.affects_class_attendance !== undefined
          ? Boolean(catData.affects_class_attendance)
          : true,
      order: catData.order || list.length + 1,
      is_active: catData.is_active !== undefined ? catData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newCategory];
    periodCategoriesStore.saveCategories(tenantId, updated);
    return newCategory;
  },

  updateCategory: (
    tenantId: string | null | undefined,
    id: string,
    updatedData: Partial<PeriodCategory>
  ): PeriodCategory[] => {
    const list = periodCategoriesStore.getCategories(tenantId);
    const updated = list.map((c) =>
      c.id === id || c.code === id
        ? {
            ...c,
            ...updatedData,
            id: c.id,
            code: c.code,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    periodCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },

  deleteCategory: (tenantId: string | null | undefined, id: string): PeriodCategory[] => {
    const list = periodCategoriesStore.getCategories(tenantId);
    const updated = list.filter((c) => c.id !== id && c.code !== id);
    periodCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },

  isAttendanceTrackedForSlot: (tenantId: string | null | undefined, slotOrTypeCode: any): boolean => {
    if (!slotOrTypeCode) return true;
    const typeCode =
      typeof slotOrTypeCode === 'string'
        ? slotOrTypeCode
        : slotOrTypeCode.slot_type || slotOrTypeCode.code || slotOrTypeCode.id;
    const categories = periodCategoriesStore.getCategories(tenantId);
    const found = categories.find((c) => c.code === typeCode || c.id === typeCode);
    if (found) {
      return found.affects_class_attendance !== false;
    }
    if (typeCode === 'BREAK_TIFFIN' || typeCode === 'PRAYER_BREAK') {
      return false;
    }
    return true;
  },

  getAttendanceTrackedCategoryCodes: (tenantId?: string | null): string[] => {
    const categories = periodCategoriesStore.getCategories(tenantId);
    return categories
      .filter((c) => c.affects_class_attendance !== false)
      .map((c) => c.code || c.id);
  },
};

export const periodSequencesStore = {
  getSequences: (tenantId?: string | null): PeriodSequence[] => {
    const key = `spr_period_sequences_${tenantId || 'default'}`;
    const stored = readJSON(key, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      writeJSON(key, DEFAULT_PERIOD_SEQUENCES);
      return DEFAULT_PERIOD_SEQUENCES;
    }
    return stored.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },

  saveSequences: (tenantId: string | null | undefined, sequences: PeriodSequence[]): PeriodSequence[] => {
    const key = `spr_period_sequences_${tenantId || 'default'}`;
    const safe = Array.isArray(sequences) ? sequences : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_period_sequences_updated', { detail: safe }));
    }
    return safe;
  },

  addSequence: (tenantId: string | null | undefined, seqData: Partial<PeriodSequence>): PeriodSequence => {
    const list = periodSequencesStore.getSequences(tenantId);
    const orderNum = parseInt(String(seqData.order), 10) || list.length + 1;
    const ordinal = getOrdinalPeriodLabel(orderNum);
    const label = seqData.name || seqData.badge || ordinal;
    const newSeq: PeriodSequence = {
      ...seqData,
      id: seqData.id || `period_seq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: orderNum,
      name: label,
      badge: seqData.badge || label,
      code: (seqData.code || `PERIOD_${orderNum}`)
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '_')
        .slice(0, 30),
      description: seqData.description || '',
      is_active: seqData.is_active !== undefined ? Boolean(seqData.is_active) : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newSeq].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    periodSequencesStore.saveSequences(tenantId, updated);
    return newSeq;
  },

  updateSequence: (
    tenantId: string | null | undefined,
    id: string | number,
    updatedData: Partial<PeriodSequence>
  ): PeriodSequence[] => {
    const list = periodSequencesStore.getSequences(tenantId);
    const updated = list
      .map((s) =>
        s.id === id || s.code === id || String(s.order) === String(id)
          ? {
              ...s,
              ...updatedData,
              order:
                updatedData.order !== undefined
                  ? parseInt(String(updatedData.order), 10) || s.order
                  : s.order,
              name: updatedData.name || s.name,
              badge: updatedData.badge || updatedData.name || s.badge,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
      .sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    periodSequencesStore.saveSequences(tenantId, updated);
    return updated;
  },

  deleteSequence: (tenantId: string | null | undefined, id: string | number): PeriodSequence[] => {
    const list = periodSequencesStore.getSequences(tenantId);
    const updated = list.filter(
      (s) => s.id !== id && s.code !== id && String(s.order) !== String(id)
    );
    periodSequencesStore.saveSequences(tenantId, updated);
    return updated;
  },

  getOptions: (
    tenantId?: string | null
  ): Array<{ value: string; label: string; description: string; order: number }> => {
    const list = periodSequencesStore.getSequences(tenantId);
    return list
      .filter((s) => s.is_active !== false)
      .map((s) => ({
        value: String(s.order),
        label: s.name || s.badge || getOrdinalPeriodLabel(s.order),
        description: s.description || '',
        order: s.order,
      }));
  },

  getLabelForOrder: (tenantId: string | null | undefined, orderNum: string | number): string => {
    const list = periodSequencesStore.getSequences(tenantId);
    const found = list.find(
      (s) => String(s.order) === String(orderNum) || s.id === orderNum || s.code === orderNum
    );
    return found ? found.name || found.badge : getOrdinalPeriodLabel(orderNum);
  },
};
