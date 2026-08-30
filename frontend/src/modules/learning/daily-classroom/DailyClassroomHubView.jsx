import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import { PageContainer } from '../../../components/layout';
import {
  BookOpenIcon,
  ChecklistIcon,
  PlusIcon,
  CopyIcon,
  TimerIcon,
} from '../../../components/ui/Icons';
import { useAcademicData } from '../useAcademicData';
import { useTenant } from '../../../context/TenantContext';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { learningStore } from '../../../utils/stores/learningStore';
import { curriculumStore, getOrdinalPeriodLabel } from '../../../utils/localStore';
import { LessonDeliveryManagementView, LessonPlanDrawer, CarryForwardLessonModal } from './lessons';
import { StudentAssessmentManagementView, StudentAssessmentDrawer } from './assessment';

const TABS = [
  { id: 'LESSON', label: 'Daily Lesson Delivery', icon: BookOpenIcon },
  { id: 'ASSESSMENT', label: 'Daily Student Assessment', icon: ChecklistIcon },
];

export default function DailyClassroomHubView({
  hideHeader = false,
  isEmbedded = false,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const tenantId = activeTenantId || 'default';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'LESSON';
  const [activeTab, setActiveTab] = useState(activeTabParam);

  const { departments, classes, sections, students, periodSlots } = useAcademicData();

  // State
  const [selectedDate, setSelectedDate] = useState(() => {
    return searchParams.get('date') || new Date().toISOString().split('T')[0];
  });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [activePeriodId, setActivePeriodId] = useState('ALL');
  const [lessonSearch, setLessonSearch] = useState('');
  const [assessmentSearch, setAssessmentSearch] = useState('');

  // Data
  const [lessons, setLessons] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [curriculumBooks, setCurriculumBooks] = useState([]);

  // Carry forward modal state
  const [isBulkCarryForwardOpen, setIsBulkCarryForwardOpen] = useState(false);

  const loadData = useCallback(() => {
    try {
      const l = learningStore.getDailyLessons(tenantId);
      const e = learningStore.getEvaluations(tenantId);
      const b = curriculumStore.getItems(tenantId) || [];
      setLessons(l);
      setEvaluations(e);
      setCurriculumBooks(b);
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('spr_learning_updated', handleUpdate);
    window.addEventListener('spr_curriculum_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_learning_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_updated', handleUpdate);
    };
  }, [loadData]);

  // Synchronize Tab switcher with URL query
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  };

  // ── Department & Class Filtering ──
  const hasDepartments = departments && departments.length > 0;

  const departmentSelectOptions = useMemo(() => [
    { value: 'ALL', label: 'All Departments' },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ], [departments]);

  const filteredClassList = useMemo(() => {
    if (!hasDepartments || selectedDepartmentId === 'ALL') return classes;
    return classes.filter((c) => {
      const cDept = c.department !== undefined ? c.department : c.department_id;
      const cDeptId = typeof cDept === 'object' ? String(cDept?.id || '') : String(cDept || '');
      return cDeptId === String(selectedDepartmentId);
    });
  }, [classes, hasDepartments, selectedDepartmentId]);

  const classSelectOptions = useMemo(() => [
    { value: 'ALL', label: 'All Academic Classes' },
    ...filteredClassList.map((c) => ({ value: String(c.id), label: c.name || c.class_name })),
  ], [filteredClassList]);

  // Effective class ID
  const effectiveClassId = selectedClassId;

  const selectedClassObj = useMemo(() => {
    if (effectiveClassId === 'ALL') return null;
    return classes.find((c) => String(c.id) === String(effectiveClassId));
  }, [classes, effectiveClassId]);

  // ── Sections for selected class ──
  const filteredSectionList = useMemo(() => {
    if (effectiveClassId !== 'ALL') {
      const targetClassObj = classes.find((c) => String(c.id) === String(effectiveClassId));
      const targetClassName = (targetClassObj?.name || targetClassObj?.class_name || '').toLowerCase().trim();

      return sections.filter((s) => {
        const rawCls = s.student_class !== undefined ? s.student_class : (s.class_id || s.class);
        const sClsId = typeof rawCls === 'object' ? String(rawCls?.id || '') : String(rawCls || '');
        const sClsName = (s.student_class_name || s.class_name || '').toLowerCase().trim();

        const isIdMatch = sClsId === String(effectiveClassId);
        const isNameMatch = Boolean(targetClassName && sClsName && targetClassName === sClsName);
        return isIdMatch || isNameMatch;
      });
    }
    if (selectedDepartmentId !== 'ALL') {
      const validClassIds = new Set(filteredClassList.map((c) => String(c.id)));
      return sections.filter((s) => {
        const rawCls = s.student_class !== undefined ? s.student_class : (s.class_id || s.class);
        const sClsId = typeof rawCls === 'object' ? String(rawCls?.id || '') : String(rawCls || '');
        return validClassIds.has(sClsId);
      });
    }
    return sections;
  }, [sections, effectiveClassId, selectedDepartmentId, filteredClassList, classes]);

  const hasSectionsForClass = filteredSectionList.length > 0;

  const sectionSelectOptions = useMemo(() => [
    { value: 'ALL', label: 'All Sections' },
    ...filteredSectionList.map((s) => ({ value: String(s.id), label: s.section_name || 'Section' })),
  ], [filteredSectionList]);

  // ── Filtered Period Slots for current class ──
  const filteredPeriodsForClass = useMemo(() => {
    if (effectiveClassId === 'ALL') return periodSlots;

    const targetClassObj = classes.find((c) => String(c.id) === String(effectiveClassId));
    const targetClassName = (targetClassObj?.name || targetClassObj?.class_name || '').toLowerCase().trim();

    return periodSlots.filter((p) => {
      const rawCls = p.student_class !== undefined ? p.student_class : (p.class_id || p.class);
      const pClsId = typeof rawCls === 'object' ? String(rawCls?.id || '') : String(rawCls || '');
      const pClsName = (p.class_name || p.student_class_name || '').toLowerCase().trim();

      if (!pClsId && !pClsName) return true; // Global periods available for all

      const isIdMatch = pClsId === String(effectiveClassId);
      const isNameMatch = Boolean(targetClassName && pClsName && targetClassName === pClsName);
      if (!isIdMatch && !isNameMatch) return false;

      if (selectedSectionId !== 'ALL') {
        const rawSec = p.section !== undefined ? p.section : p.section_id;
        const pSecId = typeof rawSec === 'object' ? String(rawSec?.id || '') : String(rawSec || '');
        if (pSecId && pSecId !== String(selectedSectionId)) return false;
      }
      return true;
    });
  }, [periodSlots, effectiveClassId, selectedSectionId, classes]);

  // ── Helper: Match Lesson to Class ──
  const doesLessonMatchClass = useCallback((l, targetClassId) => {
    if (!targetClassId || targetClassId === 'ALL') return true;

    const lCls = l.academic_class !== undefined ? l.academic_class : (l.class_id || l.student_class);
    const lClsStr = typeof lCls === 'object' ? String(lCls?.id || '') : String(lCls || '');

    // 1. Direct ID match
    if (lClsStr === String(targetClassId)) return true;

    const targetClassObj = classes.find((c) => String(c.id) === String(targetClassId));
    if (!targetClassObj) return false;

    const targetClassName = (targetClassObj.name || targetClassObj.class_name || '').toLowerCase().trim();
    const lessonClassName = (l.class_name || '').toLowerCase().trim();

    // 2. Direct exact or partial Name match
    if (targetClassName && lessonClassName) {
      if (targetClassName === lessonClassName) return true;
      if (targetClassName.includes(lessonClassName) || lessonClassName.includes(targetClassName)) return true;
    }

    // 3. Match by relative index/position of class within its Department
    const targetDeptId = typeof targetClassObj.department === 'object'
      ? String(targetClassObj.department?.id || '')
      : String(targetClassObj.department !== undefined ? targetClassObj.department : (targetClassObj.department_id || ''));

    const classesInSameDept = classes.filter((c) => {
      const cDept = typeof c.department === 'object'
        ? String(c.department?.id || '')
        : String(c.department !== undefined ? c.department : (c.department_id || ''));
      return cDept && cDept === targetDeptId;
    });

    if (classesInSameDept.length > 0) {
      const targetIndex = classesInSameDept.findIndex((c) => String(c.id) === String(targetClassId));
      const lMatch = lClsStr.match(/\d+/);
      if (lMatch && targetIndex !== -1) {
        const lIndex = Number(lMatch[0]) - 1;
        if (lIndex === targetIndex) return true;
      }
    }

    return false;
  }, [classes]);

  // ── Helper: Match Lesson to Department ──
  const doesLessonMatchDepartment = useCallback((l, targetDeptId) => {
    if (!targetDeptId || targetDeptId === 'ALL') return true;

    const lDept = l.department_id !== undefined ? l.department_id : l.department;
    const lDeptStr = typeof lDept === 'object' ? String(lDept?.id || '') : String(lDept || '');

    // 1. Direct ID match
    if (lDeptStr && lDeptStr === String(targetDeptId)) return true;

    // 2. Name match
    const targetDeptObj = departments.find((d) => String(d.id) === String(targetDeptId));
    const targetDeptName = (targetDeptObj?.name || '').toLowerCase().trim();
    const lessonDeptName = (l.department_name || '').toLowerCase().trim();

    if (targetDeptName && lessonDeptName) {
      if (targetDeptName === lessonDeptName) return true;
      if (targetDeptName.includes(lessonDeptName) || lessonDeptName.includes(targetDeptName)) return true;
    }

    // 3. Match via matched class in classes list
    const matchedCls = classes.find((c) => doesLessonMatchClass(l, c.id));
    if (matchedCls) {
      const cDept = typeof matchedCls.department === 'object'
        ? String(matchedCls.department?.id || '')
        : String(matchedCls.department !== undefined ? matchedCls.department : (matchedCls.department_id || ''));
      if (cDept && cDept === String(targetDeptId)) return true;
    }

    // 4. Pattern / keyword matching
    if (lDeptStr.toLowerCase().includes('hifz') && targetDeptName.includes('hifz')) return true;
    if (lDeptStr.toLowerCase().includes('kitab') && targetDeptName.includes('kitab')) return true;
    if (lDeptStr.toLowerCase().includes('primary') && (targetDeptName.includes('primary') || targetDeptName.includes('general'))) return true;

    return false;
  }, [departments, classes, doesLessonMatchClass]);

  // ── Base Filtered Lessons (Filters by Date, Department, Class, Section & Search) ──
  const baseFilteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      // 1. Date filter
      if (selectedDate) {
        const lDate = String(l.lesson_date || '').split('T')[0];
        const targetDate = String(selectedDate).split('T')[0];
        if (lDate !== targetDate) return false;
      }

      // 2. Department filter
      if (selectedDepartmentId !== 'ALL') {
        if (!doesLessonMatchDepartment(l, selectedDepartmentId)) return false;
      }

      // 3. Class filter
      if (effectiveClassId !== 'ALL') {
        if (!doesLessonMatchClass(l, effectiveClassId)) return false;
      }

      // 4. Section filter
      if (selectedSectionId !== 'ALL') {
        const targetSec = sections.find((s) => String(s.id) === String(selectedSectionId));
        const targetSecName = (targetSec?.section_name || targetSec?.name || '').toLowerCase().trim();
        const lessonSecName = (l.section_name || '').toLowerCase().trim();

        const isSecIdMatch = l.section && String(l.section) === String(selectedSectionId);
        const isSecNameMatch = Boolean(targetSecName && lessonSecName && targetSecName === lessonSecName);
        if (!isSecIdMatch && !isSecNameMatch) return false;
      }

      // 5. Search query
      if (lessonSearch.trim()) {
        const q = lessonSearch.toLowerCase();
        const matchTitle = (l.lesson_title || '').toLowerCase().includes(q);
        const matchBook = (l.curriculum_book_name || '').toLowerCase().includes(q);
        const matchTeacher = (l.teacher_name || '').toLowerCase().includes(q);
        const matchInstructions = (l.lesson_instructions || '').toLowerCase().includes(q);
        return matchTitle || matchBook || matchTeacher || matchInstructions;
      }

      return true;
    });
  }, [lessons, selectedDate, selectedDepartmentId, effectiveClassId, selectedSectionId, lessonSearch, sections, doesLessonMatchDepartment, doesLessonMatchClass]);

  // ── Robust Universal Period Order Extractor ──
  const extractPeriodOrder = useCallback((item) => {
    if (!item) return null;
    if (typeof item === 'number') return item;

    // 1. Direct explicit numeric period_order or order
    if (item.period_order !== undefined && item.period_order !== null && !isNaN(Number(item.period_order))) {
      return Number(item.period_order);
    }
    if (item.order !== undefined && item.order !== null && !isNaN(Number(item.order))) {
      return Number(item.order);
    }

    // 2. Check if item is an evaluation with a parent lesson_plan
    if (item.lesson_plan) {
      const parentLesson = lessons.find((l) => String(l.id) === String(item.lesson_plan));
      if (parentLesson && parentLesson !== item) {
        const pOrder = extractPeriodOrder(parentLesson);
        if (pOrder !== null) return pOrder;
      }
    }

    // 3. Check period_slot (e.g. "period_1", "slot_2", "1")
    if (item.period_slot) {
      // If period_slot is an ID referencing an entry in periodSlots
      const matchedSlot = periodSlots.find((p) => String(p.id) === String(item.period_slot));
      if (matchedSlot) {
        if (matchedSlot.order !== undefined && !isNaN(Number(matchedSlot.order))) {
          return Number(matchedSlot.order);
        }
        if (matchedSlot.period_order !== undefined && !isNaN(Number(matchedSlot.period_order))) {
          return Number(matchedSlot.period_order);
        }
      }

      const slotStr = String(item.period_slot);
      const slotMatch = slotStr.match(/\d+/);
      if (slotMatch) return Number(slotMatch[0]);
    }

    // 4. Check period_name string (e.g. "1st Period: ...", "2nd Period")
    if (item.period_name || item.name) {
      const nameStr = String(item.period_name || item.name || '');
      const periodMatch = nameStr.match(/(\d+)(?:st|nd|rd|th)?\s*period/i);
      if (periodMatch) return Number(periodMatch[1]);
      const numMatch = nameStr.match(/^(\d+)/);
      if (numMatch) return Number(numMatch[1]);
    }

    return null;
  }, [lessons, periodSlots]);

  // ── Universal Slot Matcher ──
  const isLessonInSlot = useCallback((lesson, slotValue) => {
    if (slotValue === 'ALL') return true;
    if (slotValue === 'UNASSIGNED') {
      const order = extractPeriodOrder(lesson);
      return !order && !lesson.period_slot;
    }
    const lOrder = extractPeriodOrder(lesson);
    const targetOrder = Number(slotValue);

    if (lOrder !== null && !isNaN(targetOrder)) {
      if (lOrder === targetOrder) return true;
    }
    if (String(lesson.period_slot) === String(slotValue)) return true;
    if (String(lesson.period_order) === String(slotValue)) return true;
    return false;
  }, [extractPeriodOrder]);

  // ── Dynamic Routine Period Filter Options (Deduplicated, Clean Ordinal Period Numbers 1st, 2nd, 3rd...) ──
  const allPeriodFilterOptions = useMemo(() => {
    const options = [{ value: 'ALL', label: 'All Periods', order: 0 }];
    const seenOrders = new Set();
    const activeSlots = effectiveClassId === 'ALL' ? periodSlots : filteredPeriodsForClass;

    // 1. Collect all distinct period orders from configured slots
    activeSlots.forEach((p) => {
      const order = extractPeriodOrder(p);
      if (order) seenOrders.add(order);
    });

    // 2. Also collect period orders from lessons matching today's filters
    let hasUnassigned = false;
    baseFilteredLessons.forEach((l) => {
      const order = extractPeriodOrder(l);
      if (order) {
        seenOrders.add(order);
      } else {
        hasUnassigned = true;
      }
    });

    // If no specific periods found, default to standard periods 1 through 6
    if (seenOrders.size === 0) {
      [1, 2, 3, 4, 5, 6].forEach((o) => seenOrders.add(o));
    }

    // 3. Sort orders ascending (1, 2, 3, 4, 5, 6...) and build clean options
    const sortedOrders = Array.from(seenOrders).sort((a, b) => a - b);
    sortedOrders.forEach((order) => {
      options.push({
        value: String(order),
        label: getOrdinalPeriodLabel(order),
        order,
      });
    });

    // 4. Add unassigned option if there are unassigned lessons
    if (hasUnassigned) {
      options.push({
        value: 'UNASSIGNED',
        label: 'No Period',
        order: 999,
      });
    }

    return options;
  }, [effectiveClassId, periodSlots, filteredPeriodsForClass, baseFilteredLessons]);

  // Reset activePeriodId if selected period is not in available options
  useEffect(() => {
    if (activePeriodId !== 'ALL') {
      const isValidOption = allPeriodFilterOptions.some((opt) => opt.value === activePeriodId);
      if (!isValidOption) {
        setActivePeriodId('ALL');
      }
    }
  }, [allPeriodFilterOptions, activePeriodId]);

  // ── Final Filtered Lessons (Applies Active Period Filter) ──
  const filteredLessons = useMemo(() => {
    if (activePeriodId === 'ALL') {
      return baseFilteredLessons;
    }
    return baseFilteredLessons.filter((l) => isLessonInSlot(l, activePeriodId));
  }, [baseFilteredLessons, activePeriodId]);

  // Count lessons in each period slot (Guaranteed 100% consistent with All Periods count)
  const getSlotLessonsCount = useCallback((slotValue) => {
    if (slotValue === 'ALL') {
      return baseFilteredLessons.length;
    }
    return baseFilteredLessons.filter((l) => isLessonInSlot(l, slotValue)).length;
  }, [baseFilteredLessons]);

  // Resolve book name(s) assigned for period slot
  const getBookNamesForPeriod = useCallback((slotValue) => {
    if (slotValue === 'ALL') return 'All Books';
    if (slotValue === 'UNASSIGNED') return 'General Sabaq';

    // 1. Check if any lesson matching this period today has a curriculum_book_name
    const lessonsInSlot = baseFilteredLessons.filter((l) => isLessonInSlot(l, slotValue));
    const bookNames = Array.from(
      new Set(lessonsInSlot.map((l) => l.curriculum_book_name || l.subject_name).filter(Boolean))
    );
    if (bookNames.length > 0) {
      return bookNames.join(', ');
    }

    // 2. Fallback to curriculumBooks configured for this class/period
    const targetOrder = Number(slotValue);
    const matchedCurriculum = curriculumBooks.filter((b) => {
      if (effectiveClassId !== 'ALL' && b.classId && String(b.classId) !== String(effectiveClassId)) return false;
      const bOrder = extractPeriodOrder(b);
      return bOrder === targetOrder;
    });

    if (matchedCurriculum.length > 0) {
      const names = Array.from(new Set(matchedCurriculum.map((b) => b.name).filter(Boolean)));
      if (names.length > 0) return names.join(', ');
    }

    return 'No Book Assigned';
  }, [baseFilteredLessons, curriculumBooks, effectiveClassId]);

  // Resolve period timing for period slot
  const getPeriodTimeForSlot = useCallback((slotValue) => {
    if (slotValue === 'ALL') return 'All Day Routine';
    if (slotValue === 'UNASSIGNED') return 'Flexible Time';

    // 1. Check if any lesson matching this period today has a period_time
    const matchedLesson = baseFilteredLessons.find(
      (l) => isLessonInSlot(l, slotValue) && l.period_time
    );
    if (matchedLesson?.period_time) {
      return matchedLesson.period_time;
    }

    // 2. Check periodSlots matching order
    const targetOrder = Number(slotValue);
    const matchedSlot = periodSlots.find((p) => {
      if (effectiveClassId !== 'ALL') {
        const pCls = p.student_class !== undefined ? p.student_class : (p.class_id || p.class);
        const pClsId = typeof pCls === 'object' ? String(pCls?.id || '') : String(pCls || '');
        if (pClsId && pClsId !== String(effectiveClassId)) return false;
      }
      return extractPeriodOrder(p) === targetOrder;
    }) || periodSlots.find((p) => extractPeriodOrder(p) === targetOrder);

    if (matchedSlot?.start_time && matchedSlot?.end_time) {
      return `${matchedSlot.start_time.slice(0, 5)} - ${matchedSlot.end_time.slice(0, 5)}`;
    }
    if (matchedSlot?.time_range) {
      return matchedSlot.time_range;
    }

    // Default standard madrasah/school timings
    const defaultTimings = {
      1: '06:30 AM - 07:30 AM',
      2: '07:30 AM - 08:30 AM',
      3: '09:00 AM - 10:00 AM',
      4: '10:00 AM - 11:00 AM',
      5: '11:15 AM - 12:15 PM',
      6: '02:00 PM - 03:00 PM',
      7: '03:00 PM - 04:00 PM',
      8: '04:15 PM - 05:15 PM',
    };

    return defaultTimings[targetOrder] || 'Routine Time';
  }, [baseFilteredLessons, periodSlots, effectiveClassId]);

  // ── Filter Enrolled Students ──
  const enrolledStudents = useMemo(() => {
    const targetClassObj = effectiveClassId !== 'ALL' ? classes.find((c) => String(c.id) === String(effectiveClassId)) : null;
    const targetClassName = (targetClassObj?.name || targetClassObj?.class_name || '').toLowerCase().trim();

    return students.filter((st) => {
      const stCls = st.student_class !== undefined ? st.student_class : (st.class_id || st.class);
      const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');
      const stClsName = (st.student_class_name || st.class_name || '').toLowerCase().trim();

      if (effectiveClassId !== 'ALL') {
        const isIdMatch = stClsId === String(effectiveClassId);
        const isNameMatch = Boolean(targetClassName && stClsName && targetClassName === stClsName);
        if (!isIdMatch && !isNameMatch) return false;
      } else if (selectedDepartmentId !== 'ALL') {
        const validClassIds = new Set(filteredClassList.map((c) => String(c.id)));
        if (!validClassIds.has(stClsId)) return false;
      }

      if (selectedSectionId !== 'ALL') {
        const stSec = st.section !== undefined ? st.section : (st.section_id || st.student_section);
        const stSecId = typeof stSec === 'object' ? String(stSec?.id || '') : String(stSec || '');
        if (stSecId && stSecId !== String(selectedSectionId)) return false;
      }

      return true;
    });
  }, [students, effectiveClassId, selectedDepartmentId, filteredClassList, selectedSectionId, classes]);

  // Assessment rows for Tab 2 (Period-aware Evaluation Matrix)
  const assessmentRows = useMemo(() => {
    return enrolledStudents.filter((st) => {
      const name = (st.name_en || st.name || '').toLowerCase();
      const id = (st.uniq_id || st.roll_number || '').toLowerCase();
      return assessmentSearch === '' || name.includes(assessmentSearch.toLowerCase()) || id.includes(assessmentSearch.toLowerCase());
    }).map((st) => {
      const evalsForStudent = evaluations.filter(
        (e) => String(e.student) === String(st.id) && e.evaluation_date === selectedDate
      );

      const matchedEval = activePeriodId === 'ALL'
        ? evalsForStudent[0]
        : evalsForStudent.find((e) => isLessonInSlot(e, activePeriodId));

      const stCls = st.student_class !== undefined ? st.student_class : (st.class_id || st.class);
      const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');

      const relevantLesson = filteredLessons.find((l) => doesLessonMatchClass(l, stClsId, classes, departments)) ||
                             baseFilteredLessons.find((l) => doesLessonMatchClass(l, stClsId, classes, departments));

      const hasAssignedLesson = Boolean(relevantLesson || matchedEval);
      const curriculumBookName = matchedEval?.curriculum_book_name || relevantLesson?.curriculum_book_name || '';
      const subjectName = matchedEval?.subject_name || relevantLesson?.subject_name || '';
      const lessonTitle = matchedEval?.lesson_covered || relevantLesson?.lesson_title || '';
      const startUnit = matchedEval?.start_unit || relevantLesson?.start_unit || '';
      const endUnit = matchedEval?.end_unit || relevantLesson?.end_unit || '';

      return {
        id: st.id,
        student: st.id,
        student_name: st.name_en || st.name || 'Student',
        student_uniq_id: st.uniq_id || st.roll_number || 'N/A',
        student_class_name: st.student_class_name || 'Standard Division',
        evaluation_date: selectedDate,
        is_evaluated: Boolean(matchedEval),
        has_assigned_lesson: hasAssignedLesson,
        evaluation_status: matchedEval?.evaluation_status || 'NOT_EVALUATED',
        curriculum_book_name: curriculumBookName,
        subject_name: subjectName,
        lesson_title: lessonTitle,
        lesson_covered: matchedEval?.lesson_covered || lessonTitle,
        start_unit: startUnit,
        end_unit: endUnit,
        score: matchedEval?.score !== undefined ? matchedEval.score : '—',
        recitation_score: matchedEval?.recitation_score !== undefined
          ? matchedEval.recitation_score
          : (matchedEval?.score !== undefined ? matchedEval.score : '—'),
        homework_score: matchedEval?.homework_score !== undefined
          ? matchedEval.homework_score
          : (matchedEval?.score !== undefined ? matchedEval.score : '—'),
        total_mistakes: matchedEval?.total_mistakes || 0,
        total_stucks: matchedEval?.total_stucks || 0,
        fluency_rating: matchedEval?.fluency_rating || '—',
        teacher_remarks: matchedEval?.teacher_remarks || '—',
      };
    });
  }, [enrolledStudents, assessmentSearch, evaluations, selectedDate, activePeriodId, filteredLessons, baseFilteredLessons, classes, departments]);

  // Count assessments evaluated per period slot
  const getSlotAssessmentCount = useCallback((slotValue) => {
    if (slotValue === 'ALL') {
      return evaluations.filter(
        (e) => e.evaluation_date === selectedDate && enrolledStudents.some((s) => String(s.id) === String(e.student))
      ).length;
    }
    return evaluations.filter(
      (e) => e.evaluation_date === selectedDate &&
             isLessonInSlot(e, slotValue) &&
             enrolledStudents.some((s) => String(s.id) === String(e.student))
    ).length;
  }, [evaluations, selectedDate, enrolledStudents]);

  // ── Metrics ──
  const activePeriodsCount = useMemo(() => {
    const pSet = new Set(filteredLessons.map((l) => l.period_slot || l.period_name).filter(Boolean));
    return pSet.size;
  }, [filteredLessons]);

  const lessonMetrics = useMemo(() => [
    { label: 'Assigned Lessons', value: filteredLessons.length, subValue: 'Delivered for selected date & period' },
    { label: 'Active Periods', value: activePeriodsCount || filteredLessons.length, subValue: 'Routine slots utilized' },
    { label: 'Enrolled Classes', value: classes.length, subValue: 'Active divisions' },
    { label: 'Instructions Dispatched', value: filteredLessons.filter((l) => l.lesson_instructions).length, subValue: 'Guidelines attached' },
  ], [filteredLessons, activePeriodsCount, classes]);

  const assessmentMetrics = useMemo(() => {
    const evaluated = assessmentRows.filter((r) => r.is_evaluated && r.evaluation_status !== 'ABSENT').length;
    const mistakes = assessmentRows.reduce((acc, r) => acc + (Number(r.total_mistakes) || 0), 0);
    const stucks = assessmentRows.reduce((acc, r) => acc + (Number(r.total_stucks) || 0), 0);
    return [
      { label: 'Enrolled Students', value: enrolledStudents.length, subValue: 'Class roster count' },
      { label: 'Assessed Today', value: evaluated, subValue: 'Evaluated students' },
      { label: 'Total Mistakes', value: mistakes, subValue: 'Errors flagged' },
      { label: 'Total Stucks', value: stucks, subValue: 'Lukmah occurrences' },
    ];
  }, [assessmentRows, enrolledStudents]);

  // ── Right Sidebar Drawer Registrations ──
  useDrawerRegistration(
    'lesson_plan',
    (params) => {
      const mode = params.get('mode') || 'add';
      const lessonId = params.get('id');
      const foundLesson = lessonId ? lessons.find((l) => String(l.id) === String(lessonId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Lesson Plan & Assignment' : 'Assign Daily Sabaq & Lesson',
        subtitle: mode === 'edit'
          ? `Update details for ${foundLesson?.lesson_title || 'Lesson'}`
          : 'Define homework, instruction milestones, and target page span',
        category: 'Academic Learning',
        size: 'lg',
        width: 'lg',
        content: (
          <LessonPlanDrawer
            key={`lesson-plan-drawer-${mode}-${lessonId || 'new'}`}
            lesson={foundLesson}
            defaultDepartmentId={selectedDepartmentId !== 'ALL' ? selectedDepartmentId : ''}
            defaultClassId={effectiveClassId !== 'ALL' ? effectiveClassId : ''}
            defaultSectionId={selectedSectionId !== 'ALL' ? selectedSectionId : ''}
            defaultPeriodId={activePeriodId !== 'ALL' ? activePeriodId : ''}
            defaultDate={selectedDate}
            onSaveSuccess={() => {
              loadData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [lessons, selectedDepartmentId, effectiveClassId, selectedSectionId, activePeriodId, selectedDate, loadData, closeDrawer]
  );

  useDrawerRegistration(
    'student_assessment',
    (params) => {
      const studentId = params.get('studentId') || '';
      const date = params.get('date') || selectedDate;
      const foundStudent = students.find((s) => String(s.id) === String(studentId));
      const foundEval = evaluations.find(
        (e) => String(e.student) === String(studentId) && e.evaluation_date === date
      );

      return {
        title: foundEval ? 'Edit Student Assessment' : 'Evaluate Student Performance',
        subtitle: foundStudent
          ? `${foundStudent.name_en || foundStudent.name} (${foundStudent.uniq_id || foundStudent.roll_number || 'N/A'})`
          : 'Evaluate performance, mistakes, stucks, and lesson scores',
        category: 'Academic Learning',
        size: 'lg',
        width: 'lg',
        content: (
          <StudentAssessmentDrawer
            key={`assessment-drawer-${studentId}-${date}`}
            studentId={studentId}
            date={date}
            evaluation={foundEval}
            onSaveSuccess={() => {
              loadData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [students, evaluations, selectedDate, loadData, closeDrawer]
  );

  const handleOpenAddLesson = () => {
    openDrawer('lesson_plan', { mode: 'add' });
  };

  const handleEditLesson = (lesson) => {
    openDrawer('lesson_plan', { mode: 'edit', id: lesson.id });
  };

  const handleOpenAssessmentDrawer = (studentId) => {
    openDrawer('student_assessment', { studentId, date: selectedDate });
  };

  return (
    <PageContainer isEmbedded={isEmbedded} className="space-y-4">
      {/* 1. Page Header */}
      {!hideHeader && (
        <PageHeader
          title="Daily Classroom & Sabaq Delivery"
          subtitle="Plan and monitor daily lesson assignments, homework dispatch, evaluation rubrics, and individual student diary assessments."
          icon={BookOpenIcon}
          actions={
            <div className="flex items-center gap-2">
              {activeTab === 'LESSON' && (
                <CustomButton
                  type="button"
                  variant="sub"
                  size="sm"
                  icon={CopyIcon}
                  onClick={() => setIsBulkCarryForwardOpen(true)}
                  title="Carry forward lessons from yesterday"
                >
                  Carry Forward
                </CustomButton>
              )}

              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={activeTab === 'LESSON' ? handleOpenAddLesson : () => handleOpenAssessmentDrawer('')}
              >
                {activeTab === 'LESSON' ? 'Add Daily Sabaq' : 'Evaluate Student'}
              </CustomButton>
            </div>
          }
        />
      )}

      {/* 2. Tab Switcher */}
      <TabSwitcher
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {/* 3. Tab 1: Daily Lesson Delivery */}
      {activeTab === 'LESSON' && (
        <LessonDeliveryManagementView
          filteredLessons={filteredLessons}
          lessonMetrics={lessonMetrics}
          lessonSearch={lessonSearch}
          onSearchChange={setLessonSearch}
          selectedDate={selectedDate}
          onDateChange={(val) => {
            setSelectedDate(val);
            setActivePeriodId('ALL');
          }}
          selectedDepartmentId={selectedDepartmentId}
          onDepartmentChange={(val) => {
            setSelectedDepartmentId(val);
            setSelectedClassId('ALL');
            setSelectedSectionId('ALL');
            setActivePeriodId('ALL');
          }}
          departmentSelectOptions={departmentSelectOptions}
          hasDepartments={hasDepartments}
          selectedClassId={selectedClassId}
          onClassChange={(val) => {
            setSelectedClassId(val);
            setSelectedSectionId('ALL');
            setActivePeriodId('ALL');
          }}
          classSelectOptions={classSelectOptions}
          selectedSectionId={selectedSectionId}
          onSectionChange={(val) => {
            setSelectedSectionId(val);
            setActivePeriodId('ALL');
          }}
          sectionSelectOptions={sectionSelectOptions}
          hasSectionsForClass={hasSectionsForClass}
          activePeriodId={activePeriodId}
          onPeriodChange={setActivePeriodId}
          allPeriodFilterOptions={allPeriodFilterOptions}
          getSlotLessonsCount={getSlotLessonsCount}
          getBookNamesForPeriod={getBookNamesForPeriod}
          getPeriodTimeForSlot={getPeriodTimeForSlot}
          selectedClassObj={selectedClassObj}
          classes={classes}
          tenantId={tenantId}
          loadData={loadData}
          onOpenAddLesson={handleOpenAddLesson}
          onEditLesson={handleEditLesson}
          onOpenBulkCarryForward={() => setIsBulkCarryForwardOpen(true)}
        />
      )}

      {/* 4. Tab 2: Daily Student Assessment */}
      {activeTab === 'ASSESSMENT' && (
        <StudentAssessmentManagementView
          assessmentRows={assessmentRows}
          assessmentMetrics={assessmentMetrics}
          assessmentSearch={assessmentSearch}
          onSearchChange={setAssessmentSearch}
          selectedDate={selectedDate}
          onDateChange={(val) => {
            setSelectedDate(val);
            setActivePeriodId('ALL');
          }}
          selectedDepartmentId={selectedDepartmentId}
          onDepartmentChange={(val) => {
            setSelectedDepartmentId(val);
            setSelectedClassId('ALL');
            setSelectedSectionId('ALL');
            setActivePeriodId('ALL');
          }}
          departmentSelectOptions={departmentSelectOptions}
          hasDepartments={hasDepartments}
          selectedClassId={selectedClassId}
          onClassChange={(val) => {
            setSelectedClassId(val);
            setSelectedSectionId('ALL');
            setActivePeriodId('ALL');
          }}
          classSelectOptions={classSelectOptions}
          selectedSectionId={selectedSectionId}
          onSectionChange={(val) => {
            setSelectedSectionId(val);
            setActivePeriodId('ALL');
          }}
          sectionSelectOptions={sectionSelectOptions}
          hasSectionsForClass={hasSectionsForClass}
          activePeriodId={activePeriodId}
          onPeriodChange={setActivePeriodId}
          allPeriodFilterOptions={allPeriodFilterOptions}
          getSlotLessonsCount={getSlotLessonsCount}
          getSlotAssessmentCount={getSlotAssessmentCount}
          getPeriodTimeForSlot={getPeriodTimeForSlot}
          onOpenAssessmentDrawer={handleOpenAssessmentDrawer}
        />
      )}

      {/* Bulk Carry-Forward Modal */}
      <CarryForwardLessonModal
        isOpen={isBulkCarryForwardOpen}
        onClose={() => setIsBulkCarryForwardOpen(false)}
        mode="bulk"
        currentDate={selectedDate}
        selectedClassId={effectiveClassId}
        selectedClassObj={selectedClassObj}
        classes={classes}
        onSuccess={loadData}
      />
    </PageContainer>
  );
}
