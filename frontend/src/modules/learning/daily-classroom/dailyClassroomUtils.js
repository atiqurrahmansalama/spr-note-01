import { getOrdinalPeriodLabel } from '../../../utils/localStore.js';

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
 * Extracts normalized department ID from any entity object (lesson, class, book, slot, student).
 */
export function getDepartmentId(item) {
  if (!item) return '';
  if (typeof item.department === 'object' && item.department !== null) return String(item.department?.id || '');
  if (item.department !== undefined && item.department !== null && item.department !== '') return String(item.department);
  if (item.department_id !== undefined && item.department_id !== null) return String(item.department_id);
  if (item.departmentId !== undefined && item.departmentId !== null) return String(item.departmentId);
  if (item.dept_id !== undefined && item.dept_id !== null) return String(item.dept_id);
  if (item.deptId !== undefined && item.deptId !== null) return String(item.deptId);
  return '';
}

/**
 * Extracts normalized class ID from any entity object (lesson, slot, section, book, student).
 */
export function getClassId(item) {
  if (!item) return '';
  if (typeof item.student_class === 'object' && item.student_class !== null) return String(item.student_class?.id || '');
  if (typeof item.academic_class === 'object' && item.academic_class !== null) return String(item.academic_class?.id || '');
  if (typeof item.class === 'object' && item.class !== null) return String(item.class?.id || '');
  if (item.student_class !== undefined && item.student_class !== null && item.student_class !== '') return String(item.student_class);
  if (item.academic_class !== undefined && item.academic_class !== null && item.academic_class !== '') return String(item.academic_class);
  if (item.academic_class_id !== undefined && item.academic_class_id !== null) return String(item.academic_class_id);
  if (item.class_id !== undefined && item.class_id !== null) return String(item.class_id);
  if (item.classId !== undefined && item.classId !== null) return String(item.classId);
  if (item.class !== undefined && item.class !== null && item.class !== '') return String(item.class);
  return '';
}

/**
 * Extracts normalized section ID from any entity object (lesson, slot, student).
 */
export function getSectionId(item) {
  if (!item) return '';
  if (typeof item.section === 'object' && item.section !== null) return String(item.section?.id || '').trim();
  if (typeof item.student_section === 'object' && item.student_section !== null) return String(item.student_section?.id || '').trim();
  
  const rawSec = item.section !== undefined && item.section !== null ? String(item.section).trim() : '';
  if (rawSec && rawSec !== 'null' && rawSec !== 'undefined' && !rawSec.toLowerCase().includes('class wide') && !rawSec.toLowerCase().includes('all section')) {
    return rawSec;
  }

  const rawSecId = item.section_id !== undefined && item.section_id !== null ? String(item.section_id).trim() : '';
  if (rawSecId && rawSecId !== 'null' && rawSecId !== 'undefined') {
    return rawSecId;
  }

  const rawSecIdCamel = item.sectionId !== undefined && item.sectionId !== null ? String(item.sectionId).trim() : '';
  if (rawSecIdCamel && rawSecIdCamel !== 'null' && rawSecIdCamel !== 'undefined') {
    return rawSecIdCamel;
  }

  const rawStuSec = item.student_section !== undefined && item.student_section !== null ? String(item.student_section).trim() : '';
  if (rawStuSec && rawStuSec !== 'null' && rawStuSec !== 'undefined') {
    return rawStuSec;
  }

  return '';
}

/**
 * Helper to get all matching section IDs (resolving duplicate seeded sections with identical names).
 */
export function getEquivalentSectionIds(targetSectionId, sections = []) {
  if (!targetSectionId || targetSectionId === 'ALL') return new Set(['ALL']);
  const targetIdStr = String(targetSectionId).trim();
  const matchedSet = new Set([targetIdStr]);

  const targetSection = sections.find((s) => String(s.id) === targetIdStr) ||
                        sections.find((s) => (s.section_name || s.name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  if (targetSection) {
    const tName = (targetSection.section_name || targetSection.name || '').toLowerCase().trim();
    sections.forEach((s) => {
      const sName = (s.section_name || s.name || '').toLowerCase().trim();
      if (tName && sName && sName === tName) {
        matchedSet.add(String(s.id));
      }
    });
  }

  return matchedSet;
}

/**
 * Helper to get all matching department IDs (resolving duplicate seeded departments with identical names/codes).
 */
export function getEquivalentDepartmentIds(targetDeptId, departments = []) {
  if (!targetDeptId || targetDeptId === 'ALL') return new Set(['ALL']);
  const targetIdStr = String(targetDeptId).trim();
  const matchedSet = new Set([targetIdStr]);

  const targetDept = departments.find((d) => String(d.id) === targetIdStr) ||
                     departments.find((d) => (d.name || d.department_name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  if (targetDept) {
    const tName = (targetDept.name || targetDept.department_name || '').toLowerCase().trim();
    const tCode = (targetDept.code || '').toLowerCase().trim();

    departments.forEach((d) => {
      const dName = (d.name || d.department_name || '').toLowerCase().trim();
      const dCode = (d.code || '').toLowerCase().trim();
      if ((tName && dName && dName === tName) ||
          (tCode && dCode && tCode === dCode)) {
        matchedSet.add(String(d.id));
      }
    });
  }

  return matchedSet;
}

/**
 * Checks if a lesson or book belongs to a target department by ID, name, class relation, or domain taxonomy.
 */
export function doesLessonMatchDepartment(item, targetDeptId, departments = [], classes = []) {
  if (!targetDeptId || targetDeptId === 'ALL') return true;
  if (!item) return false;
  const targetIdStr = String(targetDeptId).trim();

  // 1. Direct ID match or equivalent department IDs match
  const equivalentIds = getEquivalentDepartmentIds(targetDeptId, departments);
  const itemDeptId = getDepartmentId(item);
  if (itemDeptId && equivalentIds.has(itemDeptId)) return true;

  // If item itself is a department object
  if (item.id && departments.some((d) => String(d.id) === String(item.id))) {
    if (equivalentIds.has(String(item.id))) return true;
  }

  // 2. Department name matching
  const targetDept = departments.find((d) => String(d.id) === targetIdStr);
  const targetDeptName = (targetDept?.name || targetDept?.department_name || '').toLowerCase().trim();
  const targetDeptCode = (targetDept?.code || '').toLowerCase().trim();

  const candidateDeptNames = [
    item.department_name,
    item.dept_name,
    typeof item.department === 'string' ? item.department : '',
    typeof item.dept === 'string' ? item.dept : '',
  ].filter(Boolean).map((s) => String(s).toLowerCase().trim());

  if (targetDeptName && candidateDeptNames.some((n) => n === targetDeptName)) {
    return true;
  }

  // 3. Department via item's class
  const itemClsId = getClassId(item) || (item.id && classes.some((c) => String(c.id) === String(item.id)) ? String(item.id) : '');
  if (itemClsId) {
    const matchedClass = classes.find((c) => String(c.id) === String(itemClsId));
    if (matchedClass) {
      const cDeptId = getDepartmentId(matchedClass);
      if (cDeptId && equivalentIds.has(cDeptId)) return true;
      const cDeptName = (matchedClass.department_name || '').toLowerCase().trim();
      if (targetDeptName && cDeptName && targetDeptName === cDeptName) return true;
    }
  }

  // 4. Semantic taxonomy fallback (for curriculum syllabus items & legacy models)
  const itemText = [
    item.className,
    item.class_name,
    item.student_class_name,
    item.name,
    item.curriculum_book_name,
    item.subject,
    item.subject_name,
    item.department,
    item.notes,
  ].filter(Boolean).join(' ').toLowerCase();

  if (targetDeptName.includes('hifz') || targetDeptCode === 'HIFZ') {
    if (itemText.includes('hifz') || itemText.includes('quran') || itemText.includes('sabaq') || itemText.includes('sabqi') || itemText.includes('manzil') || itemText.includes('daur')) {
      return true;
    }
  }
  if (targetDeptName.includes('kitab') || targetDeptName.includes('arabic') || targetDeptCode === 'KITAB') {
    if (itemText.includes('kitab') || itemText.includes('nahw') || itemText.includes('sarf') || itemText.includes('mishkat') || itemText.includes('jalalayn') || itemText.includes('quduri') || itemText.includes('shashi') || itemText.includes('balaghat') || itemText.includes('fazilat')) {
      return true;
    }
  }
  if (targetDeptName.includes('noorani') || targetDeptName.includes('nazira') || targetDeptName.includes('nazera') || targetDeptCode === 'NOOR' || targetDeptCode === 'NAZERA') {
    if (itemText.includes('noorani') || itemText.includes('qaida') || itemText.includes('nazira') || itemText.includes('nazera') || itemText.includes('ampara') || itemText.includes('primary islamic')) {
      return true;
    }
  }
  if (targetDeptName.includes('general') || targetDeptName.includes('academic') || targetDeptName.includes('science') || targetDeptCode.startsWith('GEN')) {
    if (itemText.includes('general') || itemText.includes('class 6') || itemText.includes('class 7') || itemText.includes('class 8') || itemText.includes('science') || itemText.includes('mathematics') || itemText.includes('english') || itemText.includes('bangla')) {
      return true;
    }
  }
  if (targetDeptName.includes('tajweed') || targetDeptCode === 'TAJWEED') {
    if (itemText.includes('tajweed') || itemText.includes('makhraj') || itemText.includes('qirat') || itemText.includes('jazariyyah') || itemText.includes('atfal')) {
      return true;
    }
  }
  if (targetDeptName.includes('hadith') || targetDeptCode === 'HADITH') {
    if (itemText.includes('hadith') || itemText.includes('riyadus') || itemText.includes('ethics') || itemText.includes('etiquette')) {
      return true;
    }
  }

  return false;
}

/**
 * Helper to get all matching class IDs (resolving duplicate seeded classes with identical names/codes across branches).
 */
export function getEquivalentClassIds(targetClassId, classes = []) {
  if (!targetClassId || targetClassId === 'ALL') return new Set(['ALL']);
  const targetIdStr = String(targetClassId).trim();
  const matchedSet = new Set([targetIdStr]);

  const targetClass = classes.find((c) => String(c.id) === targetIdStr) ||
                      classes.find((c) => (c.name || c.class_name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  if (targetClass) {
    const tName = (targetClass.name || targetClass.class_name || '').toLowerCase().trim();
    const tCode = (targetClass.code || '').toLowerCase().trim();

    classes.forEach((c) => {
      const cName = (c.name || c.class_name || '').toLowerCase().trim();
      const cCode = (c.code || '').toLowerCase().trim();
      if ((tName && cName && cName === tName) ||
          (tCode && cCode && tCode === cCode)) {
        matchedSet.add(String(c.id));
      }
    });
  }

  return matchedSet;
}

/**
 * Checks if a lesson or book belongs to a target class by ID, name, code, or curriculum syllabus class relation.
 */
export function doesLessonMatchClass(item, targetClassId, classes = []) {
  if (!targetClassId || targetClassId === 'ALL') return true;
  if (!item) return false;
  const targetIdStr = String(targetClassId).trim();

  // 1. Direct ID or Equivalent Class IDs match
  const equivalentIds = getEquivalentClassIds(targetClassId, classes);
  const itemClsId = getClassId(item) || (item.id && classes.some((c) => String(c.id) === String(item.id)) ? String(item.id) : '');
  if (itemClsId && equivalentIds.has(itemClsId)) return true;

  const targetClass = classes.find((c) => String(c.id) === targetIdStr) ||
                      classes.find((c) => (c.name || c.class_name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  const tName = (targetClass?.name || targetClass?.class_name || '').toLowerCase().trim();
  const tCode = (targetClass?.code || '').toLowerCase().trim();

  // If item explicitly references a class ID that exists in classes but not in equivalentIds:
  if (itemClsId) {
    const itemClsObj = classes.find((c) => String(c.id) === itemClsId);
    if (itemClsObj) {
      const itemClsName = (itemClsObj.name || itemClsObj.class_name || '').toLowerCase().trim();
      const itemClsCode = (itemClsObj.code || '').toLowerCase().trim();
      if (tName && itemClsName && itemClsName === tName) return true;
      if (tCode && itemClsCode && itemClsCode === tCode) return true;
      return false; // Belongs to a different registered class
    }
  }

  // 2. Exact Class Name / Code Matching
  const candidateNames = [
    item.class_name,
    item.className,
    item.student_class_name,
    item.academic_class_name,
    typeof item.academic_class === 'string' ? item.academic_class : '',
    typeof item.class === 'string' ? item.class : '',
    typeof item.student_class === 'string' ? item.student_class : '',
  ].filter(Boolean).map((s) => String(s).toLowerCase().trim());

  if (tName && candidateNames.some((n) => n === tName)) {
    return true;
  }

  if (tCode && (item.class_code || candidateNames.some((n) => n === tCode))) {
    return true;
  }

  // 3. Precise Tier Fallback for Curriculum Syllabus & Legacy Items
  const itemClassIdStr = String(item.classId || item.class_id || '').toLowerCase();

  if ((tName.includes('senior') || tName.includes('khatm') || tCode.includes('HIFZ-SR') || targetIdStr === 'cls_1') &&
      (itemClassIdStr === 'cls_1' || itemClassIdStr === 'cls_hifz_sr' || candidateNames.some((n) => n.includes('senior') || n.includes('khatm')))) {
    return true;
  }
  if ((tName.includes('intermediate') || tCode.includes('HIFZ-INT') || targetIdStr === 'cls_hifz_int') &&
      (itemClassIdStr === 'cls_hifz_int' || candidateNames.some((n) => n.includes('intermediate')))) {
    return true;
  }
  if ((tName.includes('junior') || tCode.includes('HIFZ-JUN') || targetIdStr === 'cls_hifz_jun') &&
      (itemClassIdStr === 'cls_hifz_jun' || candidateNames.some((n) => n.includes('junior')))) {
    return true;
  }
  if ((tName.includes('noorani') || tCode.includes('NOOR') || targetIdStr === 'cls_3' || targetIdStr === 'cls_noorani') &&
      (itemClassIdStr === 'cls_3' || itemClassIdStr === 'cls_noorani' || candidateNames.some((n) => n.includes('noorani')))) {
    return true;
  }
  if ((tName.includes('nazera') || tName.includes('nazira') || tCode.includes('NAZ') || targetIdStr === 'cls_4') &&
      (itemClassIdStr === 'cls_4' || candidateNames.some((n) => n.includes('nazera') || n.includes('nazira')))) {
    return true;
  }
  if ((tName.includes('kitab') || tName.includes('mizan') || tName.includes('fazilat') || tCode.includes('KITAB') || targetIdStr === 'cls_2') &&
      (itemClassIdStr === 'cls_2' || itemClassIdStr === 'cls_kitab' || candidateNames.some((n) => n.includes('kitab') || n.includes('mizan') || n.includes('fazilat')))) {
    return true;
  }
  if ((tName.includes('class 6') || tCode.includes('CLS-06') || targetIdStr === 'cls_6') &&
      (itemClassIdStr === 'cls_6' || candidateNames.some((n) => n.includes('class 6')))) {
    return true;
  }
  if ((tName.includes('class 7') || tCode.includes('CLS-07') || targetIdStr === 'cls_7') &&
      (itemClassIdStr === 'cls_7' || candidateNames.some((n) => n.includes('class 7')))) {
    return true;
  }
  if ((tName.includes('class 8') || tCode.includes('CLS-08') || targetIdStr === 'cls_8') &&
      (itemClassIdStr === 'cls_8' || candidateNames.some((n) => n.includes('class 8')))) {
    return true;
  }

  return false;
}

/**
 * Checks if a lesson matches the selected section filter.
 */
export function doesLessonMatchSection(lesson, targetSectionId, sections = []) {
  if (!targetSectionId || targetSectionId === 'ALL' || targetSectionId === '') return true;
  if (!lesson) return false;
  const targetIdStr = String(targetSectionId).trim();

  // 1. Direct ID or Equivalent Section ID match
  const equivalentIds = getEquivalentSectionIds(targetSectionId, sections);
  const lSecId = getSectionId(lesson);
  if (lSecId && equivalentIds.has(lSecId)) return true;

  const targetSection = sections.find((s) => String(s.id) === targetIdStr) ||
                        sections.find((s) => (s.section_name || s.name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  const targetSecName = (targetSection?.section_name || targetSection?.name || '').toLowerCase().trim();

  // Extract lesson section name
  const rawSecName = lesson.section_name || (typeof lesson.section === 'string' && isNaN(Number(lesson.section)) ? lesson.section : '');
  const lSecName = String(rawSecName || '').toLowerCase().trim();

  // If lesson explicitly specifies a section ID:
  if (lSecId) {
    const lessonSecObj = sections.find((s) => String(s.id) === lSecId);
    if (lessonSecObj) {
      const lessonSecName = (lessonSecObj.section_name || lessonSecObj.name || '').toLowerCase().trim();
      if (targetSecName && lessonSecName && targetSecName === lessonSecName) return true;
    }
    if (targetSecName && lSecName && targetSecName === lSecName) return true;
    // Explicitly assigned to a different section
    return false;
  }

  // If lesson does not have a section ID, check section name:
  if (lSecName) {
    const isClassWide = lSecName === 'class wide (all sections)' || 
                        lSecName === 'class wide' || 
                        lSecName === 'all sections' || 
                        lSecName === 'all';
    if (isClassWide) return true;
    if (targetSecName && lSecName === targetSecName) return true;
    return false;
  }

  // Class-wide lesson with no explicit section assigned applies to all sections
  return true;
}

/**
 * Checks if a student belongs to a target class.
 */
export function doesStudentMatchClass(student, targetClassId, classes = []) {
  if (!targetClassId || targetClassId === 'ALL') return true;
  if (!student) return false;
  const targetIdStr = String(targetClassId).trim();

  // 1. Direct or Equivalent Class ID match
  const equivalentIds = getEquivalentClassIds(targetClassId, classes);
  const stClsId = getClassId(student);
  if (stClsId && equivalentIds.has(stClsId)) return true;

  const targetClass = classes.find((c) => String(c.id) === targetIdStr) ||
                      classes.find((c) => (c.name || c.class_name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  const tName = (targetClass?.name || targetClass?.class_name || '').toLowerCase().trim();
  const tCode = (targetClass?.code || '').toLowerCase().trim();

  // If student has a class ID, check if it maps to a class with the same name/code
  if (stClsId) {
    const stClsObj = classes.find((c) => String(c.id) === stClsId);
    if (stClsObj) {
      const stClsName = (stClsObj.name || stClsObj.class_name || '').toLowerCase().trim();
      const stClsCode = (stClsObj.code || '').toLowerCase().trim();
      if (tName && stClsName && stClsName === tName) return true;
      if (tCode && stClsCode && stClsCode === tCode) return true;
      return false;
    }
  }

  // 2. Class name and code matching
  const candidateNames = [
    student.student_class_name,
    student.class_name,
    student.academic_class_name,
    typeof student.student_class === 'string' ? student.student_class : '',
    typeof student.academic_class === 'string' ? student.academic_class : '',
    typeof student.class === 'string' ? student.class : '',
    student.education_status,
    typeof student?.sub === 'string' ? student.sub : '',
  ].filter(Boolean).map((s) => String(s).toLowerCase().trim());

  if (tName && candidateNames.some((n) => n === tName)) {
    return true;
  }

  if (tCode && (student.class_code || candidateNames.some((n) => n === tCode))) {
    return true;
  }

  // Specific tier matching
  if (tName.includes('senior') && candidateNames.some((n) => n.includes('senior') || n.includes('khatm'))) return true;
  if (tName.includes('intermediate') && candidateNames.some((n) => n.includes('intermediate'))) return true;
  if (tName.includes('junior') && candidateNames.some((n) => n.includes('junior'))) return true;
  if (tName.includes('noorani') && candidateNames.some((n) => n.includes('noorani'))) return true;
  if (tName.includes('nazera') && candidateNames.some((n) => n.includes('nazera') || n.includes('nazira'))) return true;
  if (tName.includes('kitab') && candidateNames.some((n) => n.includes('kitab') || n.includes('mizan') || n.includes('fazilat'))) return true;
  if (tName.includes('class 6') && candidateNames.some((n) => n.includes('class 6'))) return true;
  if (tName.includes('class 7') && candidateNames.some((n) => n.includes('class 7'))) return true;
  if (tName.includes('class 8') && candidateNames.some((n) => n.includes('class 8'))) return true;

  return false;
}

/**
 * Checks if a student belongs to a target department.
 */
export function doesStudentMatchDepartment(student, targetDeptId, departments = [], classes = []) {
  if (!targetDeptId || targetDeptId === 'ALL') return true;
  if (!student) return false;
  const targetIdStr = String(targetDeptId).trim();

  // 1. Direct or equivalent department ID match
  const equivalentIds = getEquivalentDepartmentIds(targetDeptId, departments);
  const stDeptId = getDepartmentId(student);
  if (stDeptId && equivalentIds.has(stDeptId)) return true;

  // 2. Department name match
  const targetDept = departments.find((d) => String(d.id) === targetIdStr);
  const targetDeptName = (targetDept?.name || targetDept?.department_name || '').toLowerCase().trim();
  const stDeptName = (student.department_name || (typeof student.department === 'string' ? student.department : '')).toLowerCase().trim();
  if (targetDeptName && stDeptName && (targetDeptName === stDeptName || targetDeptName.includes(stDeptName) || stDeptName.includes(targetDeptName))) {
    return true;
  }

  // 3. Via Student's class
  for (const c of classes) {
    if (doesStudentMatchClass(student, c.id, classes)) {
      const cDeptId = getDepartmentId(c);
      if (cDeptId && equivalentIds.has(cDeptId)) return true;
      const cDeptName = (c.department_name || '').toLowerCase().trim();
      if (targetDeptName && cDeptName && (targetDeptName === cDeptName || targetDeptName.includes(cDeptName) || cDeptName.includes(targetDeptName))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a student belongs to a target section.
 */
export function doesStudentMatchSection(student, targetSectionId, sections = []) {
  if (!targetSectionId || targetSectionId === 'ALL' || targetSectionId === '') return true;
  if (!student) return false;
  const targetIdStr = String(targetSectionId).trim();

  // 1. Direct or Equivalent section ID
  const equivalentIds = getEquivalentSectionIds(targetSectionId, sections);
  const stSecId = getSectionId(student);
  if (stSecId && equivalentIds.has(stSecId)) return true;

  // 2. Section name match
  const targetSec = sections.find((s) => String(s.id) === targetIdStr) ||
                    sections.find((s) => (s.section_name || s.name || '').toLowerCase().trim() === targetIdStr.toLowerCase());
  const tSecName = (targetSec?.section_name || targetSec?.name || '').toLowerCase().trim();

  if (stSecId) {
    const stSecObj = sections.find((s) => String(s.id) === stSecId);
    if (stSecObj) {
      const stSecObjName = (stSecObj.section_name || stSecObj.name || '').toLowerCase().trim();
      if (tSecName && stSecObjName && tSecName === stSecObjName) return true;
    }
  }

  const stuSub = typeof student?.sub === 'string' ? student.sub : '';
  const rawStuSecName = student.section_name || (typeof student.section === 'string' && isNaN(Number(student.section)) ? student.section : '') || stuSub || '';
  const stSecName = String(rawStuSecName || '').toLowerCase().trim();
  if (tSecName && stSecName && tSecName === stSecName) {
    return true;
  }

  return false;
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
  const raw = book.teacherName || book.teacher_name || book.instructor || book.assignedTeacher || '';
  let name = typeof raw === 'object'
    ? (raw?.name_en || raw?.user_name || raw?.name || raw?.full_name || '')
    : String(raw || '');

  if (!name && book.teacher) {
    if (typeof book.teacher === 'object') {
      name = book.teacher?.name_en || book.teacher?.user_name || book.teacher?.name || book.teacher?.full_name || '';
    } else if (typeof book.teacher === 'string' && isNaN(Number(book.teacher)) && book.teacher.length > 1) {
      name = book.teacher;
    }
  }

  const teacherId = book.teacherId || book.teacher_id || (typeof book.teacher !== 'object' && book.teacher ? String(book.teacher) : '');
  if (!name && teacherId) {
    const targetId = String(teacherId);
    const matched =
      teachers.find((t) => String(t.id) === targetId || String(t.teacher_id) === targetId || String(t.user) === targetId || String(t.user_id) === targetId) ||
      staff.find((s) => String(s.id) === targetId || String(s.employee_id) === targetId || String(s.user) === targetId);
    if (matched) {
      name = matched.name_en || matched.user_name || matched.name || (matched.first_name ? `${matched.first_name} ${matched.last_name || ''}`.trim() : '') || matched.full_name || '';
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
  const cDeptId = getDepartmentId(targetClass) || departmentId;

  const filtered = curriculumBooks.filter((b) => {
    const bClassId = getClassId(b);
    if (bClassId && (bClassId === String(classId) || (targetClass && bClassId === String(targetClass.id)))) {
      return true;
    }
    const bClassName = (b.className || b.class_name || '').toLowerCase().trim();
    if (targetClassName && bClassName && (targetClassName === bClassName || targetClassName.includes(bClassName) || bClassName.includes(targetClassName))) {
      return true;
    }
    const bDeptId = getDepartmentId(b);
    if (cDeptId && bDeptId && cDeptId === bDeptId) {
      return true;
    }
    return false;
  });

  return filtered.length > 0 ? filtered : curriculumBooks;
}

/**
 * Calculates yesterday's date formatted as YYYY-MM-DD.
 */
export function getYesterdayDate(baseDate) {
  try {
    const d = baseDate ? new Date(baseDate) : new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Calculates tomorrow's date formatted as YYYY-MM-DD.
 */
export function getTomorrowDate(baseDate) {
  try {
    const d = baseDate ? new Date(baseDate) : new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

