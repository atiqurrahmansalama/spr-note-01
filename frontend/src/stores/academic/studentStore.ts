/**
 * SPR Note — Students Store
 * ==========================
 * Client-side cached student directory and offline merge resolver.
 */

import { KEYS, readJSON, writeJSON } from '../coreStore';
import type { StudentItem } from './types';

export const students = {
  getAll: (): StudentItem[] => readJSON(KEYS.STUDENTS, []),

  saveAll: (list: StudentItem[]): StudentItem[] => {
    writeJSON(KEYS.STUDENTS, list);
    return list;
  },

  /** Add new student (with unique ID support). */
  add: (student: string | Partial<StudentItem>): StudentItem[] => {
    const list = students.getAll();
    const newId =
      (typeof student === 'object' && student?.id) ||
      `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const studentSub =
      typeof student === 'object' && typeof student?.sub === 'string'
        ? student.sub
        : typeof student === 'object' && (student?.group || student?.group_name)
        ? String(student.group || student.group_name)
        : '';

    const newStudentItem: StudentItem = {
      id: newId,
      label:
        typeof student === 'object'
          ? student.label || student.name || ''
          : String(student || ''),
      sub: studentSub,
      _local: true,
      ...(typeof student === 'object' ? student : {}),
    };

    const isExactDuplicate = list.some((s) => s.id && s.id === newId);

    if (!isExactDuplicate) {
      const updated = [...list, newStudentItem];
      writeJSON(KEYS.STUDENTS, updated);
      return updated;
    }
    return list;
  },

  /** Remove student by ID, uniq_id, or predicate function. */
  remove: (idOrPredicate: string | number | ((s: StudentItem) => boolean)): StudentItem[] => {
    const list = students.getAll();
    const updated = list.filter((s) => {
      if (typeof idOrPredicate === 'function') return !idOrPredicate(s);
      const targetStr = String(idOrPredicate).trim().toLowerCase();
      const sId = s.id != null ? String(s.id).trim().toLowerCase() : '';
      const sUniq = s.uniq_id != null ? String(s.uniq_id).trim().toLowerCase() : '';
      return sId !== targetStr && sUniq !== targetStr;
    });
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  delete: (idOrPredicate: string | number | ((s: StudentItem) => boolean)): StudentItem[] =>
    students.remove(idOrPredicate),

  /** Update student by label (replace mode). */
  replace: (oldLabel: string, newStudent: Partial<StudentItem>): StudentItem[] => {
    const list = students.getAll();
    const updated = list.map((s) =>
      s.label?.toLowerCase() === oldLabel?.toLowerCase() ? { ...s, ...newStudent } : s
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Update group name across all associated students. */
  updateGroupName: (oldGroupName: string, newGroupName: string): StudentItem[] => {
    const list = students.getAll();
    const targetOld = String(oldGroupName || '').toLowerCase();
    const updated = list.map((s) => {
      const currentSub =
        typeof s?.sub === 'string' ? s.sub : typeof s?.group === 'string' ? s.group : '';
      if (currentSub.toLowerCase() === targetOld) {
        return { ...s, sub: String(newGroupName || ''), _local: true };
      }
      return s;
    });
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Remove all students in a specified group. */
  removeGroup: (groupName: string): StudentItem[] => {
    const list = students.getAll();
    const targetGroup = String(groupName || '').toLowerCase();
    const updated = list.filter((s) => {
      const currentSub =
        typeof s?.sub === 'string' ? s.sub : typeof s?.group === 'string' ? s.group : '';
      return currentSub.toLowerCase() !== targetGroup;
    });
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Update student by ID or label (merge mode). */
  update: (identifier: string, updatedFields: Partial<StudentItem>): StudentItem[] => {
    const list = students.getAll();
    const targetId = String(identifier || '').trim();
    let found = false;
    const updated = list.map((s) => {
      if (s.id && String(s.id) === targetId) {
        found = true;
        return { ...s, ...updatedFields, id: s.id };
      }
      return s;
    });
    if (!found && (updatedFields?.label || updatedFields?.name)) {
      const targetLabel = String(updatedFields.label || updatedFields.name).trim().toLowerCase();
      const byLabel = list.map((s) => {
        if (s.label && s.label.trim().toLowerCase() === targetLabel) {
          found = true;
          return { ...s, ...updatedFields, id: s.id || identifier };
        }
        return s;
      });
      if (found) {
        writeJSON(KEYS.STUDENTS, byLabel);
        return byLabel;
      }
    }
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },
};

/**
 * mergeStudents — Merges API data with LocalStorage data deterministically.
 */
export function mergeStudents(
  apiStudents: any[],
  localStudents: StudentItem[]
): StudentItem[] {
  const apiList: StudentItem[] = (Array.isArray(apiStudents) ? apiStudents : []).map((s) => {
    const subVal =
      typeof s === 'object' && typeof s?.sub === 'string'
        ? s.sub
        : typeof s === 'object' && (s?.section_name || s?.student_section_name || s?.group_name || s?.group)
        ? String(s.section_name || s.student_section_name || s.group_name || s.group)
        : '';

    return {
      ...(typeof s === 'object' ? s : {}),
      id: typeof s === 'object' ? s?.id ?? null : null,
      label:
        typeof s === 'object'
          ? s?.label || s?.name_en || s?.name || s?.student_name || ''
          : String(s || ''),
      name: typeof s === 'object' ? s?.name || s?.name_en || s?.label || '' : String(s || ''),
      name_en: typeof s === 'object' ? s?.name_en || s?.name || s?.label || '' : String(s || ''),
      sub: subVal,
      group_name: subVal,
    };
  });

  const apiIds = new Set(
    apiList.map((s) => String(s.id)).filter((id) => id && id !== 'null' && id !== 'undefined')
  );

  const localOnly = (Array.isArray(localStudents) ? localStudents : [])
    .filter((s) => {
      if (!s || (!s.label && !s.name)) return false;
      const sId = s.id ? String(s.id) : null;
      if (sId && apiIds.has(sId)) return false;
      return Boolean(s._local);
    })
    .map((s) => ({ ...s, _local: true }));

  const seenKeys = new Set<string>();
  const merged: StudentItem[] = [];

  for (const s of [...apiList, ...localOnly]) {
    const sSub = typeof s?.sub === 'string' ? s.sub : '';
    const key = s.id
      ? `id_${s.id}`
      : `local_${(s.label || s.name || '').trim().toLowerCase()}_${sSub.trim().toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push({ ...s, sub: sSub });
    }
  }

  writeJSON(KEYS.STUDENTS, merged);
  return merged;
}
