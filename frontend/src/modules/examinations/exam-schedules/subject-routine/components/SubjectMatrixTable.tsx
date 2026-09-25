import React, { useMemo } from 'react';
import DataTable, { Column } from '../../../../../components/ui/DataTable';
import ActionMenu, { ActionMenuItem } from '../../../../../components/ui/ActionMenu';
import { formatShortDateLabel } from '../../utils/examScheduleUtils';
import {
  CalendarIcon,
  ClockIcon,
  BookOpenIcon,
  SparklesIcon,
  HistoryIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  UserCheckIcon,
} from '../../../../../components/ui/Icons';
import { SubjectRoutineItem, SubjectMatrixTableProps } from '../types';

/**
 * SubjectMatrixTable
 * High-performance, aesthetic read-only DataTable for Subject Exam Routines.
 * Shared across Exam Schedules (`ExamSchedulesView`) and Subject Routine Matrix (`SubjectRoutineMatrixView`).
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Separate Invigilator and Examiner / Paper Setter columns
 * - Conditional Visibility for Breakdown & Previous Exams columns
 * - Generous row padding for enterprise data density
 */
export default function SubjectMatrixTable({
  activeExam = null,
  filteredRows = [],
  showActions = true,
  onEditRow,
  onOpenComponentModal,
  onDuplicateRow,
  onDeleteRow,
}: SubjectMatrixTableProps) {
  const isBreakdownEnabled = activeExam ? activeExam.breakdownEnabled !== false : true;

  const isPreviousExamsEnabled = useMemo(() => {
    if (!activeExam) return false;
    return Boolean(
      activeExam.previousExamsConfig?.enabled ??
      activeExam.previousExamsEnabled ??
      (Array.isArray(activeExam.previousExams) && activeExam.previousExams.length > 0) ??
      (Array.isArray(activeExam.previousExamsConfig?.exams) && activeExam.previousExamsConfig.exams.length > 0)
    );
  }, [activeExam]);

  const columns = useMemo(() => {
    const list: Column<SubjectRoutineItem>[] = [
      // ─── 1. Class & Scope ────────────────────────────────────────────────
      {
        key: 'classScope',
        title: 'Class & Scope',
        sortValue: (row: SubjectRoutineItem) => `${row.className || ''} ${row.sectionName || ''} ${row.departmentName || ''}`,
        headerClassName: 'w-[20%] min-w-[130px]',
        className: 'w-[20%] min-w-[130px] align-middle',
        render: (row: SubjectRoutineItem) => (
          <div className="space-y-1 py-1">
            <div className="font-bold text-xs sm:text-sm theme-text-primary truncate">
              {row.className || 'General Class'}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] theme-text-secondary font-medium truncate opacity-90">
                {row.departmentName || 'General Dept'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded theme-bg-sub border theme-border font-mono theme-text-secondary font-semibold">
                {row.sectionName || 'All Sections'}
              </span>
            </div>
          </div>
        ),
      },

      // ─── 2. Curriculum Book & Subject Title ──────────────────────────────
      {
        key: 'curriculumBook',
        title: 'Curriculum Book & Subject',
        sortValue: (row: SubjectRoutineItem) => row.curriculumBookName || row.subjectName || '',
        headerClassName: 'w-[26%] min-w-[160px]',
        className: 'w-[26%] min-w-[160px] align-middle',
        render: (row: SubjectRoutineItem) => (
          <div className="space-y-1 py-1">
            {/* Top: Book Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpenIcon className="w-4 h-4 theme-accent shrink-0 opacity-90" />
              <span className="font-bold text-xs sm:text-sm theme-text-primary truncate">
                {row.curriculumBookName || row.subjectName || 'Curriculum Book'}
              </span>
              {row.subjectCode && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
                  {row.subjectCode}
                </span>
              )}
            </div>

            {/* Sub: Subject Name */}
            <div className="flex items-center gap-1 text-[11px] theme-text-secondary truncate pl-5">
              <span className="truncate opacity-85 font-medium">
                {row.subjectName || 'Core Subject'}
              </span>
            </div>
          </div>
        ),
      },

      // ─── 3. Date & Timing (Clean Minimal Schedule) ──────────────────────
      {
        key: 'scheduleTiming',
        title: 'Date & Timing',
        sortValue: (row: SubjectRoutineItem) => `${row.examDate || ''} ${row.startTime || ''}`,
        headerClassName: 'w-[18%] min-w-[130px]',
        className: 'w-[18%] min-w-[130px] align-middle',
        render: (row: SubjectRoutineItem) => (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0 opacity-85" />
              <span className="font-bold text-xs theme-text-primary font-mono whitespace-nowrap">
                {formatShortDateLabel(row.examDate)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary font-mono">
              <ClockIcon className="w-3 h-3 theme-text-secondary shrink-0 opacity-60" />
              <span className="font-medium whitespace-nowrap">
                {row.startTime || '09:00 AM'} – {row.endTime || '11:00 AM'}
              </span>
            </div>
          </div>
        ),
      },

      // ─── 4. Paper Setter & Examiner ───────────────────────────────────────
      {
        key: 'examiner',
        title: 'Examiner',
        sortValue: (row: SubjectRoutineItem) => row.examinerName || row.evaluatorName || '',
        headerClassName: 'w-[18%] min-w-[130px]',
        className: 'w-[18%] min-w-[130px] align-middle',
        render: (row: SubjectRoutineItem) => {
          const exName = row.examinerName || row.evaluatorName;
          const exId = row.examinerId || row.evaluatorId;
          if (!exName && !exId) {
            return (
              <span className="text-[11px] px-2 py-0.5 rounded theme-bg-sub theme-text-secondary border theme-border opacity-70 italic">
                Unassigned
              </span>
            );
          }

          return (
            <div className="flex items-center gap-1.5 min-w-0 py-1" title={`Paper Setter / Evaluator: ${exName || `Examiner #${exId}`}`}>
              <div className="w-5.5 h-5.5 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs border border-[var(--accent-main)]/20">
                <UserCheckIcon className="w-3 h-3" />
              </div>
              <span className="text-xs font-semibold theme-text-primary truncate">
                {exName || `Examiner #${exId}`}
              </span>
            </div>
          );
        },
      },

      // ─── 5. Full Marks ────────────────────────────────────────────────────
      {
        key: 'marks',
        title: 'Full Marks',
        align: 'center',
        sortValue: (row: SubjectRoutineItem) => Number(row.fullMarks) || 100,
        headerClassName: 'w-20 min-w-[75px] text-center',
        className: 'w-20 min-w-[75px] text-center align-middle',
        render: (row: SubjectRoutineItem) => (
          <div
            className="inline-flex items-center justify-center gap-1 font-mono text-xs whitespace-nowrap py-1"
            title={row.passMarks ? `Full Marks: ${row.fullMarks ?? 100} pts (Pass Mark: ${row.passMarks} pts)` : `Full Marks: ${row.fullMarks ?? 100} pts`}
          >
            <span className="theme-text-primary font-bold text-xs">{row.fullMarks ?? 100}</span>
            <span className="text-[11px] theme-text-secondary opacity-70">pts</span>
          </div>
        ),
      },
    ];

    // ─── 6. Previous Exam Data (Conditionally shown before Breakdown) ─────
    if (isPreviousExamsEnabled) {
      list.push({
        key: 'previousExams',
        title: 'Previous Exams',
        align: 'center',
        headerClassName: 'w-32 min-w-[110px] text-center',
        className: 'w-32 min-w-[110px] text-center align-middle',
        render: (row: SubjectRoutineItem) => {
          const rowPrevEnabled = row.previousExamsEnabled !== false;
          if (!rowPrevEnabled) {
            return (
              <div className="flex items-center justify-center py-1">
                <span className="text-[11px] px-2.5 py-1 rounded-md theme-bg-sub theme-text-secondary border theme-border opacity-70 italic">
                  Excluded
                </span>
              </div>
            );
          }

          const prevExamsList = Array.isArray(row.previousExams) && row.previousExams.length > 0
            ? row.previousExams
            : activeExam?.previousExamsConfig?.exams || activeExam?.previousExams || [];
          
          const totalWeightPct = prevExamsList.reduce((acc: number, e: any) => acc + (Number(e.weightagePct) || 0), 0);
          const count = prevExamsList.length;

          return (
            <div className="flex items-center justify-center py-1">
              <button
                type="button"
                onClick={() => onEditRow?.(row)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-sub border theme-border hover:border-[var(--accent-main)]/50 transition-all cursor-pointer truncate max-w-[130px] inline-flex items-center gap-1.5 shadow-2xs group whitespace-nowrap"
                title={`Previous exam marks merger: ${count} terms linked (${totalWeightPct}% weight)`}
              >
                <HistoryIcon className="w-3.5 h-3.5 theme-accent shrink-0 group-hover:rotate-45 transition-transform" />
                <span className="truncate">{count > 0 ? `${count} Terms (${totalWeightPct}%)` : 'Default'}</span>
              </button>
            </div>
          );
        },
      });
    }

    // ─── 7. Breakdown (Conditionally shown if breakdownEnabled is true) ───
    if (isBreakdownEnabled) {
      list.push({
        key: 'breakdown',
        title: 'Breakdown',
        align: 'center',
        headerClassName: 'w-28 min-w-[95px] text-center',
        className: 'w-28 min-w-[95px] text-center align-middle',
        render: (row: SubjectRoutineItem) => {
          const count = row.components?.length || 0;
          const markLabels =
            row.components && row.components.length > 0
              ? row.components.map((c) => c.maxMarks).join('/')
              : `${row.fullMarks || 100}`;

          return (
            <div className="flex items-center justify-center py-1">
              <button
                type="button"
                onClick={() => (onOpenComponentModal ? onOpenComponentModal(row) : onEditRow?.(row))}
                className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-sub border theme-border hover:border-[var(--accent-main)]/50 transition-all cursor-pointer truncate max-w-[120px] inline-flex items-center gap-1.5 shadow-2xs group whitespace-nowrap"
                title={`Click to preview/fine-tune marks breakdown (${markLabels})`}
              >
                <SparklesIcon className="w-3.5 h-3.5 theme-accent shrink-0 group-hover:rotate-12 transition-transform" />
                <span className="truncate">{count > 0 ? `${count}P (${markLabels})` : 'Default'}</span>
              </button>
            </div>
          );
        },
      });
    }

    // ─── 8. Actions (Sticky Right Column) ──────────────────────────────────
    if (showActions) {
      list.push({
        key: 'actions',
        title: 'Actions',
        sticky: 'right',
        align: 'center',
        headerClassName: 'w-12 min-w-[48px] text-center',
        className: 'w-12 min-w-[48px] text-center align-middle',
        render: (row: SubjectRoutineItem, idx?: number) => {
          const actions: ActionMenuItem[] = [];
          if (onEditRow) {
            actions.push({
              label: 'Edit Subject Routine',
              icon: EditIcon,
              onClick: () => onEditRow(row),
            });
          }
          if (onDuplicateRow) {
            actions.push({
              label: 'Duplicate Routine Row',
              icon: PlusIcon,
              onClick: () => onDuplicateRow(row),
            });
          }
          if (onDeleteRow) {
            actions.push({
              label: 'Delete Routine Row',
              icon: TrashIcon,
              danger: true,
              onClick: () => onDeleteRow(row.id),
            });
          }

          if (actions.length === 0) return null;

          return (
            <div
              className="flex items-center justify-center py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ActionMenu
                buttonClassName="p-1.5 rounded-lg border-0 shadow-none hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                actions={actions}
                align="right"
                ariaLabel={`Actions for row ${(idx ?? 0) + 1}`}
              />
            </div>
          );
        },
      });
    }

    return list;
  }, [isPreviousExamsEnabled, isBreakdownEnabled, activeExam, showActions, onEditRow, onOpenComponentModal, onDuplicateRow, onDeleteRow]);

  return (
    <DataTable
      columns={columns as any}
      data={filteredRows}
      keyExtractor={(item: SubjectRoutineItem) => item.id}
      selectable={false}
      onRowClick={onEditRow ? (row: SubjectRoutineItem) => onEditRow(row) : undefined}
      emptyTitle="No Subject Routines Found"
      emptySubMessage="Click 'Add Subject Routine' or 'Auto-Populate from Curriculum' to configure subject schedules."
      emptyIcon={BookOpenIcon}
      compact={false}
      headerPaddingClass="py-3.5 px-4 sm:px-5"
      cellPaddingClass="py-4.5 px-4 sm:px-5"
    />
  );
}
