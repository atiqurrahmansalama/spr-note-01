/**
 * timetableDndValidator.js
 * Enterprise Reusable Drag-and-Drop Validator Utilities for Matrix Timetable Grids.
 *
 * Provides pure validation strategies to control:
 * - Row-to-Row (Vertical / Cross-Class / Cross-Entity) Transfers
 * - Col-to-Col (Horizontal / Date & Shift / Time Slot) Transfers
 * - Granular Scope Constraints (Subjects, Teachers, Rooms, Custom Attributes)
 */

import { LENS_MODES } from './TimetableLensSelector';

/**
 * Standard Academic Matrix DND Rule:
 * - Curriculum Books / Subjects strictly belong to their academic Class (Row).
 *   Therefore, vertical drag across different class rows is prohibited under SUBJECT & ALL scopes.
 * - Teachers (Examiners/Invigilators) and Rooms can be freely allocated or swapped across any class row.
 * - Horizontal rescheduling (across Dates & Shifts within the same class) is always permitted.
 */
export function validateAcademicRoutineDnd({
  sourceRow,
  sourceCol,
  targetRow,
  targetCol,
  draggedItem,
  targetItem,
  activeLens = LENS_MODES.ALL,
  isCopy = false,
}) {
  // If source and target are the same row (same academic class), always allow
  if (!sourceRow || !targetRow || String(sourceRow.id) === String(targetRow.id)) {
    return { allowed: true };
  }

  // Cross-class row movement
  // When scope is ALL or SUBJECT, moving across rows would reassign the book to another class -> Prohibited!
  if (activeLens === LENS_MODES.SUBJECT || activeLens === LENS_MODES.ALL || !activeLens) {
    return {
      allowed: false,
      reason: 'Curriculum books cannot be transferred across different classes. Please reschedule dates within the same class row.',
    };
  }

  // TEACHER and ROOM scopes can be assigned or swapped across different classes
  if (activeLens === LENS_MODES.TEACHER || activeLens === LENS_MODES.ROOM) {
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Creates a strict Horizontal-Only Validator (locks all vertical row changes)
 */
export function createHorizontalOnlyValidator(customReason = 'Vertical row-to-row movement is locked.') {
  return ({ sourceRow, targetRow }) => {
    if (sourceRow?.id && targetRow?.id && String(sourceRow.id) !== String(targetRow.id)) {
      return { allowed: false, reason: customReason };
    }
    return { allowed: true };
  };
}

/**
 * Creates a strict Vertical-Only Validator (locks all horizontal column changes)
 */
export function createVerticalOnlyValidator(customReason = 'Horizontal column-to-column movement is locked.') {
  return ({ sourceCol, targetCol }) => {
    if (sourceCol?.id && targetCol?.id && String(sourceCol.id) !== String(targetCol.id)) {
      return { allowed: false, reason: customReason };
    }
    return { allowed: true };
  };
}

/**
 * Universal Matrix DND Validator with support for configurable flags:
 * - allowCrossRow: boolean | (ctx) => boolean
 * - allowCrossCol: boolean | (ctx) => boolean
 * - customValidator: (ctx) => { allowed: boolean, reason?: string } | boolean
 */
export function validateMatrixGridDnd(context, options = {}) {
  const { sourceRow, sourceCol, targetRow, targetCol } = context;
  const {
    allowCrossRow = true,
    allowCrossCol = true,
    customValidator = null,
  } = options;

  // 1. Cross-Row Check
  const isCrossRow = sourceRow?.id && targetRow?.id && String(sourceRow.id) !== String(targetRow.id);
  if (isCrossRow) {
    if (typeof allowCrossRow === 'function') {
      const rowAllowed = allowCrossRow(context);
      if (!rowAllowed) {
        return { allowed: false, reason: 'Cross-row movement is restricted for this item.' };
      }
    } else if (allowCrossRow === false) {
      return { allowed: false, reason: 'Cross-row movement is disabled.' };
    }
  }

  // 2. Cross-Col Check
  const isCrossCol = sourceCol?.id && targetCol?.id && String(sourceCol.id) !== String(targetCol.id);
  if (isCrossCol) {
    if (typeof allowCrossCol === 'function') {
      const colAllowed = allowCrossCol(context);
      if (!colAllowed) {
        return { allowed: false, reason: 'Cross-column movement is restricted for this item.' };
      }
    } else if (allowCrossCol === false) {
      return { allowed: false, reason: 'Cross-column movement is disabled.' };
    }
  }

  // 3. Custom Validator
  if (typeof customValidator === 'function') {
    const res = customValidator(context);
    if (typeof res === 'boolean') {
      return { allowed: res, reason: res ? '' : 'DND is restricted for this slot.' };
    }
    if (res && typeof res.allowed === 'boolean') {
      return res;
    }
  }

  // 4. Default Academic Routine Rule
  return validateAcademicRoutineDnd(context);
}
