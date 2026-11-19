import { generateDateRange, formatShortDateLabel } from '../../utils/examScheduleUtils';
import { SubjectRoutineItem } from '../types';

export interface StudioMatrixColumn {
  id: string;
  date: string;
  shiftId: string;
  shiftName: string;
  timing: string;
  dateLabel: string;
  rawDay?: any;
  rawShift?: any;
}

export interface StudioMatrixRow {
  id: string;
  label: string;
  sub: string;
  code: string;
  rawClass?: any;
}

/**
 * Builds dynamic 2D column headers (Dates & Shifts) for the Routine Studio matrix.
 */
export function buildStudioMatrixColumns(
  activeExam: any,
  examShifts: any[] = [],
  designatedExamDays: string[] = [],
  routineRows: SubjectRoutineItem[] = []
): StudioMatrixColumn[] {
  const colMap = new Map<string, StudioMatrixColumn>();
  const shiftsList = Array.isArray(examShifts) && examShifts.length > 0 ? examShifts : [
    { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
  ];

  const addColumn = (dateStr: string, shiftObj: any, dayMeta: any = null) => {
    if (!dateStr) return;
    const sId = shiftObj?.id || 'shift_1';
    const colKey = `${dateStr}___${sId}`;
    if (colMap.has(colKey)) return;

    const timing = shiftObj?.startTime && shiftObj?.endTime
      ? `${shiftObj.startTime} - ${shiftObj.endTime}`
      : '09:00 AM - 11:00 AM';

    colMap.set(colKey, {
      id: `col_${dateStr}_${sId}`,
      date: dateStr,
      shiftId: sId,
      shiftName: shiftObj?.name || 'Standard Shift',
      timing,
      dateLabel: `${formatShortDateLabel(dateStr)}${shiftsList.length > 1 ? ` (${shiftObj?.name?.split(' ')[0] || sId})` : ''}`,
      rawDay: dayMeta,
      rawShift: shiftObj,
    });
  };

  // A. Source 1: Active Exam Schedule Days
  if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays) && activeExam.scheduleDays.length > 0) {
    activeExam.scheduleDays.forEach((d: any) => {
      if (d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK' && d.date) {
        const shiftCount = typeof d.shiftCount === 'number'
          ? Math.max(1, Math.min(d.shiftCount, shiftsList.length))
          : (d.type === 'DUAL_EXAM' ? Math.min(2, shiftsList.length) : 1);

        const applicableShifts = shiftsList.slice(0, shiftCount);
        applicableShifts.forEach((shift) => {
          addColumn(d.date, shift, d);
        });
      }
    });
  }

  // B. Source 2: Designated Exam Days
  if (colMap.size === 0 && Array.isArray(designatedExamDays) && designatedExamDays.length > 0) {
    designatedExamDays.forEach((dStr: string) => {
      shiftsList.forEach((shift) => {
        addColumn(dStr, shift);
      });
    });
  }

  // C. Source 3: Date range fallback
  if (colMap.size === 0 && activeExam?.startDate) {
    const dates = activeExam.endDate
      ? generateDateRange(activeExam.startDate, activeExam.endDate)
      : [activeExam.startDate];

    dates.forEach((dStr: string) => {
      shiftsList.forEach((shift) => {
        addColumn(dStr, shift);
      });
    });
  }

  // D. Source 4: Guarantee any scheduled date & shift in routineRows has a column!
  if (Array.isArray(routineRows)) {
    routineRows.forEach((r: SubjectRoutineItem) => {
      if (r.examDate) {
        const rDate = String(r.examDate).split('T')[0];
        const matchedShift = shiftsList.find((s) => s.id === r.shiftId) || {
          id: r.shiftId || 'shift_1',
          name: r.shiftName || 'Shift 1',
          startTime: r.startTime || '09:00 AM',
          endTime: r.endTime || '11:00 AM',
        };
        addColumn(rDate, matchedShift);
      }
    });
  }

  // Sort columns chronologically by date and shift
  return Array.from(colMap.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.shiftId || '').localeCompare(b.shiftId || '');
  });
}

/**
 * Builds dynamic 2D row headers (Classes / Academic Levels) for the Routine Studio matrix.
 */
export function buildStudioMatrixRows(
  participatingClasses: any[] = [],
  allAvailableClasses: any[] = [],
  routineRows: SubjectRoutineItem[] = [],
  departments: any[] = [],
  filterDepartmentId: string = 'ALL',
  filterClassId: string = 'ALL'
): StudioMatrixRow[] {
  const classMap = new Map<string, any>();
  const normalize = (s: any) => String(s || '').replace(/^dept_|^cls_/, '').trim().toLowerCase();

  const addClass = (clsObj: any) => {
    if (!clsObj || !clsObj.id) return;
    const idStr = String(clsObj.id);
    const clean = normalize(idStr);
    const nameClean = String(clsObj.name || clsObj.class_name || clsObj.className || '').trim().toLowerCase();

    let matchedKey: string | null = null;
    for (const [existingId, existingObj] of classMap.entries()) {
      const existClean = normalize(existingId);
      const existNameClean = String(existingObj.name || existingObj.class_name || existingObj.className || '').trim().toLowerCase();
      if (
        existingId === idStr ||
        (clean && existClean === clean) ||
        (nameClean && existNameClean && nameClean === existNameClean)
      ) {
        matchedKey = existingId;
        break;
      }
    }

    if (!matchedKey) {
      classMap.set(idStr, clsObj);
    }
  };

  (participatingClasses || []).forEach(addClass);
  (allAvailableClasses || []).forEach(addClass);

  (routineRows || []).forEach((r: SubjectRoutineItem) => {
    if (r.classId) {
      addClass({
        id: String(r.classId),
        name: r.className || `Class ${r.classId}`,
        className: r.className || `Class ${r.classId}`,
        departmentId: r.departmentId,
        departmentName: r.departmentName,
        code: r.classCode || '',
      });
    }
  });

  const hasDeptFilter = filterDepartmentId && filterDepartmentId !== 'ALL';
  const cleanDeptFilter = hasDeptFilter ? normalize(filterDepartmentId) : '';
  const hasClassFilter = filterClassId && filterClassId !== 'ALL';
  const cleanClassFilter = hasClassFilter ? normalize(filterClassId) : '';

  return Array.from(classMap.values())
    .filter((c: any) => {
      if (!c) return false;
      if (hasDeptFilter) {
        const cDeptId = String(c.departmentId || c.department_id || (typeof c.department === 'object' ? c.department?.id : c.department) || '');
        const cDeptClean = normalize(cDeptId);
        if (cDeptId !== String(filterDepartmentId) && cDeptClean !== cleanDeptFilter) {
          return false;
        }
      }
      if (hasClassFilter) {
        const cId = String(c.id || '');
        const cClean = normalize(cId);
        if (cId !== String(filterClassId) && cClean !== cleanClassFilter) {
          return false;
        }
      }
      return true;
    })
    .map((c: any) => {
      const rawDept = c.department;
      const deptId = String(c.departmentId || c.department_id || (typeof rawDept === 'object' ? rawDept?.id : rawDept) || '');
      const matchedDept = (departments || []).find((d: any) => String(d.id) === deptId);
      const deptName = matchedDept?.name || matchedDept?.department_name || c.departmentName || c.department_name || (typeof rawDept === 'object' ? rawDept?.name : '') || '';

      return {
        id: String(c.id),
        label: c.name || c.class_name || c.className || 'Class',
        sub: deptName || (c.code ? `Class Code: ${c.code}` : 'Class Level'),
        code: c.code || '',
        rawClass: c,
      };
    });
}

/**
 * Extracts and matches a single subject routine item for a specific (row, col) coordinate in the 2D grid.
 */
export function extractStudioCellItem(
  allData: SubjectRoutineItem[],
  row: StudioMatrixRow,
  col: StudioMatrixColumn
): SubjectRoutineItem | null {
  if (!Array.isArray(allData)) return null;
  const cleanRowId = String(row.id).replace(/^cls_/, '').trim().toLowerCase();
  const rowLabelClean = String(row.label || '').trim().toLowerCase();
  const colDate = String(col.date || '').split('T')[0].trim();
  const colShiftId = String(col.shiftId || 'shift_1');
  const cleanColShift = colShiftId.replace(/^shift_/, '').trim().toLowerCase();

  return (
    allData.find((it: SubjectRoutineItem) => {
      const itClassId = String(it.classId || it.targetClassId || '').trim();
      const cleanItClassId = itClassId.replace(/^cls_/, '').toLowerCase();
      const itClassName = String(it.className || '').trim().toLowerCase();

      const matchClass =
        itClassId === String(row.id) ||
        (cleanRowId && cleanItClassId === cleanRowId) ||
        (rowLabelClean && itClassName && (rowLabelClean === itClassName || rowLabelClean.includes(itClassName) || itClassName.includes(rowLabelClean)));

      if (!matchClass) return false;

      const itDate = String(it.examDate || it.date || '').split('T')[0].trim();
      if (itDate !== colDate) return false;

      const itShiftId = String(it.shiftId || 'shift_1');
      const cleanItShift = itShiftId.replace(/^shift_/, '').trim().toLowerCase();
      if (col.shiftId && (col.shiftId !== itShiftId && cleanColShift !== cleanItShift)) {
        return false;
      }

      return true;
    }) || null
  );
}
