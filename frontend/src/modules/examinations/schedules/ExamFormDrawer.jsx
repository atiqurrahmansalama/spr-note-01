import React, { useState, useEffect, useMemo } from 'react';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import CustomTimePicker from '../../../components/ui/CustomTimePicker';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import {
  CalendarIcon,
  CheckIcon,
  AcademicCapIcon,
  SettingsIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClockIcon,
  PlusIcon,
  CloseIcon,
} from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { examStore } from '../../../utils/stores/examStore';
import { masterCalendarStore } from '../../../utils/stores/calendarStore';
import ExamDateMappingGrid from './ExamDateMappingGrid';

/**
 * ExamFormDrawer
 * Enterprise Right-sidebar drawer form for creating and configuring examination sessions.
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Dynamic Academy Data: Department and Classes load live from Academy database.
 * - Department Auto-Selection: Selecting a department automatically auto-selects all corresponding classes.
 * - Day-by-Day Exam Schedule & Study Gap Mapping: Pick exact dates for exams, preparation gaps, and breaks.
 * - Two-Way Master Event Calendar Sync: Automatically syncs exam sessions and gap days to masterCalendarStore.
 * - Dynamic Cascading: Terms derived directly from the selected Academic Year.
 * - Container Queries only (@[460px]:grid-cols-2 / @[480px]:grid-cols-2)
 * - Zero double-padding (padding="none")
 * - Streamlined Section Separation
 */
export default function ExamFormDrawer({
  exam = null,
  tenantId = 'default',
  academicYears = [],
  academicYearOptions = [],
  departmentOptions = [],
  gradingSystemOptions = [],
  classOptions = [],
  onSaveSuccess,
  onCancel,
}) {
  const { showToast } = useToast();

  const [name, setName] = useState(exam?.name || '');
  const [code, setCode] = useState(exam?.code || '');
  
  // Academic Year State
  const [academicYearId, setAcademicYearId] = useState(() => {
    if (exam?.academicYearId) return String(exam.academicYearId);
    const activeY = academicYears.find((y) => y.isCurrent || y.is_active);
    return activeY ? String(activeY.id || activeY.academic_year) : (academicYearOptions[0]?.value || '');
  });

  // Selected Academic Year Object (Dynamically located)
  const selectedYear = useMemo(() => {
    if (!academicYearId) {
      return academicYears.find((y) => y.isCurrent || y.is_active) || academicYears[0] || null;
    }
    const found = academicYears.find(
      (y) => String(y.id || y.academic_year || y.year_code) === String(academicYearId)
    );
    return found || academicYears.find((y) => y.isCurrent || y.is_active) || academicYears[0] || null;
  }, [academicYears, academicYearId]);

  // 100% Dynamic Term / Semester Options from Selected Academic Year
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

  // Semester ID State
  const [semesterId, setSemesterId] = useState(() => {
    if (exam?.semesterId) return String(exam.semesterId);
    const currentTerm = selectedYear?.terms?.find((t) => t.isCurrent);
    return currentTerm ? String(currentTerm.id) : (semesterOptions[0]?.value || 'annual_term');
  });

  // Automatically keep semesterId in sync when Academic Year / semesterOptions changes
  useEffect(() => {
    if (semesterOptions.length > 0) {
      const exists = semesterOptions.some((opt) => String(opt.value) === String(semesterId));
      if (!exists) {
        const defaultTerm = semesterOptions.find((opt) => opt.term?.isCurrent) || semesterOptions[0];
        setSemesterId(defaultTerm.value);

        // Auto-fill dates for new examination from the selected term
        if (!exam?.id && defaultTerm.term) {
          if (defaultTerm.term.startDate) setStartDate(defaultTerm.term.startDate);
          if (defaultTerm.term.endDate) setEndDate(defaultTerm.term.endDate);
        }
      }
    }
  }, [semesterOptions, semesterId, exam]);

  const [gradingSystemId, setGradingSystemId] = useState(
    exam?.gradingSystemId || gradingSystemOptions[0]?.value || 'dars_e_nizami_standard'
  );

  // Department Scope Filter
  const [departmentId, setDepartmentId] = useState(exam?.departmentId || 'ALL');

  // Filtered Classes based on chosen Department
  const visibleClasses = useMemo(() => {
    if (!departmentId || departmentId === 'ALL') {
      return classOptions;
    }
    const filtered = classOptions.filter(
      (c) => c.departmentId && String(c.departmentId) === String(departmentId)
    );
    return filtered.length > 0 ? filtered : classOptions;
  }, [classOptions, departmentId]);

  const [targetClassIds, setTargetClassIds] = useState(exam?.targetClassIds || []);

  // Auto-select classes on initial creation
  useEffect(() => {
    if (!exam?.id && classOptions.length > 0 && targetClassIds.length === 0) {
      if (departmentId === 'ALL') {
        setTargetClassIds(classOptions.map((c) => c.value));
      } else {
        const matching = classOptions.filter(
          (c) => c.departmentId && String(c.departmentId) === String(departmentId)
        );
        setTargetClassIds(matching.length > 0 ? matching.map((c) => c.value) : classOptions.map((c) => c.value));
      }
    }
  }, [classOptions, departmentId, exam, targetClassIds.length]);

  // Handle Department Change & Automatically Auto-Select Corresponding Classes
  const handleDepartmentChange = (newDeptId) => {
    setDepartmentId(newDeptId);

    if (!newDeptId || newDeptId === 'ALL') {
      setTargetClassIds(classOptions.map((c) => c.value));
    } else {
      const matchingClasses = classOptions.filter(
        (c) => c.departmentId && String(c.departmentId) === String(newDeptId)
      );

      if (matchingClasses.length > 0) {
        setTargetClassIds(matchingClasses.map((c) => c.value));
      } else {
        setTargetClassIds(classOptions.map((c) => c.value));
      }
    }
  };

  const [startDate, setStartDate] = useState(exam?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(exam?.endDate || new Date().toISOString().split('T')[0]);
  const [prepStartDate, setPrepStartDate] = useState(exam?.prepStartDate || '');
  const [prepEndDate, setPrepEndDate] = useState(exam?.prepEndDate || '');
  
  // Day-by-Day Schedule & Study Gap Mapping State
  const [scheduleDays, setScheduleDays] = useState(exam?.scheduleDays || []);

  const [description, setDescription] = useState(exam?.description || '');
  
  // Default Schedule Timing & Marks Breakdown Settings
  const [defaultStartTime, setDefaultStartTime] = useState(exam?.defaultStartTime || '09:00 AM');
  const [defaultEndTime, setDefaultEndTime] = useState(exam?.defaultEndTime || '11:00 AM');
  const [hasSecondShift, setHasSecondShift] = useState(Boolean(exam?.hasSecondShift));
  const [secondStartTime, setSecondStartTime] = useState(exam?.secondStartTime || '02:00 PM');
  const [secondEndTime, setSecondEndTime] = useState(exam?.secondEndTime || '04:00 PM');
  const [defaultWrittenMarks, setDefaultWrittenMarks] = useState(exam?.defaultBreakdown?.written ?? 70);
  const [defaultOralMarks, setDefaultOralMarks] = useState(exam?.defaultBreakdown?.oral ?? 30);
  
  // Continuous Assessment & Mark Distribution Weightage
  const [caEnabled, setCaEnabled] = useState(exam?.caWeightage?.enabled || false);
  const [dailyClassroomPct, setDailyClassroomPct] = useState(exam?.caWeightage?.dailyClassroomPct ?? 10);
  const [attendancePct, setAttendancePct] = useState(exam?.caWeightage?.attendancePct ?? 10);
  const [examPct, setExamPct] = useState(exam?.caWeightage?.examPct ?? 80);

  // Ranking & Merit Rules
  const [rankingScope, setRankingScope] = useState(exam?.rankingConfig?.scope || 'CLASS_AND_SECTION');
  const [failSubjectRule, setFailSubjectRule] = useState(exam?.rankingConfig?.failSubjectRule || 'EXCLUDE_FROM_MERIT');

  const [saving, setSaving] = useState(false);

  // Auto-fill academic year if not yet initialized
  useEffect(() => {
    if (!academicYearId && academicYearOptions.length > 0) {
      setAcademicYearId(academicYearOptions[0].value);
    }
  }, [academicYearId, academicYearOptions]);

  // Handle Term Selection with date auto-fill for new exams
  const handleSemesterChange = (newSemId) => {
    setSemesterId(newSemId);
    const selectedOpt = semesterOptions.find((opt) => String(opt.value) === String(newSemId));
    if (!exam?.id && selectedOpt?.term) {
      if (selectedOpt.term.startDate) setStartDate(selectedOpt.term.startDate);
      if (selectedOpt.term.endDate) setEndDate(selectedOpt.term.endDate);
    }
  };

  // Handle CA weightage balance
  const handleCaChange = (field, val) => {
    const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    if (field === 'daily') setDailyClassroomPct(num);
    if (field === 'attendance') setAttendancePct(num);
    if (field === 'exam') setExamPct(num);
  };

  const totalWeightage = (Number(dailyClassroomPct) || 0) + (Number(attendancePct) || 0) + (Number(examPct) || 0);

  const handleClassToggle = (cId) => {
    setTargetClassIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const handleSelectAllClasses = () => {
    const visibleIds = visibleClasses.map((c) => c.value);
    const allVisibleSelected = visibleIds.every((id) => targetClassIds.includes(id));

    if (allVisibleSelected) {
      setTargetClassIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setTargetClassIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Examination Name is required.', 'warning');
      return;
    }
    if (!academicYearId) {
      showToast('Academic Year is required.', 'warning');
      return;
    }
    if (caEnabled && totalWeightage !== 100) {
      showToast(`Continuous assessment weightage must equal 100% (currently ${totalWeightage}%).`, 'warning');
      return;
    }

    setSaving(true);
    try {
      const selectedYearObj = academicYears.find((y) => String(y.id || y.academic_year || y.year_code) === String(academicYearId)) || selectedYear;
      const selectedSemObj = semesterOptions.find((s) => String(s.value) === String(semesterId));
      const selectedDeptObj = departmentOptions.find((d) => String(d.value) === String(departmentId));

      const payload = {
        name: name.trim(),
        code: code.trim() || `EXAM_${Date.now().toString(36).toUpperCase()}`,
        academicYearId: String(academicYearId),
        academicYearName: selectedYearObj?.name || selectedYearObj?.academic_year || 'Academic Year',
        semesterId: String(semesterId || (semesterOptions[0]?.value || 'annual_term')),
        semesterName: selectedSemObj?.term?.name || selectedSemObj?.label || 'Semester',
        departmentId: departmentId || 'ALL',
        departmentName: selectedDeptObj?.label || 'All Departments',
        gradingSystemId,
        targetClassIds: targetClassIds.length > 0 ? targetClassIds : visibleClasses.map((c) => c.value),
        startDate,
        endDate,
        prepStartDate: prepStartDate || null,
        prepEndDate: prepEndDate || null,
        scheduleDays,
        description: description.trim(),
        defaultStartTime: defaultStartTime || '09:00 AM',
        defaultEndTime: defaultEndTime || '11:00 AM',
        hasSecondShift: Boolean(hasSecondShift),
        secondStartTime: hasSecondShift ? (secondStartTime || '02:00 PM') : null,
        secondEndTime: hasSecondShift ? (secondEndTime || '04:00 PM') : null,
        defaultBreakdown: {
          written: Number(defaultWrittenMarks) || 70,
          oral: Number(defaultOralMarks) || 30,
        },
        defaultComponents: [
          { name: 'Written', maxMarks: Number(defaultWrittenMarks) || 70 },
          { name: 'Oral / Nazera', maxMarks: Number(defaultOralMarks) || 30 },
        ],
        caWeightage: {
          enabled: caEnabled,
          dailyClassroomPct: Number(dailyClassroomPct) || 10,
          attendancePct: Number(attendancePct) || 10,
          examPct: Number(examPct) || 80,
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

      // Auto-sync with Master Institutional Event Calendar (masterCalendarStore)
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
          description: payload.description || `Official Examination Session for ${selectedYearObj?.name || 'Academic Year'} - ${selectedSemObj?.label || 'Semester'}`,
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

      onSaveSuccess?.();
    } catch {
      showToast('Failed to save examination session.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const visibleSelectedCount = visibleClasses.filter((c) => targetClassIds.includes(c.value)).length;

  return (
    <DrawerContainer padding="none">
      <form onSubmit={handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* 1. Institutional Scope & Hierarchy */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <BuildingOfficeIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Institutional Scope & Hierarchy
            </h3>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <CustomSelect
              label="Academic Year / Session"
              options={academicYearOptions}
              value={academicYearId}
              onChange={setAcademicYearId}
              required
            />
            <CustomSelect
              label="Examination Term / Semester"
              options={semesterOptions}
              value={semesterId}
              onChange={handleSemesterChange}
              required
            />
          </div>

          <div>
            <CustomSelect
              label="Grading Policy Scale"
              options={gradingSystemOptions}
              value={gradingSystemId}
              onChange={setGradingSystemId}
              required
            />
          </div>
        </div>

        {/* 2. Examination Overview & Day-by-Day Schedule */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Examination Information & Schedule Window
            </h3>
          </div>

          <div>
            <CustomInput
              label="Examination Name"
              placeholder="e.g. Annual Final Examination 2026"
              value={name}
              onChange={setName}
              required
            />
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <ReusableCalendar
              label="Exam Date Range"
              placeholder="Select Exam Dates"
              isRange={true}
              startDate={startDate}
              endDate={endDate}
              onRangeSelect={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              required
            />
            <ReusableCalendar
              label="Preparation Gap Range"
              placeholder="Select Preparation Dates"
              isRange={true}
              startDate={prepStartDate}
              endDate={prepEndDate}
              onRangeSelect={(start, end) => {
                setPrepStartDate(start);
                setPrepEndDate(end);
              }}
              clearable
            />
          </div>

          {/* Default Exam Time Slots (Shift 1 and optional Shift 2) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold theme-text-secondary">
                Examination Shifts & Default Time Slots
              </label>
              <button
                type="button"
                onClick={() => setHasSecondShift((prev) => !prev)}
                className="text-[11px] font-bold theme-accent hover:underline cursor-pointer flex items-center gap-1"
              >
                <PlusIcon className="w-3 h-3" />
                {hasSecondShift ? 'Disable 2nd Shift' : '+ Add 2nd Exam Shift (Dual Exam)'}
              </button>
            </div>

            {/* Shift 1 */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomTimePicker
                label={hasSecondShift ? "Shift 1 Start Time (1st Exam)" : "Default Start Time"}
                placeholder="09:00 AM"
                value={defaultStartTime}
                onChange={setDefaultStartTime}
              />
              <CustomTimePicker
                label={hasSecondShift ? "Shift 1 End Time (1st Exam)" : "Default End Time"}
                placeholder="11:00 AM"
                value={defaultEndTime}
                onChange={setDefaultEndTime}
              />
            </div>

            {/* Shift 2 (Optional Dual Exam) */}
            {hasSecondShift && (
              <div className="space-y-2.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full theme-bg-accent" />
                    <span className="text-xs font-bold theme-text-primary">
                      Shift 2 (2nd Exam / Afternoon Session)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasSecondShift(false)}
                    className="text-[11px] font-semibold theme-text-secondary hover:text-rose-500 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <CloseIcon className="w-3 h-3" />
                    Remove Shift 2
                  </button>
                </div>
                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                  <CustomTimePicker
                    label="Shift 2 Start Time"
                    placeholder="02:00 PM"
                    value={secondStartTime}
                    onChange={setSecondStartTime}
                  />
                  <CustomTimePicker
                    label="Shift 2 End Time"
                    placeholder="04:00 PM"
                    value={secondEndTime}
                    onChange={setSecondEndTime}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Day-by-Day Schedule & Study Gap Mapper */}
          <ExamDateMappingGrid
            startDate={startDate}
            endDate={endDate}
            scheduleDays={scheduleDays}
            startTime={defaultStartTime}
            endTime={defaultEndTime}
            hasSecondShift={hasSecondShift}
            secondStartTime={secondStartTime}
            secondEndTime={secondEndTime}
            onEnableSecondShift={() => setHasSecondShift(true)}
            onChange={setScheduleDays}
          />

          <CustomInput
            type="textarea"
            rows={2}
            label="Description & General Guidelines"
            placeholder="e.g. Official semester assessment instructions for teachers and examiners..."
            value={description}
            onChange={setDescription}
          />
        </div>

        {/* 3. Department & Participating Classes */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b theme-border">
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="w-4 h-4 theme-accent shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Department & Participating Classes
              </h3>
            </div>
            {visibleClasses.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllClasses}
                className="text-xs font-bold theme-accent hover:underline cursor-pointer"
              >
                {visibleSelectedCount === visibleClasses.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {/* Department Filter Selector */}
          <div className="w-full">
            <CustomSelect
              label="Target Academic Department / Faculty"
              options={departmentOptions}
              value={departmentId}
              onChange={handleDepartmentChange}
            />
          </div>

          {/* Classes Multi-Select Grid */}
          {visibleClasses.length === 0 ? (
            <div className="p-5 text-center border border-dashed theme-border rounded-xl theme-bg-sub/20 space-y-1">
              <AcademicCapIcon className="w-5 h-5 mx-auto text-slate-400" />
              <p className="text-xs font-semibold theme-text-primary">No Academy Classes Found</p>
              <p className="text-[11px] theme-text-secondary">
                Please add classes in the Academy Classes & Sections module first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar border theme-border rounded-xl p-3 theme-bg-sub/30">
              {visibleClasses.map((c) => {
                const isSelected = targetClassIds.length === 0 || targetClassIds.includes(c.value);
                return (
                  <div
                    key={c.value}
                    onClick={() => handleClassToggle(c.value)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'theme-bg-surface border-[var(--accent-main)]/50 shadow-2xs'
                        : 'theme-bg-sub/40 theme-border opacity-70'
                    }`}
                  >
                    <span className="text-xs font-bold theme-text-primary truncate">{c.label}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                        isSelected
                          ? 'theme-bg-accent text-white border-[var(--accent-main)]'
                          : 'theme-border theme-bg-surface'
                      }`}
                    >
                      {isSelected && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Default Marks Breakdown Template */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <ChartBarIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Default Marks Breakdown Template
            </h3>
          </div>

          <div className="space-y-3 p-3.5 rounded-xl border theme-border theme-bg-sub/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold theme-text-secondary">
                100 Marks Distribution Ratio (Written / Oral)
              </label>
              <span className="text-[11px] font-bold theme-accent">
                Sum: {(Number(defaultWrittenMarks) || 0) + (Number(defaultOralMarks) || 0)} pts
              </span>
            </div>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Written Component"
                type="number"
                min={0}
                max={100}
                suffix="pts"
                value={defaultWrittenMarks}
                onChange={(val) => setDefaultWrittenMarks(Math.max(0, parseInt(val, 10) || 0))}
              />
              <CustomInput
                label="Oral / Nazera Component"
                type="number"
                min={0}
                max={100}
                suffix="pts"
                value={defaultOralMarks}
                onChange={(val) => setDefaultOralMarks(Math.max(0, parseInt(val, 10) || 0))}
              />
            </div>
            <p className="text-[11px] theme-text-secondary">
              Sets default sub-component split when automatically scheduling subjects in Subject Routine Matrix.
            </p>
          </div>
        </div>

        {/* 5. Continuous Assessment (CA) & Mark Distribution */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <ChartBarIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Continuous Assessment (CA) & Weightage
            </h3>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between">
            <div className="space-y-0.5 pr-3">
              <span className="text-xs font-bold theme-text-primary block">
                Enable Continuous Assessment (CA) Weightage
              </span>
              <span className="text-[11px] theme-text-secondary block">
                Automatically merge daily classroom scores, attendance percentage, and written exam marks into final result.
              </span>
            </div>
            <CustomCheckbox
              checked={caEnabled}
              onChange={setCaEnabled}
              size="md"
            />
          </div>

          {caEnabled && (
            <div className="space-y-3.5 p-3.5 rounded-xl border theme-border theme-bg-sub/40 animate-fade-in">
              {/* Sliders / Inputs */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3">
                <CustomInput
                  label="Daily Performance (%)"
                  type="number"
                  min={0}
                  max={100}
                  allowDecimals={false}
                  suffix="%"
                  value={dailyClassroomPct}
                  onChange={(val) => handleCaChange('daily', val)}
                />
                <CustomInput
                  label="Attendance (%)"
                  type="number"
                  min={0}
                  max={100}
                  allowDecimals={false}
                  suffix="%"
                  value={attendancePct}
                  onChange={(val) => handleCaChange('attendance', val)}
                />
                <CustomInput
                  label="Term Exam (%)"
                  type="number"
                  min={0}
                  max={100}
                  allowDecimals={false}
                  suffix="%"
                  value={examPct}
                  onChange={(val) => handleCaChange('exam', val)}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t theme-border">
                <span className="font-semibold theme-text-secondary">Total Weightage Ratio:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    totalWeightage === 100
                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                      : 'theme-bg-sub theme-text-secondary border theme-border'
                  }`}
                >
                  {totalWeightage}% / 100% {totalWeightage !== 100 && '(Must equal 100%)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 5. Ranking & Merit Rules */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <SettingsIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Merit Ranking & Promotion Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <CustomSelect
              label="Ranking Calculation Scope"
              options={[
                { value: 'CLASS_AND_SECTION', label: 'Class & Section Positions (1st, 2nd, 3rd...)' },
                { value: 'CLASS_ONLY', label: 'Class Overall Position Only' },
              ]}
              value={rankingScope}
              onChange={setRankingScope}
            />

            <CustomSelect
              label="Failed Subject Rule"
              options={[
                { value: 'EXCLUDE_FROM_MERIT', label: 'Exclude Failed Students from Top Merit List' },
                { value: 'NORMAL', label: 'Rank by Total Marks Regardless of Failed Subjects' },
              ]}
              value={failSubjectRule}
              onChange={setFailSubjectRule}
            />
          </div>
        </div>

        <DrawerFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <CustomButton
              type="button"
              variant="sub"
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
              loadingText="Saving..."
              icon={CheckIcon}
            >
              {exam ? 'Update Examination' : 'Create Examination'}
            </CustomButton>
          </div>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}
