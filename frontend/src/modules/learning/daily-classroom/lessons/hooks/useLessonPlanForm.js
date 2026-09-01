import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "../../../../../context/ToastContext";
import { learningStore } from "../../../../../utils/stores/learningStore";
import { getOrdinalPeriodLabel, curriculumStore } from "../../../../../utils/localStore";
import {
  findMatchingPeriodSlot,
  resolvePeriodTime,
  resolveBookTeacher,
  filterCurriculumBooks,
} from "../../dailyClassroomUtils";

/**
 * useLessonPlanForm
 * Manages all form state, derived values, handlers, and submission logic
 * for LessonPlanDrawer. Separates business logic from UI rendering.
 *
 * @param {Object} params - Lesson, defaults, academic data, and callbacks
 */
export default function useLessonPlanForm({
  lesson,
  date,
  defaultDate,
  defaultDepartmentId,
  defaultClassId,
  defaultSectionId,
  defaultPeriodId,
  classes,
  sections,
  periodSlots,
  teachers,
  staff,
  curriculumBooks,
  tenantId,
  onSaveSuccess,
}) {
  const { showToast } = useToast();

  // ── Form State ──────────────────────────────────────────────────────────────

  const [lessonDate, setLessonDate] = useState(
    date || defaultDate || lesson?.lesson_date || new Date().toISOString().split("T")[0]
  );

  const [departmentId, setDepartmentId] = useState(() => {
    if (lesson?.department_id) return String(lesson.department_id);
    if (lesson?.department) return typeof lesson.department === "object" ? String(lesson.department?.id || "") : String(lesson.department);
    return defaultDepartmentId && defaultDepartmentId !== "ALL" ? String(defaultDepartmentId) : "";
  });

  const [classId, setClassId] = useState(() => {
    if (lesson?.academic_class) return typeof lesson.academic_class === "object" ? String(lesson.academic_class?.id || "") : String(lesson.academic_class);
    if (lesson?.class_id) return String(lesson.class_id);
    if (lesson?.student_class) return typeof lesson.student_class === "object" ? String(lesson.student_class?.id || "") : String(lesson.student_class);
    return defaultClassId && defaultClassId !== "ALL" ? String(defaultClassId) : "";
  });

  const [sectionId, setSectionId] = useState(() => {
    if (lesson?.section) return typeof lesson.section === "object" ? String(lesson.section?.id || "") : String(lesson.section);
    if (lesson?.section_id) return String(lesson.section_id);
    if (lesson?.student_section) return typeof lesson.student_section === "object" ? String(lesson.student_section?.id || "") : String(lesson.student_section);
    return defaultSectionId && defaultSectionId !== "ALL" ? String(defaultSectionId) : "";
  });

  const [periodSlotId, setPeriodSlotId] = useState(
    lesson?.period_slot || (defaultPeriodId && defaultPeriodId !== "ALL" ? String(defaultPeriodId) : "")
  );

  const [curriculumBookId, setCurriculumBookId] = useState(lesson?.curriculum_book_id ? String(lesson.curriculum_book_id) : "");
  const [curriculumBookName, setCurriculumBookName] = useState(lesson?.curriculum_book_name || "");
  const [subjectName, setSubjectName] = useState(lesson?.subject_name || "");
  const [teacherName, setTeacherName] = useState(lesson?.teacher_name || "");
  const [lessonTitle, setLessonTitle] = useState(lesson?.lesson_title || "");
  const [startUnit, setStartUnit] = useState(lesson?.start_unit !== undefined && lesson?.start_unit !== "" ? String(lesson.start_unit) : "");
  const [endUnit, setEndUnit] = useState(lesson?.end_unit !== undefined && lesson?.end_unit !== "" ? String(lesson.end_unit) : "");
  const [homeworkTask, setHomeworkTask] = useState(lesson?.homework_task || "");
  const [lessonInstructions, setLessonInstructions] = useState(lesson?.lesson_instructions || "");
  const [assignedScope, setAssignedScope] = useState(() => {
    if (lesson?.assigned_scope) return lesson.assigned_scope;
    if (Array.isArray(lesson?.target_student_ids) && lesson.target_student_ids.length > 0) return "SPECIFIC_STUDENTS";
    if (lesson?.target_student_id) return "SPECIFIC_STUDENTS";
    return "CLASS_WIDE";
  });
  const [targetStudentIds, setTargetStudentIds] = useState(() => {
    if (Array.isArray(lesson?.target_student_ids)) return lesson.target_student_ids.map(String);
    if (lesson?.target_student_id) return [String(lesson.target_student_id)];
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);

  // ── Auto-sync department from class ────────────────────────────────────────

  useEffect(() => {
    if (!departmentId && classId) {
      const matched = classes.find((c) => String(c.id) === String(classId));
      if (matched) {
        const cDept = matched.department !== undefined ? matched.department : matched.department_id;
        const cDeptId = typeof cDept === "object" ? String(cDept?.id || "") : String(cDept || "");
        if (cDeptId) setDepartmentId(cDeptId);
      }
    }
  }, [departmentId, classId, classes]);

  // ── Auto-sync period slot from defaultPeriodId ─────────────────────────────

  useEffect(() => {
    const target = (defaultPeriodId && defaultPeriodId !== "ALL" ? defaultPeriodId : "") || lesson?.period_slot || "";
    if (target && !periodSlotId) {
      const matched = findMatchingPeriodSlot(target, periodSlots);
      setPeriodSlotId(matched ? String(matched.id) : String(target));
    }
  }, [defaultPeriodId, lesson, periodSlots, periodSlotId]);

  // ── Available books filtered by class & department ──────────────────────────

  const availableBooks = useMemo(
    () => filterCurriculumBooks(curriculumBooks, classId, classes, departmentId),
    [curriculumBooks, classId, classes, departmentId]
  );

  // ── Selected book ───────────────────────────────────────────────────────────

  const selectedBook = useMemo(() =>
    availableBooks.find((b) => String(b.id) === String(curriculumBookId)) ||
    curriculumBooks.find((b) => String(b.id) === String(curriculumBookId)),
    [availableBooks, curriculumBooks, curriculumBookId]
  );

  // ── Auto-match book from period slot ───────────────────────────────────────

  const matchBookForPeriod = useCallback((targetSlotId) => {
    if (!targetSlotId) return;
    const matchedSlot = findMatchingPeriodSlot(targetSlotId, periodSlots);
    const targetOrder = matchedSlot?.period_order ?? matchedSlot?.order ?? (Number(targetSlotId) || null);

    // 1. Check for a book explicitly linked to this period slot
    const matchedBook = availableBooks.find((b) => {
      if (b.periodSlotId && (String(b.periodSlotId) === String(targetSlotId) || (matchedSlot && String(b.periodSlotId) === String(matchedSlot.id)))) {
        return true;
      }
      const bOrder = b.period_order !== undefined ? Number(b.period_order) : (b.order !== undefined ? Number(b.order) : null);
      return targetOrder !== null && bOrder !== null && bOrder === targetOrder;
    });

    const bookToApply = matchedBook || (availableBooks.length > 0 ? availableBooks[0] : null);
    if (bookToApply) {
      setCurriculumBookId(String(bookToApply.id));
      setCurriculumBookName(bookToApply.name || "");
      if (bookToApply.subject) setSubjectName(bookToApply.subject);
      const autoTeacher = resolveBookTeacher(bookToApply, teachers, staff) || matchedSlot?.teacher_name || matchedSlot?.teacher || "";
      if (autoTeacher) setTeacherName(autoTeacher);
      if (bookToApply.startPage) setStartUnit(String(bookToApply.startPage));
      if (bookToApply.endPage) setEndUnit(String(bookToApply.endPage));
    } else {
      const slotTeacher = matchedSlot?.teacher_name || matchedSlot?.teacher || "";
      if (slotTeacher) setTeacherName(slotTeacher);
    }
  }, [availableBooks, periodSlots, teachers, staff]);

  // Auto-match on class/period mount
  useEffect(() => {
    if (!lesson && classId && periodSlotId && !curriculumBookId) {
      matchBookForPeriod(periodSlotId);
    }
  }, [lesson, classId, periodSlotId, curriculumBookId, matchBookForPeriod]);

  // Auto-sync from selectedBook
  useEffect(() => {
    if (selectedBook) {
      if (selectedBook.name) setCurriculumBookName(selectedBook.name);
      if (selectedBook.subject) setSubjectName(selectedBook.subject);
      const autoTeacher = resolveBookTeacher(selectedBook, teachers, staff);
      if (autoTeacher) setTeacherName(autoTeacher);
      if (selectedBook.startPage && !startUnit) setStartUnit(String(selectedBook.startPage));
      if (selectedBook.endPage && !endUnit) setEndUnit(String(selectedBook.endPage));
    }
  }, [selectedBook, teachers, staff, startUnit, endUnit]);

  // ── Derived display values ──────────────────────────────────────────────────

  const matchedPeriod = useMemo(() =>
    findMatchingPeriodSlot(periodSlotId, periodSlots) ||
    findMatchingPeriodSlot(defaultPeriodId, periodSlots) ||
    findMatchingPeriodSlot(lesson?.period_slot, periodSlots) ||
    null,
    [periodSlots, periodSlotId, defaultPeriodId, lesson]
  );

  const displayPeriodName = useMemo(() => {
    if (matchedPeriod) {
      const order = matchedPeriod.period_order ?? matchedPeriod.order;
      if (order) return getOrdinalPeriodLabel(order);
      if (matchedPeriod.period_name) return matchedPeriod.period_name;
    }
    if (lesson?.period_order) return getOrdinalPeriodLabel(lesson.period_order);
    if (defaultPeriodId && /^\d+$/.test(String(defaultPeriodId))) return getOrdinalPeriodLabel(Number(defaultPeriodId));
    if (periodSlotId && /^\d+$/.test(String(periodSlotId))) return getOrdinalPeriodLabel(Number(periodSlotId));
    return "1st Period";
  }, [matchedPeriod, lesson, periodSlotId, defaultPeriodId]);

  const resolvedPeriodTime = useMemo(() =>
    resolvePeriodTime(matchedPeriod, lesson, defaultPeriodId || periodSlotId, periodSlots),
    [matchedPeriod, lesson, defaultPeriodId, periodSlotId, periodSlots]
  );

  const bookMinPage = selectedBook ? Number(selectedBook.startPage || 1) : 1;
  const bookMaxPage = selectedBook ? Number(selectedBook.endPage || 9999) : undefined;

  const bookProgressStats = useMemo(() => {
    if (!selectedBook) return null;
    const total = Number(selectedBook.endPage || 100) - Number(selectedBook.startPage || 1) + 1;
    const cur = Number(endUnit || startUnit || 0);
    const start = Number(selectedBook.startPage || 1);
    const covered = Math.max(0, cur >= start ? cur - start + 1 : 0);
    const pct = total > 0 ? Math.min(100, Math.round((covered / total) * 100)) : 0;
    return { totalPages: total, currentPage: cur, coveredPages: covered, percentage: pct };
  }, [selectedBook, startUnit, endUnit]);

  // ── Resolved context entities ───────────────────────────────────────────────

  const matchedClass = classes.find((c) => String(c.id) === String(classId));
  const matchedSection = sections.find((s) => String(s.id) === String(sectionId));
  const resolvedDeptId = departmentId ||
    (typeof matchedClass?.department === "object" ? matchedClass.department?.id : (matchedClass?.department || matchedClass?.department_id));
  const displaySectionLabel = matchedSection
    ? (matchedSection.section_name || matchedSection.name || "Section")
    : (sectionId ? "Section" : "Class Wide (All Sections)");

  const isDateFixed = Boolean(defaultDate || lesson?.lesson_date);
  const isClassFixed = Boolean((defaultClassId && defaultClassId !== "ALL") || lesson?.academic_class);
  const isPeriodFixed = Boolean((defaultPeriodId && defaultPeriodId !== "ALL") || lesson?.period_slot);
  const hasFixedContext = Boolean(lesson || isClassFixed || isPeriodFixed || isDateFixed);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePeriodChange = (val) => {
    setPeriodSlotId(val);
    matchBookForPeriod(val);
  };

  const handleBookChange = (val) => {
    setCurriculumBookId(val);
    if (!val) { setCurriculumBookName(""); return; }
    const b = availableBooks.find((item) => String(item.id) === String(val)) ||
              curriculumBooks.find((item) => String(item.id) === String(val));
    if (b) {
      setCurriculumBookName(b.name || "");
      if (b.subject) setSubjectName(b.subject);
      const autoTeacher = resolveBookTeacher(b, teachers, staff);
      if (autoTeacher) setTeacherName(autoTeacher);
      if (b.startPage) setStartUnit(String(b.startPage));
      if (b.endPage) setEndUnit(String(b.endPage));
    }
  };

  const handleStartPageChange = (val) => {
    const rawVal = typeof val === "string" ? val : val?.target?.value || "";
    if (rawVal === "") { setStartUnit(""); return; }
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    if (bookMaxPage && num > bookMaxPage) {
      setStartUnit(String(bookMaxPage));
      showToast(`Start page cannot exceed book end page (${bookMaxPage}).`, "warning");
      return;
    }
    setStartUnit(String(num));
  };

  const handleEndPageChange = (val) => {
    const rawVal = typeof val === "string" ? val : val?.target?.value || "";
    if (rawVal === "") { setEndUnit(""); return; }
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    if (bookMaxPage && num > bookMaxPage) {
      setEndUnit(String(bookMaxPage));
      showToast(`End page cannot exceed book max page (${bookMaxPage}).`, "warning");
      return;
    }
    setEndUnit(String(num));
  };

  const handleSelectAllStudents = (allStudents) => {
    if (targetStudentIds.length === allStudents.length) setTargetStudentIds([]);
    else setTargetStudentIds(allStudents.map((s) => String(s.id)));
  };

  const handleStudentSelectionToggle = (stId) => {
    setTargetStudentIds((prev) =>
      prev.includes(stId) ? prev.filter((id) => id !== stId) : [...prev, stId]
    );
  };

  const handleApplySourceLessonToForm = (src, { autoAdvancePages, nextStart, nextEnd } = {}) => {
    if (!src) return;
    if (src.academic_class || src.class_id) {
      const cId = typeof (src.academic_class || src.class_id) === "object"
        ? String((src.academic_class || src.class_id)?.id || "")
        : String(src.academic_class || src.class_id || "");
      if (cId) setClassId(cId);
    }
    if (src.department_id) setDepartmentId(String(src.department_id));
    if (src.section) setSectionId(String(src.section));
    if (src.period_slot) {
      const matched = findMatchingPeriodSlot(src.period_slot, periodSlots);
      setPeriodSlotId(matched ? String(matched.id) : String(src.period_slot));
    }
    if (src.curriculum_book_id) setCurriculumBookId(String(src.curriculum_book_id));
    if (src.curriculum_book_name) setCurriculumBookName(src.curriculum_book_name);
    if (src.subject_name) setSubjectName(src.subject_name);
    if (src.teacher_name) setTeacherName(src.teacher_name);
    if (src.homework_task) setHomeworkTask(src.homework_task);
    if (src.lesson_instructions) setLessonInstructions(src.lesson_instructions);
    if (src.lesson_title) setLessonTitle(src.lesson_title);

    if (nextStart !== undefined && nextEnd !== undefined) {
      setStartUnit(String(nextStart));
      setEndUnit(String(nextEnd));
    } else {
      const sNum = parseInt(src.start_unit, 10);
      const eNum = parseInt(src.end_unit, 10);
      if (autoAdvancePages && !isNaN(sNum) && !isNaN(eNum) && eNum >= sNum) {
        const span = eNum - sNum + 1;
        setStartUnit(String(eNum + 1));
        setEndUnit(String(eNum + span));
      } else {
        setStartUnit(src.start_unit || "");
        setEndUnit(src.end_unit || "");
      }
    }

    setIsCarryForwardOpen(false);
    showToast(`Applied yesterday's Sabaq (${src.curriculum_book_name || "Lesson"}) to form.`, "success");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!classId) { showToast("Please select a target class division.", "warning"); return; }
    if (!lessonTitle.trim()) { showToast("Lesson Title is required.", "warning"); return; }
    if (assignedScope === "SPECIFIC_STUDENTS" && targetStudentIds.length === 0) {
      showToast("Please select at least one student for individual assignment.", "warning");
      return;
    }

    setSaving(true);
    try {
      const matchedClassObj = classes.find((c) => String(c.id) === String(classId));
      const matchedSectionObj = sections.find((s) => String(s.id) === String(sectionId));
      const resolvedDeptIdFinal = departmentId ||
        (typeof matchedClassObj?.department === "object" ? matchedClassObj.department?.id : (matchedClassObj?.department || matchedClassObj?.department_id));
      const displaySecLabel = matchedSectionObj
        ? (matchedSectionObj.section_name || matchedSectionObj.name || "Section")
        : (sectionId ? "Section" : "Class Wide (All Sections)");

      const payload = {
        id: lesson?.id || `lesson_${Date.now()}`,
        academic_class: classId,
        class_name: matchedClassObj ? (matchedClassObj.name || matchedClassObj.class_name) : (lesson?.class_name || "Academic Class"),
        department_id: resolvedDeptIdFinal || null,
        department_name: lesson?.department_name || matchedClassObj?.department_name || "",
        section: sectionId || null,
        section_name: displaySecLabel !== "Class Wide (All Sections)" ? displaySecLabel : null,
        period_slot: periodSlotId || null,
        period_name: displayPeriodName,
        period_time: resolvedPeriodTime || null,
        period_order: matchedPeriod?.period_order ?? matchedPeriod?.order ?? (defaultPeriodId ? Number(defaultPeriodId) : null),
        curriculum_book_id: curriculumBookId || null,
        curriculum_book_name: curriculumBookName || (selectedBook?.name || null),
        subject_name: subjectName.trim() || (selectedBook?.subject || "General Studies"),
        teacher_name: teacherName.trim() || (selectedBook?.teacherName || ""),
        lesson_date: lessonDate,
        lesson_title: lessonTitle.trim(),
        start_unit: startUnit ? String(startUnit) : "",
        end_unit: endUnit ? String(endUnit) : "",
        homework_task: homeworkTask.trim() || "",
        lesson_instructions: lessonInstructions.trim() || "",
        assigned_scope: assignedScope,
        target_student_ids: assignedScope === "SPECIFIC_STUDENTS" ? targetStudentIds : [],
        target_student_id: assignedScope === "SPECIFIC_STUDENTS" && targetStudentIds.length === 1 ? targetStudentIds[0] : null,
      };

      learningStore.saveDailyLesson(tenantId, payload);

      // Sync progress with main Curriculum Store
      if (curriculumBookId && endUnit) {
        const pageNum = parseInt(endUnit, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          try {
            curriculumStore.updateProgress(tenantId, curriculumBookId, pageNum, lessonTitle.trim() || undefined);
          } catch {}
        }
      }

      showToast(lesson && !lesson?.isDuplicate ? "Daily lesson plan updated." : "Daily lesson assigned successfully.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save daily lesson.", "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    // State
    lessonDate, setLessonDate,
    departmentId, setDepartmentId,
    classId, setClassId,
    sectionId, setSectionId,
    periodSlotId, setPeriodSlotId,
    curriculumBookId, setCurriculumBookId,
    curriculumBookName,
    subjectName, setSubjectName,
    teacherName, setTeacherName,
    lessonTitle, setLessonTitle,
    startUnit, endUnit,
    homeworkTask, setHomeworkTask,
    lessonInstructions, setLessonInstructions,
    assignedScope, setAssignedScope,
    targetStudentIds, setTargetStudentIds,
    saving,
    isCarryForwardOpen, setIsCarryForwardOpen,
    isEditingContext, setIsEditingContext,
    // Derived
    availableBooks,
    selectedBook,
    matchedPeriod,
    displayPeriodName,
    resolvedPeriodTime,
    bookMinPage,
    bookMaxPage,
    bookProgressStats,
    matchedClass,
    matchedSection,
    resolvedDeptId,
    displaySectionLabel,
    hasFixedContext,
    // Handlers
    handlePeriodChange,
    handleBookChange,
    handleStartPageChange,
    handleEndPageChange,
    handleSelectAllStudents,
    handleStudentSelectionToggle,
    handleApplySourceLessonToForm,
    handleSubmit,
  };
}
