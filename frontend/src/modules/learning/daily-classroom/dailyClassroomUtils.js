import { getOrdinalPeriodLabel } from '../../../utils/localStore';

/**
 * Helper to resolve period slot by ID, Order number, or Name from periodSlots list.
 */
export function findMatchingPeriodSlot(pId, periodSlots = []) {
  if (!pId || pId === 'ALL' || pId === 'UNASSIGNED') return null;
  const targetStr = String(pId).trim().toLowerCase();

  // 1. Direct ID match
  const byId = periodSlots.find((p) => String(p.id || '').trim().toLowerCase() === targetStr);
  if (byId) return byId;

  // 2. Direct Period Order match (number or 'period_N' or 'Nth Period')
  let targetNum = null;
  if (/^\d+$/.test(targetStr)) {
    targetNum = Number(targetStr);
  } else {
    const slotMatch = targetStr.match(/^(?:period|slot|p)[_\-\s]*(\d+)$/i);
    if (slotMatch) {
      targetNum = Number(slotMatch[1]);
    } else {
      const ordMatch = targetStr.match(/^(\d+)(?:st|nd|rd|th)\s*period$/i);
      if (ordMatch) targetNum = Number(ordMatch[1]);
    }
  }

  if (targetNum !== null && !isNaN(targetNum)) {
    const byOrder = periodSlots.find((p) => {
      const pOrder = Number(p.period_order ?? p.order ?? null);
      return pOrder === targetNum;
    });
    if (byOrder) return byOrder;
  }

  // 3. Exact Name match
  const byName = periodSlots.find((p) => {
    const pName = (p.period_name || p.name || '').trim().toLowerCase();
    return pName && pName === targetStr;
  });
  if (byName) return byName;

  return null;
}

/**
 * Extracts the numeric period order (1..8) from a period slot or lesson object.
 */
export function extractPeriodOrder(item) {
  if (!item) return null;
  const rawOrder = item.period_order ?? item.order;
  if (rawOrder !== undefined && rawOrder !== null && rawOrder !== '' && !isNaN(Number(rawOrder))) {
    return Number(rawOrder);
  }

  const slotStr = String(item.period_slot || item.period_slot_id || item.slot || '').trim();
  if (slotStr && /^\d+$/.test(slotStr)) {
    return Number(slotStr);
  }
  const slotMatch = slotStr.match(/^(?:period|slot|p)[_\-\s]*(\d+)$/i);
  if (slotMatch) return Number(slotMatch[1]);

  const nameStr = String(item.period_name || item.name || '').trim();
  const ordMatch = nameStr.match(/(\d+)(?:st|nd|rd|th)?\s*period/i);
  if (ordMatch) return Number(ordMatch[1]);

  return null;
}

/**
 * Resolves period time string dynamically from Routine & Curriculum period slots.
 * 100% Zero hardcoded timings — strictly driven by configured Routine Period Slots.
 */
export function resolvePeriodTime(matchedSlot, lessonOrEval = null, fallbackOrder = null, periodSlots = []) {
  // 1. Direct start_time and end_time on matchedSlot
  if (matchedSlot?.start_time && matchedSlot?.end_time) {
    return `${matchedSlot.start_time.slice(0, 5)} - ${matchedSlot.end_time.slice(0, 5)}`;
  }
  if (matchedSlot?.time_range) {
    return matchedSlot.time_range;
  }

  // 2. Direct time on lesson or evaluation if already recorded
  if (lessonOrEval?.period_time) {
    return lessonOrEval.period_time;
  }

  // 3. Dynamically search in periodSlots by target order or ID
  if (Array.isArray(periodSlots) && periodSlots.length > 0) {
    const targetOrder = extractPeriodOrder(matchedSlot) || extractPeriodOrder(lessonOrEval) || (Number(fallbackOrder) || null);
    if (targetOrder !== null && !isNaN(targetOrder)) {
      const slot = periodSlots.find((p) => {
        const pOrder = extractPeriodOrder(p);
        return pOrder === targetOrder;
      });
      if (slot?.start_time && slot?.end_time) {
        return `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
      }
      if (slot?.time_range) {
        return slot.time_range;
      }
    }
  }

  return '';
}

/**
 * Checks if a lesson belongs to a target department by ID, department relation, or class department.
 */
export function doesLessonMatchDepartment(lesson, targetDeptId, departments = [], classes = []) {
  if (!targetDeptId || targetDeptId === 'ALL') return true;

  // 1. Direct department ID on lesson
  const lDept = lesson.department_id !== undefined ? lesson.department_id : (lesson.department || lesson.dept_id);
  const lDeptId = typeof lDept === 'object' ? String(lDept?.id || '') : String(lDept || '');
  if (lDeptId && lDeptId === String(targetDeptId)) return true;

  // 2. Department name match
  const targetDept = departments.find((d) => String(d.id) === String(targetDeptId));
  if (targetDept && lesson.department_name) {
    if (targetDept.name.toLowerCase().trim() === lesson.department_name.toLowerCase().trim()) return true;
  }

  // 3. Department via lesson class
  const lCls = lesson.academic_class !== undefined ? lesson.academic_class : (lesson.class_id || lesson.student_class || lesson.academic_class_id);
  const lClsId = typeof lCls === 'object' ? String(lCls?.id || '') : String(lCls || '');
  if (lClsId) {
    const matchedClass = classes.find((c) => String(c.id) === lClsId);
    if (matchedClass) {
      const cDept = matchedClass.department !== undefined ? matchedClass.department : matchedClass.department_id;
      const cDeptId = typeof cDept === 'object' ? String(cDept?.id || '') : String(cDept || '');
      if (cDeptId && cDeptId === String(targetDeptId)) return true;
    }
  }

  return false;
}

/**
 * Checks if a lesson belongs to a target class by ID or class relation.
 */
export function doesLessonMatchClass(lesson, targetClassId, classes = []) {
  if (!targetClassId || targetClassId === 'ALL') return true;

  const lCls = lesson.academic_class !== undefined ? lesson.academic_class : (lesson.class_id || lesson.student_class || lesson.academic_class_id);
  const lClsId = typeof lCls === 'object' ? String(lCls?.id || '') : String(lCls || '');
  if (lClsId && lClsId === String(targetClassId)) return true;

  const targetClass = classes.find((c) => String(c.id) === String(targetClassId));
  if (targetClass && lesson.class_name) {
    const tName = (targetClass.name || targetClass.class_name || '').toLowerCase().trim();
    const lName = lesson.class_name.toLowerCase().trim();
    if (tName === lName) return true;
  }

  return false;
}

/**
 * Checks if a lesson matches the selected section filter.
 */
export function doesLessonMatchSection(lesson, targetSectionId) {
  if (!targetSectionId || targetSectionId === 'ALL') return true;

  const lSec = lesson.section !== undefined ? lesson.section : (lesson.section_id || lesson.student_section);
  const lSecId = typeof lSec === 'object' ? String(lSec?.id || '') : String(lSec || '');
  if (lSecId && lSecId === String(targetSectionId)) return true;

  if (lesson.section_name && lesson.section_name !== 'Class Wide (All Sections)') {
    return false;
  }

  // Class-wide lesson with no explicit section assigned applies to all sections
  return !lSecId;
}

/**
 * Checks if a lesson matches a period slot filter.
 */
export function isLessonInSlot(lesson, slotValue, periodSlots = []) {
  if (!slotValue || slotValue === 'ALL') return true;
  if (slotValue === 'UNASSIGNED') {
    return !lesson.period_slot && !lesson.period_order && !lesson.period_name;
  }

  // 1. Direct slot ID match
  const lSlot = lesson.period_slot || lesson.period_slot_id;
  if (lSlot && String(lSlot) === String(slotValue)) return true;

  // 2. Numeric order match
  const lessonOrder = extractPeriodOrder(lesson);
  if (/^\d+$/.test(String(slotValue))) {
    const filterOrder = Number(slotValue);
    if (lessonOrder !== null && lessonOrder === filterOrder) return true;
  }

  // 3. Slot match in periodSlots list
  const slotObj = periodSlots.find((p) => String(p.id) === String(slotValue));
  if (slotObj) {
    const slotOrder = extractPeriodOrder(slotObj);
    if (slotOrder !== null && lessonOrder !== null && slotOrder === lessonOrder) return true;
  }

  return false;
}

/**
 * Resolves teacher name from book object and teachers/staff roster.
 */
export function resolveBookTeacher(book, teachers = [], staff = []) {
  if (!book) return '';
  const raw = book.teacherName || book.teacher_name || book.instructor || book.teacher || book.assignedTeacher || '';
  let name = typeof raw === 'object'
    ? (raw?.name_en || raw?.user_name || raw?.name || raw?.full_name || '')
    : String(raw || '');

  if (!name && (book.teacherId || book.teacher_id)) {
    const targetId = String(book.teacherId || book.teacher_id);
    const matched =
      teachers.find((t) => String(t.id) === targetId || String(t.teacher_id) === targetId || String(t.user) === targetId) ||
      staff.find((s) => String(s.id) === targetId || String(s.employee_id) === targetId);
    if (matched) {
      name = matched.name_en || matched.user_name || matched.name || matched.full_name || '';
    }
  }
  return name;
}

/**
 * Filters curriculum books belonging to selected class and department.
 */
export function filterCurriculumBooks(curriculumBooks = [], classId, classes = [], departmentId = '') {
  if (!classId || classId === 'ALL') return curriculumBooks;

  const targetClass = classes.find((c) => String(c.id) === String(classId));
  const targetClassName = (targetClass?.name || targetClass?.class_name || '').toLowerCase().trim();
  const cDept = targetClass?.department !== undefined ? targetClass.department : targetClass?.department_id;
  const targetDeptId = typeof cDept === 'object' ? String(cDept?.id || '') : String(cDept || departmentId || '');

  const filtered = curriculumBooks.filter((b) => {
    const bClassId = String(b.classId || b.class_id || b.student_class || '');
    if (bClassId && (bClassId === String(classId) || (targetClass && bClassId === String(targetClass.id)))) {
      return true;
    }
    const bClassName = (b.className || b.class_name || '').toLowerCase().trim();
    if (targetClassName && bClassName && (targetClassName === bClassName || targetClassName.includes(bClassName) || bClassName.includes(targetClassName))) {
      return true;
    }
    const bDeptId = String(b.departmentId || b.department_id || b.department || '');
    if (targetDeptId && bDeptId && targetDeptId === bDeptId) {
      return true;
    }
    return false;
  });

  return filtered.length > 0 ? filtered : curriculumBooks;
}
