import React, { useState, useRef, useEffect, useMemo } from 'react';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { DepartmentSelect, ClassSelect, SectionSelect } from '../../../../components/selectors';
import {
  CalendarIcon,
  ClockIcon,
  BuildingIcon,
  TeacherIcon,
  BookOpenIcon,
  AboutIcon,
  GridIcon,
  AcademicCapIcon,
} from '../../../../components/ui/Icons';
import { formatDateLabel, formatCleanRange } from '../../exam-schedules/utils/examScheduleUtils';
import { examStore } from '@/stores/examStore';

/**
 * MarkEntryFilterBar
 * Dynamic academic filter console connecting:
 * - Examination Session
 * - Department Scope (Reusable DepartmentSelect)
 * - Target Class & Section (Reusable ClassSelect & SectionSelect)
 * - Scheduled Routine Subjects (Optional, showSubject = true/false)
 * - Subject Metadata Popover (Click to open, stays open)
 * - Live Mark Grading Scale Popover (Click to open, stays open)
 * - Auto Viewport Collision Detection (Opens downward if clipped above)
 */
/** @type {any} */
export default function MarkEntryFilterBar({
  examOptions = [],
  selectedExamId = '',
  setSelectedExamId = (val) => {},
  onExamChange = null,
  departmentOptions = [],
  filterDepartmentId = 'ALL',
  setFilterDepartmentId = (val) => {},
  selectedDepartmentId = 'ALL',
  setSelectedDepartmentId = (val) => {},
  onDepartmentChange = null,
  classOptions = [],
  filterClassId = '',
  setFilterClassId = (val) => {},
  selectedClassId = '',
  setSelectedClassId = (val) => {},
  onClassChange = null,
  sectionOptions = [],
  filterSectionId = 'ALL',
  setFilterSectionId = (val) => {},
  selectedSectionId = 'ALL',
  setSelectedSectionId = (val) => {},
  onSectionChange = null,
  subjectOptions = [],
  selectedSubjectId = '',
  setSelectedSubjectId = (val) => {},
  onSubjectChange = null,
  selectedSubject = null,
  availableSubjects = [],
  activeGradingSystem = null,
  gradingSystem = null,
  showSubject = true,
  selectedClassName = '',
  selectedSectionName = '',
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isGradesOpen, setIsGradesOpen] = useState(false);

  const [detailsPlacement, setDetailsPlacement] = useState('bottom');
  const [gradesPlacement, setGradesPlacement] = useState('bottom');

  const detailsPopoverRef = useRef(null);
  const detailsBtnRef = useRef(null);
  const gradesPopoverRef = useRef(null);
  const gradesBtnRef = useRef(null);

  // Robust prop normalization
  const currentExamId = selectedExamId !== undefined ? String(selectedExamId) : '';
  const handleExamChange = (val) => {
    onExamChange?.(val);
    setSelectedExamId?.(val);
  };

  const currentDeptId = filterDepartmentId !== undefined ? String(filterDepartmentId) : (selectedDepartmentId !== undefined ? String(selectedDepartmentId) : 'ALL');
  const handleDeptChange = (val) => {
    onDepartmentChange?.(val);
    setFilterDepartmentId?.(val);
    setSelectedDepartmentId?.(val);
  };

  const currentClassId = filterClassId !== undefined ? String(filterClassId) : (selectedClassId !== undefined ? String(selectedClassId) : '');
  const handleClassChange = (val) => {
    onClassChange?.(val);
    setFilterClassId?.(val);
    setSelectedClassId?.(val);
  };

  const currentSectionId = filterSectionId !== undefined ? String(filterSectionId) : (selectedSectionId !== undefined ? String(selectedSectionId) : 'ALL');
  const handleSectionChange = (val) => {
    onSectionChange?.(val);
    setFilterSectionId?.(val);
    setSelectedSectionId?.(val);
  };

  const currentSubjectId = selectedSubjectId !== undefined ? String(selectedSubjectId) : '';
  const handleSubjectChange = (val) => {
    onSubjectChange?.(val);
    setSelectedSubjectId?.(val);
  };

  const resolvedGradingSystem = activeGradingSystem || gradingSystem || null;

  // Auto-calculate smart placement based on available viewport space
  const updatePlacement = (btnEl, setPlacement) => {
    if (!btnEl) return;
    const rect = btnEl.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceAbove < 350) {
      setPlacement('bottom');
    } else if (spaceBelow < 320 && spaceAbove >= 350) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  };

  const handleToggleDetails = () => {
    if (!isDetailsOpen) {
      updatePlacement(detailsBtnRef.current, setDetailsPlacement);
    }
    setIsDetailsOpen((prev) => !prev);
    setIsGradesOpen(false);
  };

  const handleToggleGrades = () => {
    if (!isGradesOpen) {
      updatePlacement(gradesBtnRef.current, setGradesPlacement);
    }
    setIsGradesOpen((prev) => !prev);
    setIsDetailsOpen(false);
  };

  // Close when clicking outside of popover and trigger button
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        detailsPopoverRef.current &&
        !detailsPopoverRef.current.contains(e.target) &&
        detailsBtnRef.current &&
        !detailsBtnRef.current.contains(e.target)
      ) {
        setIsDetailsOpen(false);
      }
      if (
        gradesPopoverRef.current &&
        !gradesPopoverRef.current.contains(e.target) &&
        gradesBtnRef.current &&
        !gradesBtnRef.current.contains(e.target)
      ) {
        setIsGradesOpen(false);
      }
    };
    if (isDetailsOpen || isGradesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDetailsOpen, isGradesOpen]);

  // Active Grading Rules
  const gradingRules = useMemo(() => {
    if (resolvedGradingSystem?.rules && Array.isArray(resolvedGradingSystem.rules) && resolvedGradingSystem.rules.length > 0) {
      return resolvedGradingSystem.rules;
    }
    const allSystems = examStore.getGradingSystems();
    return allSystems[0]?.rules || [];
  }, [resolvedGradingSystem]);

  // Format raw entities for reusable selectors
  const rawDepartments = useMemo(() => {
    return (departmentOptions || [])
      .map((d) => {
        if (!d) return null;
        const obj = d.department || d.raw || d;
        const id = d.value !== undefined ? d.value : (d.id !== undefined ? d.id : obj.id);
        const name = d.label || d.name || obj.name || obj.department_name;
        if (id === '' || id === 'ALL' || id === null || id === undefined) return null;
        return {
          ...obj,
          id: String(id),
          name: String(name || `Department ${id}`),
        };
      })
      .filter(Boolean);
  }, [departmentOptions]);

  const rawClasses = useMemo(() => {
    return (classOptions || [])
      .map((c) => {
        if (!c) return null;
        const obj = c.classObj || c.raw || c;
        const id = c.value !== undefined ? c.value : (c.id !== undefined ? c.id : obj.id);
        const name = c.label || c.name || obj.name || obj.class_name;
        const deptId = c.departmentId !== undefined ? c.departmentId : (c.department_id !== undefined ? c.department_id : (obj.department_id || obj.departmentId || obj.department));
        if (id === '' || id === 'ALL' || id === null || id === undefined) return null;
        return {
          ...obj,
          id: String(id),
          name: String(name || `Class ${id}`),
          department_id: deptId ? String(typeof deptId === 'object' ? deptId.id : deptId) : null,
          department: deptId ? (typeof deptId === 'object' ? deptId : { id: deptId }) : null,
        };
      })
      .filter(Boolean);
  }, [classOptions]);

  const rawSections = useMemo(() => {
    return (sectionOptions || [])
      .map((s) => {
        if (!s) return null;
        const obj = s.sectionObj || s.raw || s;
        const id = s.value !== undefined ? s.value : (s.id !== undefined ? s.id : obj.id);
        const name = s.label || s.name || obj.name || obj.section_name;
        const cId = s.classId !== undefined ? s.classId : (s.class_id !== undefined ? s.class_id : (obj.class_id || obj.classId || obj.class));
        if (id === '' || id === 'ALL' || id === null || id === undefined) return null;
        return {
          ...obj,
          id: String(id),
          name: String(name || `Section ${id}`),
          class_id: cId ? String(typeof cId === 'object' ? cId.id : cId) : null,
          class: cId ? (typeof cId === 'object' ? cId : { id: cId }) : null,
        };
      })
      .filter(Boolean);
  }, [sectionOptions]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
      {/* Filters in a Single Row on Large Screens using Enterprise Reusable Selectors */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${showSubject ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
        {/* 1. Exam Term */}
        <CustomSelect
          label="Examination"
          icon={CalendarIcon}
          options={examOptions}
          value={currentExamId}
          onChange={(val) => {
            handleExamChange(val);
            handleDeptChange('ALL');
            handleClassChange('');
            handleSectionChange('ALL');
            handleSubjectChange('');
          }}
          placeholder="Choose Session..."
        />

        {/* 2. Reusable Department Selector */}
        <DepartmentSelect
          label="Department"
          departments={rawDepartments}
          value={currentDeptId}
          allowAll
          allLabel="All Departments"
          allValue="ALL"
          onChange={(val) => {
            handleDeptChange(val || 'ALL');
            handleClassChange('');
            handleSectionChange('ALL');
            handleSubjectChange('');
          }}
          placeholder="All Departments"
        />

        {/* 3. Reusable Class Selector (Auto-cascaded by departmentId) */}
        <ClassSelect
          label="Class"
          classes={rawClasses}
          departmentId={currentDeptId}
          value={currentClassId}
          allowAll
          allLabel="All Classes"
          allValue=""
          onChange={(val) => {
            handleClassChange(val || '');
            handleSectionChange('ALL');
            handleSubjectChange('');
          }}
          placeholder="All Classes"
        />

        {/* 4. Reusable Section Selector (Auto-cascaded by classId) */}
        <SectionSelect
          label="Section"
          sections={rawSections}
          classId={currentClassId}
          value={currentSectionId}
          allowAll
          allLabel="All Sections"
          allValue="ALL"
          onChange={(val) => {
            handleSectionChange(val || 'ALL');
            handleSubjectChange('');
          }}
          placeholder="All Sections"
        />

        {/* 5. Scheduled Exam Subject (Optional) */}
        {showSubject && (
          <CustomSelect
            label={`Subject (${availableSubjects.length})`}
            icon={BookOpenIcon}
            options={subjectOptions}
            value={currentSubjectId || (selectedSubject?.id ? String(selectedSubject.id) : '')}
            onChange={handleSubjectChange}
            placeholder={
              !currentExamId
                ? 'Select exam term first...'
                : availableSubjects.length === 0
                ? 'No subjects scheduled'
                : 'Choose Subject...'
            }
          />
        )}
      </div>

      {/* Bottom Row: Selected Subject / Scope Summary, Details & Mark Grades Popovers */}
      {(selectedSubject || (!showSubject && currentExamId && currentClassId)) && (
        <div className="pt-2.5 mt-3 border-t theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Active Overview */}
          <div className="flex items-center gap-2.5 min-w-0 text-xs theme-text-secondary flex-wrap">
            {selectedSubject ? (
              /* Active Subject Overview Metadata */
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0 inline-block" />
                <span className="font-semibold theme-text-primary truncate">
                  {selectedSubject.subjectName}
                </span>
                {selectedSubject.subjectCode && (
                  <span className="text-[10px] font-mono theme-text-secondary font-normal shrink-0">
                    ({selectedSubject.subjectCode})
                  </span>
                )}
                {selectedSubject.examDate && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-[11px] theme-text-secondary truncate">
                      {formatDateLabel(selectedSubject.examDate)}
                    </span>
                  </>
                )}
              </div>
            ) : (
              /* Tabulation Ledger Scope Overview */
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0 inline-block" />
                <span className="font-semibold theme-text-primary">
                  {selectedClassName || 'Selected Class'}
                </span>
                <span className="opacity-40">•</span>
                <span className="text-[11px] theme-text-secondary">
                  {selectedSectionName || 'All Sections'}
                </span>
                {activeGradingSystem?.name && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-[11px] theme-text-secondary">
                      {activeGradingSystem.name}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* 1. Subject Details Button & Popover */}
            {selectedSubject && (
              <div className="relative shrink-0">
                <button
                  ref={detailsBtnRef}
                  type="button"
                  onClick={handleToggleDetails}
                  aria-expanded={isDetailsOpen}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer select-none shadow-2xs ${
                    isDetailsOpen
                      ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/30 shadow-xs'
                      : 'theme-bg-surface hover:theme-bg-sub/60 theme-border hover:theme-border-strong theme-text-secondary hover:theme-text-primary'
                  }`}
                  title="View Subject Schedule & Routine Details"
                >
                  <AboutIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span className="font-semibold text-xs">Details</span>
                </button>

                {/* Floating Metadata Popover Card */}
                {isDetailsOpen && (
                  <div
                    ref={detailsPopoverRef}
                    className={`absolute left-0 ${
                      detailsPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                    } w-[280px] sm:w-[320px] max-w-[92vw] rounded-2xl border theme-border theme-bg-surface p-3.5 sm:p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-2.5 backdrop-blur-md`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Popover Header */}
                    <div className="pb-2.5 border-b theme-border">
                      <div className="flex items-center gap-1.5 font-bold theme-text-primary text-[13px] leading-snug">
                        <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0 inline-block" />
                        <span className="break-words">{selectedSubject.subjectName}</span>
                        {selectedSubject.subjectCode && (
                          <span className="text-[10px] font-mono font-normal theme-text-secondary shrink-0">
                            ({selectedSubject.subjectCode})
                          </span>
                        )}
                      </div>
                      {selectedSubject.curriculumBookName && selectedSubject.curriculumBookName !== selectedSubject.subjectName && (
                        <p className="text-[10.5px] theme-text-secondary mt-0.5 break-words">
                          Book: {selectedSubject.curriculumBookName}
                        </p>
                      )}
                    </div>

                    {/* Lightweight Detail Rows */}
                    <div className="space-y-1 text-xs">
                      {/* Class & Section */}
                      <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border">
                        <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                          <GridIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Class & Section
                        </span>
                        <span className="font-semibold theme-text-primary text-right break-words text-[11.5px]">
                          {selectedSubject.className}
                          {selectedSubject.sectionName && selectedSubject.sectionName !== 'All Sections'
                            ? ` (${selectedSubject.sectionName})`
                            : ''}
                        </span>
                      </div>

                      {/* Scheduled Date */}
                      <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border">
                        <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Exam Date
                        </span>
                        <span className="font-semibold theme-text-primary text-right break-words text-[11.5px]">
                          {selectedSubject.examDate ? formatDateLabel(selectedSubject.examDate) : 'Not scheduled'}
                        </span>
                      </div>

                      {/* Shift & Time */}
                      <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border">
                        <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Time & Shift
                        </span>
                        <span className="font-semibold theme-text-primary text-right break-words text-[11.5px] leading-tight">
                          {selectedSubject.shiftName ? `${selectedSubject.shiftName}: ` : ''}
                          {formatCleanRange(selectedSubject.startTime, selectedSubject.endTime) || 'Standard Time'}
                        </span>
                      </div>

                      {/* Room */}
                      <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border">
                        <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                          <BuildingIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Room
                        </span>
                        <span className="font-semibold theme-text-primary text-right break-words text-[11.5px]">
                          {selectedSubject.roomNo ? `Room ${selectedSubject.roomNo}` : 'Main Exam Hall'}
                        </span>
                      </div>

                      {/* Examiner / Teacher */}
                      <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border">
                        <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Examiner
                        </span>
                        <span className="font-semibold theme-text-primary text-right break-words text-[11.5px] leading-tight">
                          {selectedSubject.examinerName ||
                            selectedSubject.invigilatorName ||
                            selectedSubject.teacherName ||
                            'Assigned Faculty'}
                        </span>
                      </div>

                      {/* Curriculum Book */}
                      {selectedSubject.curriculumBookName && (
                        <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border">
                          <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                            <BookOpenIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Book
                          </span>
                          <span className="font-semibold theme-text-primary text-right break-words text-[11.5px] leading-tight">
                            {selectedSubject.curriculumBookName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Mark Grades Action Button & Popover */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* 2. Mark Grades Button & Popover */}
            <div className="relative shrink-0">
              <button
                ref={gradesBtnRef}
                type="button"
                onClick={handleToggleGrades}
                aria-expanded={isGradesOpen}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer select-none shadow-2xs ${
                  isGradesOpen
                    ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/30 shadow-xs'
                    : 'theme-bg-surface hover:theme-bg-sub/60 theme-border hover:theme-border-strong theme-text-secondary hover:theme-text-primary'
                }`}
                title="View Active Mark Grading Scale & Criteria"
              >
                <AcademicCapIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                <span className="font-semibold text-xs">Mark Grades</span>
              </button>

              {/* Floating Mark Grades Popover Card */}
              {isGradesOpen && (
                <div
                  ref={gradesPopoverRef}
                  className={`absolute right-0 ${
                    gradesPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                  } w-[260px] sm:w-[280px] max-w-[92vw] rounded-2xl border theme-border theme-bg-surface p-3 sm:p-3.5 shadow-2xl z-50 animate-fade-in text-xs space-y-2 backdrop-blur-md`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Popover Header */}
                  <div className="pb-2.5 border-b theme-border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold theme-text-primary text-[13px] leading-snug truncate">
                        <span className="w-2 h-2 rounded-full theme-bg-accent shrink-0 inline-block" />
                        <span className="truncate">{activeGradingSystem?.name || 'Grading Scale'}</span>
                      </div>
                    </div>
                    <p className="text-[10.5px] theme-text-secondary mt-0.5">
                      Marks percentage evaluation & GPA scale
                    </p>
                  </div>

                  {/* Grading Scale Tier Rows */}
                  <div className="space-y-1 text-xs max-h-[220px] overflow-y-auto pr-0.5">
                    {gradingRules.map((rule, idx) => (
                      <div
                        key={rule.grade || idx}
                        className="flex items-center justify-between gap-2 py-1.5 border-b theme-border text-[11.5px]"
                      >
                        <span className="font-bold theme-text-primary font-mono shrink-0">
                          {rule.grade}
                        </span>

                        <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11.5px]">
                          <span className="theme-text-secondary">
                            {rule.minMark}% – {rule.maxMark}%
                          </span>
                          {rule.gradePoint !== undefined && (
                            <span className="theme-text-primary font-semibold">
                              GPA {Number(rule.gradePoint).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Popover Footer */}
                  {activeGradingSystem?.rules && (
                    <div className="pt-1.5 flex items-center justify-between text-[11px] theme-text-secondary">
                      <span>Pass Criteria</span>
                      <span className="font-semibold theme-text-primary">
                        Min. {activeGradingSystem.rules.find((r) => r.isPass)?.minMark || 33}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
