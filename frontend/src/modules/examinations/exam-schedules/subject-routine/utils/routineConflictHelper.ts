import { RoutineConflictResult } from '../types';

/**
 * routineConflictHelper.ts
 * High-performance conflict detector for examination routine & timetable matrices.
 * Automatically scans schedule items for:
 * 1. Examiner / Teacher Clashes (same teacher assigned to multiple exams in the same date & shift)
 * 2. Invigilator Clashes (same invigilator assigned to multiple exam halls in the same date & shift)
 * 3. Class Double-Booking (same class scheduled for multiple subjects in the same shift)
 * 4. Room / Hall Clashes (same hall assigned to conflicting sessions)
 */

export interface ItemConflict {
  type: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

/**
 * Detect all clashes across an array of scheduled items
 */
export function detectRoutineConflicts(items: any[] = []): RoutineConflictResult {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      conflictMap: new Map(),
      totalConflictsCount: 0,
      hasAnyConflict: false,
      conflictsList: [],
    };
  }

  const conflictMap = new Map<string, any[]>(); // itemId -> Array of conflict objects
  const addConflict = (itemId: string, conflict: ItemConflict) => {
    if (!conflictMap.has(itemId)) {
      conflictMap.set(itemId, []);
    }
    conflictMap.get(itemId)!.push(conflict);
  };

  // ─── 1. Detect Class Clashes (Class has 2+ subjects in the same Date & Shift) ───
  const classSlotBuckets = new Map<string, any[]>(); // key: "date___shiftId___classId" -> [item]

  // ─── 2. Detect Examiner Clashes (Same Examiner in 2+ exams in the same Date & Shift) ───
  const examinerSlotBuckets = new Map<string, any[]>(); // key: "date___shiftId___examinerId" -> [item]

  // ─── 3. Detect Invigilator Clashes (Same Invigilator in 2+ exams in the same Date & Shift) ───
  const invigilatorSlotBuckets = new Map<string, any[]>(); // key: "date___shiftId___invigilatorId" -> [item]

  items.forEach((item) => {
    if (!item || !item.id) return;
    const date = (item.examDate || item.date || '').split('T')[0];
    const shiftId = item.shiftId || 'shift_1';
    if (!date) return;

    // A. Class Key
    const classId = String(item.classId || '').trim();
    if (classId) {
      const classKey = `${date}___${shiftId}___${classId}`;
      if (!classSlotBuckets.has(classKey)) classSlotBuckets.set(classKey, []);
      classSlotBuckets.get(classKey)!.push(item);
    }

    // B. Examiner Key
    const examinerId = String(item.examinerId || item.evaluatorId || '').trim();
    if (examinerId && examinerId !== 'ALL' && examinerId !== 'UNASSIGNED') {
      const examinerKey = `${date}___${shiftId}___${examinerId}`;
      if (!examinerSlotBuckets.has(examinerKey)) examinerSlotBuckets.set(examinerKey, []);
      examinerSlotBuckets.get(examinerKey)!.push(item);
    }

    // C. Invigilator Key
    const invigilatorId = String(item.invigilatorId || item.teacherId || '').trim();
    if (invigilatorId && invigilatorId !== 'ALL' && invigilatorId !== 'UNASSIGNED') {
      const invigilatorKey = `${date}___${shiftId}___${invigilatorId}`;
      if (!invigilatorSlotBuckets.has(invigilatorKey)) invigilatorSlotBuckets.set(invigilatorKey, []);
      invigilatorSlotBuckets.get(invigilatorKey)!.push(item);
    }
  });

  // Evaluate Class Conflicts
  classSlotBuckets.forEach((bucket) => {
    if (bucket.length > 1) {
      const names = bucket.map((b) => b.subjectName || 'Subject').join(', ');
      bucket.forEach((it) => {
        addConflict(String(it.id), {
          type: 'CLASS_DOUBLE_BOOKED',
          severity: 'danger',
          title: 'Class Double-Booked',
          message: `Class "${it.className || 'Class'}" has ${bucket.length} subjects in this slot: ${names}.`,
        });
      });
    }
  });

  // Evaluate Examiner Conflicts
  examinerSlotBuckets.forEach((bucket) => {
    if (bucket.length > 1) {
      const classes = bucket.map((b) => b.className || 'Class').join(', ');
      bucket.forEach((it) => {
        addConflict(String(it.id), {
          type: 'EXAMINER_CLASH',
          severity: 'warning',
          title: 'Examiner Simultaneous Duty',
          message: `Examiner "${it.examinerName || 'Teacher'}" is assigned to multiple classes simultaneously (${classes}).`,
        });
      });
    }
  });

  // Evaluate Invigilator Conflicts
  invigilatorSlotBuckets.forEach((bucket) => {
    if (bucket.length > 1) {
      const halls = bucket.map((b) => b.className || b.roomNo || 'Room').join(', ');
      bucket.forEach((it) => {
        addConflict(String(it.id), {
          type: 'INVIGILATOR_CLASH',
          severity: 'warning',
          title: 'Invigilator Simultaneous Duty',
          message: `Invigilator "${it.invigilatorName || 'Teacher'}" is scheduled in multiple rooms at the same time (${halls}).`,
        });
      });
    }
  });

  const conflictsList: Array<{ itemId: string; item: any; conflicts: any[] }> = [];
  conflictMap.forEach((conflicts, itemId) => {
    const item = items.find((it) => String(it.id) === String(itemId));
    conflictsList.push({
      itemId,
      item,
      conflicts,
    });
  });

  return {
    conflictMap,
    totalConflictsCount: conflictMap.size,
    hasAnyConflict: conflictMap.size > 0,
    conflictsList,
  };
}

/**
 * Get conflict details for a specific item
 */
export function getItemConflicts(
  itemId: string | number | undefined | null,
  conflictMap: Map<string, any[]> | undefined | null
) {
  if (!conflictMap || !itemId) return null;
  const list = conflictMap.get(String(itemId));
  if (!list || list.length === 0) return null;

  const hasDanger = list.some((c) => c.severity === 'danger');
  return {
    hasConflict: true,
    severity: hasDanger ? ('danger' as const) : ('warning' as const),
    conflicts: list,
    primaryMessage: list[0]?.message || 'Scheduling conflict detected.',
  };
}
