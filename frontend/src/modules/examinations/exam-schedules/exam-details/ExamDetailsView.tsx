import React, { useState, useMemo } from 'react';
import { PageContainer } from '../../../../components/layout';
import PageHeader from '../../../../components/ui/PageHeader';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomSelect from '../../../../components/ui/CustomSelect';
import DataViewToolbar from '../../../../components/ui/DataViewToolbar';
import MetricsGrid from '../../../../components/ui/MetricsGrid';
import ActionMenu from '../../../../components/ui/ActionMenu';
import EmptyState from '../../../../components/ui/EmptyState';
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
  SparklesIcon,
  ChartBarIcon,
  AcademicCapIcon,
  LockClosedIcon,
  DepartmentIcon,
  CheckCircleIcon,
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { useTranslation } from '@/i18n';
import { getLocalizedValue } from '@/i18n/localizedEntity';
import { examStore } from '@/stores/examStore';
import useExamData from '../../hooks/useExamData';
import { Exam, ExamDetailsViewProps, SelectOption } from './types';
import {
  buildExamCardMetrics,
  getGroupedDepartmentSchedules,
  LIFECYCLE_STAGES,
  getLifecycleStageIndex,
} from './utils';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft Setup' },
  { value: 'MARK_ENTRY', label: 'Mark Entry Open' },
  { value: 'FIRST_PUBLISHED', label: '1st Published (Review Window)' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'FINAL_PUBLISHED', label: 'Final Published & Certified' },
];

/**
 * ExamDetailsView
 * Enterprise management workspace for examination sessions,
 * policy parameters, and multi-tier lifecycle statuses.
 * Directs detailed routine schedule operations to the Subject Routine Matrix workspace.
 */
export default function ExamDetailsView({
  isEmbedded = false,
  hideHeader = false,
  onNavigateToMatrix,
  onNavigateToMarkEntry,
  onNavigateToTabulation,
}: ExamDetailsViewProps) {
  const { language } = useTranslation();
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

  const getExamTitle = (name: any) => {
    if (!name) return 'Examination';
    if (typeof name === 'string') return name;
    return getLocalizedValue(name, language as any) || 'Examination';
  };

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Delete Impact Modal States
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // ── Global Drawer Registrations ───────────────────────────────────────────────
  useDrawerRegistration(
    'exam_session',
    (params) => {
      const mode = params.get('mode') || 'add';
      const examId = params.get('id');
      const foundExam = examId ? exams.find((e: Exam) => String(e.id) === String(examId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Examination Session' : 'Create Examination Session',
        subtitle:
          mode === 'edit'
            ? `Update details for ${getExamTitle(foundExam?.name)}`
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
  const filteredExams = useMemo<Exam[]>(() => {
    return exams.filter((e: Exam) => {
      if (selectedYearFilter && String(e.academicYearId) !== String(selectedYearFilter)) return false;
      if (selectedStatusFilter && selectedStatusFilter !== 'ALL' && e.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const examNameStr =
          typeof e.name === 'string'
            ? e.name
            : Object.values(e.name || {}).filter(Boolean).join(' ');
        const matchName = examNameStr.toLowerCase().includes(q);
        const matchCode = e.code?.toLowerCase().includes(q);
        const matchYear = e.academicYearName?.toLowerCase().includes(q);
        const matchDept = e.departmentName?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchYear && !matchDept) return false;
      }
      return true;
    });
  }, [exams, selectedYearFilter, selectedStatusFilter, searchQuery]);

  const handleOpenNewExam = () => {
    openDrawer('exam_session', { mode: 'add' });
  };

  const handleEditExam = (exam: Exam) => {
    openDrawer('exam_session', { mode: 'edit', id: exam.id });
  };

  const handleConfirmDeleteExam = () => {
    if (!examToDelete) return;
    examStore.deleteExam(tenantId, examToDelete.id);
    refreshExamData();
    showToast(`Examination session "${getExamTitle(examToDelete.name)}" deleted.`, 'success');
    setExamToDelete(null);
  };

  const handleStatusChange = (examId: string, newStatus: string) => {
    examStore.updateExamStatus(tenantId, examId, newStatus);
    refreshExamData();
    showToast(`Exam status updated to ${newStatus.replace(/_/g, ' ')}.`, 'success');
  };

  const handleNavigateToMatrixInternal = (examId: string) => {
    if (onNavigateToMatrix) {
      onNavigateToMatrix(examId);
    }
  };

  return (
    <PageContainer isEmbedded={isEmbedded} maxWidth="7xl">
      {/* ── 1. Optional Standard PageHeader (When viewed standalone) ── */}
      {!hideHeader && (
        <PageHeader
          title="Exam Details & Sessions"
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
                onChange={(val: string) => setSelectedYearFilter(val || '')}
                size="md"
              />
            </div>

            <div>
              <CustomSelect
                label="Lifecycle Status"
                options={STATUS_OPTIONS}
                value={selectedStatusFilter}
                onChange={(val: string) => setSelectedStatusFilter(val || 'ALL')}
                size="md"
              />
            </div>
          </>
        }
      />

      {/* ── 4. Examination Cards List ── */}
      {filteredExams.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          iconVariant="glow"
          size="lg"
          title="No Examination Sessions Found"
          description={
            isFilterActive
              ? 'No examination sessions match your active filters. Try resetting your search filters.'
              : 'Create your first term examination session to configure subjects and start recording marks.'
          }
          variant="dashed"
          className="rounded-3xl"
          action={{
            label: isFilterActive ? 'Reset Active Filters' : 'Create First Examination',
            icon: isFilterActive ? undefined : PlusIcon,
            onClick: isFilterActive ? handleResetFilters : handleOpenNewExam,
            variant: isFilterActive ? 'sub' : 'primary',
            size: 'sm',
          }}
        />
      ) : (
        <div className="space-y-6">
          {filteredExams.map((exam: Exam) => {
            const currentSubjects = examSubjects.filter((s: any) => String(s.examId) === String(exam.id));
            const currentStageIdx = getLifecycleStageIndex(exam.status);

            // Group department schedules by identical date windows (startDate — endDate)
            const groupedDepartmentSchedules = getGroupedDepartmentSchedules(exam);

            return (
              <div key={exam.id} className="space-y-3.5 text-left animate-fade-in">
                {/* ── 4.1 Standalone Exam Session Card ── */}
                <div className="rounded-2xl border theme-border theme-bg-surface shadow-xs transition-all duration-200 hover:shadow-md hover:border-[var(--accent-main)]/35 overflow-hidden">
                  {/* Card Main Body */}
                  <div className="p-4 sm:p-5 lg:p-6 space-y-4">
                    {/* Header Row: Identity, Code, Status & Top Actions */}
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl theme-bg-accent-soft border border-[var(--accent-main)]/25 theme-accent flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-xs">
                          <AcademicCapIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          {/* 1st Line: Title, Code, Academic Year & Semester */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight truncate">
                              {getExamTitle(exam.name)}
                            </h2>
                            <span className="text-xs font-mono font-medium theme-text-secondary opacity-75">
                              {exam.code}
                            </span>
                            <span className="text-xs theme-text-secondary opacity-30">|</span>
                            <span className="text-xs font-semibold theme-text-secondary">
                              {exam.academicYearName}
                              {exam.semesterName ? ` · ${exam.semesterName}` : ''}
                            </span>
                          </div>

                          {/* 2nd Line: Scope & Schedule Dates */}
                          <div className="flex items-center gap-2.5 text-xs theme-text-secondary flex-wrap">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <DepartmentIcon className="w-3.5 h-3.5 opacity-70 shrink-0" />
                              <span>{exam.isMultiDepartmentSchedule ? 'Multi-Dept' : 'All Departments'}</span>
                            </span>

                            {(exam.startDate || exam.endDate) && (
                              <span className="inline-flex items-center gap-1.5 font-mono font-medium theme-text-primary">
                                <ClockIcon className="w-3.5 h-3.5 theme-accent opacity-85 shrink-0" />
                                <span>{exam.startDate} — {exam.endDate}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Right ActionMenu (Pinned Top-Right Across All Breakpoints) */}
                      <div className="shrink-0 flex items-center self-start mt-0.5">
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
                              onClick: () => handleNavigateToMatrixInternal(exam.id),
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
                          ariaLabel={`Actions for ${getExamTitle(exam.name)}`}
                        />
                      </div>
                    </div>

                    {/* Policy & Key Specifications 4-Tile Grid (Reusing Standard Project MetricsGrid) */}
                    <MetricsGrid
                      cols={4}
                      density="compact"
                      items={buildExamCardMetrics(exam, currentSubjects.length)}
                    />

                    {/* Department Specific Date Windows Row (Grouped by Date Window) */}
                    {exam.isMultiDepartmentSchedule && groupedDepartmentSchedules.length > 0 && (
                      <div className="pt-3 border-t theme-border space-y-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                          <DepartmentIcon className="w-3.5 h-3.5 theme-accent opacity-85 shrink-0" />
                          <span>Department Windows</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          {groupedDepartmentSchedules.map((group, gIdx) => (
                            <div
                              key={`${group.startDate}_${group.endDate}_${gIdx}`}
                              className="space-y-1 text-xs"
                            >
                              {/* Top Date Header */}
                              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold theme-text-primary">
                                <CalendarIcon className="w-3.5 h-3.5 theme-accent opacity-85 shrink-0" />
                                <span>{group.startDate} — {group.endDate}</span>
                              </div>

                              {/* Departments List Under Date (One per line) */}
                              <div className="space-y-0.5 pl-5">
                                {group.departments.map((deptName, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="flex items-center gap-1.5 font-medium theme-text-secondary"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] opacity-70 shrink-0" />
                                    <span className="truncate">{deptName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lifecycle Management Stepper Bar */}
                  <div className="px-4 sm:px-5 lg:px-6 py-2.5 border-t theme-border theme-bg-sub/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Visual Lifecycle Pipeline */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                      <span className="font-bold theme-text-secondary uppercase tracking-wider text-[10px] mr-0.5 shrink-0">
                        Lifecycle:
                      </span>
                      {LIFECYCLE_STAGES.map((st, idx) => {
                        const isCurrent = currentStageIdx === idx;
                        const isPast = currentStageIdx > idx;
                        return (
                          <React.Fragment key={st.key}>
                            {idx > 0 && (
                              <span
                                className={`text-[10px] select-none ${
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
                                <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                              ) : (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
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
                    <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
                      {exam.status === 'DRAFT' && (
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={EditIcon}
                          onClick={() => handleStatusChange(exam.id, 'MARK_ENTRY')}
                          title="Open examination session for teacher mark entry"
                        >
                          Open Mark Entry
                        </CustomButton>
                      )}

                      {exam.status === 'MARK_ENTRY' && (
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={CheckIcon}
                          onClick={() => handleStatusChange(exam.id, 'FIRST_PUBLISHED')}
                          title="Publish first preliminary results and start verification review period"
                        >
                          Publish 1st Result
                        </CustomButton>
                      )}

                      {exam.status === 'FIRST_PUBLISHED' && (
                        <>
                          <CustomButton
                            size="xs"
                            variant="sub"
                            icon={ClockIcon}
                            onClick={() => handleStatusChange(exam.id, 'UNDER_REVIEW')}
                            title="Flag preliminary result as actively under academic review"
                          >
                            Mark Review
                          </CustomButton>
                          <CustomButton
                            size="xs"
                            variant="primary"
                            icon={LockClosedIcon}
                            onClick={() => handleStatusChange(exam.id, 'FINAL_PUBLISHED')}
                            title="Publish certified final result and lock grade records"
                          >
                            Publish Final
                          </CustomButton>
                        </>
                      )}

                      {exam.status === 'UNDER_REVIEW' && (
                        <CustomButton
                          size="xs"
                          variant="primary"
                          icon={LockClosedIcon}
                          onClick={() => handleStatusChange(exam.id, 'FINAL_PUBLISHED')}
                          title="Publish certified final result and lock grade records"
                        >
                          Publish Final
                        </CustomButton>
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
        subtitle={`You are about to permanently delete "${getExamTitle(examToDelete?.name)}".`}
        entityName={getExamTitle(examToDelete?.name)}
        entityType="Examination Session"
        requireAck={false}
        requireNameMatch={false}
        confirmButtonText="Delete Examination"
        warningMessage="Permanently deleting this examination session will remove all associated subject routine schedules, invigilator assignments, recorded marks, and tabulation entries."
      />
    </PageContainer>
  );
}

export { ExamDetailsView };
