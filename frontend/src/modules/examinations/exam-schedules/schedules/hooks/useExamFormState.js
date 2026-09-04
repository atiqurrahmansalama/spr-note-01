import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { examStore } from '../../../../../utils/stores/examStore';
import { masterCalendarStore } from '../../../../../utils/stores/calendarStore';
import { readJSON, writeJSON } from '../../../../../utils/stores/coreStore';

export const DEFAULT_SHIFT_PRESETS = [
  { name: 'Shift 1', startTime: '09:00 AM', endTime: '11:00 AM' },
  { name: 'Shift 2', startTime: '11:30 AM', endTime: '01:30 PM' },
  { name: 'Shift 3', startTime: '02:00 PM', endTime: '04:00 PM' },
  { name: 'Shift 4', startTime: '04:30 PM', endTime: '06:30 PM' },
  { name: 'Shift 5', startTime: '07:00 PM', endTime: '09:00 PM' },
  { name: 'Shift 6', startTime: '09:30 PM', endTime: '11:30 PM' },
];

/**
 * useExamFormState
 * Headless state and business logic hook for creating/editing examination sessions.
 * Manages:
 * - 3-step wizard workflow (Schedule, Classes, Evaluation)
 * - Dynamic academic year terms, shifts, and class multi-select
 * - Real-time auto-saving to localStorage and draft restoration
 * - 100% dynamic marks components and CA/previous exam weightage auto-balancing
 * - Master event calendar synchronization
 */
export default function useExamFormState({
  exam = null,
  tenantId = 'default',
  academicYears = [],
  academicYearOptions = [],
  departmentOptions = [],
  gradingSystemOptions = [],
  classOptions = [],
  onSaveSuccess,
}) {
  const { showToast } = useToast();

  const draftKey = `spr_exam_form_draft_${tenantId}_${exam?.id || 'new'}`;
  const savedDraft = useMemo(() => {
    return readJSON(draftKey, null);
  }, [draftKey]);

  const [step, setStep] = useState(1);
  const [isDraftRestored, setIsDraftRestored] = useState(() => Boolean(savedDraft));
  const [saving, setSaving] = useState(false);

  // ── Step 1: General Info & Schedule ───────────────────────────────────────
  const [name, setName] = useState(savedDraft?.name ?? exam?.name ?? '');
  const [code, setCode] = useState(savedDraft?.code ?? exam?.code ?? '');

  const [academicYearId, setAcademicYearId] = useState(() => {
    if (savedDraft?.academicYearId) return String(savedDraft.academicYearId);
    if (exam?.academicYearId) return String(exam.academicYearId);
    const activeY = academicYears.find((y) => y.isCurrent || y.is_active);
    return activeY ? String(activeY.id || activeY.academic_year) : (academicYearOptions[0]?.value || '');
  });

  const selectedYear = useMemo(() => {
    if (!academicYearId) {
      return academicYears.find((y) => y.isCurrent || y.is_active) || academicYears[0] || null;
    }
    const found = academicYears.find(
      (y) => String(y.id || y.academic_year || y.year_code) === String(academicYearId)
    );
    return found || academicYears.find((y) => y.isCurrent || y.is_active) || academicYears[0] || null;
  }, [academicYears, academicYearId]);

  const semesterOptions = useMemo(() => {
    if (!selectedYear || !Array.isArray(selectedYear.terms) || selectedYear.terms.length === 0) {
      return [
        {
          value: 'annual_term',
          label: 'Full Academic Year / Annual Session',
          term: null,
        },
      ];
    }

    return selectedYear.terms.map((t, idx) => {
      const dateRange = t.startDate && t.endDate ? ` (${t.startDate} — ${t.endDate})` : '';
      return {
        value: String(t.id || `term_${idx + 1}`),
        label: `${t.name}${dateRange}${t.isCurrent ? ' (Active Term)' : ''}`,
        term: t,
      };
    });
  }, [selectedYear]);

  const [semesterId, setSemesterId] = useState(() => {
    if (savedDraft?.semesterId) return String(savedDraft.semesterId);
    if (exam?.semesterId) return String(exam.semesterId);
    const currentTerm = selectedYear?.terms?.find((t) => t.isCurrent);
    return currentTerm ? String(currentTerm.id) : (semesterOptions[0]?.value || 'annual_term');
  });

  const [gradingSystemId, setGradingSystemId] = useState(
    savedDraft?.gradingSystemId ?? exam?.gradingSystemId ?? gradingSystemOptions[0]?.value ?? 'dars_e_nizami_standard'
  );

  const [startDate, setStartDate] = useState(savedDraft?.startDate ?? exam?.startDate ?? new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(savedDraft?.endDate ?? exam?.endDate ?? new Date().toISOString().split('T')[0]);
  const [prepStartDate, setPrepStartDate] = useState(savedDraft?.prepStartDate ?? exam?.prepStartDate ?? '');
  const [prepEndDate, setPrepEndDate] = useState(savedDraft?.prepEndDate ?? exam?.prepEndDate ?? '');
  const [scheduleDays, setScheduleDays] = useState(savedDraft?.scheduleDays ?? exam?.scheduleDays ?? []);
  const [description, setDescription] = useState(savedDraft?.description ?? exam?.description ?? '');

  const [shifts, setShifts] = useState(() => {
    if (Array.isArray(savedDraft?.shifts) && savedDraft.shifts.length > 0) {
      return savedDraft.shifts;
    }
    if (Array.isArray(exam?.shifts) && exam.shifts.length > 0) {
      return exam.shifts.map((s, idx) => ({
        id: s.id || `shift_${idx + 1}`,
        name: s.name || `Shift ${idx + 1}`,
        startTime: s.startTime || '09:00 AM',
        endTime: s.endTime || '11:00 AM',
      }));
    }
    const initial = [
      {
        id: 'shift_1',
        name: DEFAULT_SHIFT_PRESETS[0].name,
        startTime: exam?.defaultStartTime || DEFAULT_SHIFT_PRESETS[0].startTime,
        endTime: exam?.defaultEndTime || DEFAULT_SHIFT_PRESETS[0].endTime,
      },
    ];
    if (exam?.hasSecondShift || exam?.secondStartTime) {
      initial.push({
        id: 'shift_2',
        name: DEFAULT_SHIFT_PRESETS[1].name,
        startTime: exam?.secondStartTime || DEFAULT_SHIFT_PRESETS[1].startTime,
        endTime: exam?.secondEndTime || DEFAULT_SHIFT_PRESETS[1].endTime,
      });
    }
    return initial;
  });

  // Auto-sync semesterId when Academic Year changes
  useEffect(() => {
    if (semesterOptions.length > 0) {
      const exists = semesterOptions.some((opt) => String(opt.value) === String(semesterId));
      if (!exists) {
        const defaultTerm = semesterOptions.find((opt) => opt.term?.isCurrent) || semesterOptions[0];
        setSemesterId(defaultTerm.value);

        if (!exam?.id && !savedDraft && defaultTerm.term) {
          if (defaultTerm.term.startDate) setStartDate(defaultTerm.term.startDate);
          if (defaultTerm.term.endDate) setEndDate(defaultTerm.term.endDate);
        }
      }
    }
  }, [semesterOptions, semesterId, exam, savedDraft]);

  useEffect(() => {
    if (!academicYearId && academicYearOptions.length > 0) {
      setAcademicYearId(academicYearOptions[0].value);
    }
  }, [academicYearId, academicYearOptions]);

  const handleSemesterChange = (newSemId) => {
    setSemesterId(newSemId);
    const selectedOpt = semesterOptions.find((opt) => String(opt.value) === String(newSemId));
    if (!exam?.id && selectedOpt?.term) {
      if (selectedOpt.term.startDate) setStartDate(selectedOpt.term.startDate);
      if (selectedOpt.term.endDate) setEndDate(selectedOpt.term.endDate);
    }
  };

  const handleAddShift = () => {
    setShifts((prev) => {
      const nextIndex = prev.length;
      const preset = DEFAULT_SHIFT_PRESETS[nextIndex] || {
        name: `Shift ${nextIndex + 1}`,
        startTime: '09:00 AM',
        endTime: '11:00 AM',
      };
      return [
        ...prev,
        {
          id: `shift_${Date.now()}_${nextIndex + 1}`,
          name: preset.name || `Shift ${nextIndex + 1}`,
          startTime: preset.startTime || '09:00 AM',
          endTime: preset.endTime || '11:00 AM',
        },
      ];
    });
  };

  const handleRemoveShift = (indexToRemove) => {
    setShifts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleShiftChange = (index, field, value) => {
    setShifts((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [field]: value } : s))
    );
  };

  // ── Step 2: Departments & Classes ─────────────────────────────────────────
  const [departmentId, setDepartmentId] = useState(() => {
    if (savedDraft?.departmentId !== undefined && savedDraft?.departmentId !== null) {
      return String(savedDraft.departmentId);
    }
    if (exam?.departmentId !== undefined && exam?.departmentId !== null) {
      return String(exam.departmentId);
    }
    return 'ALL';
  });

  useEffect(() => {
    if (exam?.departmentId !== undefined && exam?.departmentId !== null && !savedDraft) {
      setDepartmentId(String(exam.departmentId));
    }
  }, [exam?.departmentId, savedDraft]);

  const [targetClassIds, setTargetClassIds] = useState(() => {
    if (Array.isArray(savedDraft?.targetClassIds)) {
      return savedDraft.targetClassIds.map(String);
    }
    if (Array.isArray(exam?.targetClassIds) && exam.targetClassIds.length > 0) {
      return exam.targetClassIds.map(String);
    }
    return [];
  });

  useEffect(() => {
    if (Array.isArray(exam?.targetClassIds) && !savedDraft) {
      setTargetClassIds(exam.targetClassIds.map(String));
    }
  }, [exam?.targetClassIds, savedDraft]);

  const visibleClasses = useMemo(() => {
    if (!departmentId || departmentId === 'ALL') {
      return classOptions;
    }
    return classOptions.filter(
      (c) => c.departmentId && String(c.departmentId) === String(departmentId)
    );
  }, [classOptions, departmentId]);

  useEffect(() => {
    if (!exam?.id && !savedDraft && classOptions.length > 0 && targetClassIds.length === 0) {
      if (!departmentId || departmentId === 'ALL') {
        setTargetClassIds(classOptions.map((c) => String(c.value)));
      } else {
        const matching = classOptions.filter(
          (c) => c.departmentId && String(c.departmentId) === String(departmentId)
        );
        setTargetClassIds(
          matching.length > 0
            ? matching.map((c) => String(c.value))
            : classOptions.map((c) => String(c.value))
        );
      }
    }
  }, [classOptions, departmentId, exam?.id, savedDraft, targetClassIds.length]);

  const handleDepartmentChange = (newDeptId) => {
    const strDeptId = String(newDeptId || 'ALL');
    setDepartmentId(strDeptId);

    if (!strDeptId || strDeptId === 'ALL') {
      setTargetClassIds(classOptions.map((c) => String(c.value)));
    } else {
      const matchingClasses = classOptions.filter(
        (c) => c.departmentId && String(c.departmentId) === strDeptId
      );
      if (matchingClasses.length > 0) {
        setTargetClassIds(matchingClasses.map((c) => String(c.value)));
      } else {
        setTargetClassIds([]);
      }
    }
  };

  const handleClassToggle = (cId) => {
    const strId = String(cId);
    setTargetClassIds((prev) => {
      const exists = prev.some((id) => String(id) === strId);
      if (exists) {
        return prev.filter((id) => String(id) !== strId);
      } else {
        return [...prev, strId];
      }
    });
  };

  const handleSelectAllClasses = () => {
    const visibleIds = visibleClasses.map((c) => String(c.value));
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((vId) => targetClassIds.some((tId) => String(tId) === vId));

    if (allVisibleSelected) {
      setTargetClassIds((prev) => prev.filter((id) => !visibleIds.includes(String(id))));
    } else {
      setTargetClassIds((prev) => Array.from(new Set([...prev.map(String), ...visibleIds])));
    }
  };

  // ── Step 3: Evaluation Policy & Marks Breakdown ───────────────────────────
  const [breakdownEnabled, setBreakdownEnabled] = useState(
    savedDraft?.breakdownEnabled ?? exam?.breakdownEnabled ?? true
  );
  const [targetFullMarks, setTargetFullMarks] = useState(
    savedDraft?.targetFullMarks ?? exam?.defaultFullMarks ?? 100
  );

  const [defaultComponents, setDefaultComponents] = useState(() => {
    if (Array.isArray(savedDraft?.defaultComponents) && savedDraft.defaultComponents.length > 0) {
      return savedDraft.defaultComponents;
    }
    if (Array.isArray(exam?.defaultComponents) && exam.defaultComponents.length > 0) {
      return exam.defaultComponents.map((c, idx) => ({
        id: c.id || `comp_${idx + 1}`,
        name: c.name || `Component ${idx + 1}`,
        maxMarks: Number(c.maxMarks) || 0,
      }));
    }
    if (exam?.defaultBreakdown) {
      const w = Number(exam.defaultBreakdown.written) || 70;
      const o = Number(exam.defaultBreakdown.oral) || 30;
      return [
        { id: 'comp_1', name: 'Written Exam', maxMarks: w },
        { id: 'comp_2', name: 'Oral', maxMarks: o },
      ];
    }
    return [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral', maxMarks: 30 },
    ];
  });

  const handleAddComponent = () => {
    setDefaultComponents((prev) => {
      const nextIdx = prev.length + 1;
      const currentSum = prev.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0);
      const remaining = Math.max(0, Number(targetFullMarks) - currentSum);
      return [
        ...prev,
        {
          id: `comp_${Date.now()}_${nextIdx}`,
          name: `Component ${nextIdx}`,
          maxMarks: remaining > 0 ? remaining : 10,
        },
      ];
    });
  };

  const handleRemoveComponent = (indexToRemove) => {
    setDefaultComponents((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleUpdateComponent = (index, field, value) => {
    setDefaultComponents((prev) =>
      prev.map((c, idx) => {
        if (idx === index) {
          if (field === 'maxMarks') {
            return { ...c, maxMarks: Math.max(0, parseInt(value, 10) || 0) };
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  const handleTargetFullMarksChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 0);
    setTargetFullMarks(num);
  };

  // CA & Mark Distribution Weightage
  const [caEnabled, setCaEnabled] = useState(savedDraft?.caEnabled ?? exam?.caWeightage?.enabled ?? false);
  const [dailyEnabled, setDailyEnabled] = useState(savedDraft?.dailyEnabled ?? exam?.caWeightage?.dailyEnabled ?? true);
  const [attendanceEnabled, setAttendanceEnabled] = useState(savedDraft?.attendanceEnabled ?? exam?.caWeightage?.attendanceEnabled ?? true);
  const [examWeightageEnabled, setExamWeightageEnabled] = useState(savedDraft?.examWeightageEnabled ?? exam?.caWeightage?.examWeightageEnabled ?? true);

  const [dailyClassroomPct, setDailyClassroomPct] = useState(savedDraft?.dailyClassroomPct ?? exam?.caWeightage?.dailyClassroomPct ?? 10);
  const [attendancePct, setAttendancePct] = useState(savedDraft?.attendancePct ?? exam?.caWeightage?.attendancePct ?? 10);
  const [examPct, setExamPct] = useState(savedDraft?.examPct ?? exam?.caWeightage?.examPct ?? 80);

  // Previous Exams Marks Merger
  const allExams = useMemo(() => {
    return examStore.getExams(tenantId);
  }, [tenantId]);

  const otherExamsOptions = useMemo(() => {
    return allExams
      .filter((e) => String(e.id) !== String(exam?.id) && (!academicYearId || String(e.academicYearId) === String(academicYearId)))
      .map((e) => ({
        value: String(e.id),
        label: `${e.name || 'Exam'} (${e.semesterName || 'Term'} — Full Marks: ${e.defaultFullMarks || e.targetFullMarks || 100} pts)`,
        exam: e,
      }));
  }, [allExams, exam?.id, academicYearId]);

  const [previousExamsEnabled, setPreviousExamsEnabled] = useState(
    savedDraft?.previousExamsEnabled ?? exam?.previousExamsConfig?.enabled ?? false
  );
  const [previousExams, setPreviousExams] = useState(() => {
    if (Array.isArray(savedDraft?.previousExams) && savedDraft.previousExams.length > 0) {
      return savedDraft.previousExams;
    }
    if (Array.isArray(exam?.previousExamsConfig?.exams) && exam.previousExamsConfig.exams.length > 0) {
      return exam.previousExamsConfig.exams;
    }
    return [];
  });

  const handleAddPreviousExam = () => {
    setPreviousExams((prev) => {
      const nextIdx = prev.length + 1;
      const defaultExamId = otherExamsOptions.find((opt) => !prev.some((p) => p.examId === opt.value))?.value || otherExamsOptions[0]?.value || '';
      return [
        ...prev,
        {
          id: `prev_exam_${Date.now()}_${nextIdx}`,
          examId: defaultExamId,
          weightagePct: 20,
        },
      ];
    });
  };

  const handleRemovePreviousExam = (indexToRemove) => {
    setPreviousExams((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdatePreviousExam = (index, field, value) => {
    setPreviousExams((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          if (field === 'weightagePct') {
            return { ...item, weightagePct: Math.max(0, Math.min(100, parseInt(value, 10) || 0)) };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const previousExamsTotalPct = useMemo(() => {
    if (!previousExamsEnabled || !Array.isArray(previousExams)) return 0;
    return previousExams.reduce((sum, e) => sum + (Number(e.weightagePct) || 0), 0);
  }, [previousExamsEnabled, previousExams]);

  const handleCaChange = (field, val) => {
    const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    if (field === 'daily') setDailyClassroomPct(num);
    if (field === 'attendance') setAttendancePct(num);
    if (field === 'exam') setExamPct(num);
  };

  const handleAutoBalanceCa = () => {
    if (examWeightageEnabled) {
      const activeDaily = (caEnabled && dailyEnabled) ? (Number(dailyClassroomPct) || 0) : 0;
      const activeAtt = (caEnabled && attendanceEnabled) ? (Number(attendancePct) || 0) : 0;
      const activePrev = previousExamsEnabled ? previousExamsTotalPct : 0;
      const remaining = Math.max(0, 100 - activeDaily - activeAtt - activePrev);
      setExamPct(remaining);
    }
  };

  const totalWeightage =
    (caEnabled && dailyEnabled ? (Number(dailyClassroomPct) || 0) : 0) +
    (caEnabled && attendanceEnabled ? (Number(attendancePct) || 0) : 0) +
    (previousExamsEnabled ? previousExamsTotalPct : 0) +
    (caEnabled && examWeightageEnabled ? (Number(examPct) || 0) : 0);

  // Ranking & Merit Rules
  const [rankingScope, setRankingScope] = useState(savedDraft?.rankingScope ?? exam?.rankingConfig?.scope ?? 'CLASS_AND_SECTION');
  const [failSubjectRule, setFailSubjectRule] = useState(savedDraft?.failSubjectRule ?? exam?.rankingConfig?.failSubjectRule ?? 'EXCLUDE_FROM_MERIT');

  // ── Auto-Save Draft ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasContent = Boolean(
        name.trim() ||
        code.trim() ||
        description.trim() ||
        (scheduleDays && scheduleDays.length > 0) ||
        prepStartDate ||
        prepEndDate ||
        caEnabled ||
        previousExamsEnabled ||
        (shifts && shifts.length > 1) ||
        (targetFullMarks && targetFullMarks !== 100) ||
        (defaultComponents && defaultComponents.length > 2) ||
        (departmentId && departmentId !== 'ALL')
      );

      if (hasContent) {
        writeJSON(draftKey, {
          name,
          code,
          academicYearId,
          semesterId,
          gradingSystemId,
          departmentId,
          targetClassIds,
          startDate,
          endDate,
          prepStartDate,
          prepEndDate,
          scheduleDays,
          shifts,
          description,
          breakdownEnabled,
          targetFullMarks,
          defaultComponents,
          caEnabled,
          dailyEnabled,
          attendanceEnabled,
          examWeightageEnabled,
          dailyClassroomPct,
          attendancePct,
          examPct,
          previousExamsEnabled,
          previousExams,
          rankingScope,
          failSubjectRule,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    draftKey,
    name,
    code,
    academicYearId,
    semesterId,
    gradingSystemId,
    departmentId,
    targetClassIds,
    startDate,
    endDate,
    prepStartDate,
    prepEndDate,
    scheduleDays,
    shifts,
    description,
    breakdownEnabled,
    targetFullMarks,
    defaultComponents,
    caEnabled,
    dailyEnabled,
    attendanceEnabled,
    examWeightageEnabled,
    dailyClassroomPct,
    attendancePct,
    examPct,
    previousExamsEnabled,
    previousExams,
    rankingScope,
    failSubjectRule,
  ]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setIsDraftRestored(false);

    setName(exam?.name || '');
    setCode(exam?.code || '');
    const activeY = academicYears.find((y) => y.isCurrent || y.is_active);
    const defYear = exam?.academicYearId
      ? String(exam.academicYearId)
      : activeY
      ? String(activeY.id || activeY.academic_year)
      : (academicYearOptions[0]?.value || '');
    setAcademicYearId(defYear);
    setSemesterId(exam?.semesterId ? String(exam.semesterId) : (semesterOptions[0]?.value || 'annual_term'));
    setGradingSystemId(exam?.gradingSystemId || gradingSystemOptions[0]?.value || 'dars_e_nizami_standard');
    setDepartmentId(exam?.departmentId !== undefined && exam?.departmentId !== null ? String(exam.departmentId) : 'ALL');
    setTargetClassIds(Array.isArray(exam?.targetClassIds) ? exam.targetClassIds.map(String) : []);
    setStartDate(exam?.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(exam?.endDate || new Date().toISOString().split('T')[0]);
    setPrepStartDate(exam?.prepStartDate || '');
    setPrepEndDate(exam?.prepEndDate || '');
    setScheduleDays(exam?.scheduleDays || []);
    setDescription(exam?.description || '');
    setShifts(
      Array.isArray(exam?.shifts) && exam.shifts.length > 0
        ? exam.shifts.map((s, idx) => ({
            id: s.id || `shift_${idx + 1}`,
            name: s.name || `Shift ${idx + 1}`,
            startTime: s.startTime || '09:00 AM',
            endTime: s.endTime || '11:00 AM',
          }))
        : [
            {
              id: 'shift_1',
              name: DEFAULT_SHIFT_PRESETS[0].name,
              startTime: exam?.defaultStartTime || DEFAULT_SHIFT_PRESETS[0].startTime,
              endTime: exam?.defaultEndTime || DEFAULT_SHIFT_PRESETS[0].endTime,
            },
          ]
    );
    setBreakdownEnabled(exam?.breakdownEnabled ?? true);
    setTargetFullMarks(exam?.defaultFullMarks || 100);
    setDefaultComponents([
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral / Nazera / Hifz', maxMarks: 30 },
    ]);
    setCaEnabled(exam?.caWeightage?.enabled || false);
    setDailyEnabled(exam?.caWeightage?.dailyEnabled ?? true);
    setAttendanceEnabled(exam?.caWeightage?.attendanceEnabled ?? true);
    setExamWeightageEnabled(exam?.caWeightage?.examWeightageEnabled ?? true);
    setDailyClassroomPct(exam?.caWeightage?.dailyClassroomPct ?? 10);
    setAttendancePct(exam?.caWeightage?.attendancePct ?? 10);
    setExamPct(exam?.caWeightage?.examPct ?? 80);
    setPreviousExamsEnabled(exam?.previousExamsConfig?.enabled ?? false);
    setPreviousExams(Array.isArray(exam?.previousExamsConfig?.exams) ? exam.previousExamsConfig.exams : []);
    setRankingScope(exam?.rankingConfig?.scope || 'CLASS_AND_SECTION');
    setFailSubjectRule(exam?.rankingConfig?.failSubjectRule || 'EXCLUDE_FROM_MERIT');

    showToast('Draft discarded and form reset.', 'info');
  };

  // ── Form Submission ───────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!name.trim()) {
      showToast('Examination Name is required.', 'warning');
      return;
    }
    if (!academicYearId) {
      showToast('Academic Year is required.', 'warning');
      return;
    }
    if ((caEnabled || previousExamsEnabled) && totalWeightage !== 100) {
      showToast(`Evaluation weightage ratio must equal 100% (currently ${totalWeightage}%).`, 'warning');
      return;
    }

    setSaving(true);
    try {
      const selectedYearObj =
        academicYears.find((y) => String(y.id || y.academic_year || y.year_code) === String(academicYearId)) ||
        selectedYear;
      const selectedSemObj = semesterOptions.find((s) => String(s.value) === String(semesterId));
      const selectedDeptObj = departmentOptions.find((d) => String(d.value) === String(departmentId));

      const finalTargetClassIds =
        targetClassIds.length > 0
          ? targetClassIds.map(String)
          : visibleClasses.map((c) => String(c.value));

      const payload = {
        name: name.trim(),
        code: code.trim() || `EXAM_${Date.now().toString(36).toUpperCase()}`,
        academicYearId: String(academicYearId),
        academicYearName: selectedYearObj?.name || selectedYearObj?.academic_year || 'Academic Year',
        semesterId: String(semesterId || (semesterOptions[0]?.value || 'annual_term')),
        semesterName: selectedSemObj?.term?.name || selectedSemObj?.label || 'Semester',
        departmentId: departmentId || 'ALL',
        departmentName: selectedDeptObj?.label || (departmentId === 'ALL' ? 'All Departments' : 'Department'),
        gradingSystemId,
        targetClassIds: finalTargetClassIds,
        startDate,
        endDate,
        prepStartDate: prepStartDate || null,
        prepEndDate: prepEndDate || null,
        scheduleDays,
        description: description.trim(),
        shifts: shifts.map((s, idx) => ({
          id: s.id || `shift_${idx + 1}`,
          name: s.name?.trim() || `Shift ${idx + 1}`,
          startTime: s.startTime || '09:00 AM',
          endTime: s.endTime || '11:00 AM',
        })),
        defaultStartTime: shifts[0]?.startTime || '09:00 AM',
        defaultEndTime: shifts[0]?.endTime || '11:00 AM',
        breakdownEnabled,
        defaultFullMarks: Number(targetFullMarks) || 100,
        defaultBreakdown: {
          written:
            Number(
              (defaultComponents.find((c) => c.name.toLowerCase().includes('written')) || defaultComponents[0])?.maxMarks
            ) || 70,
          oral:
            Number(
              (defaultComponents.find(
                (c) =>
                  c.name.toLowerCase().includes('oral') ||
                  c.name.toLowerCase().includes('nazera') ||
                  c.name.toLowerCase().includes('viva') ||
                  c.name.toLowerCase().includes('mcq')
              ) || (defaultComponents.length > 1 ? defaultComponents[1] : { maxMarks: 0 }))?.maxMarks
            ) || 30,
        },
        defaultComponents: breakdownEnabled
          ? defaultComponents.map((c) => ({
              id: c.id,
              name: c.name?.trim() || 'Component',
              maxMarks: Number(c.maxMarks) || 0,
            }))
          : [{ id: 'comp_1', name: 'Total Marks', maxMarks: Number(targetFullMarks) || 100 }],
        caWeightage: {
          enabled: caEnabled,
          dailyEnabled,
          attendanceEnabled,
          examWeightageEnabled,
          dailyClassroomPct: dailyEnabled ? (Number(dailyClassroomPct) || 0) : 0,
          attendancePct: attendanceEnabled ? (Number(attendancePct) || 0) : 0,
          examPct: examWeightageEnabled ? (Number(examPct) || 0) : 0,
        },
        previousExamsConfig: {
          enabled: Boolean(previousExamsEnabled),
          exams: previousExamsEnabled
            ? previousExams.map((e) => ({
                id: e.id,
                examId: e.examId,
                weightagePct: Number(e.weightagePct) || 0,
              }))
            : [],
        },
        rankingConfig: {
          scope: rankingScope,
          failSubjectRule,
        },
      };

      let savedExam;
      if (exam?.id) {
        savedExam = examStore.updateExam(tenantId, exam.id, payload);
        showToast('Examination session updated successfully.', 'success');
      } else {
        savedExam = examStore.addExam(tenantId, payload);
        showToast('New examination session created.', 'success');
      }

      // Sync with Master Institutional Event Calendar
      try {
        const savedId = savedExam?.id || exam?.id || payload.code;
        const calendarEvents = masterCalendarStore.getEvents(tenantId);
        const examEventId = `exam_evt_${savedId}`;
        const existingIdx = calendarEvents.findIndex(
          (e) => e.id === examEventId || (e.examId && String(e.examId) === String(savedId))
        );

        const examDaysList = scheduleDays.filter((d) => d.type === 'EXAM_DAY').map((d) => d.date);
        const prepDaysList = scheduleDays.filter((d) => d.type === 'PREPARATION_GAP').map((d) => d.date);

        const calendarPayload = {
          id: examEventId,
          examId: savedId,
          title: `${payload.name} (Examination)`,
          category: 'EXAM',
          audience: 'STUDENTS',
          startDate: payload.startDate,
          endDate: payload.endDate,
          isFullDay: true,
          repeats: false,
          priorityRank: 1,
          impacts: ['ATTENDANCE'],
          description:
            payload.description ||
            `Official Examination Session for ${selectedYearObj?.name || 'Academic Year'} - ${selectedSemObj?.label || 'Semester'}`,
          examDays: examDaysList,
          preparationDays: prepDaysList,
          scheduleDays: scheduleDays,
        };

        if (existingIdx >= 0) {
          calendarEvents[existingIdx] = { ...calendarEvents[existingIdx], ...calendarPayload };
          masterCalendarStore.saveEvents(tenantId, calendarEvents);
        } else {
          masterCalendarStore.addEvent(tenantId, calendarPayload);
        }
      } catch (syncErr) {
        console.warn('Event Calendar Sync Notice:', syncErr);
      }

      // Clean up draft
      try {
        localStorage.removeItem(draftKey);
      } catch {}

      onSaveSuccess?.();
    } catch {
      showToast('Failed to save examination session.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    // Stepper & Meta
    step,
    setStep,
    isDraftRestored,
    handleDiscardDraft,
    saving,
    handleSubmit,

    // Step 1: General Info
    name,
    setName,
    academicYearId,
    setAcademicYearId,
    academicYearOptions,
    semesterId,
    semesterOptions,
    handleSemesterChange,
    gradingSystemId,
    setGradingSystemId,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    prepStartDate,
    prepEndDate,
    setPrepStartDate,
    setPrepEndDate,
    shifts,
    handleAddShift,
    handleRemoveShift,
    handleShiftChange,
    scheduleDays,
    setScheduleDays,
    description,
    setDescription,

    // Step 2: Classes & Faculty
    departmentId,
    handleDepartmentChange,
    visibleClasses,
    targetClassIds,
    handleClassToggle,
    handleSelectAllClasses,

    // Step 3: Evaluation Policy
    breakdownEnabled,
    setBreakdownEnabled,
    targetFullMarks,
    handleTargetFullMarksChange,
    defaultComponents,
    handleAddComponent,
    handleRemoveComponent,
    handleUpdateComponent,
    caEnabled,
    setCaEnabled,
    dailyEnabled,
    setDailyEnabled,
    attendanceEnabled,
    setAttendanceEnabled,
    examWeightageEnabled,
    setExamWeightageEnabled,
    dailyClassroomPct,
    attendancePct,
    examPct,
    handleCaChange,
    handleAutoBalanceCa,
    previousExamsEnabled,
    setPreviousExamsEnabled,
    previousExams,
    handleAddPreviousExam,
    handleRemovePreviousExam,
    handleUpdatePreviousExam,
    otherExamsOptions,
    rankingScope,
    setRankingScope,
    failSubjectRule,
    setFailSubjectRule,
  };
}
