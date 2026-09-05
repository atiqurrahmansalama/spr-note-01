import React, { useState, useMemo } from 'react';
import { PageContainer } from '../../../../components/layout';
import PageHeader from '../../../../components/ui/PageHeader';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomSelect from '../../../../components/ui/CustomSelect';
import DataViewToolbar from '../../../../components/ui/DataViewToolbar';
import SubjectMatrixTable from '../components/SubjectMatrixTable';
import ExamStatTile from '../components/ExamStatTile';
import ActionMenu from '../../../../components/ui/ActionMenu';
import DeleteImpactModal from '../../../../components/common/DeleteImpactModal';
import ExamFormDrawer from './ExamFormDrawer';
import {
  CalendarIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  ChevronIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ChartBarIcon,
  AcademicCapIcon,
  LockClosedIcon,
  DepartmentIcon,
  CheckCircleIcon,
  HistoryIcon,
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { examStore } from '../../../../utils/stores/examStore';
import useExamData from '../../hooks/useExamData';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft Setup' },
  { value: 'MARK_ENTRY', label: 'Mark Entry Open' },
  { value: 'FIRST_PUBLISHED', label: '1st Published (Review Window)' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'FINAL_PUBLISHED', label: 'Final Published & Certified' },
];

const LIFECYCLE_STAGES = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'MARK_ENTRY', label: 'Mark Entry' },
  { key: 'REVIEW', label: 'Review Window' },
  { key: 'FINAL', label: 'Certified' },
];

const getLifecycleStageIndex = (status) => {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'MARK_ENTRY':
      return 1;
    case 'FIRST_PUBLISHED':
    case 'UNDER_REVIEW':
      return 2;
    case 'FINAL_PUBLISHED':
    case 'LOCKED':
      return 3;
    default:
      return 0;
  }
};

/**
 * ExamSchedulesView
 * Enterprise management workspace for examination sessions,
 * scheduled subject routines, and multi-tier lifecycle statuses.
 */
export default function ExamSchedulesView({
  isEmbedded = false,
  hideHeader = false,
  onNavigateToMatrix,
  onNavigateToMarkEntry,
  onNavigateToTabulation,
}) {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const {
    tenantId,
    exams,
    gradingSystems,
    gradingSystemOptions,
    examSubjects,
    academicYears,
    academicYearOptions,
    departmentOptions,
    classOptions,
    refreshExamData,
  } = useExamData();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Expanded Routine Cards State (Map of examId -> boolean)
  const [expandedExams, setExpandedExams] = useState({});

  // Delete Impact Modal States
  const [examToDelete, setExamToDelete] = useState(null);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // ── Global Drawer Registrations ───────────────────────────────────────────────
  useDrawerRegistration(
    'exam_session',
    (params) => {
      const mode = params.get('mode') || 'add';
      const examId = params.get('id');
      const foundExam = examId ? exams.find((e) => String(e.id) === String(examId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Examination Session' : 'Create Examination Session',
        subtitle:
          mode === 'edit'
            ? `Update details for ${foundExam?.name || 'Examination'}`
            : 'Configure institutional scope, grading scale, and CA weightage',
        category: 'Examination & Results',
        size: 'lg',
        width: 'lg',
        content: (
          <ExamFormDrawer
            key={`exam-session-drawer-${mode}-${examId || 'new'}`}
            exam={foundExam}
            tenantId={tenantId}
            academicYears={academicYears}
            academicYearOptions={academicYearOptions}
            departmentOptions={departmentOptions}
            gradingSystemOptions={gradingSystemOptions}
            classOptions={classOptions}
            onSaveSuccess={() => {
              refreshExamData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [
      exams,
      tenantId,
      academicYears,
      academicYearOptions,
      departmentOptions,
      gradingSystemOptions,
      classOptions,
      refreshExamData,
      closeDrawer,
    ]
  );

  // Filter Active Check
  const isFilterActive = Boolean(
    (searchQuery && searchQuery.trim()) ||
    (selectedYearFilter && selectedYearFilter !== '') ||
    (selectedStatusFilter && selectedStatusFilter !== 'ALL')
  );

  const activeFilterCount = [
    Boolean(searchQuery && searchQuery.trim()),
    Boolean(selectedYearFilter && selectedYearFilter !== ''),
    Boolean(selectedStatusFilter && selectedStatusFilter !== 'ALL'),
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedYearFilter('');
    setSelectedStatusFilter('ALL');
  };

  // Filtered Examinations
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (selectedYearFilter && String(e.academicYearId) !== String(selectedYearFilter)) return false;
      if (selectedStatusFilter && selectedStatusFilter !== 'ALL' && e.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = e.name?.toLowerCase().includes(q);
        const matchCode = e.code?.toLowerCase().includes(q);
        const matchYear = e.academicYearName?.toLowerCase().includes(q);
        const matchBranch = e.branchName?.toLowerCase().includes(q);
        const matchDept = e.departmentName?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchYear && !matchBranch && !matchDept) return false;
      }
      return true;
    });
  }, [exams, selectedYearFilter, selectedStatusFilter, searchQuery]);

  // Toggle Subject Routines Accordion
  const toggleExpand = (examId) => {
    const key = String(examId);
    setExpandedExams((prev) => {
      const isCurrentlyOpen = prev[key] !== undefined ? prev[key] : true;
      return {
        ...prev,
        [key]: !isCurrentlyOpen,
      };
    });
  };

  const handleOpenNewExam = () => {
    openDrawer('exam_session', { mode: 'add' });
  };

  const handleEditExam = (exam) => {
    openDrawer('exam_session', { mode: 'edit', id: exam.id });
  };

  const handleConfirmDeleteExam = () => {
    if (!examToDelete) return;
    examStore.deleteExam(tenantId, examToDelete.id);
    refreshExamData();
    showToast(`Examination session "${examToDelete.name}" deleted.`, 'success');
    setExamToDelete(null);
  };

  const handleConfirmDeleteSubject = () => {
    if (!subjectToDelete) return;
    examStore.deleteExamSubject(tenantId, subjectToDelete.id);
    refreshExamData();
    showToast(`Subject schedule "${subjectToDelete.subjectName}" removed.`, 'success');
    setSubjectToDelete(null);
  };

  const handleStatusChange = (examId, newStatus) => {
    examStore.updateExamStatus(tenantId, examId, newStatus);
    refreshExamData();
    showToast(`Exam status updated to ${newStatus.replace(/_/g, ' ')}.`, 'success');
  };

  const handleNavigateToMatrix = (examId) => {
    if (onNavigateToMatrix) {
      onNavigateToMatrix(examId);
    }
  };

  return (
    <PageContainer isEmbedded={isEmbedded} maxWidth="7xl">
      {/* ── 1. Optional Standard PageHeader (When viewed standalone) ── */}
      {!hideHeader && (
        <PageHeader
          title="Exam Schedules & Sessions"
          subtitle="Configure examination terms, link participating classes, define subject full marks, and manage result lifecycles."
          icon={CalendarIcon}
          actions={
            <CustomButton
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenNewExam}
            >
              Create Examination
            </CustomButton>
          }
        />
      )}

      {/* ── 2. Enterprise Data View Toolbar (Search, Academic Year & Status Filters, Live Counters & Reset) ── */}
      <DataViewToolbar
        searchLabel="Search"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by exam name, code, session or department..."
        searchSpanClassName="col-span-1 sm:col-span-2 lg:col-span-2"
        filterGridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        stackedSwitcher={true}
        filteredCount={filteredExams.length}
        totalCount={exams.length}
        itemLabel={filteredExams.length === 1 ? 'exam session' : 'exam sessions'}
        hasActiveFilters={isFilterActive}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        customFilters={
          <>
            <div>
              <CustomSelect
                label="Academic Year"
                options={[{ value: '', label: 'All Academic Years' }, ...academicYearOptions]}
                value={selectedYearFilter}
                onChange={(val) => setSelectedYearFilter(val || '')}
                size="md"
              />
            </div>

            <div>
              <CustomSelect
                label="Lifecycle Status"
                options={STATUS_OPTIONS}
                value={selectedStatusFilter}
                onChange={(val) => setSelectedStatusFilter(val || 'ALL')}
                size="md"
              />
            </div>
          </>
        }
      />

      {/* ── 4. Examination Cards List ── */}
      {filteredExams.length === 0 ? (
        <div className="p-12 sm:p-16 text-center border-2 border-dashed theme-border rounded-3xl theme-bg-surface/50 space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full theme-bg-sub flex items-center justify-center mx-auto theme-text-secondary opacity-70">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold theme-text-primary">No Examination Sessions Found</h3>
            <p className="text-xs theme-text-secondary">
              {isFilterActive
                ? 'No examination sessions match your active filters. Try resetting your search filters.'
                : 'Create your first term examination session to configure subjects and start recording marks.'}
            </p>
          </div>
          <div>
            <CustomButton
              variant={isFilterActive ? 'sub' : 'primary'}
              size="sm"
              icon={isFilterActive ? null : PlusIcon}
              onClick={isFilterActive ? handleResetFilters : handleOpenNewExam}
            >
              {isFilterActive ? 'Reset Active Filters' : 'Create First Examination'}
            </CustomButton>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredExams.map((exam) => {
            const currentSubjects = examSubjects.filter((s) => String(s.examId) === String(exam.id));
            const grading = gradingSystems.find((g) => g.id === exam.gradingSystemId);
            const isExpanded = expandedExams[exam.id] ?? true;
            const examDaysList = exam.scheduleDays || [];
            const currentStageIdx = getLifecycleStageIndex(exam.status);

            return (
              <div key={exam.id} className="space-y-3.5 text-left animate-fade-in">
                {/* ── 4.1 Standalone Exam Session Card ── */}
                <div className="rounded-2xl border theme-border theme-bg-surface shadow-xs transition-all duration-200 hover:shadow-md hover:border-[var(--accent-main)]/35 overflow-hidden">
                  {/* Card Main Body */}
                  <div className="p-4 sm:p-5 lg:p-6 space-y-4">
                    {/* Header Row: Identity, Code, Status & Top Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl theme-bg-accent-soft border border-[var(--accent-main)]/25 theme-accent flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-xs">
                          <AcademicCapIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          {/* 1st Line: Title, Code, Academic Year & Semester */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight truncate">
                              {exam.name}
                            </h2>
                            <span className="text-xs font-mono font-medium theme-text-secondary opacity-75">
                              #{exam.code}
                            </span>
                            <span className="text-xs theme-text-secondary opacity-30">/</span>
                            <span className="text-xs font-semibold theme-text-secondary">
                              {exam.academicYearName}
                              {exam.semesterName ? ` · ${exam.semesterName}` : ''}
                            </span>
                          </div>

                          {/* 2nd Line: Scope, Schedule Dates & Multi-Dept Status */}
                          <div className="flex items-center gap-2.5 text-xs theme-text-secondary flex-wrap">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <DepartmentIcon className="w-3.5 h-3.5 opacity-70 shrink-0" />
                              <span>{exam.departmentName || 'All Departments'}</span>
                            </span>

                            {(exam.startDate || exam.endDate) && (
                              <>
                                <span className="inline-flex items-center gap-1.5 font-mono font-medium theme-text-primary">
                                  <ClockIcon className="w-3.5 h-3.5 theme-accent opacity-85 shrink-0" />
                                  <span>{exam.startDate} — {exam.endDate}</span>
                                </span>
                              </>
                            )}

                            {exam.isMultiDepartmentSchedule && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs">
                                Multi-Dept Windows
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Right Actions: Toggle Table Accordion & ActionMenu */}
                      <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(exam.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-sub/80 theme-text-secondary hover:theme-text-primary flex items-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95"
                          title={isExpanded ? 'Hide Subject Routines' : 'Show Subject Routines'}
                        >
                          <span>{isExpanded ? 'Hide Routines' : 'View Routines'}</span>
                          <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] theme-bg-surface border theme-border font-bold">
                            {currentSubjects.length}
                          </span>
                          <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5 transition-transform duration-200" />
                        </button>

                        <ActionMenu
                          actions={[
                            {
                              label: 'Edit Examination',
                              icon: EditIcon,
                              onClick: () => handleEditExam(exam),
                            },
                            {
                              label: 'Subject Routine Matrix',
                              icon: BookOpenIcon,
                              onClick: () => handleNavigateToMatrix(exam.id),
                            },
                            ...(onNavigateToMarkEntry
                              ? [
                                  {
                                    label: 'Mark Entry',
                                    icon: EditIcon,
                                    onClick: () => onNavigateToMarkEntry(exam.id),
                                  },
                                ]
                              : []),
                            ...(onNavigateToTabulation
                              ? [
                                  {
                                    label: 'Tabulation Ledger',
                                    icon: ChartBarIcon,
                                    onClick: () => onNavigateToTabulation(exam.id),
                                  },
                                ]
                              : []),
                            { divider: true },
                            {
                              label: 'Delete Examination',
                              icon: TrashIcon,
                              danger: true,
                              onClick: () => setExamToDelete(exam),
                            },
                          ]}
                          align="right"
                          ariaLabel={`Actions for ${exam.name}`}
                        />
                      </div>
                    </div>

                    {/* Policy & Key Specifications 4-Tile Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                      {/* Tile 1: Routine Coverage */}
                      <ExamStatTile
                        icon={BookOpenIcon}
                        label="Routine Coverage"
                        value={`${currentSubjects.length} ${currentSubjects.length === 1 ? 'Subject Routine' : 'Subject Routines'}`}
                      />

                      {/* Tile 2: Full Marks */}
                      <ExamStatTile
                        icon={AcademicCapIcon}
                        label="Full Marks"
                        value={`${exam.defaultFullMarks || exam.targetFullMarks || 100} pts`}
                        title={`Baseline Examination Marks Scale: ${exam.defaultFullMarks || exam.targetFullMarks || 100} Points`}
                      />

                      {/* Tile 3: Breakdown */}
                      <ExamStatTile
                        icon={ChartBarIcon}
                        label="Breakdown"
                        value={
                          Array.isArray(exam.components) && exam.components.length > 0
                            ? exam.components.map((c) => `${c.name || 'Comp'}: ${c.maxMarks || 0}`).join(' · ')
                            : (exam.breakdownConfig?.enabled === false ? 'No Breakdown (Single Total)' : 'Direct 100% Written')
                        }
                        title={
                          Array.isArray(exam.components) && exam.components.length > 0
                            ? exam.components.map((c) => `${c.name || 'Component'}: ${c.maxMarks || 0} pts`).join(', ')
                            : 'Direct Full Marks'
                        }
                      />

                      {/* Tile 4: Assessment Policy */}
                      <ExamStatTile
                        icon={SparklesIcon}
                        label="Assessment Policy"
                        value={
                          exam.caWeightage?.enabled
                            ? `CA: ${exam.caWeightage.dailyClassroomPct}%D · ${exam.caWeightage.attendancePct}%A · ${exam.caWeightage.examPct}%E`
                            : 'Direct Written (100%)'
                        }
                        title={
                          exam.caWeightage?.enabled
                            ? `Continuous Assessment: Daily ${exam.caWeightage.dailyClassroomPct}% + Attendance ${exam.caWeightage.attendancePct}% + Exam ${exam.caWeightage.examPct}%`
                            : 'Direct 100% Examination Evaluation'
                        }
                      />
                    </div>

                    {/* Department Specific Date Windows Row (If Multi-Department Dates Enabled) */}
                    {exam.isMultiDepartmentSchedule && Array.isArray(exam.departmentSchedules) && exam.departmentSchedules.length > 0 && (
                      <div className="pt-2.5 border-t theme-border/60">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider theme-text-secondary shrink-0">
                            <DepartmentIcon className="w-3.5 h-3.5 theme-accent opacity-85" />
                            <span>Department Windows:</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {exam.departmentSchedules.map((dept) => (
                              <div
                                key={dept.departmentId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs theme-bg-sub/60 theme-text-primary border theme-border shadow-2xs"
                              >
                                <span className="font-semibold">{dept.departmentName || dept.departmentCode}:</span>
                                <span className="font-mono text-[11px] theme-text-secondary font-medium">
                                  {dept.startDate} — {dept.endDate}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lifecycle Management Stepper Bar */}
                  <div className="px-4 sm:px-5 lg:px-6 py-3 border-t theme-border theme-bg-sub/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    {/* Visual Lifecycle Pipeline */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                      <span className="font-bold theme-text-secondary uppercase tracking-wider text-[10px] mr-1 shrink-0">
                        Lifecycle:
                      </span>
                      {LIFECYCLE_STAGES.map((st, idx) => {
                        const isCurrent = currentStageIdx === idx;
                        const isPast = currentStageIdx > idx;
                        return (
                          <React.Fragment key={st.key}>
                            {idx > 0 && (
                              <span
                                className={`text-[10px] ${
                                  isPast ? 'theme-accent font-bold' : 'theme-text-secondary opacity-30'
                                }`}
                              >
                                →
                              </span>
                            )}
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                                isCurrent
                                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 font-bold shadow-2xs'
                                  : isPast
                                  ? 'theme-text-primary font-medium'
                                  : 'theme-text-secondary opacity-50'
                              }`}
                            >
                              {isPast ? (
                                <CheckCircleIcon className="w-3.5 h-3.5 theme-accent" />
                              ) : (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isCurrent ? 'bg-[var(--accent-main)]' : 'theme-bg-subtle'
                                  }`}
                                />
                              )}
                              <span>{st.label}</span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Transition Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {exam.status === 'DRAFT' && (
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={EditIcon}
                          onClick={() => handleStatusChange(exam.id, 'MARK_ENTRY')}
                        >
                          Open for Mark Entry
                        </CustomButton>
                      )}

                      {exam.status === 'MARK_ENTRY' && (
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={CheckIcon}
                          onClick={() => handleStatusChange(exam.id, 'FIRST_PUBLISHED')}
                        >
                          Publish 1st Result (Open Review Window)
                        </CustomButton>
                      )}

                      {exam.status === 'FIRST_PUBLISHED' && (
                        <>
                          <CustomButton
                            size="xs"
                            variant="sub"
                            icon={ClockIcon}
                            onClick={() => handleStatusChange(exam.id, 'UNDER_REVIEW')}
                          >
                            Mark as Under Review
                          </CustomButton>
                          <CustomButton
                            size="xs"
                            variant="primary"
                            icon={LockClosedIcon}
                            onClick={() => handleStatusChange(exam.id, 'FINAL_PUBLISHED')}
                          >
                            Publish Final Result & Lock
                          </CustomButton>
                        </>
                      )}

                      {exam.status === 'UNDER_REVIEW' && (
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={LockClosedIcon}
                          onClick={() => handleStatusChange(exam.id, 'FINAL_PUBLISHED')}
                        >
                          Publish Final Result & Lock
                        </CustomButton>
                      )}

                      {(exam.status === 'FINAL_PUBLISHED' || exam.status === 'LOCKED') && (
                        <span className="inline-flex items-center gap-1.5 font-bold theme-accent theme-bg-accent-soft px-2.5 py-1 rounded-full border border-[var(--accent-main)]/20 text-xs shadow-2xs">
                          <LockClosedIcon className="w-3.5 h-3.5" />
                          Official Certified & Immutable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 4.2 Scheduled Subject Routines Table (Smooth Accordion Grid) ── */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2.5 pt-1 pb-1">
                      {/* Clean minimal sub-header without boxed background */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpenIcon className="w-4 h-4 theme-accent shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold theme-text-primary tracking-tight">
                            Scheduled Subject Routines & Components
                          </h4>
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] theme-bg-sub theme-text-secondary border theme-border font-bold shadow-2xs shrink-0">
                            {currentSubjects.length} {currentSubjects.length === 1 ? 'subject' : 'subjects'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <CustomButton
                            variant="sub"
                            size="xs"
                            icon={EditIcon}
                            onClick={() => handleNavigateToMatrix(exam.id)}
                          >
                            Open in Routine Matrix
                          </CustomButton>
                        </div>
                      </div>

                      {/* Table Body with Generous Row Height (Reusing SubjectMatrixTable) */}
                      {currentSubjects.length === 0 ? (
                        <div className="p-8 text-center border border-dashed theme-border rounded-2xl theme-bg-sub/10 space-y-2">
                          <BookOpenIcon className="w-7 h-7 mx-auto theme-text-secondary opacity-60" />
                          <p className="text-xs font-medium theme-text-secondary">
                            No subjects scheduled yet for this examination session.
                          </p>
                          <CustomButton
                            variant="sub"
                            size="xs"
                            icon={PlusIcon}
                            onClick={() => handleNavigateToMatrix(exam.id)}
                          >
                            Configure Routine Matrix
                          </CustomButton>
                        </div>
                      ) : (
                        <SubjectMatrixTable
                          activeExam={exam}
                          filteredRows={currentSubjects}
                          showActions={false}
                          onOpenComponentModal={() => handleNavigateToMatrix(exam.id)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. Standard DeleteImpactModal for Examination Session Deletion ── */}
      <DeleteImpactModal
        isOpen={Boolean(examToDelete)}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleConfirmDeleteExam}
        title="Delete Examination Session?"
        subtitle={`You are about to permanently delete "${examToDelete?.name}".`}
        entityName={examToDelete?.name || 'Examination Session'}
        entityType="Examination Session"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Delete Examination"
        warningMessage="Permanently deleting this examination session will remove all associated subject routine schedules, invigilator assignments, recorded marks, and tabulation entries."
      />

      {/* ── 6. Standard DeleteImpactModal for Subject Routine Removal ── */}
      <DeleteImpactModal
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleConfirmDeleteSubject}
        title="Remove Subject Routine Schedule?"
        subtitle={`You are about to remove "${subjectToDelete?.subjectName}" from the exam routine.`}
        entityName={subjectToDelete?.subjectName || 'Subject Routine'}
        entityType="Subject Schedule"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Remove Schedule"
        warningMessage="Removing this subject schedule will delete its scheduled date, shift timings, invigilator assignments, and mark components."
      />
    </PageContainer>
  );
}
