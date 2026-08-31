import React from 'react';
import {
  CalendarIcon,
  TimerIcon,
  AcademicCapIcon,
  DepartmentIcon,
  SectionIcon,
  BookOpenIcon,
  TeacherIcon,
  StudentIcon,
  EditIcon,
  CheckIcon,
  FileIcon,
  CopyIcon,
} from '../../../components/ui/Icons';

/**
 * Format date string safely into a clean readable format (e.g., "Mon, 31 Aug 2026")
 */
function formatReadableDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Reusable ClassroomContextCard
 * Presents pre-selected classroom context (Date, Class, Section, Period, Book, Teacher, Student, Lesson, Pages)
 * in an enterprise-grade card, reducing redundant inputs in drawers.
 */
export default function ClassroomContextCard({
  title = 'Active Classroom Context',
  badgeLabel = '',
  date = '',
  periodName = '',
  periodTime = '',
  departmentName = '',
  className: academicClassName = '',
  sectionName = '',
  bookName = '',
  subjectName = '',
  teacherName = '',
  lessonTitle = '',
  startUnit = '',
  endUnit = '',
  student = null,
  bookProgressStats = null,
  isEditable = false,
  isEditMode = false,
  onToggleEdit,
  onCarryForward,
  classNameExtra = '',
}) {
  const formattedDate = formatReadableDate(date);

  return (
    <div
      className={`rounded-2xl border border-[var(--accent-main)]/30 theme-bg-sub/40 p-3.5 sm:p-4 space-y-3 shadow-2xs animate-fade-in text-left ${classNameExtra}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 border-b theme-border pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
            <BookOpenIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold theme-text-primary truncate">{title}</h4>
              {badgeLabel && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 shrink-0">
                  {badgeLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCarryForward && (
            <button
              type="button"
              onClick={onCarryForward}
              className="text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border theme-bg-sub theme-border theme-text-primary hover:theme-bg-sub/80 transition-all cursor-pointer shadow-2xs"
              title="Carry forward lessons from yesterday"
            >
              <CopyIcon className="w-3 h-3 theme-accent" />
              <span>Carry Forward</span>
            </button>
          )}

          {isEditable && onToggleEdit && (
            <button
              type="button"
              onClick={onToggleEdit}
              className={`text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isEditMode
                  ? 'theme-bg-accent text-white border-[var(--accent-main)] shadow-xs'
                  : 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 hover:border-[var(--accent-main)]/60 hover:theme-bg-accent-soft/80 shadow-2xs'
              }`}
            >
              {isEditMode ? <CheckIcon className="w-3 h-3" /> : <EditIcon className="w-3 h-3" />}
              <span>{isEditMode ? 'Done' : 'Change Context'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Banner (If present) */}
      {student && (
        <div className="flex items-center justify-between p-2.5 rounded-xl border theme-border theme-bg-surface/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center justify-center font-bold text-xs shrink-0">
              <StudentIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold theme-text-primary text-xs block truncate">
                {student.name_en || student.name || 'Student'}
              </span>
              <span className="text-[11px] theme-text-secondary block truncate">
                ID: {student.uniq_id || student.roll_number || 'N/A'}
                {student.student_class_name ? ` • ${student.student_class_name}` : ''}
                {student.section_name ? ` (${student.section_name})` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Grid (Sequence: Date > Department > Class > Section > Period > Book > Teacher) */}
      <div className="grid grid-cols-1 @[380px]:grid-cols-2 @[540px]:grid-cols-3 gap-2 text-xs">
        {/* 1. Date */}
        {formattedDate && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Delivery Date
              </span>
              <span className="font-bold theme-text-primary truncate block">{formattedDate}</span>
            </div>
          </div>
        )}

        {/* 2. Department */}
        {departmentName && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2">
            <DepartmentIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Department
              </span>
              <span className="font-bold theme-text-primary truncate block" title={departmentName}>
                {departmentName}
              </span>
            </div>
          </div>
        )}

        {/* 3. Academic Class */}
        {academicClassName && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2">
            <AcademicCapIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Target Class
              </span>
              <span className="font-bold theme-text-primary truncate block" title={academicClassName}>
                {academicClassName}
              </span>
            </div>
          </div>
        )}

        {/* 4. Target Section (Only if present) */}
        {sectionName && sectionName !== 'All Sections' && sectionName !== 'Class Wide (All Sections)' && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2">
            <SectionIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Target Section
              </span>
              <span className="font-bold theme-text-primary truncate block" title={sectionName}>
                {sectionName}
              </span>
            </div>
          </div>
        )}

        {/* 5. Routine Period */}
        {periodName && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2">
            <TimerIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Routine Period
              </span>
              <span
                className="font-bold theme-text-primary truncate block"
                title={periodTime ? `${periodName} (${periodTime})` : periodName}
              >
                {periodName}{periodTime && !periodName.includes(periodTime) ? ` (${periodTime})` : ''}
              </span>
            </div>
          </div>
        )}

        {/* 6. Curriculum Book & Subject */}
        {(bookName || subjectName) && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2 col-span-1 @[380px]:col-span-2 @[540px]:col-span-2">
            <BookOpenIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                {bookName ? 'Curriculum Book' : 'Subject'}
              </span>
              <span className="font-bold theme-text-primary truncate block">
                {bookName || subjectName}
                {bookName && subjectName ? ` • ${subjectName}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* 7. Assigned Teacher */}
        {teacherName && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2">
            <TeacherIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Assigned Teacher
              </span>
              <span className="font-bold theme-text-primary truncate block">{teacherName}</span>
            </div>
          </div>
        )}

        {/* 8. Assigned Lesson & Page Range (If present) */}
        {(lessonTitle || startUnit || endUnit) && (
          <div className="p-2 rounded-xl border theme-border theme-bg-surface/70 flex items-center gap-2 col-span-1 @[380px]:col-span-2 @[540px]:col-span-3">
            <FileIcon className="w-4 h-4 theme-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block truncate">
                  Assigned Lesson & Pages
                </span>
                {(startUnit || endUnit) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 shrink-0">
                    {startUnit && endUnit
                      ? `Page ${startUnit} – ${endUnit}`
                      : startUnit
                      ? `From Page ${startUnit}`
                      : `To Page ${endUnit}`}
                  </span>
                )}
              </div>
              {lessonTitle && (
                <span className="font-bold theme-text-primary truncate block text-xs">
                  {lessonTitle}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Book Progress Stats (If present) */}
      {bookProgressStats && (
        <div className="p-3 rounded-xl border theme-border theme-bg-surface/60 space-y-2">
          <div className="flex justify-between text-[11px] theme-text-secondary">
            <span>
              {bookProgressStats.currentPage > 0
                ? `Completed up to Page ${bookProgressStats.currentPage}`
                : 'Not started yet (Page 0)'}
            </span>
            <span className="font-bold theme-text-primary">
              {bookProgressStats.percentage}% ({bookProgressStats.coveredPages}/{bookProgressStats.totalPages} pgs)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full theme-bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 theme-bg-accent"
              style={{ width: `${bookProgressStats.percentage}%` }}
            />
          </div>
          <div className="grid grid-cols-2 @[360px]:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div>
              <span className="block theme-text-secondary text-[10px] uppercase font-semibold">Start Page</span>
              <span className="font-bold theme-text-primary">{bookProgressStats.startPage}</span>
            </div>
            <div>
              <span className="block theme-text-secondary text-[10px] uppercase font-semibold">Target End</span>
              <span className="font-bold theme-text-primary">{bookProgressStats.endPage}</span>
            </div>
            <div>
              <span className="block theme-text-secondary text-[10px] uppercase font-semibold">Current Page</span>
              <span className="font-bold theme-accent">{bookProgressStats.currentPage || '—'}</span>
            </div>
            <div>
              <span className="block theme-text-secondary text-[10px] uppercase font-semibold">Remaining</span>
              <span className="font-bold theme-text-primary">{bookProgressStats.remainingPages} pgs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
