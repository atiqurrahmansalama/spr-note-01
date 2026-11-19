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
export function getAttributeKeysForScope(scope?: string): string[] | null {
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
 */
export function swapRoutineScopedAttributes(
  sourceItem: any,
  targetItem: any,
  scope: string = LENS_MODES.ALL,
  context: any = {}
) {
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
 */
export function copyRoutineScopedAttributes(
  sourceItem: any,
  targetItem: any,
  scope: string = LENS_MODES.ALL,
  context: any = {}
) {
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
 */
export function isDndScopeAllowed(sourceRow: any, targetRow: any, scope: string = LENS_MODES.ALL) {
  if (!sourceRow || !targetRow || String(sourceRow.id) === String(targetRow.id)) {
    return { allowed: true };
  }

  if (scope === LENS_MODES.SUBJECT || scope === LENS_MODES.ALL || !scope) {
    return {
      allowed: false,
      reason: 'Curriculum books cannot be transferred across different classes. Please reschedule dates within the same class row.',
    };
  }

  if (scope === LENS_MODES.TEACHER || scope === LENS_MODES.ROOM) {
    return { allowed: true };
  }

  return { allowed: true };
}
