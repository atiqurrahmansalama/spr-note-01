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
  ChevronIcon,
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
 * - Scheduled Routine Subjects
 * - Compact Subject Metadata Popover (Hover/Click)
 * - Live Mark Grading Scale Popover (Hover/Click)
 * - Auto Viewport Collision Detection (Opens downward if clipped above)
 */
export default function MarkEntryFilterBar({
  examOptions = [],
  selectedExamId,
  setSelectedExamId,
  departmentOptions = [],
  filterDepartmentId,
  setFilterDepartmentId,
  classOptions = [],
  filterClassId,
  setFilterClassId,
  sectionOptions = [],
  filterSectionId,
  setFilterSectionId,
  subjectOptions = [],
  selectedSubjectId,
  setSelectedSubjectId,
  selectedSubject,
  availableSubjects = [],
  activeGradingSystem = null,
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isGradesOpen, setIsGradesOpen] = useState(false);

  const [detailsPlacement, setDetailsPlacement] = useState('bottom');
  const [gradesPlacement, setGradesPlacement] = useState('bottom');

  const detailsPopoverRef = useRef(null);
  const detailsBtnRef = useRef(null);
  const gradesPopoverRef = useRef(null);
  const gradesBtnRef = useRef(null);

  // Auto-calculate smart placement based on available viewport space
  const updatePlacement = (btnEl, setPlacement) => {
    if (!btnEl) return;
    const rect = btnEl.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    // If space above is tight (< 350px), always open downwards to prevent top clipping
    if (spaceAbove < 350) {
      setPlacement('bottom');
    } else if (spaceBelow < 320 && spaceAbove >= 350) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  };

  const handleOpenDetails = () => {
    updatePlacement(detailsBtnRef.current, setDetailsPlacement);
    setIsDetailsOpen(true);
    setIsGradesOpen(false);
  };

  const handleToggleDetails = () => {
    if (!isDetailsOpen) {
      updatePlacement(detailsBtnRef.current, setDetailsPlacement);
    }
    setIsDetailsOpen((prev) => !prev);
    setIsGradesOpen(false);
  };

  const handleOpenGrades = () => {
    updatePlacement(gradesBtnRef.current, setGradesPlacement);
    setIsGradesOpen(true);
    setIsDetailsOpen(false);
  };

  const handleToggleGrades = () => {
    if (!isGradesOpen) {
      updatePlacement(gradesBtnRef.current, setGradesPlacement);
    }
    setIsGradesOpen((prev) => !prev);
    setIsDetailsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (detailsPopoverRef.current && !detailsPopoverRef.current.contains(e.target)) {
        setIsDetailsOpen(false);
      }
      if (gradesPopoverRef.current && !gradesPopoverRef.current.contains(e.target)) {
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
    if (activeGradingSystem?.rules && Array.isArray(activeGradingSystem.rules) && activeGradingSystem.rules.length > 0) {
      return activeGradingSystem.rules;
    }
    const allSystems = examStore.getGradingSystems();
    return allSystems[0]?.rules || [];
  }, [activeGradingSystem]);

  // Format raw entities for reusable selectors
  const rawDepartments = useMemo(() => {
    return departmentOptions
      .map((d) => d.department || d)
      .filter((d) => d && d.id !== 'ALL' && d.value !== 'ALL');
  }, [departmentOptions]);

  const rawClasses = useMemo(() => {
    return classOptions
      .map((c) => c.classObj || c)
      .filter((c) => c && c.id !== '' && c.value !== '');
  }, [classOptions]);

  const rawSections = useMemo(() => {
    return sectionOptions
      .map((s) => s.sectionObj || s)
      .filter((s) => s && s.id !== 'ALL' && s.value !== 'ALL');
  }, [sectionOptions]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
      {/* 5 Filters in a Single Row on Large Screens (lg:grid-cols-5) using Enterprise Reusable Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Exam Term */}
        <CustomSelect
          label="Examination"
          options={examOptions}
          value={selectedExamId}
          onChange={(val) => {
            setSelectedExamId(val);
            setFilterDepartmentId('ALL');
            setFilterClassId('');
            setFilterSectionId('ALL');
            setSelectedSubjectId('');
          }}
          placeholder="Choose Session..."
        />

        {/* 2. Reusable Department Selector */}
        <DepartmentSelect
          label="Department"
          departments={rawDepartments}
          value={filterDepartmentId}
          allowAll
          allLabel="All Departments"
          allValue="ALL"
          onChange={(val) => {
            setFilterDepartmentId(val || 'ALL');
            setFilterClassId('');
            setFilterSectionId('ALL');
            setSelectedSubjectId('');
          }}
          placeholder="All Departments"
        />

        {/* 3. Reusable Class Selector (Auto-cascaded by departmentId) */}
        <ClassSelect
          label="Class"
          classes={rawClasses}
          departmentId={filterDepartmentId}
          value={filterClassId}
          allowAll
          allLabel="All Classes"
          allValue=""
          onChange={(val) => {
            setFilterClassId(val || '');
            setFilterSectionId('ALL');
            setSelectedSubjectId('');
          }}
          placeholder="All Classes"
        />

        {/* 4. Reusable Section Selector (Auto-cascaded by classId) */}
        <SectionSelect
          label="Section"
          sections={rawSections}
          classId={filterClassId}
          value={filterSectionId}
          allowAll
          allLabel="All Sections"
          allValue="ALL"
          onChange={(val) => {
            setFilterSectionId(val || 'ALL');
            setSelectedSubjectId('');
          }}
          placeholder="All Sections"
        />

        {/* 5. Scheduled Exam Subject */}
        <CustomSelect
          label={`Subject (${availableSubjects.length})`}
          options={subjectOptions}
          value={selectedSubjectId || (selectedSubject?.id ? String(selectedSubject.id) : '')}
          onChange={setSelectedSubjectId}
          placeholder={
            !selectedExamId
              ? 'Select exam term first...'
              : availableSubjects.length === 0
              ? 'No subjects scheduled'
              : 'Choose Subject...'
          }
        />
      </div>

      {/* Bottom Row: Selected Subject Summary, Details & Mark Grades Popovers */}
      {selectedSubject && (
        <div className="pt-2.5 mt-3 border-t theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Active Subject Overview & Details Button */}
          <div className="flex items-center gap-2.5 min-w-0 text-xs theme-text-secondary flex-wrap">
            {/* Active Subject Overview Metadata */}
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

            {/* 1. Subject Details Button & Popover */}
            <div
              ref={detailsPopoverRef}
              className="relative shrink-0"
              onMouseEnter={handleOpenDetails}
              onMouseLeave={() => setIsDetailsOpen(false)}
            >
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
                  className={`absolute left-0 ${
                    detailsPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                  } w-[280px] sm:w-[320px] max-w-[92vw] rounded-2xl border theme-border theme-bg-surface p-3.5 sm:p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-2.5 backdrop-blur-md`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Popover Header */}
                  <div className="pb-2.5 border-b theme-border-subtle">
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
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border-light">
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
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border-light">
                      <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Exam Date
                      </span>
                      <span className="font-semibold theme-text-primary text-right break-words text-[11.5px]">
                        {selectedSubject.examDate ? formatDateLabel(selectedSubject.examDate) : 'Not scheduled'}
                      </span>
                    </div>

                    {/* Shift & Time */}
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border-light">
                      <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Time & Shift
                      </span>
                      <span className="font-semibold theme-text-primary text-right break-words text-[11.5px] leading-tight">
                        {selectedSubject.shiftName ? `${selectedSubject.shiftName}: ` : ''}
                        {formatCleanRange(selectedSubject.startTime, selectedSubject.endTime) || 'Standard Time'}
                      </span>
                    </div>

                    {/* Room */}
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border-light">
                      <span className="text-[11px] theme-text-secondary font-medium shrink-0 flex items-center gap-1.5">
                        <BuildingIcon className="w-3.5 h-3.5 theme-accent shrink-0" /> Room
                      </span>
                      <span className="font-semibold theme-text-primary text-right break-words text-[11.5px]">
                        {selectedSubject.roomNo ? `Room ${selectedSubject.roomNo}` : 'Main Exam Hall'}
                      </span>
                    </div>

                    {/* Examiner / Teacher */}
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border-light">
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
                      <div className="flex items-start justify-between gap-2 py-1.5 border-b theme-border-light">
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
          </div>

          {/* Right: Mark Grades Action Button & Popover */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* 2. Mark Grades Button & Popover */}
            <div
              ref={gradesPopoverRef}
              className="relative shrink-0"
              onMouseEnter={handleOpenGrades}
              onMouseLeave={() => setIsGradesOpen(false)}
            >
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
                  className={`absolute right-0 ${
                    gradesPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                  } w-[300px] sm:w-[350px] max-w-[92vw] rounded-2xl border theme-border theme-bg-surface p-3.5 sm:p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-2.5 backdrop-blur-md`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Popover Header */}
                  <div className="pb-2.5 border-b theme-border-subtle">
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
                        className="flex items-center justify-between gap-2 py-1.5 border-b theme-border-light text-[11.5px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold theme-text-primary font-mono shrink-0">
                            {rule.grade}
                          </span>
                          {rule.title && (
                            <span className="text-[10.5px] theme-text-secondary truncate">
                              ({rule.title})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded-md theme-bg-sub/50 border theme-border theme-text-primary font-semibold">
                            {rule.minMark}% – {rule.maxMark}%
                          </span>
                          {rule.gradePoint !== undefined && (
                            <span className="px-1.5 py-0.5 rounded-md theme-bg-accent-soft theme-accent font-bold">
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

