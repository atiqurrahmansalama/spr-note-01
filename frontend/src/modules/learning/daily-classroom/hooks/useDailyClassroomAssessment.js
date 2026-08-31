import { useMemo, useCallback } from "react";
import { doesLessonMatchClass, isLessonInSlot } from "../dailyClassroomUtils";

/**
 * useDailyClassroomAssessment
 * Computes assessment rows (student + evaluation matrix),
 * slot-based assessment counts, and dashboard metrics.
 *
 * @param {Object} params - All required data and filter references
 */
export default function useDailyClassroomAssessment({
  enrolledStudents,
  evaluations,
  lessons,
  classes,
  selectedDate,
  activePeriodId,
  filteredLessons,
  baseFilteredLessons,
  assessmentSearch,
}) {
  // ── Assessment Rows (Student × Evaluation join) ─────────────────────────────

  const assessmentRows = useMemo(() => {
    const targetDate = String(selectedDate || "").split("T")[0];

    return enrolledStudents
      .filter((st) => {
        const name = (st.name_en || st.name || "").toLowerCase();
        const id = (st.uniq_id || st.roll_number || "").toLowerCase();
        return (
          assessmentSearch === "" ||
          name.includes(assessmentSearch.toLowerCase()) ||
          id.includes(assessmentSearch.toLowerCase())
        );
      })
      .map((st) => {
        const evalsForStudent = evaluations.filter((e) => {
          const eDate = String(e.evaluation_date || "").split("T")[0];
          return String(e.student) === String(st.id) && eDate === targetDate;
        });

        // 1. Period-aware eval match
        const matchedEval =
          activePeriodId === "ALL"
            ? evalsForStudent[0]
            : evalsForStudent.find((e) => isLessonInSlot(e, activePeriodId));

        // 2. Parent lesson from evaluation
        const evalParentLesson = matchedEval?.lesson_plan
          ? lessons.find((l) => String(l.id) === String(matchedEval.lesson_plan))
          : null;

        // 3. Relevant lesson for student's class
        const stCls = st.student_class !== undefined ? st.student_class : (st.class_id || st.class || st.student_class_id);
        const stClsId = typeof stCls === "object" ? String(stCls?.id || "") : String(stCls || "");
        const stClsName = (st.student_class_name || st.class_name || "").toLowerCase().trim();

        const findClassLesson = (list) => {
          if (!list || list.length === 0) return null;
          return list.find((l) => {
            if (stClsId && doesLessonMatchClass(l, stClsId, classes)) return true;
            if (stClsName && l.class_name && l.class_name.toLowerCase().trim() === stClsName) return true;
            return false;
          });
        };

        const relevantLesson =
          evalParentLesson ||
          findClassLesson(filteredLessons) ||
          (activePeriodId === "ALL" ? findClassLesson(baseFilteredLessons) : null);

        const hasAssignedLesson = Boolean(relevantLesson || matchedEval);

        return {
          id: st.id,
          student: st.id,
          student_name: st.name_en || st.name || "Student",
          student_uniq_id: st.uniq_id || st.roll_number || "N/A",
          student_class_name: st.student_class_name || "Standard Division",
          evaluation_date: selectedDate,
          is_evaluated: Boolean(matchedEval),
          has_assigned_lesson: hasAssignedLesson,
          evaluation_status: matchedEval?.evaluation_status || "NOT_EVALUATED",
          curriculum_book_id: matchedEval?.curriculum_book_id || relevantLesson?.curriculum_book_id || "",
          curriculum_book_name: matchedEval?.curriculum_book_name || relevantLesson?.curriculum_book_name || "",
          subject_name: matchedEval?.subject_name || relevantLesson?.subject_name || "",
          lesson_title: matchedEval?.lesson_covered || relevantLesson?.lesson_title || "",
          lesson_covered: matchedEval?.lesson_covered || relevantLesson?.lesson_title || "",
          start_unit: matchedEval?.start_unit || relevantLesson?.start_unit || "",
          end_unit: matchedEval?.end_unit || relevantLesson?.end_unit || "",
          score: matchedEval?.score !== undefined ? matchedEval.score : "—",
          recitation_score:
            matchedEval?.recitation_score !== undefined
              ? matchedEval.recitation_score
              : matchedEval?.score !== undefined
              ? matchedEval.score
              : "—",
          homework_score:
            matchedEval?.homework_score !== undefined
              ? matchedEval.homework_score
              : matchedEval?.score !== undefined
              ? matchedEval.score
              : "—",
          total_mistakes: matchedEval?.total_mistakes || 0,
          total_stucks: matchedEval?.total_stucks || 0,
          fluency_rating: matchedEval?.fluency_rating || "—",
          teacher_remarks: matchedEval?.teacher_remarks || "—",
        };
      });
  }, [enrolledStudents, assessmentSearch, evaluations, selectedDate, activePeriodId, filteredLessons, baseFilteredLessons, lessons, classes]);

  // ── Per-Slot Assessment Count ───────────────────────────────────────────────

  const getSlotAssessmentCount = useCallback((slotValue) => {
    const targetDate = String(selectedDate || "").split("T")[0];
    if (slotValue === "ALL") {
      return evaluations.filter(
        (e) =>
          String(e.evaluation_date || "").split("T")[0] === targetDate &&
          enrolledStudents.some((s) => String(s.id) === String(e.student))
      ).length;
    }
    return evaluations.filter(
      (e) =>
        String(e.evaluation_date || "").split("T")[0] === targetDate &&
        isLessonInSlot(e, slotValue) &&
        enrolledStudents.some((s) => String(s.id) === String(e.student))
    ).length;
  }, [evaluations, selectedDate, enrolledStudents]);

  // ── Metrics ─────────────────────────────────────────────────────────────────

  const assessmentMetrics = useMemo(() => {
    const evaluated = assessmentRows.filter((r) => r.is_evaluated && r.evaluation_status !== "ABSENT").length;
    const mistakes = assessmentRows.reduce((acc, r) => acc + (Number(r.total_mistakes) || 0), 0);
    const stucks = assessmentRows.reduce((acc, r) => acc + (Number(r.total_stucks) || 0), 0);
    return [
      { label: "Enrolled Students", value: enrolledStudents.length, subValue: "Class roster count" },
      { label: "Assessed Today", value: evaluated, subValue: "Evaluated students" },
      { label: "Total Mistakes", value: mistakes, subValue: "Errors flagged" },
      { label: "Total Stucks", value: stucks, subValue: "Lukmah occurrences" },
    ];
  }, [assessmentRows, enrolledStudents]);

  return {
    assessmentRows,
    assessmentMetrics,
    getSlotAssessmentCount,
  };
}
