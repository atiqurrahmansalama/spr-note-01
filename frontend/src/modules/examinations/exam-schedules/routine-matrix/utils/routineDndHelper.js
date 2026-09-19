/**
 * routineDndHelper.js
 * Enterprise Reusable Drag-and-Drop Scope & Granular Attribute Transfer Ecosystem.
 *
 * Supported DND Scopes:
 * - ALL: Complete routine slot (Subject, Teacher, Room, Marks, Components, etc.)
 * - TEACHER: Examiner, Invigilator, Evaluator and Teacher assignments only
 * - ROOM: Exam Hall, Room Number and Seating layout only
 * - SUBJECT: Curriculum Book, Subject Name, Subject Code, Full Marks, Pass Marks and Components
 *
 * Supported Actions:
 * - MOVE: Transfer item or attribute from source to target (source gets cleared / moved)
 * - SWAP: Atomically swap target attribute/card with source
 * - COPY (Ctrl/Alt/Meta held): Clone attribute/card into target without clearing source
 */

import { LENS_MODES } from '../../../../../components/common/TimetableMatrixGrid/TimetableLensSelector';

export const TEACHER_ATTRIBUTE_KEYS = [
  'examinerId',
  'examinerName',
  'evaluatorId',
  'evaluatorName',
  'invigilatorId',
  'invigilatorName',
  'teacherId',
  'teacherName',
];

export const ROOM_ATTRIBUTE_KEYS = [
  'roomNo',
  'room',
  'hallName',
  'hallId',
  'roomCapacity',
  'seatingPlan',
];

export const SUBJECT_ATTRIBUTE_KEYS = [
  'curriculumBookId',
  'curriculumBookName',
  'subjectName',
  'subjectCode',
  'fullMarks',
  'passMarks',
  'components',
];

/**
 * Get attribute keys for a specific DND scope
 */
export function getAttributeKeysForScope(scope) {
  switch (scope) {
    case LENS_MODES.TEACHER:
      return TEACHER_ATTRIBUTE_KEYS;
    case LENS_MODES.ROOM:
      return ROOM_ATTRIBUTE_KEYS;
    case LENS_MODES.SUBJECT:
      return SUBJECT_ATTRIBUTE_KEYS;
    case LENS_MODES.ALL:
    default:
      return null; // Full object swap / move
  }
}

/**
 * Atomically swap attributes between two items according to the active scope.
 * If scope is ALL, swaps the slot coordinates (Date, Shift, Class) between the two full items.
 * If scope is TEACHER, ROOM, or SUBJECT, only swaps the respective attribute fields while keeping
 * subjects, dates, and classes in their original places.
 */
export function swapRoutineScopedAttributes(sourceItem, targetItem, scope = LENS_MODES.ALL, context = {}) {
  if (!sourceItem || !targetItem) {
    return { updatedSource: sourceItem, updatedTarget: targetItem };
  }

  const { sourceRow, sourceCol, targetRow, targetCol } = context;

  // ─── 1. FULL CARD SWAP (ALL SCOPE) ───
  if (scope === LENS_MODES.ALL || !scope) {
    const targetDept = typeof targetRow?.sub === 'string' ? targetRow.sub : targetItem?.departmentName || sourceItem?.departmentName;
    const sourceDept = typeof sourceRow?.sub === 'string' ? sourceRow.sub : sourceItem?.departmentName || targetItem?.departmentName;

    const updatedSource = {
      ...sourceItem,
      classId: targetRow?.id || targetItem.classId || sourceItem.classId,
      className: targetRow?.label || targetItem.className || sourceItem.className,
      departmentName: targetDept,
      examDate: targetCol?.date || targetItem.examDate || sourceItem.examDate,
      shiftId: targetCol?.shiftId || targetItem.shiftId || sourceItem.shiftId || 'shift_1',
      shiftName: targetCol?.shiftName || targetItem.shiftName || sourceItem.shiftName || 'Shift 1',
      startTime: targetCol?.rawShift?.startTime || targetCol?.timing?.split(' - ')[0] || targetItem.startTime || sourceItem.startTime,
      endTime: targetCol?.rawShift?.endTime || targetCol?.timing?.split(' - ')[1] || targetItem.endTime || sourceItem.endTime,
      updatedAt: new Date().toISOString(),
    };

    const updatedTarget = {
      ...targetItem,
      classId: sourceRow?.id || sourceItem.classId || targetItem.classId,
      className: sourceRow?.label || sourceItem.className || targetItem.className,
      departmentName: sourceDept,
      examDate: sourceCol?.date || sourceItem.examDate || targetItem.examDate,
      shiftId: sourceCol?.shiftId || sourceItem.shiftId || targetItem.shiftId || 'shift_1',
      shiftName: sourceCol?.shiftName || sourceItem.shiftName || targetItem.shiftName || 'Shift 1',
      startTime: sourceCol?.rawShift?.startTime || sourceCol?.timing?.split(' - ')[0] || sourceItem.startTime || targetItem.startTime,
      endTime: sourceCol?.rawShift?.endTime || sourceCol?.timing?.split(' - ')[1] || sourceItem.endTime || targetItem.endTime,
      updatedAt: new Date().toISOString(),
    };

    return { updatedSource, updatedTarget };
  }

  // ─── 2. GRANULAR ATTRIBUTE SWAP (TEACHER / ROOM / SUBJECT) ───
  const keys = getAttributeKeysForScope(scope) || [];
  const updatedSource = { ...sourceItem, updatedAt: new Date().toISOString() };
  const updatedTarget = { ...targetItem, updatedAt: new Date().toISOString() };

  keys.forEach((key) => {
    const sourceVal = sourceItem[key];
    const targetVal = targetItem[key];
    updatedSource[key] = targetVal !== undefined ? targetVal : null;
    updatedTarget[key] = sourceVal !== undefined ? sourceVal : null;
  });

  return { updatedSource, updatedTarget };
}

/**
 * Copy attributes or entire card from source to target (Ctrl + Drag Drop).
 * Source remains completely unchanged. Target gets updated or newly created.
 */
export function copyRoutineScopedAttributes(sourceItem, targetItem, scope = LENS_MODES.ALL, context = {}) {
  if (!sourceItem) return null;

  const { targetRow, targetCol } = context;

  // ─── 1. FULL CARD COPY (ALL SCOPE) ───
  if (scope === LENS_MODES.ALL || !scope) {
    const targetDept = typeof targetRow?.sub === 'string' ? targetRow.sub : targetItem?.departmentName || sourceItem.departmentName;
    return {
      ...sourceItem,
      id: `row_copy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      classId: targetRow?.id || targetItem?.classId || sourceItem.classId,
      className: targetRow?.label || targetItem?.className || sourceItem.className,
      departmentName: targetDept,
      examDate: targetCol?.date || targetItem?.examDate || sourceItem.examDate,
      shiftId: targetCol?.shiftId || targetItem?.shiftId || sourceItem.shiftId || 'shift_1',
      shiftName: targetCol?.shiftName || targetItem?.shiftName || sourceItem.shiftName || 'Shift 1',
      startTime: targetCol?.rawShift?.startTime || targetCol?.timing?.split(' - ')[0] || targetItem?.startTime || sourceItem.startTime,
      endTime: targetCol?.rawShift?.endTime || targetCol?.timing?.split(' - ')[1] || targetItem?.endTime || sourceItem.endTime,
      updatedAt: new Date().toISOString(),
    };
  }

  // ─── 2. GRANULAR ATTRIBUTE COPY INTO OCCUPIED TARGET (TEACHER / ROOM / SUBJECT) ───
  if (targetItem) {
    const keys = getAttributeKeysForScope(scope) || [];
    const updatedTarget = { ...targetItem, updatedAt: new Date().toISOString() };

    keys.forEach((key) => {
      if (sourceItem[key] !== undefined) {
        updatedTarget[key] = sourceItem[key];
      }
    });

    return updatedTarget;
  }

  // ─── 3. GRANULAR ATTRIBUTE COPY INTO EMPTY TARGET ───
  // If target is empty and copying a Subject, create a new item in target slot
  if (scope === LENS_MODES.SUBJECT) {
    const targetDept = typeof targetRow?.sub === 'string' ? targetRow.sub : sourceItem.departmentName;
    return {
      ...sourceItem,
      id: `row_copy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      classId: targetRow?.id || sourceItem.classId,
      className: targetRow?.label || sourceItem.className,
      departmentName: targetDept,
      examDate: targetCol?.date || sourceItem.examDate,
      shiftId: targetCol?.shiftId || sourceItem.shiftId || 'shift_1',
      shiftName: targetCol?.shiftName || sourceItem.shiftName || 'Shift 1',
      startTime: targetCol?.rawShift?.startTime || targetCol?.timing?.split(' - ')[0] || sourceItem.startTime,
      endTime: targetCol?.rawShift?.endTime || targetCol?.timing?.split(' - ')[1] || sourceItem.endTime,
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Validate whether a DND operation between source and target rows is permissible under the active scope.
 * - Under SUBJECT and ALL scopes (which involve curriculum books), vertical cross-class transfer is strictly blocked
 *   so books are never mistakenly assigned to a different class.
 * - Under TEACHER and ROOM scopes, 2D cross-class transfers remain permitted.
 */
export function isDndScopeAllowed(sourceRow, targetRow, scope = LENS_MODES.ALL) {
  // If source and target are the same row (same academic class), always allow
  if (!sourceRow || !targetRow || String(sourceRow.id) === String(targetRow.id)) {
    return { allowed: true };
  }

  // Cross-class row movement
  // When scope is ALL or SUBJECT, moving across rows would reassign the book to another class -> Prohibited!
  if (scope === LENS_MODES.SUBJECT || scope === LENS_MODES.ALL || !scope) {
    return {
      allowed: false,
      reason: 'Curriculum books cannot be transferred across different classes. Please reschedule dates within the same class row.',
    };
  }

  // TEACHER and ROOM scopes can be assigned or swapped across different classes
  if (scope === LENS_MODES.TEACHER || scope === LENS_MODES.ROOM) {
    return { allowed: true };
  }

  return { allowed: true };
}
