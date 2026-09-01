import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { learningStore } from '../../../../../utils/stores/learningStore';
import { getOrdinalPeriodLabel, curriculumStore } from '../../../../../utils/localStore';
import {
  findMatchingPeriodSlot,
  resolvePeriodTime,
  filterCurriculumBooks,
  resolveBookTeacher,
  doesLessonMatchClass,
} from '../../dailyClassroomUtils';

/**
 * useStudentAssessmentForm
 * Manages all form states, evaluation synchronizations, score computations,
 * book-period auto-matching, and submission logic for StudentAssessmentDrawer.
 */
export default function useStudentAssessmentForm({
  studentId = '',
  date = '',
  evaluation = null,
  assignedLesson = null,
  defaultDepartmentId = '',
  defaultClassId = '',
  defaultSectionId = '',
  defaultPeriodId = '',
  students = [],
  classes = [],
  sections = [],
  departments = [],
  periodSlots = [],
  teachers = [],
  staff = [],
  curriculumBooks = [],
  tenantId = 'default',
  onSaveSuccess,
  onCancel,
}) {
  const { showToast } = useToast();

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || evaluation?.student || '');
  const [evaluationDate, setEvaluationDate] = useState(
    date || evaluation?.evaluation_date || new Date().toISOString().split('T')[0]
  );
  const [periodSlotId, setPeriodSlotId] = useState(
    evaluation?.period_slot || (defaultPeriodId && defaultPeriodId !== 'ALL' ? String(defaultPeriodId) : '')
  );
  const [curriculumBookId, setCurriculumBookId] = useState(
    evaluation?.curriculum_book_id
      ? String(evaluation.curriculum_book_id)
      : (assignedLesson?.curriculum_book_id ? String(assignedLesson.curriculum_book_id) : '')
  );
  const [curriculumBookName, setCurriculumBookName] = useState(
    evaluation?.curriculum_book_name || assignedLesson?.curriculum_book_name || ''
  );
  const [subjectName, setSubjectName] = useState(
    evaluation?.subject_name || assignedLesson?.subject_name || ''
  );
  const [lessonCovered, setLessonCovered] = useState(
    evaluation?.lesson_covered || assignedLesson?.lesson_title || ''
  );
  const [startUnit, setStartUnit] = useState(
    evaluation?.start_unit !== undefined && evaluation?.start_unit !== ''
      ? String(evaluation.start_unit)
      : (assignedLesson?.start_unit !== undefined && assignedLesson?.start_unit !== '' ? String(assignedLesson.start_unit) : '')
  );
  const [endUnit, setEndUnit] = useState(
    evaluation?.end_unit !== undefined && evaluation?.end_unit !== ''
      ? String(evaluation.end_unit)
      : (assignedLesson?.end_unit !== undefined && assignedLesson?.end_unit !== '' ? String(assignedLesson.end_unit) : '')
  );
  const [recitationScore, setRecitationScore] = useState(
    evaluation?.recitation_score !== undefined
      ? evaluation.recitation_score
      : (evaluation?.score !== undefined ? evaluation.score : 10.0)
  );
  const [homeworkScore, setHomeworkScore] = useState(
    evaluation?.homework_score !== undefined ? evaluation.homework_score : 10.0
  );
  const [maxScore, setMaxScore] = useState(
    evaluation?.max_score !== undefined ? evaluation.max_score : 10.0
  );
  const [totalMistakes, setTotalMistakes] = useState(
    Number(evaluation?.total_mistakes || evaluation?.mistakes_count || 0)
  );
  const [totalStucks, setTotalStucks] = useState(
    Number(evaluation?.total_stucks || evaluation?.stucks_count || 0)
  );
  const [fluencyRating, setFluencyRating] = useState(evaluation?.fluency_rating || 5);
  const [teacherRemarks, setTeacherRemarks] = useState(evaluation?.teacher_remarks || '');
  const [nextTarget, setNextTarget] = useState(evaluation?.next_target || '');
  const [saving, setSaving] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (studentId) setSelectedStudentId(String(studentId));
  }, [studentId]);

  useEffect(() => {
    if (date) setEvaluationDate(date);
  }, [date]);

  // ─── Active Student Entity ──────────────────────────────────────────────────
  const activeStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    const found = students.find((s) => String(s.id) === String(selectedStudentId) || String(s.uniq_id) === String(selectedStudentId));
    if (found) return found;
    if (evaluation?.student_name) {
      return {
        id: selectedStudentId,
        name: evaluation.student_name,
        name_en: evaluation.student_name,
        uniq_id: evaluation.student_uniq_id || 'N/A',
        student_class: evaluation.student_class || defaultClassId || '',
        student_class_name: evaluation.student_class_name || '',
      };
    }
    return null;
  }, [students, selectedStudentId, evaluation, defaultClassId]);

  // ─── Available Books for Student Class ──────────────────────────────────────
  const availableBooks = useMemo(() => {
    const stCls = activeStudent?.student_class !== undefined ? activeStudent.student_class : (activeStudent?.class_id || activeStudent?.class || defaultClassId);
    const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');
    return filterCurriculumBooks(curriculumBooks, stClsId, classes, defaultDepartmentId);
  }, [curriculumBooks, activeStudent, defaultClassId, classes, defaultDepartmentId]);

  const selectedBook = useMemo(() => {
    return availableBooks.find((b) => String(b.id) === String(curriculumBookId)) ||
      curriculumBooks.find((b) => String(b.id) === String(curriculumBookId)) ||
      (curriculumBookName ? { id: curriculumBookId || 'custom', name: curriculumBookName, subject: subjectName } : (availableBooks.length === 1 ? availableBooks[0] : null));
  }, [availableBooks, curriculumBooks, curriculumBookId, curriculumBookName, subjectName]);

  const studentClassObj = useMemo(() => {
    if (activeStudent) {
      const stCls = activeStudent.student_class !== undefined ? activeStudent.student_class : (activeStudent.class_id || activeStudent.class);
      const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');
      const byId = classes.find((c) => String(c.id) === stClsId);
      if (byId) return byId;
      if (activeStudent.student_class_name) {
        const byName = classes.find((c) => (c.name || c.class_name || '').toLowerCase().trim() === activeStudent.student_class_name.toLowerCase().trim());
        if (byName) return byName;
      }
    }
    if (defaultClassId && defaultClassId !== 'ALL') {
      return classes.find((c) => String(c.id) === String(defaultClassId)) || null;
    }
    return null;
  }, [activeStudent, defaultClassId, classes]);

  const studentDeptObj = useMemo(() => {
    if (studentClassObj) {
      const dId = typeof studentClassObj.department === 'object'
        ? studentClassObj.department?.id
        : (studentClassObj.department || studentClassObj.department_id);
      const byId = departments.find((d) => String(d.id) === String(dId));
      if (byId) return byId;
    }
    if (activeStudent?.department_id || activeStudent?.department) {
      const dId = typeof activeStudent.department === 'object' ? activeStudent.department?.id : (activeStudent.department_id || activeStudent.department);
      const byId = departments.find((d) => String(d.id) === String(dId));
      if (byId) return byId;
    }
    if (defaultDepartmentId && defaultDepartmentId !== 'ALL') {
      return departments.find((d) => String(d.id) === String(defaultDepartmentId)) || null;
    }
    return null;
  }, [studentClassObj, activeStudent, defaultDepartmentId, departments]);

  const matchedSectionObj = useMemo(() => {
    if (activeStudent) {
      const stSec = activeStudent.section !== undefined ? activeStudent.section : (activeStudent.section_id || activeStudent.student_section);
      const stSecId = typeof stSec === 'object' ? String(stSec?.id || '') : String(stSec || '');
      const byId = sections.find((s) => String(s.id) === stSecId);
      if (byId) return byId;
      if (activeStudent.section_name) {
        const byName = sections.find((s) => (s.section_name || s.name || '').toLowerCase().trim() === activeStudent.section_name.toLowerCase().trim());
        if (byName) return byName;
      }
    }
    if (defaultSectionId && defaultSectionId !== 'ALL') {
      return sections.find((s) => String(s.id) === String(defaultSectionId)) || null;
    }
    return null;
  }, [activeStudent, defaultSectionId, sections]);

  const displaySectionName = useMemo(() => {
    if (matchedSectionObj) {
      return matchedSectionObj.section_name || matchedSectionObj.name || '';
    }
    if (activeStudent?.section_name) {
      return activeStudent.section_name;
    }
    if (defaultSectionId && defaultSectionId !== 'ALL') {
      const found = sections.find((s) => String(s.id) === String(defaultSectionId));
      if (found) return found.section_name || found.name || '';
      return '';
    }
    return '';
  }, [matchedSectionObj, activeStudent, defaultSectionId, sections]);

  const resolvedTeacherName = useMemo(() => {
    return evaluation?.teacher_name ||
      assignedLesson?.teacher_name ||
      selectedBook?.teacherName ||
      selectedBook?.teacher_name ||
      resolveBookTeacher(selectedBook, teachers, staff) ||
      '';
  }, [evaluation, assignedLesson, selectedBook, teachers, staff]);

  // ─── Period Slot & Time Resolution ─────────────────────────────────────────
  const matchedPeriod = useMemo(() => {
    return (
      findMatchingPeriodSlot(periodSlotId, periodSlots) ||
      findMatchingPeriodSlot(evaluation?.period_slot, periodSlots) ||
      findMatchingPeriodSlot(evaluation?.period_order, periodSlots) ||
      findMatchingPeriodSlot(assignedLesson?.period_slot, periodSlots) ||
      findMatchingPeriodSlot(assignedLesson?.period_order, periodSlots) ||
      findMatchingPeriodSlot(defaultPeriodId, periodSlots) ||
      null
    );
  }, [periodSlots, periodSlotId, defaultPeriodId, evaluation, assignedLesson]);

  const displayPeriodName = useMemo(() => {
    if (matchedPeriod) {
      const order = matchedPeriod.period_order ?? matchedPeriod.order;
      if (order) return getOrdinalPeriodLabel(order);
      if (matchedPeriod.period_name) return matchedPeriod.period_name;
    }
    const eOrder = evaluation?.period_order || assignedLesson?.period_order;
    if (eOrder) return getOrdinalPeriodLabel(eOrder);
    if (defaultPeriodId && /^\d+$/.test(String(defaultPeriodId))) {
      return getOrdinalPeriodLabel(Number(defaultPeriodId));
    }
    if (periodSlotId && /^\d+$/.test(String(periodSlotId))) {
      return getOrdinalPeriodLabel(Number(periodSlotId));
    }
    return '';
  }, [matchedPeriod, evaluation, assignedLesson, periodSlotId, defaultPeriodId]);

  const resolvedPeriodTime = useMemo(() => {
    return resolvePeriodTime(matchedPeriod, evaluation || assignedLesson, defaultPeriodId || periodSlotId, periodSlots);
  }, [matchedPeriod, evaluation, assignedLesson, defaultPeriodId, periodSlotId, periodSlots]);

  // ─── Auto-match book from period slot ───────────────────────────────────────
  const matchBookForPeriod = useCallback((targetSlotId) => {
    if (!targetSlotId) return;
    const matchedSlot = findMatchingPeriodSlot(targetSlotId, periodSlots);
    const targetOrder = matchedSlot?.period_order ?? matchedSlot?.order ?? (Number(targetSlotId) || null);

    if (targetOrder !== null && !isNaN(targetOrder)) {
      const matchedBook = availableBooks.find((b) => {
        if (b.periodSlotId && (String(b.periodSlotId) === String(targetSlotId) || (matchedSlot && String(b.periodSlotId) === String(matchedSlot.id)))) {
          return true;
        }
        const bOrder = b.period_order !== undefined ? Number(b.period_order) : (b.order !== undefined ? Number(b.order) : null);
        return bOrder !== null && bOrder === targetOrder;
      });

      if (matchedBook) {
        if (!curriculumBookId) setCurriculumBookId(String(matchedBook.id));
        if (!curriculumBookName) setCurriculumBookName(matchedBook.name || '');
        if (matchedBook.subject && !subjectName) setSubjectName(matchedBook.subject);
        if (matchedBook.startPage && !startUnit) setStartUnit(String(matchedBook.startPage));
        if (matchedBook.endPage && !endUnit) setEndUnit(String(matchedBook.endPage));
      } else if (availableBooks.length > 0 && !curriculumBookId) {
        const firstBook = availableBooks[0];
        setCurriculumBookId(String(firstBook.id));
        setCurriculumBookName(firstBook.name || '');
        if (firstBook.subject && !subjectName) setSubjectName(firstBook.subject);
        if (firstBook.startPage && !startUnit) setStartUnit(String(firstBook.startPage));
        if (firstBook.endPage && !endUnit) setEndUnit(String(firstBook.endPage));
      }
    }
  }, [availableBooks, periodSlots, curriculumBookId, curriculumBookName, subjectName, startUnit, endUnit]);

  useEffect(() => {
    if (!evaluation && !assignedLesson && periodSlotId) {
      matchBookForPeriod(periodSlotId);
    }
  }, [evaluation, assignedLesson, periodSlotId, matchBookForPeriod]);

  // Sync state if student/date/evaluation/assignedLesson changes
  useEffect(() => {
    if (selectedStudentId && evaluationDate) {
      const evals = learningStore.getEvaluations(tenantId);
      const existing = evaluation || evals.find(
        (e) => String(e.student) === String(selectedStudentId) && e.evaluation_date === evaluationDate
      );

      const dailyLessons = learningStore.getDailyLessons(tenantId) || [];
      const matchedLessonPlan = existing?.lesson_plan ? dailyLessons.find((l) => l.id === existing.lesson_plan) : null;
      
      const stCls = activeStudent?.student_class !== undefined ? activeStudent.student_class : (activeStudent?.class_id || activeStudent?.class);
      const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');

      const matchedDailyLesson = assignedLesson || matchedLessonPlan || dailyLessons.find((l) => {
        const lDate = String(l.lesson_date || '').split('T')[0];
        if (lDate && lDate !== String(evaluationDate).split('T')[0]) return false;
        if (stClsId && !doesLessonMatchClass(l, stClsId, classes, departments)) return false;
        if (defaultPeriodId && defaultPeriodId !== 'ALL') {
          const slotMatch = findMatchingPeriodSlot(defaultPeriodId, periodSlots);
          const lSlot = findMatchingPeriodSlot(l.period_slot || l.period_slot_id || l.period_order, periodSlots);
          if (slotMatch && lSlot && slotMatch.id !== lSlot.id) return false;
        }
        return true;
      }) || (stClsId ? dailyLessons.find((l) => doesLessonMatchClass(l, stClsId, classes, departments) && String(l.lesson_date || '').split('T')[0] === String(evaluationDate).split('T')[0]) : null)
         || (stClsId ? dailyLessons.find((l) => doesLessonMatchClass(l, stClsId, classes, departments)) : null);

      const resolvedBookName = existing?.curriculum_book_name || assignedLesson?.curriculum_book_name || matchedDailyLesson?.curriculum_book_name || '';
      const resolvedBookId = existing?.curriculum_book_id
        ? String(existing.curriculum_book_id)
        : (assignedLesson?.curriculum_book_id
            ? String(assignedLesson.curriculum_book_id)
            : (matchedDailyLesson?.curriculum_book_id
                ? String(matchedDailyLesson.curriculum_book_id)
                : (curriculumBooks.find((b) => b.name === resolvedBookName)?.id ? String(curriculumBooks.find((b) => b.name === resolvedBookName).id) : '')));
      const resolvedSubject = existing?.subject_name || assignedLesson?.subject_name || matchedDailyLesson?.subject_name || '';
      const resolvedLessonTitle = existing?.lesson_covered || assignedLesson?.lesson_title || matchedDailyLesson?.lesson_title || matchedDailyLesson?.lesson_covered || '';
      const resolvedStartUnit = existing?.start_unit !== undefined && existing?.start_unit !== ''
        ? String(existing.start_unit)
        : (assignedLesson?.start_unit !== undefined && assignedLesson?.start_unit !== ''
            ? String(assignedLesson.start_unit)
            : (matchedDailyLesson?.start_unit !== undefined && matchedDailyLesson?.start_unit !== '' ? String(matchedDailyLesson.start_unit) : ''));
      const resolvedEndUnit = existing?.end_unit !== undefined && existing?.end_unit !== ''
        ? String(existing.end_unit)
        : (assignedLesson?.end_unit !== undefined && assignedLesson?.end_unit !== ''
            ? String(assignedLesson.end_unit)
            : (matchedDailyLesson?.end_unit !== undefined && matchedDailyLesson?.end_unit !== '' ? String(matchedDailyLesson.end_unit) : ''));

      if (resolvedBookId) setCurriculumBookId(resolvedBookId);
      if (resolvedBookName) setCurriculumBookName(resolvedBookName);
      if (resolvedSubject) setSubjectName(resolvedSubject);
      if (resolvedLessonTitle) setLessonCovered(resolvedLessonTitle);
      if (resolvedStartUnit) setStartUnit(resolvedStartUnit);
      if (resolvedEndUnit) setEndUnit(resolvedEndUnit);

      if (existing) {
        setRecitationScore(
          existing.recitation_score !== undefined
            ? existing.recitation_score
            : (existing.score !== undefined ? existing.score : 10.0)
        );
        setHomeworkScore(
          existing.homework_score !== undefined
            ? existing.homework_score
            : 10.0
        );
        setMaxScore(existing.max_score !== undefined ? existing.max_score : 10.0);
        setTotalMistakes(existing.total_mistakes || 0);
        setTotalStucks(existing.total_stucks || 0);
        setFluencyRating(existing.fluency_rating || 5);
        setTeacherRemarks(existing.teacher_remarks || '');
        setNextTarget(existing.next_target || '');
      } else {
        setRecitationScore(10.0);
        setHomeworkScore(10.0);
        setMaxScore(10.0);
        setTotalMistakes(0);
        setTotalStucks(0);
        setFluencyRating(5);
        setTeacherRemarks('');
        setNextTarget('');
      }
    }
  }, [selectedStudentId, evaluationDate, evaluation, assignedLesson, tenantId, activeStudent, defaultPeriodId, curriculumBooks]);

  // Bound checks on pages based on selected book
  const bookMinPage = selectedBook ? Number(selectedBook.startPage || 1) : 1;
  const bookMaxPage = selectedBook ? Number(selectedBook.endPage || 9999) : undefined;

  const handleStartPageChange = (val) => {
    const rawVal = typeof val === 'string' ? val : val?.target?.value || '';
    if (rawVal === '') {
      setStartUnit('');
      return;
    }
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    if (bookMaxPage && num > bookMaxPage) {
      setStartUnit(String(bookMaxPage));
      showToast(`Start page cannot exceed book end page (${bookMaxPage}).`, 'warning');
      return;
    }
    setStartUnit(String(num));
  };

  const handleEndPageChange = (val) => {
    const rawVal = typeof val === 'string' ? val : val?.target?.value || '';
    if (rawVal === '') {
      setEndUnit('');
      return;
    }
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    if (bookMaxPage && num > bookMaxPage) {
      setEndUnit(String(bookMaxPage));
      showToast(`End page cannot exceed book max page (${bookMaxPage}).`, 'warning');
      return;
    }
    setEndUnit(String(num));
  };

  // Book Progress Stats
  const bookProgressStats = useMemo(() => {
    if (!selectedBook) return null;
    const start = Number(selectedBook.startPage || 1);
    const end = Number(selectedBook.endPage || 100);
    const current = Number(endUnit || startUnit || selectedBook.currentPage || start);
    const total = Math.max(1, end - start + 1);
    const covered = Math.max(0, Math.min(total, current - start + 1));
    const percentage = Math.min(100, Math.round((covered / total) * 100));
    return {
      startPage: start,
      endPage: end,
      currentPage: current,
      totalPages: total,
      coveredPages: covered,
      remainingPages: Math.max(0, end - current),
      percentage,
    };
  }, [selectedBook, startUnit, endUnit]);

  // Context flags
  const isDateFixed = Boolean(date || evaluation?.evaluation_date || evaluationDate);
  const isClassFixed = Boolean((defaultClassId && defaultClassId !== 'ALL') || studentClassObj);
  const isPeriodFixed = Boolean((defaultPeriodId && defaultPeriodId !== 'ALL') || periodSlotId || evaluation?.period_slot);
  const isStudentFixed = Boolean(studentId || selectedStudentId || evaluation?.student);

  const hasFixedContext = Boolean(
    evaluation ||
    assignedLesson ||
    isStudentFixed ||
    isClassFixed ||
    isPeriodFixed ||
    isDateFixed
  );

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select a student.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const studentObj = students.find((s) => String(s.id) === String(selectedStudentId));

      const rScore = Number(recitationScore) || 0;
      const mistakesCount = Number(totalMistakes) || 0;
      let computedStatus = 'SATISFACTORY';
      if (rScore >= 9 && mistakesCount === 0) {
        computedStatus = 'MASTERED';
      } else if (rScore < 5 || mistakesCount >= 5) {
        computedStatus = 'NEEDS_IMPROVEMENT';
      }

      const payload = {
        id: evaluation?.id || `eval_${selectedStudentId}_${evaluationDate}`,
        tenant_id: tenantId,
        student: selectedStudentId,
        student_name: studentObj?.name_en || studentObj?.name || 'Student',
        student_uniq_id: studentObj?.uniq_id || studentObj?.roll_number || 'N/A',
        student_class: studentObj?.student_class || '',
        student_class_name: studentObj?.student_class_name || 'Class',
        evaluation_date: evaluationDate,
        period_slot: periodSlotId || matchedPeriod?.id || null,
        period_order: matchedPeriod?.period_order ?? matchedPeriod?.order ?? null,
        period_name: displayPeriodName,
        evaluation_status: computedStatus,
        curriculum_book_id: curriculumBookId || null,
        curriculum_book_name: curriculumBookName || (selectedBook?.name || null),
        subject_name: subjectName.trim() || curriculumBookName || 'General Studies',
        lesson_covered: lessonCovered.trim(),
        start_unit: startUnit.trim(),
        end_unit: endUnit.trim(),
        score: rScore,
        recitation_score: rScore,
        homework_score: Number(homeworkScore) || 10.0,
        max_score: Number(maxScore) || 10.0,
        total_mistakes: mistakesCount,
        total_stucks: Number(totalStucks) || 0,
        fluency_rating: Number(fluencyRating) || 5,
        teacher_remarks: teacherRemarks.trim(),
        next_target: nextTarget.trim(),
        teacher_name: resolvedTeacherName,
        is_synced_to_parent: true,
        updated_at: new Date().toISOString(),
      };

      learningStore.saveEvaluation(tenantId, payload);

      // Sync progress with main Curriculum Store
      if (curriculumBookId && endUnit) {
        const pageNum = parseInt(endUnit, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          try {
            curriculumStore.updateProgress(tenantId, curriculumBookId, pageNum, lessonCovered.trim() || undefined);
          } catch {}
        }
      }

      showToast(evaluation ? 'Student evaluation updated successfully.' : 'Student evaluation recorded successfully.', 'success');
      onSaveSuccess?.(payload);
    } catch (err) {
      showToast('Failed to record evaluation. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    selectedStudentId,
    setSelectedStudentId,
    evaluationDate,
    setEvaluationDate,
    periodSlotId,
    setPeriodSlotId,
    curriculumBookId,
    setCurriculumBookId,
    curriculumBookName,
    setCurriculumBookName,
    subjectName,
    setSubjectName,
    lessonCovered,
    setLessonCovered,
    startUnit,
    setStartUnit,
    endUnit,
    setEndUnit,
    recitationScore,
    setRecitationScore,
    homeworkScore,
    setHomeworkScore,
    maxScore,
    setMaxScore,
    totalMistakes,
    setTotalMistakes,
    totalStucks,
    setTotalStucks,
    fluencyRating,
    setFluencyRating,
    teacherRemarks,
    setTeacherRemarks,
    nextTarget,
    setNextTarget,
    saving,
    isEditingContext,
    setIsEditingContext,
    activeStudent,
    studentClassObj,
    studentDeptObj,
    matchedSectionObj,
    displaySectionName,
    availableBooks,
    selectedBook,
    resolvedTeacherName,
    matchedPeriod,
    displayPeriodName,
    resolvedPeriodTime,
    bookMinPage,
    bookMaxPage,
    bookProgressStats,
    hasFixedContext,
    handleStartPageChange,
    handleEndPageChange,
    handleSubmit,
  };
}
