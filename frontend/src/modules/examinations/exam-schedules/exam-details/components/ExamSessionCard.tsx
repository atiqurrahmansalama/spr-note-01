import React from 'react';
import CustomButton from '../../../../../components/ui/CustomButton';
import MetricsGrid from '../../../../../components/ui/MetricsGrid';
import ActionMenu from '../../../../../components/ui/ActionMenu';
import {
  CalendarIcon,
  EditIcon,
  TrashIcon,
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  ChartBarIcon,
  AcademicCapIcon,
  LockClosedIcon,
  DepartmentIcon,
  CheckCircleIcon,
} from '../../../../../components/ui/Icons';
import { Exam } from '../types';
import {
  buildExamCardMetrics,
  getGroupedDepartmentSchedules,
  LIFECYCLE_STAGES,
  getLifecycleStageIndex,
} from '../utils';

export interface ExamSessionCardProps {
  exam: Exam;
  currentSubjects: any[];
  getExamTitle: (name: any) => string;
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
  onNavigateToMatrix: (examId: string) => void;
  onNavigateToMarkEntry?: (examId: string) => void;
  onNavigateToTabulation?: (examId: string) => void;
  onStatusChange: (examId: string, newStatus: string) => void;
}

/**
 * ExamSessionCard
 * Dedicated, highly-aesthetic card component displaying an examination session:
 * - Header with title, code, academic session, multi-department indicator, and action menu
 * - 4-tile MetricsGrid with routine coverage, full marks, breakdown, and evaluation weights
 * - Department-specific date windows when active
 * - Interactive Lifecycle Pipeline stepper with status transition action triggers
 */
export default function ExamSessionCard({
  exam,
  currentSubjects,
  getExamTitle,
  onEdit,
  onDelete,
  onNavigateToMatrix,
  onNavigateToMarkEntry,
  onNavigateToTabulation,
  onStatusChange,
}: ExamSessionCardProps) {
  const currentStageIdx = getLifecycleStageIndex(exam.status);
  const groupedDepartmentSchedules = getGroupedDepartmentSchedules(exam);

  return (
    <div className="space-y-3.5 text-left animate-fade-in">
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
                    onClick: () => onEdit(exam),
                  },
                  {
                    label: 'Subject Routine Matrix',
                    icon: BookOpenIcon,
                    onClick: () => onNavigateToMatrix(exam.id),
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
                    onClick: () => onDelete(exam),
                  },
                ]}
                align="right"
                ariaLabel={`Actions for ${getExamTitle(exam.name)}`}
              />
            </div>
          </div>

          {/* Policy & Key Specifications 4-Tile Grid */}
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
                onClick={() => onStatusChange(exam.id, 'MARK_ENTRY')}
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
                onClick={() => onStatusChange(exam.id, 'FIRST_PUBLISHED')}
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
                  onClick={() => onStatusChange(exam.id, 'UNDER_REVIEW')}
                  title="Flag preliminary result as actively under academic review"
                >
                  Mark Review
                </CustomButton>
                <CustomButton
                  size="xs"
                  variant="primary"
                  icon={LockClosedIcon}
                  onClick={() => onStatusChange(exam.id, 'FINAL_PUBLISHED')}
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
                onClick={() => onStatusChange(exam.id, 'FINAL_PUBLISHED')}
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
}
