import { useMemo, useEffect, useCallback } from "react";
import { getOrdinalPeriodLabel } from "../../../../utils/localStore";
import {
  extractPeriodOrder,
  resolvePeriodTime,
  doesLessonMatchDepartment,
  doesLessonMatchClass,
  doesLessonMatchSection,
  isLessonInSlot,
} from "../dailyClassroomUtils";

/**
 * useDailyClassroomFilters
 * Computes all filter-derived data:
 * - Department / Class / Section / Period options
 * - Base + final filtered lesson lists
 * - Enrolled students (with fuzzy section matching)
 * - Period slot utility callbacks (count, book names, timing)
 *
 * @param {Object} data - Raw academic + lesson data
 * @param {Object} filters - Active filter state
 * @param {Object} setters - Filter state setters for reset side-effects
 */
export default function useDailyClassroomFilters({
  lessons,
  departments,
  classes,
  sections,
  students,
  periodSlots,
  curriculumBooks,
  selectedDate,
  selectedDepartmentId,
  selectedClassId,
  selectedSectionId,
  activePeriodId,
  lessonSearch,
  setSelectedClassId,
  setSelectedSectionId,
  setActivePeriodId,
}) {
  const effectiveClassId = selectedClassId;
  const hasDepartments = departments && departments.length > 0;

  // ── Select Options ──────────────────────────────────────────────────────────

  const departmentSelectOptions = useMemo(() => [
    { value: "ALL", label: "All Departments" },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ], [departments]);

  const filteredClassList = useMemo(() => {
    if (!hasDepartments || selectedDepartmentId === "ALL") return classes;
    return classes.filter((c) => {
      const cDept = c.department !== undefined ? c.department : c.department_id;
      const cDeptId = typeof cDept === "object" ? String(cDept?.id || "") : String(cDept || "");
      return cDeptId === String(selectedDepartmentId);
    });
  }, [classes, hasDepartments, selectedDepartmentId]);

  const classSelectOptions = useMemo(() => [
    { value: "ALL", label: "All Academic Classes" },
    ...filteredClassList.map((c) => ({ value: String(c.id), label: c.name || c.class_name })),
  ], [filteredClassList]);

  const selectedClassObj = useMemo(() => {
    if (effectiveClassId === "ALL") return null;
    return classes.find((c) => String(c.id) === String(effectiveClassId)) || null;
  }, [classes, effectiveClassId]);

  const filteredSectionsForClass = useMemo(() => {
    let list = sections;
    if (selectedDepartmentId !== "ALL") {
      list = list.filter((s) => {
        const sCls = s.student_class !== undefined ? s.student_class : (s.class_id || s.class);
        const sClsId = typeof sCls === "object" ? String(sCls?.id || "") : String(sCls || "");
        const matchedClass = classes.find((c) => String(c.id) === sClsId);
        if (matchedClass) {
          const cDept = typeof matchedClass.department === "object"
            ? String(matchedClass.department?.id || "")
            : String(matchedClass.department !== undefined ? matchedClass.department : (matchedClass.department_id || ""));
          return cDept === String(selectedDepartmentId);
        }
        return true;
      });
    }
    if (effectiveClassId && effectiveClassId !== "ALL") {
      list = list.filter((s) => {
        const sCls = s.student_class !== undefined ? s.student_class : (s.class_id || s.class);
        const sClsId = typeof sCls === "object" ? String(sCls?.id || "") : String(sCls || "");
        return sClsId === String(effectiveClassId);
      });
    }
    return list;
  }, [sections, classes, selectedDepartmentId, effectiveClassId]);

  const hasSectionsForClass = filteredSectionsForClass.length > 0;

  const sectionSelectOptions = useMemo(() => {
    const opts = [{ value: "ALL", label: "All Sections" }];
    filteredSectionsForClass.forEach((s) => {
      opts.push({
        value: String(s.id),
        label: s.section_name || s.name || `Section ${s.id}`,
      });
    });
    return opts;
  }, [filteredSectionsForClass]);

  // ── Period Slots ────────────────────────────────────────────────────────────

  const filteredPeriodsForClass = useMemo(() => {
    if (!effectiveClassId || effectiveClassId === "ALL") return periodSlots;
    const classSpecific = periodSlots.filter((p) => {
      const pCls = p.student_class !== undefined ? p.student_class : (p.class_id || p.class);
      const pClsId = typeof pCls === "object" ? String(pCls?.id || "") : String(pCls || "");
      return pClsId && pClsId === String(effectiveClassId);
    });
    return classSpecific.length > 0 ? classSpecific : periodSlots;
  }, [periodSlots, effectiveClassId]);

  // ── Filter Resets ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedClassId !== "ALL") {
      const isValid = filteredClassList.some((c) => String(c.id) === String(selectedClassId));
      if (!isValid) setSelectedClassId("ALL");
    }
  }, [filteredClassList, selectedClassId, setSelectedClassId]);

  useEffect(() => {
    if (selectedSectionId !== "ALL") {
      const isValid = filteredSectionsForClass.some((s) => String(s.id) === String(selectedSectionId));
      if (!isValid) setSelectedSectionId("ALL");
    }
  }, [filteredSectionsForClass, selectedSectionId, setSelectedSectionId]);

  // ── Lesson Filters ──────────────────────────────────────────────────────────

  const baseFilteredLessons = useMemo(() => {
    const targetDate = selectedDate ? String(selectedDate).split("T")[0] : "";

    return lessons.filter((l) => {
      if (targetDate) {
        const lDate = String(l.lesson_date || "").split("T")[0];
        if (lDate !== targetDate) return false;
      }
      if (selectedDepartmentId !== "ALL") {
        if (!doesLessonMatchDepartment(l, selectedDepartmentId, departments, classes)) return false;
      }
      if (effectiveClassId !== "ALL") {
        if (!doesLessonMatchClass(l, effectiveClassId, classes)) return false;
      }
      if (selectedSectionId !== "ALL") {
        if (!doesLessonMatchSection(l, selectedSectionId)) return false;
      }
      if (lessonSearch.trim()) {
        const q = lessonSearch.toLowerCase();
        return (
          (l.lesson_title || "").toLowerCase().includes(q) ||
          (l.curriculum_book_name || "").toLowerCase().includes(q) ||
          (l.teacher_name || "").toLowerCase().includes(q) ||
          (l.lesson_instructions || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [lessons, selectedDate, selectedDepartmentId, effectiveClassId, selectedSectionId, lessonSearch, departments, classes]);

  // ── Period Filter Options ───────────────────────────────────────────────────

  const allPeriodFilterOptions = useMemo(() => {
    const options = [{ value: "ALL", label: "All Periods", order: 0 }];
    const activeSlots = effectiveClassId === "ALL" ? periodSlots : filteredPeriodsForClass;

    const sortedSlots = [...activeSlots].sort((a, b) => {
      return (extractPeriodOrder(a) || 0) - (extractPeriodOrder(b) || 0);
    });

    const seenValues = new Set();

    sortedSlots.forEach((p) => {
      const pOrder = extractPeriodOrder(p);
      const slotVal = pOrder ? String(pOrder) : String(p.id);
      if (!seenValues.has(slotVal)) {
        seenValues.add(slotVal);
        const cleanSlotLabel = pOrder ? getOrdinalPeriodLabel(pOrder) : (p.period_name || "Period Slot");
        options.push({
          value: slotVal,
          slotId: String(p.id),
          label: cleanSlotLabel,
          order: pOrder || 0,
          startTime: p.start_time || "",
          endTime: p.end_time || "",
        });
      }
    });

    let hasUnassigned = false;
    baseFilteredLessons.forEach((l) => {
      const order = extractPeriodOrder(l);
      if (order) {
        const slotVal = String(order);
        if (!seenValues.has(slotVal)) {
          seenValues.add(slotVal);
          options.push({
            value: slotVal,
            slotId: String(l.period_slot || slotVal),
            label: getOrdinalPeriodLabel(order),
            order,
            startTime: l.period_time ? l.period_time.split("-")[0]?.trim() : "",
            endTime: l.period_time ? l.period_time.split("-")[1]?.trim() : "",
          });
        }
      } else if (!l.period_slot) {
        hasUnassigned = true;
      }
    });

    if (hasUnassigned) {
      options.push({ value: "UNASSIGNED", label: "No Period", order: 999 });
    }

    const allOpt = options[0];
    const restOpts = options.slice(1).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    return [allOpt, ...restOpts];
  }, [effectiveClassId, periodSlots, filteredPeriodsForClass, baseFilteredLessons]);

  useEffect(() => {
    if (activePeriodId !== "ALL") {
      const isValid = allPeriodFilterOptions.some((opt) => opt.value === activePeriodId);
      if (!isValid) setActivePeriodId("ALL");
    }
  }, [allPeriodFilterOptions, activePeriodId, setActivePeriodId]);

  const filteredLessons = useMemo(() => {
    if (activePeriodId === "ALL") return baseFilteredLessons;
    return baseFilteredLessons.filter((l) => isLessonInSlot(l, activePeriodId, periodSlots));
  }, [baseFilteredLessons, activePeriodId, periodSlots]);

  // ── Period Utility Callbacks ────────────────────────────────────────────────

  const getSlotLessonsCount = useCallback((slotValue) => {
    if (slotValue === "ALL") return baseFilteredLessons.length;
    return baseFilteredLessons.filter((l) => isLessonInSlot(l, slotValue, periodSlots)).length;
  }, [baseFilteredLessons, periodSlots]);

  const getBookNamesForPeriod = useCallback((slotValue) => {
    if (slotValue === "ALL") return "All Books";
    if (slotValue === "UNASSIGNED") return "General Sabaq";

    const lessonsInSlot = baseFilteredLessons.filter((l) => isLessonInSlot(l, slotValue));
    const bookNames = Array.from(
      new Set(lessonsInSlot.map((l) => l.curriculum_book_name || l.subject_name).filter(Boolean))
    );
    if (bookNames.length > 0) return bookNames.join(", ");

    const targetOrder = Number(slotValue);
    const matched = curriculumBooks.filter((b) => {
      if (effectiveClassId !== "ALL" && b.classId && String(b.classId) !== String(effectiveClassId)) return false;
      return extractPeriodOrder(b) === targetOrder;
    });
    if (matched.length > 0) {
      const names = Array.from(new Set(matched.map((b) => b.name).filter(Boolean)));
      if (names.length > 0) return names.join(", ");
    }
    return "No Book Assigned";
  }, [baseFilteredLessons, curriculumBooks, effectiveClassId]);

  const getPeriodTimeForSlot = useCallback((slotValue) => {
    if (slotValue === "ALL") return "All Day Routine";
    if (slotValue === "UNASSIGNED") return "Flexible Time";

    const matchedLesson = baseFilteredLessons.find(
      (l) => isLessonInSlot(l, slotValue, periodSlots) && l.period_time
    );

    const targetOrder = Number(slotValue);
    const matchedSlot =
      periodSlots.find((p) => {
        if (effectiveClassId !== "ALL") {
          const pCls = p.student_class !== undefined ? p.student_class : (p.class_id || p.class);
          const pClsId = typeof pCls === "object" ? String(pCls?.id || "") : String(pCls || "");
          if (pClsId && pClsId !== String(effectiveClassId)) return false;
        }
        return extractPeriodOrder(p) === targetOrder;
      }) || periodSlots.find((p) => extractPeriodOrder(p) === targetOrder);

    return resolvePeriodTime(matchedSlot, matchedLesson, targetOrder, periodSlots) || "Routine Time";
  }, [baseFilteredLessons, periodSlots, effectiveClassId]);

  // ── Enrolled Students (with fuzzy section matching) ─────────────────────────

  const enrolledStudents = useMemo(() => {
    const targetClassObj = effectiveClassId !== "ALL" ? classes.find((c) => String(c.id) === String(effectiveClassId)) : null;
    const targetClassName = (targetClassObj?.name || targetClassObj?.class_name || "").toLowerCase().trim();
    const targetSecObj = selectedSectionId !== "ALL" ? sections.find((s) => String(s.id) === String(selectedSectionId)) : null;
    const targetSecName = (targetSecObj?.section_name || targetSecObj?.name || "").toLowerCase().trim();

    return students.filter((st) => {
      const stCls = st.student_class !== undefined ? st.student_class : (st.class_id || st.class || st.student_class_id);
      const stClsId = typeof stCls === "object" ? String(stCls?.id || "") : String(stCls || "");
      const stClsName = (st.student_class_name || st.class_name || "").toLowerCase().trim();

      if (effectiveClassId !== "ALL") {
        const isIdMatch = stClsId === String(effectiveClassId);
        const isNameMatch = Boolean(targetClassName && stClsName && targetClassName === stClsName);
        if (!isIdMatch && !isNameMatch) return false;
      } else if (selectedDepartmentId !== "ALL") {
        const validClassIds = new Set(filteredClassList.map((c) => String(c.id)));
        const isClassInDept = validClassIds.has(stClsId);
        const stDeptObj = departments.find((d) => String(d.id) === String(selectedDepartmentId));
        const stDeptName = (stDeptObj?.name || "").toLowerCase().trim();
        const isDeptNameMatch = Boolean(stDeptName && st.department_name && stDeptName === st.department_name.toLowerCase().trim());
        if (!isClassInDept && !isDeptNameMatch) return false;
      }

      if (selectedSectionId !== "ALL") {
        const stSec = st.section !== undefined ? st.section : (st.section_id || st.student_section);
        const stSecId = typeof stSec === "object" ? String(stSec?.id || "") : String(stSec || "");
        const stSecName = (st.section_name || "").toLowerCase().trim();

        const isSecIdMatch = stSecId && stSecId === String(selectedSectionId);
        let isSecNameMatch = false;
        if (targetSecName && stSecName) {
          if (targetSecName === stSecName || targetSecName.includes(stSecName) || stSecName.includes(targetSecName)) {
            isSecNameMatch = true;
          } else {
            // Fuzzy section alias matching
            const aliases = [
              [["abu bakr", "section a", "alpha", "morning", "rose"], ["abu bakr", "section a", "alpha", "morning", "rose"]],
              [["umar", "section b", "beta", "evening"], ["umar", "section b", "beta", "evening"]],
              [["uthman", "section c", "gamma"], ["uthman", "section c", "gamma"]],
              [["ali", "section d", "delta"], ["ali", "section d", "delta"]],
              [["night", "daur", "dorm", "residential"], ["night", "daur", "dorm", "residential"]],
            ];
            for (const [targetAliases, studentAliases] of aliases) {
              const isTargetMatch = targetAliases.some((a) => targetSecName.includes(a));
              const isStudentMatch = studentAliases.some((a) => stSecName.includes(a));
              if (isTargetMatch && isStudentMatch) { isSecNameMatch = true; break; }
            }
          }
        }
        if (!isSecIdMatch && !isSecNameMatch) return false;
      }

      return true;
    });
  }, [students, effectiveClassId, selectedDepartmentId, filteredClassList, selectedSectionId, classes, sections, departments]);

  return {
    // Options
    hasDepartments,
    departmentSelectOptions,
    filteredClassList,
    classSelectOptions,
    selectedClassObj,
    filteredSectionsForClass,
    hasSectionsForClass,
    sectionSelectOptions,
    allPeriodFilterOptions,
    // Filtered data
    baseFilteredLessons,
    filteredLessons,
    enrolledStudents,
    // Callbacks
    getSlotLessonsCount,
    getBookNamesForPeriod,
    getPeriodTimeForSlot,
  };
}
