import React, { useMemo } from 'react';
import DataTable from '../../../../../components/ui/DataTable';
import ActionMenu from '../../../../../components/ui/ActionMenu';
import { formatShortDateLabel } from '../hooks/useSubjectMatrixState';
import {
  CalendarIcon,
  ClockIcon,
  BookOpenIcon,
  SparklesIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  UserIcon,
} from '../../../../../components/ui/Icons';

/**
 * SubjectMatrixTable
 * High-performance, aesthetic read-only DataTable for Subject Exam Routines.
 * Data modifications are performed exclusively via the dedicated Right Sidebar Drawer.
 */
export default function SubjectMatrixTable({
  filteredRows,
  onEditRow,
  onOpenComponentModal,
  onDuplicateRow,
  onDeleteRow,
}) {
  const columns = useMemo(() => {
    return [
      // ─── 1. Class & Scope ────────────────────────────────────────────────
      {
        key: 'classScope',
        title: 'Class & Scope',
        headerClassName: 'w-[18%] min-w-[125px]',
        className: 'w-[18%] min-w-[125px]',
        render: (row) => (
          <div className="space-y-0.5">
            <div className="font-bold text-xs theme-text-primary truncate">
              {row.className || 'General Class'}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] theme-text-secondary font-medium truncate opacity-85">
                {row.departmentName || 'General Dept'}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded theme-bg-sub border theme-border font-mono theme-text-secondary">
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
        headerClassName: 'w-[24%] min-w-[145px]',
        className: 'w-[24%] min-w-[145px]',
        render: (row) => (
          <div className="space-y-0.5">
            {/* Top: Book Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpenIcon className="w-3.5 h-3.5 theme-accent shrink-0 opacity-85" />
              <span className="font-bold text-xs theme-text-primary truncate">
                {row.curriculumBookName || row.subjectName || 'Curriculum Book'}
              </span>
              {row.subjectCode && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
                  {row.subjectCode}
                </span>
              )}
            </div>

            {/* Sub: Subject Name */}
            <div className="flex items-center gap-1 text-[10px] theme-text-secondary truncate pl-5">
              <span className="truncate opacity-85">
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
        headerClassName: 'w-[15%] min-w-[120px]',
        className: 'w-[15%] min-w-[120px]',
        render: (row) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0 opacity-85" />
              <span className="font-bold text-xs theme-text-primary font-mono whitespace-nowrap">
                {formatShortDateLabel(row.examDate)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] theme-text-secondary font-mono">
              <ClockIcon className="w-3 h-3 theme-text-secondary shrink-0 opacity-60" />
              <span className="font-medium whitespace-nowrap">
                {row.startTime || '09:00 AM'} – {row.endTime || '11:00 AM'}
              </span>
            </div>
          </div>
        ),
      },

      // ─── 4. Examiner / Invigilator ────────────────────────────────────────
      {
        key: 'teacherName',
        title: 'Invigilator',
        headerClassName: 'w-[16%] min-w-[120px]',
        className: 'w-[16%] min-w-[120px]',
        render: (row) => {
          if (!row.teacherName && !row.teacherId) {
            return (
              <span className="text-[10px] px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border opacity-70 italic">
                Unassigned
              </span>
            );
          }

          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                <UserIcon className="w-3 h-3" />
              </div>
              <span className="text-xs font-semibold theme-text-primary truncate">
                {row.teacherName || `Teacher #${row.teacherId}`}
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
        headerClassName: 'w-20 min-w-[75px] text-center',
        className: 'w-20 min-w-[75px] text-center',
        render: (row) => (
          <div className="inline-flex items-center justify-center gap-1 font-mono text-xs whitespace-nowrap">
            <strong className="theme-text-primary font-bold">{row.fullMarks ?? 100}</strong>
            <span className="text-[10px] theme-text-secondary opacity-60">pts</span>
          </div>
        ),
      },

      // ─── 6. Breakdown (Component Parts) ───────────────────────────────────
      {
        key: 'breakdown',
        title: 'Breakdown',
        align: 'center',
        headerClassName: 'w-24 min-w-[85px] text-center',
        className: 'w-24 min-w-[85px] text-center',
        render: (row) => {
          const count = row.components?.length || 0;
          const markLabels =
            row.components && row.components.length > 0
              ? row.components.map((c) => c.maxMarks).join('/')
              : `${row.fullMarks || 100}`;

          return (
            <button
              type="button"
              onClick={() => onOpenComponentModal(row)}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold theme-bg-sub border theme-border hover:border-[var(--accent-main)]/50 transition-all cursor-pointer truncate max-w-[105px] inline-flex items-center gap-1 shadow-2xs group whitespace-nowrap"
              title={`Click to preview/fine-tune marks breakdown (${markLabels})`}
            >
              <SparklesIcon className="w-3 h-3 theme-accent shrink-0 group-hover:rotate-12 transition-transform" />
              <span className="truncate">{count > 0 ? `${count}P (${markLabels})` : 'Default'}</span>
            </button>
          );
        },
      },

      // ─── 7. Actions (Sticky Right Column) ──────────────────────────────────
      {
        key: 'actions',
        title: 'Actions',
        sticky: 'right',
        align: 'center',
        headerClassName: 'w-12 min-w-[48px] text-center',
        className: 'w-12 min-w-[48px] text-center',
        render: (row, idx) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionMenu
              buttonClassName="p-1.5 rounded-lg border-0 shadow-none hover:theme-bg-sub text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              actions={[
                {
                  label: 'Edit Subject Routine',
                  icon: EditIcon,
                  onClick: () => onEditRow(row),
                },
                {
                  label: 'Duplicate Routine Row',
                  icon: PlusIcon,
                  onClick: () => onDuplicateRow(row),
                },
                {
                  label: 'Delete Routine Row',
                  icon: TrashIcon,
                  danger: true,
                  onClick: () => onDeleteRow(row.id),
                },
              ]}
              align="right"
              ariaLabel={`Actions for row ${idx + 1}`}
            />
          </div>
        ),
      },
    ];
  }, [onEditRow, onOpenComponentModal, onDuplicateRow, onDeleteRow]);

  return (
    <DataTable
      columns={columns}
      data={filteredRows}
      keyExtractor={(item) => item.id}
      selectable={false}
      onRowClick={(row) => onEditRow(row)}
      emptyTitle="No Subject Routines Found"
      emptySubMessage="Click 'Add Subject Routine' or 'Auto-Populate from Curriculum' to configure subject schedules."
      emptyIcon={BookOpenIcon}
      compact={false}
    />
  );
}
