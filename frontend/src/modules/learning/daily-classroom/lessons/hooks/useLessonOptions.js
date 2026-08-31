import { useMemo } from "react";
import { getOrdinalPeriodLabel } from "../../../../../utils/localStore";
import { filterCurriculumBooks } from "../../dailyClassroomUtils";

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
  departmentId,
  classId,
  sectionId,
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
    () => filterCurriculumBooks(curriculumBooks, classId, classes, departmentId),
    [curriculumBooks, classId, classes, departmentId]
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

  const bookOptions = useMemo(() => [
    { value: "", label: "None (Direct Entry)" },
    ...availableBooks.map((b) => ({
      value: String(b.id),
      label: `${b.name}${b.subject ? ` (${b.subject})` : ""}`,
    })),
  ], [availableBooks]);

  const teacherOptions = useMemo(() => {
    const list = [{ value: "", label: "None (Unassigned)" }];
    const seen = new Set();

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

    curriculumBooks.forEach((b) => {
      const tName = b.teacherName || b.teacher_name || b.instructor || "";
      if (tName && !seen.has(tName)) {
        seen.add(tName);
        list.push({ value: tName, label: tName });
      }
    });

    if (teacherName && !seen.has(teacherName)) {
      seen.add(teacherName);
      list.push({ value: teacherName, label: teacherName });
    }

    return list;
  }, [teachers, staff, curriculumBooks, teacherName]);

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
