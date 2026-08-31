import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import ClassroomContextCard from '../ClassroomContextCard';
import {
  ChecklistIcon,
  BookOpenIcon,
  CalendarIcon,
  ChartBarIcon,
  TargetIcon,
  CheckIcon,
  StudentIcon,
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';
import { learningStore } from '../../../../utils/stores/learningStore';
import { curriculumStore, getOrdinalPeriodLabel } from '../../../../utils/localStore';
import {
  findMatchingPeriodSlot,
  resolvePeriodTime,
  filterCurriculumBooks,
  resolveBookTeacher,
  doesLessonMatchClass,
} from '../dailyClassroomUtils';
import { useAcademicData } from '../../useAcademicData';
import { useTenant } from '../../../../context/TenantContext';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import CarryForwardLessonPanel from '../lessons/CarryForwardLessonPanel';


export default function StudentAssessmentDrawer({
  studentId = '',
  date = '',
  evaluation = null,
  assignedLesson = null,
  defaultDepartmentId = '',
  defaultClassId = '',
  defaultSectionId = '',
  defaultPeriodId = '',
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const {
    students = [],
    classes = [],
    periodSlots = [],
    departments = [],
    teachers = [],
    staff = [],
  } = useAcademicData() || {};
  const tenantId = activeTenantId || 'default';

  const [selectedStudentId, setSelectedStudentId] = useState(studentId || evaluation?.student || '');
  const [evaluationDate, setEvaluationDate] = useState(date || evaluation?.evaluation_date || new Date().toISOString().split('T')[0]);
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
  const [subjectName, setSubjectName] = useState(evaluation?.subject_name || assignedLesson?.subject_name || '');
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
    evaluation?.homework_score !== undefined
      ? evaluation.homework_score
      : 10.0
  );
  const [maxScore, setMaxScore] = useState(evaluation?.max_score !== undefined ? evaluation.max_score : 10.0);
  const [totalMistakes, setTotalMistakes] = useState(Number(evaluation?.total_mistakes || evaluation?.mistakes_count || 0));
  const [totalStucks, setTotalStucks] = useState(Number(evaluation?.total_stucks || evaluation?.stucks_count || 0));
  const [fluencyRating, setFluencyRating] = useState(evaluation?.fluency_rating || 5);
  const [teacherRemarks, setTeacherRemarks] = useState(evaluation?.teacher_remarks || '');
  const [nextTarget, setNextTarget] = useState(evaluation?.next_target || '');
  const [saving, setSaving] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);

  // Sync props to state if they change
  useEffect(() => {
    if (studentId) setSelectedStudentId(String(studentId));
  }, [studentId]);

  useEffect(() => {
    if (date) setEvaluationDate(date);
  }, [date]);

  const [curriculumBooks, setCurriculumBooks] = useState([]);

  useEffect(() => {
    try {
      const items = curriculumStore.getCurriculumItems(tenantId);
      setCurriculumBooks(items);
    } catch {}
  }, [tenantId]);

  // Student list for select dropdown
  const studentOptions = useMemo(() => {
    return students.map((s) => ({
      value: String(s.id),
      label: `${s.name_en || s.name || 'Student'} (${s.uniq_id || s.roll_number || 'N/A'}) - ${s.student_class_name || 'Class'}`,
    }));
  }, [students]);

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

  // Filter books for active student class or default class
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

  const resolvedTeacherName = useMemo(() => {
    return evaluation?.teacher_name ||
      assignedLesson?.teacher_name ||
      selectedBook?.teacherName ||
      selectedBook?.teacher_name ||
      resolveBookTeacher(selectedBook, teachers, staff) ||
      '';
  }, [evaluation, assignedLesson, selectedBook, teachers, staff]);

  // Auto-match curriculum book and teacher from class & period slot
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

  const bookOptions = useMemo(() => {
    const list = [
      { value: '', label: 'None (General / Direct Entry)' },
      ...availableBooks.map((b) => ({
        value: String(b.id),
        label: `${b.name}${b.subject ? ` (${b.subject})` : ''}`,
      })),
    ];
    if (curriculumBookId && !list.some((o) => String(o.value) === String(curriculumBookId))) {
      list.push({
        value: String(curriculumBookId),
        label: curriculumBookName || 'Assigned Curriculum Book',
      });
    }
    return list;
  }, [availableBooks, curriculumBookId, curriculumBookName]);

  // Matched Routine Period
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

  const periodOptions = useMemo(() => {
    const list = [{ value: '', label: 'No Specific Period (Flexible Time)' }];
    periodSlots.forEach((p, idx) => {
      const order = p.period_order ?? p.order ?? (idx + 1);
      const pOrdinal = getOrdinalPeriodLabel(order);
      const timeStr = p.start_time && p.end_time ? ` (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})` : '';
      list.push({
        value: String(p.id),
        label: `${pOrdinal}${timeStr}`,
      });
    });
    return list;
  }, [periodSlots]);

  // Sync period slot when defaultPeriodId changes or periodSlots load
  useEffect(() => {
    const target = (defaultPeriodId && defaultPeriodId !== 'ALL' ? defaultPeriodId : '') ||
      evaluation?.period_slot ||
      evaluation?.period_order ||
      assignedLesson?.period_slot ||
      '';
    if (target) {
      const matched = findMatchingPeriodSlot(target, periodSlots);
      if (matched) {
        setPeriodSlotId(String(matched.id));
      } else {
        setPeriodSlotId(String(target));
      }
    }
  }, [defaultPeriodId, evaluation, assignedLesson, periodSlots]);

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

      // Resolve book, subject, lesson and page numbers prioritizing evaluation then assignedLesson / matchedDailyLesson
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
  const hasFixedContext = Boolean(
    evaluation ||
    (studentClassObj && (periodSlotId || defaultPeriodId || curriculumBookId || curriculumBookName)) ||
    selectedStudentId ||
    activeStudent ||
    (defaultClassId && defaultClassId !== 'ALL')
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
        homework_score: Number(homeworkScore) || 0,
        max_score: Number(maxScore) || 10,
        total_mistakes: mistakesCount,
        total_stucks: Number(totalStucks) || 0,
        fluency_rating: Number(fluencyRating) || 5,
        teacher_remarks: teacherRemarks.trim(),
        next_target: nextTarget.trim(),
        evaluated_at: new Date().toISOString(),
      };

      learningStore.saveEvaluation(tenantId, payload);
      showToast(`Assessment saved for ${studentObj?.name_en || 'student'} and synced to student diary.`, 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast('Failed to record student assessment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none">
      <form onSubmit={handleSubmit} className="@container p-4 sm:p-6 space-y-6 text-left">
        {/* In-Drawer Carry Forward Panel */}
        {!evaluation && isCarryForwardOpen && (
          <CarryForwardLessonPanel
            isOpen={isCarryForwardOpen}
            onClose={() => setIsCarryForwardOpen(false)}
            currentDate={evaluationDate}
            classId={studentClassObj?.id || defaultClassId}
            classes={classes}
            tenantId={tenantId}
            onApplyLesson={(src, { nextStart, nextEnd } = {}) => {
              if (!src) return;
              if (src.curriculum_book_id) setCurriculumBookId(String(src.curriculum_book_id));
              if (src.curriculum_book_name) setCurriculumBookName(src.curriculum_book_name);
              if (src.subject_name) setSubjectName(src.subject_name);
              if (src.lesson_title) setLessonCovered(src.lesson_title);
              if (nextStart !== undefined && nextEnd !== undefined) {
                setStartUnit(String(nextStart));
                setEndUnit(String(nextEnd));
              } else {
                setStartUnit(src.start_unit || '');
                setEndUnit(src.end_unit || '');
              }
              if (src.period_slot) {
                const matched = findMatchingPeriodSlot(src.period_slot, periodSlots);
                if (matched) setPeriodSlotId(String(matched.id));
              }
              setIsCarryForwardOpen(false);
              showToast(`Applied Sabaq details to assessment form.`, 'success');
            }}
          />
        )}

        {/* 1. Context Summary Card (When Student, Date, Book, Class are pre-selected) */}
        {hasFixedContext && (
          <ClassroomContextCard
            title={evaluation ? 'Assessment Evaluation Record' : 'Student Assessment Context'}
            badgeLabel={evaluation ? 'Evaluated' : (activeStudent ? 'Selected Student' : 'Pre-selected Context')}
            student={activeStudent}
            date={evaluationDate}
            departmentName={studentDeptObj?.name || activeStudent?.department_name || activeStudent?.department || ''}
            className={studentClassObj?.name || studentClassObj?.class_name || activeStudent?.student_class_name || ''}
            sectionName={activeStudent?.section_name || (defaultSectionId !== 'ALL' ? defaultSectionId : '')}
            periodName={displayPeriodName}
            periodTime={resolvedPeriodTime}
            bookName={curriculumBookName || selectedBook?.name || ''}
            subjectName={subjectName || selectedBook?.subject || ''}
            teacherName={resolvedTeacherName}
            lessonTitle={lessonCovered}
            startUnit={startUnit}
            endUnit={endUnit}
            bookProgressStats={bookProgressStats}
            isEditable={true}
            isEditMode={isEditingContext}
            onToggleEdit={() => setIsEditingContext((prev) => !prev)}
            onCarryForward={!evaluation ? () => setIsCarryForwardOpen((prev) => !prev) : undefined}
          />
        )}

        {/* 2. Target Context Selectors (Always shown if no fixed context, or when isEditingContext is active) */}
        {(!hasFixedContext || isEditingContext) && (
          <DrawerSection title="Academic Target & Assessment Context" icon={CalendarIcon}>
            <div className="space-y-4">
              {/* Row 1: Student Picker */}
              <CustomSelect
                label="Select Student"
                options={studentOptions}
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                required
                searchable={true}
                placeholder="Search & select student..."
              />

              {/* Row 2: Evaluation Date & Class Routine Period */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <ReusableCalendar
                  label="Evaluation Date"
                  selectedDate={evaluationDate}
                  onSelectDate={(val) => setEvaluationDate(val)}
                  placeholder="Select Date"
                />

                <CustomSelect
                  label="Class Routine Period"
                  options={periodOptions}
                  value={periodSlotId}
                  onChange={(val) => {
                    setPeriodSlotId(val);
                    const matchedSlot = findMatchingPeriodSlot(val, periodSlots);
                    const targetOrder = matchedSlot?.period_order ?? matchedSlot?.order ?? (Number(val) || null);
                    if (targetOrder !== null && !isNaN(targetOrder)) {
                      const autoBook = availableBooks.find((b) => {
                        if (b.periodSlotId && (String(b.periodSlotId) === String(val) || (matchedSlot && String(b.periodSlotId) === String(matchedSlot.id)))) {
                          return true;
                        }
                        const bOrder = b.period_order !== undefined ? Number(b.period_order) : (b.order !== undefined ? Number(b.order) : null);
                        return bOrder !== null && bOrder === targetOrder;
                      });
                      if (autoBook) {
                        setCurriculumBookId(String(autoBook.id));
                        setCurriculumBookName(autoBook.name || '');
                        if (autoBook.subject) setSubjectName(autoBook.subject);
                        if (autoBook.startPage) setStartUnit(String(autoBook.startPage));
                        if (autoBook.endPage) setEndUnit(String(autoBook.endPage));
                      }
                    }
                  }}
                />
              </div>

              {/* Row 3: Curriculum Book & Lesson Title */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Curriculum Book"
                  options={bookOptions}
                  value={curriculumBookId}
                  onChange={(val) => {
                    setCurriculumBookId(val);
                    if (!val) {
                      setCurriculumBookName('');
                      setSubjectName('');
                      return;
                    }
                    const b = curriculumBooks.find((item) => String(item.id) === String(val)) ||
                              availableBooks.find((item) => String(item.id) === String(val));
                    if (b) {
                      setCurriculumBookName(b.name || '');
                      if (b.subject) setSubjectName(b.subject);
                      if (b.startPage) setStartUnit(String(b.startPage));
                      if (b.endPage) setEndUnit(String(b.endPage));
                    }
                  }}
                />

                <CustomInput
                  label="Lesson / Sabaq Covered"
                  placeholder="e.g. Chapter 1: Exercise 2 or Surah Al-Kahf Ayah 1-20"
                  value={lessonCovered}
                  onChange={setLessonCovered}
                />
              </div>

              {/* Row 4: Start Page & End Page */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomInput
                  label="Start Page"
                  type="number"
                  min={bookMinPage}
                  max={bookMaxPage || undefined}
                  placeholder={selectedBook ? `e.g. ${bookMinPage}` : 'e.g. 1'}
                  value={startUnit}
                  onChange={handleStartPageChange}
                />

                <CustomInput
                  label="End Page"
                  type="number"
                  min={startUnit ? Math.max(bookMinPage, parseInt(startUnit, 10) || bookMinPage) : bookMinPage}
                  max={bookMaxPage || undefined}
                  placeholder={selectedBook ? `e.g. ${bookMaxPage}` : 'e.g. 20'}
                  value={endUnit}
                  onChange={handleEndPageChange}
                  helperText={selectedBook ? `Total: ${selectedBook.totalPages || bookMaxPage} pages` : ''}
                />
              </div>
            </div>
          </DrawerSection>
        )}

        {/* 3. Standalone Student Selection (When context is pre-selected but student not yet picked) */}
        {hasFixedContext && !activeStudent && !isEditingContext && (
          <DrawerSection title="Student Selection" icon={StudentIcon}>
            <CustomSelect
              label="Select Student to Evaluate"
              options={studentOptions}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              required
              searchable={true}
              placeholder="Search & select student..."
            />
          </DrawerSection>
        )}

        {/* 4. Section: Evaluation Metrics & Scores */}
        <DrawerSection title="Evaluation Metrics & Scores" icon={ChartBarIcon}>
          <div className="space-y-4">
            {/* Complementary Row 1: Mistakes & Stucks */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Mistakes"
                type="number"
                min={0}
                allowDecimals={false}
                value={totalMistakes}
                onChange={(val) => setTotalMistakes(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0))}
                placeholder="0"
              />

              <CustomInput
                label="Stucks"
                type="number"
                min={0}
                allowDecimals={false}
                value={totalStucks}
                onChange={(val) => setTotalStucks(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0))}
                placeholder="0"
              />
            </div>

            {/* Complementary Row 2: Lesson Score & Homework Score */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Lesson Score"
                type="number"
                min={0}
                max={10}
                step={0.25}
                suffix="/ 10"
                value={recitationScore}
                onChange={(val) => setRecitationScore(val === '' ? '' : Math.min(10, Math.max(0, parseFloat(val) || 0)))}
                placeholder="10.0"
              />

              <CustomInput
                label="Homework Score"
                type="number"
                min={0}
                max={10}
                step={0.25}
                suffix="/ 10"
                value={homeworkScore}
                onChange={(val) => setHomeworkScore(val === '' ? '' : Math.min(10, Math.max(0, parseFloat(val) || 0)))}
                placeholder="10.0"
              />
            </div>
          </div>
        </DrawerSection>

        {/* 5. Section: Feedback & Next Target */}
        <DrawerSection title="Feedback & Next Target" icon={TargetIcon}>
          <div className="space-y-4">
            <CustomInput
              type="textarea"
              rows={3}
              label="Teacher Remarks"
              placeholder="Performance remarks, focus areas..."
              value={teacherRemarks}
              onChange={setTeacherRemarks}
            />

            <CustomInput
              label="Next Target for Tomorrow"
              placeholder="e.g. Next Chapter or Next 2 Pages"
              value={nextTarget}
              onChange={setNextTarget}
            />
          </div>
        </DrawerSection>

        {/* Drawer Footer with Save & Cancel */}
        <DrawerFooter>
          <CustomButton
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </CustomButton>
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            disabled={!selectedStudentId}
            icon={CheckIcon}
          >
            {evaluation?.id ? 'Save Changes' : 'Save Assessment'}
          </CustomButton>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}
