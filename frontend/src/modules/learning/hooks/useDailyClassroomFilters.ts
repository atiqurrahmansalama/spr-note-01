import { useMemo, useEffect, useCallback } from 'react';
import { getOrdinalPeriodLabel } from '@/stores';
import {
  extractPeriodOrder,
  resolvePeriodTime,
  getClassId,
  doesLessonMatchDepartment,
  doesLessonMatchClass,
  doesLessonMatchSection,
  doesStudentMatchClass,
  doesStudentMatchDepartment,
  doesStudentMatchSection,
  isLessonInSlot,
} from '../utils/dailyClassroomUtils';

export interface UseDailyClassroomFiltersParams {
  lessons?: any[];
  departments?: any[];
  classes?: any[];
  sections?: any[];
  students?: any[];
  periodSlots?: any[];
  curriculumBooks?: any[];
  selectedDate?: string;
  selectedDepartmentId?: string;
  selectedClassId?: string;
  selectedSectionId?: string;
  activePeriodId?: string;
  setSelectedDepartmentId?: (val: string) => void;
  setSelectedClassId?: (val: string) => void;
  setSelectedSectionId?: (val: string) => void;
  setActivePeriodId?: (val: string) => void;
}

export interface UseDailyClassroomFiltersReturn {
  hasDepartments: boolean;
  departmentSelectOptions: Array<{ value: string; label: string }>;
  filteredClassList: any[];
  classSelectOptions: Array<{ value: string; label: string }>;
  selectedClassObj: any;
  filteredSectionsForClass: any[];
  hasSectionsForClass: boolean;
  sectionSelectOptions: Array<{ value: string; label: string }>;
  allPeriodFilterOptions: any[];
  baseFilteredLessons: any[];
  filteredLessons: any[];
  enrolledStudents: any[];
  getSlotLessonsCount: (slotValue: string | number) => number;
  getBookNamesForPeriod: (slotValue: string | number) => string;
  getPeriodTimeForSlot: (slotValue: string | number) => string;
}

/**
 * useDailyClassroomFilters (also useLearningClassroomFilters)
 * Computes all filter-derived data across learning activities.
 */
export default function useDailyClassroomFilters({
  lessons = [],
  departments = [],
  classes = [],
  sections = [],
  students = [],
  periodSlots = [],
  curriculumBooks = [],
  selectedDate,
  selectedDepartmentId,
  selectedClassId,
  selectedSectionId,
  activePeriodId,
  setSelectedDepartmentId,
  setSelectedClassId,
  setSelectedSectionId,
  setActivePeriodId,
}: UseDailyClassroomFiltersParams): UseDailyClassroomFiltersReturn {
  const effectiveClassId = selectedClassId;
  const hasDepartments = departments && departments.length > 0;

  // ── Select Options (Clean & Deduplicated — Zero "ALL" Options) ─────────────

  const departmentSelectOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    const seenNames = new Set<string>();
    (departments || []).forEach((d) => {
      const name = (d.name || d.department_name || '').trim();
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        opts.push({ value: String(d.id), label: name });
      }
    });
    return opts;
  }, [departments]);

  const filteredClassList = useMemo(() => {
    let list = classes || [];
    if (hasDepartments && selectedDepartmentId) {
      list = list.filter((c) => doesLessonMatchDepartment(c, selectedDepartmentId, departments, classes));
    }
    const seenClassNames = new Set<string>();
    const cleanList: any[] = [];
    list.forEach((c) => {
      const name = (c.name || c.class_name || '').trim();
      if (name && !seenClassNames.has(name.toLowerCase())) {
        seenClassNames.add(name.toLowerCase());
        cleanList.push(c);
      }
    });
    return cleanList;
  }, [classes, departments, hasDepartments, selectedDepartmentId]);

  const classSelectOptions = useMemo(() => {
    return filteredClassList.map((c) => ({
      value: String(c.id),
      label: c.name || c.class_name,
    }));
  }, [filteredClassList]);

  const selectedClassObj = useMemo(() => {
    if (!effectiveClassId) return filteredClassList[0] || null;
    return (classes || []).find((c) => String(c.id) === String(effectiveClassId)) ||
           (classes || []).find((c) => (c.name || c.class_name || '').toLowerCase().trim() === String(effectiveClassId).toLowerCase()) || null;
  }, [classes, effectiveClassId, filteredClassList]);

  const filteredSectionsForClass = useMemo(() => {
    let list = sections || [];
    if (effectiveClassId) {
      list = list.filter((s) => doesStudentMatchClass(s, effectiveClassId, classes));
    } else if (selectedDepartmentId) {
      const validClassIds = new Set(filteredClassList.map((c) => String(c.id)));
      list = list.filter((s) => {
        const sClsId = getClassId(s);
        return validClassIds.has(sClsId) || doesLessonMatchDepartment(s, selectedDepartmentId, departments, classes);
      });
    }

    const seenSecNames = new Set<string>();
    const cleanSecList: any[] = [];
    list.forEach((s) => {
      const name = (s.section_name || s.name || `Section ${s.id}`).trim();
      if (name && !seenSecNames.has(name.toLowerCase())) {
        seenSecNames.add(name.toLowerCase());
        cleanSecList.push(s);
      }
    });
    return cleanSecList;
  }, [sections, classes, effectiveClassId, selectedDepartmentId, filteredClassList, departments]);

  const hasSectionsForClass = filteredSectionsForClass.length > 0;

  const sectionSelectOptions = useMemo(() => {
    return filteredSectionsForClass.map((s) => ({
      value: String(s.id),
      label: s.section_name || s.name || `Section ${s.id}`,
    }));
  }, [filteredSectionsForClass]);

  // ── Dynamic Routine Period Slots ──

  const filteredPeriodsForClass = useMemo(() => {
    const allCustomSlots = Array.isArray(periodSlots) ? periodSlots : [];

    if (allCustomSlots.length === 0) {
      const lessonSlots = new Map();
      (lessons || []).forEach((l) => {
        const order = extractPeriodOrder(l);
        if (order && !lessonSlots.has(order)) {
          lessonSlots.set(order, {
            id: l.period_slot || l.period_slot_id || `slot_${order}`,
            period_name: l.period_name || getOrdinalPeriodLabel(order),
            period_order: order,
            order_rank: order,
            start_time: l.start_time || '',
            end_time: l.end_time || '',
          });
        }
      });
      if (lessonSlots.size > 0) {
        return Array.from(lessonSlots.values()).sort(
          (a, b) => (Number(a.period_order) || 0) - (Number(b.period_order) || 0)
        );
      }

      return [1, 2, 3, 4, 5, 6, 7].map((num) => ({
        id: String(num),
        period_name: getOrdinalPeriodLabel(num),
        period_order: num,
        order_rank: num,
        start_time: '',
        end_time: '',
      }));
    }

    const scopedSlots = allCustomSlots.filter((p) => {
      if (effectiveClassId) {
        return doesLessonMatchClass(p, effectiveClassId, classes);
      }
      if (selectedDepartmentId) {
        return doesLessonMatchDepartment(p, selectedDepartmentId, departments, classes);
      }
      return true;
    });

    const targetSlots = scopedSlots.length > 0 ? scopedSlots : allCustomSlots;
    if (targetSlots.length === 0) {
      return [1, 2, 3, 4, 5, 6, 7].map((num) => ({
        id: String(num),
        period_name: getOrdinalPeriodLabel(num),
        period_order: num,
        order_rank: num,
        start_time: '',
        end_time: '',
      }));
    }

    const slotMap = new Map();
    targetSlots.forEach((slot) => {
      const order = extractPeriodOrder(slot) || slot.order_rank || slot.period_order;
      const key = order ? String(order) : String(slot.id);

      const isClassSpecific = effectiveClassId && doesLessonMatchClass(slot, effectiveClassId, classes);
      const existing = slotMap.get(key);

      if (!existing || isClassSpecific) {
        slotMap.set(key, {
          ...slot,
          id: slot.id,
          period_name: slot.period_name || slot.name || (order ? getOrdinalPeriodLabel(order) : 'Period Slot'),
          period_order: order || 1,
          order_rank: order || 1,
          start_time: slot.start_time ? String(slot.start_time).slice(0, 5) : '',
          end_time: slot.end_time ? String(slot.end_time).slice(0, 5) : '',
          curriculum_book_name: isClassSpecific ? slot.curriculum_book_name : slot.curriculum_book_name || null,
          book_id: isClassSpecific ? slot.book_id : slot.book_id || null,
          teacher_name: isClassSpecific ? slot.teacher_name : slot.teacher_name || null,
          teacher_id: isClassSpecific ? slot.teacher_id : slot.teacher_id || null,
        });
      }
    });

    return Array.from(slotMap.values()).sort(
      (a, b) => (Number(a.period_order) || 0) - (Number(b.period_order) || 0)
    );
  }, [periodSlots, lessons, effectiveClassId, selectedDepartmentId, classes, departments]);

  // ── Cascade Validity Sync ──────
  useEffect(() => {
    if (selectedDepartmentId && (departments || []).length > 0) {
      const existsInDb = (departments || []).some((d) => String(d.id) === String(selectedDepartmentId));
      if (!existsInDb && setSelectedDepartmentId) {
        setSelectedDepartmentId('');
      }
    }
  }, [departments, selectedDepartmentId, setSelectedDepartmentId]);

  useEffect(() => {
    if (selectedClassId && (classes || []).length > 0) {
      const existsInDb = (classes || []).some((c) => String(c.id) === String(selectedClassId));
      if (!existsInDb && setSelectedClassId) {
        setSelectedClassId('');
      }
    }
  }, [classes, selectedClassId, setSelectedClassId]);

  useEffect(() => {
    if (selectedSectionId && (sections || []).length > 0) {
      const existsInDb = (sections || []).some((s) => String(s.id) === String(selectedSectionId));
      if (!existsInDb && setSelectedSectionId) {
        setSelectedSectionId('');
      }
    }
  }, [sections, selectedSectionId, setSelectedSectionId]);

  // ── Period Filter Options ─────────────────────────────────

  const allPeriodFilterOptions = useMemo(() => {
    const options: any[] = [];
    const activeSlots = filteredPeriodsForClass;

    const sortedSlots = [...activeSlots].sort((a, b) => {
      return (extractPeriodOrder(a) || a.order_rank || 0) - (extractPeriodOrder(b) || b.order_rank || 0);
    });

    const seenValues = new Set<string>();

    sortedSlots.forEach((p) => {
      const pOrder = extractPeriodOrder(p) || p.order_rank;
      const slotVal = pOrder ? String(pOrder) : String(p.id);
      if (!seenValues.has(slotVal)) {
        seenValues.add(slotVal);
        const cleanSlotLabel = pOrder ? getOrdinalPeriodLabel(pOrder) : (p.period_name || 'Period Slot');
        options.push({
          value: slotVal,
          slotId: String(p.id),
          label: cleanSlotLabel,
          order: pOrder || 0,
          startTime: p.start_time || '',
          endTime: p.end_time || '',
        });
      }
    });

    return options.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [filteredPeriodsForClass]);

  useEffect(() => {
    if (allPeriodFilterOptions.length > 0) {
      const isValid = allPeriodFilterOptions.some((opt) => opt.value === activePeriodId);
      if (!isValid && setActivePeriodId) {
        setActivePeriodId(allPeriodFilterOptions[0].value);
      }
    }
  }, [allPeriodFilterOptions, activePeriodId, setActivePeriodId]);

  // ── Base Lesson Filters ──────────────────────────

  const baseFilteredLessons = useMemo(() => {
    const targetDate = selectedDate ? String(selectedDate).split('T')[0] : '';

    return (lessons || []).filter((l) => {
      if (targetDate) {
        const lDate = String(l.lesson_date || '').split('T')[0];
        if (lDate !== targetDate) return false;
      }
      if (selectedDepartmentId) {
        if (!doesLessonMatchDepartment(l, selectedDepartmentId, departments, classes)) return false;
      }
      if (effectiveClassId) {
        if (!doesLessonMatchClass(l, effectiveClassId, classes)) return false;
      }
      if (selectedSectionId) {
        if (!doesLessonMatchSection(l, selectedSectionId, sections)) return false;
      }
      return true;
    });
  }, [lessons, selectedDate, selectedDepartmentId, effectiveClassId, selectedSectionId, departments, classes, sections]);

  // ── Delivery Rows Computation ────

  const filteredLessons = useMemo(() => {
    const activeSlots = filteredPeriodsForClass;

    const rows: any[] = [];
    const matchedLessonIds = new Set<string>();

    activeSlots.forEach((slot) => {
      const slotOrder = extractPeriodOrder(slot) || slot.order_rank;

      let matchedBook: any = null;

      if (effectiveClassId) {
        matchedBook = (curriculumBooks || []).find((b: any) => {
          const bOrder = extractPeriodOrder(b) || (b.period_order ? Number(b.period_order) : null);
          if (bOrder !== slotOrder) return false;
          return doesLessonMatchClass(b, effectiveClassId, classes);
        });
      }

      if (!matchedBook && selectedDepartmentId && !effectiveClassId) {
        matchedBook = (curriculumBooks || []).find((b: any) => {
          const bOrder = extractPeriodOrder(b) || (b.period_order ? Number(b.period_order) : null);
          if (bOrder !== slotOrder) return false;
          return doesLessonMatchDepartment(b, selectedDepartmentId, departments, classes);
        });
      }

      const bookName = matchedBook?.name || slot.curriculum_book_name || null;
      const subjectName = matchedBook?.subject || slot.subject || slot.subject_name || '';
      const teacherName = matchedBook?.teacherName || slot.teacher_name || null;
      const teacherId = matchedBook?.teacherId || slot.teacher_id || '';
      const periodName = slot.period_name || (slotOrder ? getOrdinalPeriodLabel(slotOrder) : 'Routine Slot');
      const periodTime = resolvePeriodTime(slot, null, slotOrder, periodSlots);

      const slotLessons = baseFilteredLessons.filter((l) => {
        const lOrder = extractPeriodOrder(l);
        if (lOrder && slotOrder) {
          return lOrder === slotOrder;
        }
        if (l.period_slot || l.period_slot_id) {
          return isLessonInSlot(l, slot.id, periodSlots);
        }
        return Boolean(matchedBook && l.curriculum_book_id && String(l.curriculum_book_id) === String(matchedBook.id));
      });

      if (slotLessons.length > 0) {
        slotLessons.forEach((l) => {
          matchedLessonIds.add(String(l.id));
          rows.push({
            ...l,
            id: l.id,
            is_assigned: true,
            is_placeholder: false,
            period_slot: l.period_slot || slot.id,
            period_slot_id: l.period_slot || slot.id,
            period_name: l.period_name || periodName,
            period_order: extractPeriodOrder(l) || slotOrder,
            period_time: l.period_time || periodTime,
            curriculum_book_name: l.curriculum_book_name || bookName || null,
            subject_name: l.subject_name || subjectName,
            class_name: l.class_name || selectedClassObj?.name || slot.class_name || 'Academic Class',
            section_name: l.section_name || slot.section_name || '',
            teacher_name: l.teacher_name || teacherName || null,
          });
        });
      } else {
        rows.push({
          id: `pending_slot_${slot.id}_${effectiveClassId || 'cls'}_${selectedSectionId || 'all'}_${slotOrder || '1'}_${selectedDate || 'today'}`,
          is_assigned: false,
          is_placeholder: true,
          period_slot: slot.id,
          period_slot_id: slot.id,
          period_name: periodName,
          period_order: slotOrder,
          period_time: periodTime,
          curriculum_book_id: matchedBook?.id || slot.book_id || '',
          curriculum_book_name: bookName || null,
          subject_name: subjectName,
          lesson_title: null,
          start_unit: null,
          end_unit: null,
          homework_task: null,
          academic_class: effectiveClassId || '',
          academic_class_id: effectiveClassId || '',
          class_name: selectedClassObj?.name || selectedClassObj?.class_name || 'Academic Class',
          section: selectedSectionId || '',
          section_id: selectedSectionId || '',
          section_name: selectedSectionId ? sectionSelectOptions.find((o) => o.value === selectedSectionId)?.label : '',
          teacher: teacherId,
          teacher_id: teacherId,
          teacher_name: teacherName || null,
          assigned_scope: 'CLASS_WIDE',
          lesson_date: selectedDate,
        });
      }
    });

    baseFilteredLessons.forEach((l) => {
      if (!matchedLessonIds.has(String(l.id))) {
        rows.push({
          ...l,
          id: l.id,
          is_assigned: true,
          is_placeholder: false,
        });
      }
    });

    let finalRows = rows;
    if (activePeriodId) {
      finalRows = finalRows.filter((r) => {
        return (
          isLessonInSlot(r, activePeriodId, periodSlots) ||
          String(r.period_order) === String(activePeriodId) ||
          String(r.period_slot) === String(activePeriodId) ||
          String(r.period_slot_id) === String(activePeriodId)
        );
      });
    }

    return finalRows;
  }, [
    filteredPeriodsForClass,
    curriculumBooks,
    effectiveClassId,
    selectedDepartmentId,
    classes,
    departments,
    baseFilteredLessons,
    selectedClassObj,
    periodSlots,
    selectedDate,
    selectedSectionId,
    sectionSelectOptions,
    activePeriodId,
  ]);

  // ── Period Utility Callbacks ────────────────────────────────────────────────

  const getSlotLessonsCount = useCallback(
    (slotValue: string | number) => {
      return baseFilteredLessons.filter((l) => isLessonInSlot(l, slotValue, periodSlots)).length;
    },
    [baseFilteredLessons, periodSlots]
  );

  const getBookNamesForPeriod = useCallback(
    (slotValue: string | number) => {
      const lessonsInSlot = baseFilteredLessons.filter((l) => isLessonInSlot(l, slotValue, periodSlots));
      const bookNames = Array.from(
        new Set(lessonsInSlot.map((l) => l.curriculum_book_name || l.subject_name).filter(Boolean))
      );
      if (bookNames.length > 0) return bookNames.join(', ');

      const targetOrder = Number(slotValue);
      const matched = (curriculumBooks || []).filter((b: any) => {
        const bOrder = extractPeriodOrder(b) || (b.period_order ? Number(b.period_order) : null);
        if (bOrder !== targetOrder) return false;

        if (effectiveClassId) {
          return doesLessonMatchClass(b, effectiveClassId, classes);
        } else if (selectedDepartmentId) {
          return doesLessonMatchDepartment(b, selectedDepartmentId, departments, classes);
        }
        return false;
      });
      if (matched.length > 0) {
        const names = Array.from(new Set(matched.map((b: any) => b.name).filter(Boolean)));
        if (names.length > 0) return names.join(', ');
      }
      return 'No book assigned';
    },
    [baseFilteredLessons, periodSlots, curriculumBooks, effectiveClassId, selectedDepartmentId, classes, departments]
  );

  const getPeriodTimeForSlot = useCallback(
    (slotValue: string | number) => {
      const matchedLesson = baseFilteredLessons.find(
        (l) => isLessonInSlot(l, slotValue, periodSlots) && l.period_time
      );

      const targetOrder = Number(slotValue);
      const matchedSlot =
        filteredPeriodsForClass.find((p) => (extractPeriodOrder(p) || p.order_rank) === targetOrder) ||
        (periodSlots || []).find((p) => extractPeriodOrder(p) === targetOrder);

      return resolvePeriodTime(matchedSlot, matchedLesson, targetOrder, periodSlots) || 'Routine Time';
    },
    [baseFilteredLessons, filteredPeriodsForClass, periodSlots]
  );

  // ── Enrolled Students ───────────────────────────────────────────────────────

  const enrolledStudents = useMemo(() => {
    return (students || []).filter((st) => {
      if (effectiveClassId) {
        if (!doesStudentMatchClass(st, effectiveClassId, classes)) return false;
      } else if (selectedDepartmentId) {
        if (!doesStudentMatchDepartment(st, selectedDepartmentId, departments, classes)) return false;
      }

      if (selectedSectionId) {
        if (!doesStudentMatchSection(st, selectedSectionId, sections)) return false;
      }

      return true;
    });
  }, [students, effectiveClassId, selectedDepartmentId, selectedSectionId, classes, departments, sections]);

  return {
    hasDepartments,
    departmentSelectOptions,
    filteredClassList,
    classSelectOptions,
    selectedClassObj,
    filteredSectionsForClass,
    hasSectionsForClass,
    sectionSelectOptions,
    allPeriodFilterOptions,
    baseFilteredLessons,
    filteredLessons,
    enrolledStudents,
    getSlotLessonsCount,
    getBookNamesForPeriod,
    getPeriodTimeForSlot,
  };
}

export { useDailyClassroomFilters as useLearningClassroomFilters };
