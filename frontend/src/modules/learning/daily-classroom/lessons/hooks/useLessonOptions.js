import { useMemo } from "react";
import { getOrdinalPeriodLabel } from "../../../../../utils/localStore";
import {
  filterCurriculumBooks,
  findMatchingPeriodSlot,
  resolveBookTeacher,
} from "../../dailyClassroomUtils";

/**
 * useLessonOptions
 * Builds all dropdown option arrays for LessonPlanDrawer.
 * Kept separate from form state to reduce noise in the main hook.
 */
export default function useLessonOptions({
  departments,
  classes,
  sections,
  students,
  periodSlots,
  teachers,
  staff,
  curriculumBooks,
  availableBooks: propAvailableBooks,
  departmentId,
  classId,
  sectionId,
  periodSlotId,
  curriculumBookId,
  teacherName,
}) {
  // ── Filtered Lists ──────────────────────────────────────────────────────────

  const filteredClasses = useMemo(() => {
    if (!departmentId) return classes;
    return classes.filter((c) => {
      const cDept = c.department !== undefined ? c.department : c.department_id;
      const cDeptId = typeof cDept === "object" ? String(cDept?.id || "") : String(cDept || "");
      return cDeptId === String(departmentId);
    });
  }, [classes, departmentId]);

  const filteredSections = useMemo(() => {
    if (!classId) return sections;
    return sections.filter((s) => {
      const rawCls = s.student_class !== undefined ? s.student_class : (s.class_id || s.class);
      const sClsId = typeof rawCls === "object" ? String(rawCls?.id || "") : String(rawCls || "");
      return sClsId === String(classId);
    });
  }, [sections, classId]);

  const filteredStudents = useMemo(() => {
    if (!classId) return students;
    return students.filter((st) => {
      const stCls = st.student_class !== undefined ? st.student_class : (st.class_id || st.class);
      const stClsId = typeof stCls === "object" ? String(stCls?.id || "") : String(stCls || "");
      if (stClsId !== String(classId)) return false;
      if (sectionId) {
        const stSec = st.section !== undefined ? st.section : (st.section_id || st.student_section);
        const stSecId = typeof stSec === "object" ? String(stSec?.id || "") : String(stSec || "");
        if (stSecId && stSecId !== String(sectionId)) return false;
      }
      return true;
    });
  }, [students, classId, sectionId]);

  const availableBooks = useMemo(
    () => propAvailableBooks || filterCurriculumBooks(curriculumBooks, classId, classes, departmentId),
    [propAvailableBooks, curriculumBooks, classId, classes, departmentId]
  );

  // ── Select Options ──────────────────────────────────────────────────────────

  const departmentOptions = useMemo(() => [
    { value: "", label: "Select Department" },
    ...departments.map((d) => ({ value: String(d.id), label: d.name || `Department ${d.id}` })),
  ], [departments]);

  const classOptions = useMemo(() => [
    { value: "", label: "Select Class Division" },
    ...filteredClasses.map((c) => ({ value: String(c.id), label: c.name || c.class_name })),
  ], [filteredClasses]);

  const sectionOptions = useMemo(() => [
    { value: "", label: "All Sections" },
    ...filteredSections.map((s) => ({ value: String(s.id), label: s.section_name || "Section" })),
  ], [filteredSections]);

  const studentSelectOptions = useMemo(() =>
    filteredStudents.map((st) => ({
      value: String(st.id),
      label: `${st.name_en || st.name || "Student"}${st.uniq_id || st.roll_number ? ` • [${st.uniq_id || st.roll_number}]` : ""}`,
    })),
    [filteredStudents]
  );

  const periodOptions = useMemo(() => {
    const list = [{ value: "", label: "No Specific Period" }];
    periodSlots.forEach((p, idx) => {
      const order = p.period_order ?? p.order ?? (idx + 1);
      const pOrdinal = getOrdinalPeriodLabel(order);
      const timeStr = p.start_time && p.end_time ? ` (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})` : "";
      list.push({ value: String(p.id), label: `${pOrdinal}${timeStr}` });
    });
    return list;
  }, [periodSlots]);

  const bookOptions = useMemo(() => {
    const list = [{ value: "", label: "None (Direct Entry)" }];

    if (periodSlotId && periodSlotId !== "ALL") {
      const matchedSlot = findMatchingPeriodSlot(periodSlotId, periodSlots);
      const targetOrder = matchedSlot?.period_order ?? matchedSlot?.order ?? (Number(periodSlotId) || null);

      const periodMatched = [];
      const others = [];

      availableBooks.forEach((b) => {
        const isMatch =
          (b.periodSlotId && (String(b.periodSlotId) === String(periodSlotId) || (matchedSlot && String(b.periodSlotId) === String(matchedSlot.id)))) ||
          (targetOrder !== null && (b.period_order !== undefined ? Number(b.period_order) : (b.order !== undefined ? Number(b.order) : null)) === targetOrder);

        if (isMatch) {
          periodMatched.push(b);
        } else {
          others.push(b);
        }
      });

      periodMatched.forEach((b) => {
        list.push({
          value: String(b.id),
          label: `${b.name}${b.subject ? ` (${b.subject})` : ""} • [Period Match]`,
        });
      });

      others.forEach((b) => {
        list.push({
          value: String(b.id),
          label: `${b.name}${b.subject ? ` (${b.subject})` : ""}`,
        });
      });
    } else {
      availableBooks.forEach((b) => {
        list.push({
          value: String(b.id),
          label: `${b.name}${b.subject ? ` (${b.subject})` : ""}`,
        });
      });
    }

    return list;
  }, [availableBooks, periodSlotId, periodSlots]);

  const teacherOptions = useMemo(() => {
    const list = [{ value: "", label: "None (Unassigned)" }];
    const seen = new Set();

    // 1. Primary assigned teacher for active book or period slot
    const currentBook =
      availableBooks.find((b) => String(b.id) === String(curriculumBookId)) ||
      curriculumBooks.find((b) => String(b.id) === String(curriculumBookId));
    const assignedBookTeacher = resolveBookTeacher(currentBook, teachers, staff);

    const matchedSlot = findMatchingPeriodSlot(periodSlotId, periodSlots);
    const assignedSlotTeacher = matchedSlot?.teacher_name || matchedSlot?.teacher || "";

    const primaryTeacher = assignedBookTeacher || assignedSlotTeacher || teacherName || "";

    if (primaryTeacher) {
      seen.add(primaryTeacher);
      list.push({
        value: primaryTeacher,
        label: `${primaryTeacher} (Assigned Routine Teacher)`,
      });
    }

    // 2. Add all teachers and staff
    [...teachers, ...staff].forEach((t) => {
      const name =
        t.name_en ||
        t.user_name ||
        t.name ||
        (t.first_name ? `${t.first_name} ${t.last_name || ""}`.trim() : "") ||
        t.full_name ||
        t.employee_id ||
        "";
      if (name && !seen.has(name)) {
        seen.add(name);
        const desig = t.designation || t.designation_name || t.rank_name || t.job_title || t.role || "";
        list.push({ value: name, label: desig ? `${name} (${desig})` : name });
      }
    });

    // 3. Add any book instructors
    curriculumBooks.forEach((b) => {
      const tName = b.teacherName || b.teacher_name || b.instructor || "";
      if (tName && !seen.has(tName)) {
        seen.add(tName);
        list.push({ value: tName, label: tName });
      }
    });

    return list;
  }, [teachers, staff, curriculumBooks, availableBooks, curriculumBookId, periodSlotId, periodSlots, teacherName]);

  return {
    filteredClasses,
    filteredSections,
    filteredStudents,
    availableBooks,
    departmentOptions,
    classOptions,
    sectionOptions,
    studentSelectOptions,
    periodOptions,
    bookOptions,
    teacherOptions,
  };
}
