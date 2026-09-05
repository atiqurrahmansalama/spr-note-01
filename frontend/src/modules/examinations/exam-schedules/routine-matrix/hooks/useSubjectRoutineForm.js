import { useState, useMemo } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { formatShortDateLabel, generateDateRange } from '../../utils/examScheduleUtils';

/**
 * useSubjectRoutineForm
 * Headless state and business logic hook for Subject Routine Drawer Form.
 * Handles:
 * - Academic scope resolution (Department, Class, Section)
 * - Auto-matching curriculum textbooks to selected class
 * - Department-specific date window highlighting
 * - Marks breakdown component management & auto-balancing
 * - Previous exams marks merger configuration
 * - Form validation & submission payload preparation
 */
export default function useSubjectRoutineForm({
  mode = 'add',
  initialData = null,
  activeExam = null,
  allAvailableClasses = [],
  availableCurriculumBooks = [],
  examShifts = [],
  designatedExamDays = [],
  onSave,
}) {
  const { showToast } = useToast();
  const isEditMode = mode === 'edit' || (Boolean(initialData?.id) && mode !== 'add');

  // Exam-level configuration flags
  const isBreakdownEnabledOnExam = activeExam ? activeExam.breakdownEnabled !== false : true;

  const isPreviousExamsEnabledOnExam = Boolean(
    activeExam?.previousExamsConfig?.enabled ??
    activeExam?.previousExamsEnabled ??
    (Array.isArray(activeExam?.previousExams) && activeExam.previousExams.length > 0) ??
    (Array.isArray(activeExam?.previousExamsConfig?.exams) && activeExam.previousExamsConfig.exams.length > 0)
  );

  const defaultPreviousExamsList = useMemo(() => {
    if (Array.isArray(activeExam?.previousExamsConfig?.exams) && activeExam.previousExamsConfig.exams.length > 0) {
      return activeExam.previousExamsConfig.exams;
    }
    if (Array.isArray(activeExam?.previousExams) && activeExam.previousExams.length > 0) {
      return activeExam.previousExams;
    }
    return [];
  }, [activeExam]);

  // Breakdown Enabled Toggle State
  const [breakdownEnabled, setBreakdownEnabled] = useState(() => {
    if (!isBreakdownEnabledOnExam) return false;
    if (initialData) {
      if (initialData.breakdownEnabled !== undefined) {
        return Boolean(initialData.breakdownEnabled);
      }
      return Array.isArray(initialData.components) && initialData.components.length > 0;
    }
    return true;
  });

  // Master Form State Initialization
  const [formData, setFormData] = useState(() => {
    const defaultClass = allAvailableClasses.find(c => String(c.id) === String(initialData?.classId)) || allAvailableClasses[0] || null;
    const defaultShift = examShifts.find(s => String(s.id) === String(initialData?.shiftId)) || examShifts[0] || {
      id: 'shift_1',
      name: 'Shift 1 (Morning)',
      startTime: '09:00 AM',
      endTime: '11:00 AM',
    };
    const defaultFull = Number(activeExam?.defaultFullMarks || activeExam?.targetFullMarks || 100);
    const defaultPass = Math.round(defaultFull * 0.33);

    const matchedBook = initialData?.curriculumBookId
      ? availableCurriculumBooks.find((b) => String(b.id) === String(initialData.curriculumBookId))
      : null;

    if (initialData) {
      const clsName = initialData.className || defaultClass?.name || defaultClass?.class_name || '';
      const deptId = initialData.departmentId || defaultClass?.departmentId || defaultClass?.department_id || (typeof defaultClass?.department === 'object' ? defaultClass?.department?.id : defaultClass?.department) || '';
      const deptName = initialData.departmentName || defaultClass?.departmentName || defaultClass?.department_name || 'General Dept';
      const bookName = initialData.curriculumBookName || matchedBook?.name || matchedBook?.title || '';

      return {
        id: initialData.id,
        examId: initialData.examId || activeExam?.id || '',
        classId: initialData.classId ? String(initialData.classId) : (defaultClass?.id ? String(defaultClass.id) : ''),
        className: clsName,
        departmentId: deptId ? String(deptId) : '',
        departmentName: deptName,
        sectionId: initialData.sectionId ? String(initialData.sectionId) : '',
        sectionName: initialData.sectionName || 'All Sections',
        curriculumBookId: initialData.curriculumBookId ? String(initialData.curriculumBookId) : '',
        curriculumBookName: bookName,
        subjectName: initialData.subjectName || '',
        subjectCode: initialData.subjectCode || '',
        evaluationType: initialData.evaluationType || 'COMPOSITE',
        examDate: initialData.examDate || designatedExamDays[0] || activeExam?.startDate || '',
        shiftId: initialData.shiftId || defaultShift.id,
        shiftName: initialData.shiftName || defaultShift.name,
        startTime: initialData.startTime || defaultShift.startTime,
        endTime: initialData.endTime || defaultShift.endTime,
        roomNo: initialData.roomNo || '',
        invigilatorId: initialData.invigilatorId ? String(initialData.invigilatorId) : (initialData.teacherId ? String(initialData.teacherId) : ''),
        invigilatorName: initialData.invigilatorName || initialData.teacherName || '',
        examinerId: initialData.examinerId ? String(initialData.examinerId) : (initialData.evaluatorId ? String(initialData.evaluatorId) : ''),
        examinerName: initialData.examinerName || initialData.evaluatorName || '',
        evaluatorId: initialData.examinerId ? String(initialData.examinerId) : (initialData.evaluatorId ? String(initialData.evaluatorId) : ''),
        evaluatorName: initialData.examinerName || initialData.evaluatorName || '',
        teacherId: initialData.invigilatorId ? String(initialData.invigilatorId) : (initialData.teacherId ? String(initialData.teacherId) : ''),
        teacherName: initialData.invigilatorName || initialData.teacherName || '',
        notes: initialData.notes || '',
        fullMarks: Number(initialData.fullMarks || defaultFull),
        passMarks: Number(initialData.passMarks || defaultPass),
        previousExamsEnabled: initialData.previousExamsEnabled !== undefined
          ? Boolean(initialData.previousExamsEnabled)
          : true,
        previousExams: Array.isArray(initialData.previousExams) && initialData.previousExams.length > 0
          ? initialData.previousExams
          : defaultPreviousExamsList,
        components: Array.isArray(initialData.components) && initialData.components.length > 0
          ? initialData.components
          : [
              { id: 'comp_1', name: 'Written Exam', maxMarks: Math.round(defaultFull * 0.7) },
              { id: 'comp_2', name: 'Oral / Nazera', maxMarks: defaultFull - Math.round(defaultFull * 0.7) },
            ],
      };
    }

    return {
      id: `subj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      examId: activeExam?.id || '',
      classId: defaultClass?.id ? String(defaultClass.id) : '',
      className: defaultClass?.name || defaultClass?.class_name || '',
      departmentId: defaultClass?.departmentId || defaultClass?.department_id || (typeof defaultClass?.department === 'object' ? defaultClass?.department?.id : defaultClass?.department) || '',
      departmentName: defaultClass?.departmentName || defaultClass?.department_name || 'General Dept',
      sectionId: '',
      sectionName: 'All Sections',
      curriculumBookId: '',
      curriculumBookName: '',
      subjectName: '',
      subjectCode: '',
      evaluationType: 'COMPOSITE',
      examDate: designatedExamDays[0] || activeExam?.startDate || '',
      shiftId: defaultShift.id,
      shiftName: defaultShift.name,
      startTime: defaultShift.startTime,
      endTime: defaultShift.endTime,
      roomNo: '',
      invigilatorId: '',
      invigilatorName: '',
      examinerId: '',
      examinerName: '',
      evaluatorId: '',
      evaluatorName: '',
      teacherId: '',
      teacherName: '',
      notes: '',
      fullMarks: defaultFull,
      passMarks: defaultPass,
      previousExamsEnabled: true,
      previousExams: defaultPreviousExamsList,
      components: [
        { id: 'comp_1', name: 'Written Exam', maxMarks: Math.round(defaultFull * 0.7) },
        { id: 'comp_2', name: 'Oral / Nazera', maxMarks: defaultFull - Math.round(defaultFull * 0.7) },
      ],
    };
  });

  // Dynamic Class-Filtered Curriculum Books
  const classMatchingBooks = useMemo(() => {
    const rowClassId = String(formData.classId || '').trim();
    const rowClassNameClean = String(formData.className || '').toLowerCase().trim();

    if (!rowClassId && !rowClassNameClean) return [];

    return availableCurriculumBooks.filter((b) => {
      const bClassId = String(
        b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || ''
      ).trim();
      const bClassName = String(b.className || b.class_name || '').toLowerCase().trim();

      if (rowClassId && bClassId && (bClassId === rowClassId || rowClassId.includes(bClassId))) return true;
      if (
        rowClassNameClean &&
        bClassName &&
        (bClassName === rowClassNameClean ||
          bClassName.includes(rowClassNameClean) ||
          rowClassNameClean.includes(bClassName))
      )
        return true;
      return false;
    });
  }, [formData.classId, formData.className, availableCurriculumBooks]);

  // Book Select Options
  const bookOptions = useMemo(() => {
    return [
      ...classMatchingBooks.map((b) => ({
        value: String(b.id),
        label: b.subject ? `${b.name || b.title} (${b.subject})` : b.name || b.title || 'Book',
        bookObj: b,
      })),
      { value: 'CUSTOM', label: 'Custom / Non-Curriculum Subject' },
    ];
  }, [classMatchingBooks]);

  // Department-specific schedule resolution (if enabled on active exam session)
  const departmentSchedule = useMemo(() => {
    if (!activeExam?.isMultiDepartmentSchedule || !Array.isArray(activeExam?.departmentSchedules)) {
      return null;
    }
    const currentDeptId = String(formData.departmentId || '').trim();
    if (!currentDeptId || currentDeptId === 'ALL') return null;
    return (
      activeExam.departmentSchedules.find(
        (ds) => String(ds.departmentId).trim() === currentDeptId
      ) || null
    );
  }, [activeExam, formData.departmentId]);

  // Date Options (Designated days or dynamic range, with department window highlighting)
  const dateOptions = useMemo(() => {
    const rawDays =
      designatedExamDays.length > 0
        ? designatedExamDays
        : activeExam?.startDate && activeExam?.endDate
        ? generateDateRange(activeExam.startDate, activeExam.endDate)
        : [];

    return rawDays.map((d) => {
      const isWithinDeptWindow = departmentSchedule
        ? d >= departmentSchedule.startDate && d <= departmentSchedule.endDate
        : true;

      return {
        value: d,
        label: `${formatShortDateLabel(d)} (${d})${departmentSchedule && isWithinDeptWindow ? ' · Dept Window' : ''}`,
      };
    });
  }, [designatedExamDays, activeExam, departmentSchedule]);

  // Shift Options
  const shiftOptions = useMemo(() => {
    return examShifts.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.startTime} – ${s.endTime})`,
      shiftObj: s,
    }));
  }, [examShifts]);

  // ─── Scope & Timing Handlers ──────────────────────────────────────────────
  const handleDepartmentChange = (deptId, deptObj) => {
    const deptTitle = deptObj?.name || deptObj?.department_name || deptObj?.label || '';
    setFormData((prev) => ({
      ...prev,
      departmentId: deptId || '',
      departmentName: deptTitle,
    }));
  };

  const handleClassChange = (selectedVal, selectedClassObj) => {
    const clsName = selectedClassObj?.name || selectedClassObj?.class_name || selectedClassObj?.label || '';
    const deptId = selectedClassObj?.department_id || selectedClassObj?.departmentId || formData.departmentId || '';
    const deptName = selectedClassObj?.department_name || selectedClassObj?.departmentName || formData.departmentName || 'General Dept';

    setFormData((prev) => ({
      ...prev,
      classId: selectedVal || '',
      className: clsName,
      departmentId: deptId,
      departmentName: deptName,
      curriculumBookId: '',
      curriculumBookName: '',
      subjectName: '',
      subjectCode: '',
    }));
  };

  const handleSectionChange = (selectedVal, selectedSectionObj) => {
    const secName = selectedVal === 'ALL' || !selectedVal ? 'All Sections' : selectedSectionObj?.name || selectedSectionObj?.label || 'Section';
    setFormData((prev) => ({
      ...prev,
      sectionId: selectedVal || 'ALL',
      sectionName: secName,
    }));
  };

  const handleBookChange = (selectedBookId, opt) => {
    if (selectedBookId === 'CUSTOM') {
      setFormData((prev) => ({
        ...prev,
        curriculumBookId: '',
        curriculumBookName: '',
        subjectName: prev.subjectName || '',
        subjectCode: '',
      }));
      return;
    }

    const matchedBook = opt?.bookObj || availableCurriculumBooks.find((b) => String(b.id) === String(selectedBookId));
    if (matchedBook) {
      const bookSubject = matchedBook.subject || matchedBook.subject_name || matchedBook.name || matchedBook.title || '';
      const bookCode = matchedBook.code || matchedBook.subject_code || '';
      const autoTeacherId = matchedBook.teacherId || matchedBook.teacher_id || formData.teacherId || '';
      const autoTeacherName = matchedBook.teacherName || matchedBook.teacher_name || matchedBook.teacher || formData.teacherName || '';
      const fullMarksVal = Number(matchedBook.fullMarks || matchedBook.full_marks || matchedBook.total_marks || formData.fullMarks || 100);

      setFormData((prev) => ({
        ...prev,
        curriculumBookId: String(matchedBook.id),
        curriculumBookName: matchedBook.name || matchedBook.title || bookSubject,
        subjectName: bookSubject,
        subjectCode: bookCode,
        teacherId: autoTeacherId,
        teacherName: autoTeacherName,
        fullMarks: fullMarksVal,
        passMarks: Math.round(fullMarksVal * 0.33),
      }));
    }
  };

  const handleShiftChange = (shiftId, opt) => {
    const shift = opt?.shiftObj || examShifts.find((s) => String(s.id) === String(shiftId));
    if (shift) {
      setFormData((prev) => ({
        ...prev,
        shiftId: shift.id,
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      }));
    }
  };

  const handleTeacherChange = (selectedVal, teacherObj) => {
    const teacherNameStr =
      teacherObj?.name_en ||
      teacherObj?.name ||
      teacherObj?.full_name ||
      teacherObj?.user_name ||
      teacherObj?.label ||
      '';
    setFormData((prev) => ({
      ...prev,
      teacherId: selectedVal || '',
      teacherName: teacherNameStr,
    }));
  };

  // ─── Evaluation & Breakdown Handlers ──────────────────────────────────────
  const handleToggleBreakdown = (checked) => {
    setBreakdownEnabled(checked);
    if (checked && (!formData.components || formData.components.length === 0)) {
      const defaultFull = Number(formData.fullMarks || 100);
      setFormData((prev) => ({
        ...prev,
        components: [
          { id: 'comp_1', name: 'Written Exam', maxMarks: Math.round(defaultFull * 0.7) },
          { id: 'comp_2', name: 'Oral / Nazera', maxMarks: defaultFull - Math.round(defaultFull * 0.7) },
        ],
      }));
    }
  };

  const handleAddComponent = () => {
    const comps = formData.components || [];
    const currentSum = comps.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0);
    const target = Number(formData.fullMarks || 100);
    const remainder = Math.max(0, target - currentSum);

    const newComp = {
      id: `comp_${Date.now()}_${comps.length + 1}`,
      name: `Component ${comps.length + 1}`,
      maxMarks: remainder > 0 ? remainder : 0,
    };

    setFormData((prev) => ({
      ...prev,
      components: [...(prev.components || []), newComp],
    }));
  };

  const handleRemoveComponent = (idxToRemove) => {
    setFormData((prev) => {
      const next = (prev.components || []).filter((_, idx) => idx !== idxToRemove);
      return { ...prev, components: next };
    });
  };

  const handleUpdateComponent = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.components || [])];
      if (updated[idx]) {
        updated[idx] = {
          ...updated[idx],
          [field]: field === 'maxMarks' ? Math.max(0, Number(value) || 0) : value,
        };
      }
      return { ...prev, components: updated };
    });
  };

  const handleAutoBalance = () => {
    const comps = formData.components || [];
    const total = Number(formData.fullMarks || 100);
    if (comps.length === 0) return;

    if (comps.length === 1) {
      setFormData((prev) => ({
        ...prev,
        components: [{ ...comps[0], maxMarks: total }],
      }));
      return;
    }
    const currentSum = comps.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0);
    if (currentSum === total) return;

    const diff = total - currentSum;
    const updated = [...comps];
    const lastIdx = updated.length - 1;
    updated[lastIdx] = {
      ...updated[lastIdx],
      maxMarks: Math.max(0, (Number(updated[lastIdx].maxMarks) || 0) + diff),
    };
    setFormData((prev) => ({ ...prev, components: updated }));
  };

  // ─── Previous Exams Handlers ──────────────────────────────────────────────
  const handleTogglePreviousExams = (checked) => {
    setFormData((prev) => ({
      ...prev,
      previousExamsEnabled: checked,
    }));
  };

  const handleUpdatePreviousExamWeight = (idx, val) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setFormData((prev) => {
      const currentList = Array.isArray(prev.previousExams) && prev.previousExams.length > 0
        ? [...prev.previousExams]
        : defaultPreviousExamsList.map((e) => ({ ...e }));
      if (currentList[idx]) {
        currentList[idx] = { ...currentList[idx], weightagePct: num };
      }
      return { ...prev, previousExams: currentList };
    });
  };

  // ─── Validation & Submission ──────────────────────────────────────────────
  const componentsTotalMarks = useMemo(() => {
    if (!isBreakdownEnabledOnExam || !breakdownEnabled) return Number(formData.fullMarks || 100);
    return (formData.components || []).reduce((acc, c) => acc + (Number(c.maxMarks) || 0), 0);
  }, [isBreakdownEnabledOnExam, breakdownEnabled, formData.components, formData.fullMarks]);

  const parsedTargetMarks = Number(formData.fullMarks) || 100;
  const isMarksSumBalanced = !isBreakdownEnabledOnExam || !breakdownEnabled || componentsTotalMarks === parsedTargetMarks;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.subjectName || !formData.subjectName.trim()) {
      showToast('Please enter a valid Subject Exam Title.', 'warning');
      return;
    }
    if (!formData.classId) {
      showToast('Please select a target Academic Class.', 'warning');
      return;
    }

    const matchedClass = allAvailableClasses.find((c) => String(c.id) === String(formData.classId));
    const resolvedClassName = formData.className || matchedClass?.name || matchedClass?.class_name || 'Class';
    const resolvedDeptId = formData.departmentId || matchedClass?.department_id || (typeof matchedClass?.department === 'object' ? matchedClass?.department?.id : matchedClass?.department) || 'ALL';
    const resolvedDeptName = formData.departmentName || matchedClass?.department_name || matchedClass?.departmentName || 'General Dept';

    const matchedBook = formData.curriculumBookId
      ? availableCurriculumBooks.find((b) => String(b.id) === String(formData.curriculumBookId))
      : null;
    const resolvedBookName = formData.curriculumBookName || matchedBook?.name || matchedBook?.title || '';

    const matchedShift = examShifts.find((s) => String(s.id) === String(formData.shiftId)) || examShifts[0];
    const resolvedShiftName = formData.shiftName || matchedShift?.name || 'Shift 1 (Morning)';
    const resolvedStartTime = formData.startTime || matchedShift?.startTime || '09:00 AM';
    const resolvedEndTime = formData.endTime || matchedShift?.endTime || '11:00 AM';

    const payload = {
      ...formData,
      id: String(formData.id || initialData?.id || `subj_${Date.now()}`),
      examId: String(formData.examId || activeExam?.id || ''),
      subjectName: formData.subjectName.trim(),
      classId: String(formData.classId),
      className: resolvedClassName,
      departmentId: String(resolvedDeptId),
      departmentName: resolvedDeptName,
      sectionId: formData.sectionId || 'ALL',
      sectionName: formData.sectionName || 'All Sections',
      curriculumBookId: formData.curriculumBookId ? String(formData.curriculumBookId) : null,
      curriculumBookName: resolvedBookName,
      subjectCode: formData.subjectCode || '',
      evaluationType: formData.evaluationType || 'COMPOSITE',
      roomNo: formData.roomNo || '',
      invigilatorId: formData.invigilatorId ? String(formData.invigilatorId) : (formData.teacherId ? String(formData.teacherId) : ''),
      invigilatorName: formData.invigilatorName || formData.teacherName || '',
      examinerId: formData.examinerId ? String(formData.examinerId) : (formData.evaluatorId ? String(formData.evaluatorId) : ''),
      examinerName: formData.examinerName || formData.evaluatorName || '',
      evaluatorId: formData.examinerId ? String(formData.examinerId) : (formData.evaluatorId ? String(formData.evaluatorId) : ''),
      evaluatorName: formData.examinerName || formData.evaluatorName || '',
      teacherId: formData.invigilatorId ? String(formData.invigilatorId) : (formData.teacherId ? String(formData.teacherId) : ''),
      teacherName: formData.invigilatorName || formData.teacherName || '',
      notes: formData.notes || '',
      shiftId: matchedShift?.id || formData.shiftId || 'shift_1',
      shiftName: resolvedShiftName,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      examDate: formData.examDate || designatedExamDays[0] || activeExam?.startDate || '',
      fullMarks: Number(formData.fullMarks || 100),
      passMarks: Number(formData.passMarks || 33),
      breakdownEnabled: isBreakdownEnabledOnExam ? Boolean(breakdownEnabled) : false,
      components: isBreakdownEnabledOnExam && breakdownEnabled
        ? (formData.components || []).map((c) => ({
            ...c,
            name: c.name?.trim() || 'Component',
            maxMarks: Number(c.maxMarks) || 0,
          }))
        : [],
      previousExamsEnabled: isPreviousExamsEnabledOnExam ? Boolean(formData.previousExamsEnabled) : false,
      previousExams: isPreviousExamsEnabledOnExam && formData.previousExamsEnabled
        ? (formData.previousExams || defaultPreviousExamsList).map((e) => ({
            ...e,
            weightagePct: Number(e.weightagePct) || 0,
          }))
        : [],
    };

    if (onSave) {
      onSave(payload);
    }
  };

  return {
    isEditMode,
    isBreakdownEnabledOnExam,
    isPreviousExamsEnabledOnExam,
    defaultPreviousExamsList,
    breakdownEnabled,
    formData,
    setFormData,
    classMatchingBooks,
    bookOptions,
    departmentSchedule,
    dateOptions,
    shiftOptions,
    componentsTotalMarks,
    isMarksSumBalanced,
    handleDepartmentChange,
    handleClassChange,
    handleSectionChange,
    handleBookChange,
    handleShiftChange,
    handleTeacherChange,
    handleToggleBreakdown,
    handleAddComponent,
    handleRemoveComponent,
    handleUpdateComponent,
    handleAutoBalance,
    handleTogglePreviousExams,
    handleUpdatePreviousExamWeight,
    handleSubmit,
  };
}
