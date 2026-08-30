import React, { useMemo } from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import {
  BookOpenIcon,
  ClassIcon,
  EditIcon,
  TrashIcon,
  TimelineIcon,
  FilledCheckCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  TimerIcon,
} from '../../../../components/ui/Icons';
import { weeklyHolidaysStore } from '../../../../utils/stores/calendarStore';

export default function SyllabusDetailsDrawer({
  item,
  activeTenantId,
  teachers = [],
  onEdit,
  onDelete,
  onUpdateProgress,
  onClose,
}) {
  if (!item) return null;

  const resolvedTeacherName = useMemo(() => {
    if (item.teacherId && Array.isArray(teachers) && teachers.length > 0) {
      const found = teachers.find(
        (t) => String(t.id) === String(item.teacherId) ||
               String(t.user) === String(item.teacherId) ||
               String(t.teacher_id) === String(item.teacherId) ||
               (t.user_details && String(t.user_details.id) === String(item.teacherId))
      );
      if (found) {
        return found.name ||
               found.name_en ||
               (found.first_name ? `${found.first_name} ${found.last_name || ''}`.trim() : '') ||
               found.full_name ||
               found.label ||
               found.username ||
               item.teacherName;
      }
    }
    return item.teacherName || 'Unassigned';
  }, [item, teachers]);

  const semestersList = useMemo(() => {
    if (Array.isArray(item.semesters) && item.semesters.length > 0) {
      return item.semesters;
    }
    if (item.semester) {
      return item.semester.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['1st Semester'];
  }, [item]);

  const hasVolumes = Boolean(item.hasVolumes || (item.volumes && item.volumes.length > 1));
  const volumesList = useMemo(() => {
    if (Array.isArray(item.volumes) && item.volumes.length > 0) {
      return item.volumes;
    }
    return [];
  }, [item]);

  const start = Number(item.startPage) || 1;
  const end = Number(item.endPage) || start;
  const cur = Number(item.currentPage) || 0;
  const total = Number(item.totalPages) || Math.max(1, end - start + 1);
  const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : cur));
  const remaining = Math.max(0, total - covered);
  const progressPct = Math.min(100, Math.round((covered / total) * 100));

  return (
    <div className="flex flex-col h-full space-y-5 p-1 text-left">
      {/* 1. Header Banner & Subject Badge */}
      <div className="p-4 rounded-2xl theme-bg-sub/80 border theme-border space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent">
              {item.subject || 'General Subject'}
            </span>
            {hasVolumes && (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider theme-bg-accent text-white shadow-2xs">
                {volumesList.length} Volumes
              </span>
            )}
            {semestersList.map((sem) => (
              <span key={sem} className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider theme-bg-sub border theme-border theme-text-secondary">
                {sem}
              </span>
            ))}
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              progressPct >= 100
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : progressPct > 0
                ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                : 'theme-bg-sub theme-text-secondary border theme-border'
            }`}
          >
            {progressPct >= 100 ? (
              <>
                <FilledCheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Completed</span>
              </>
            ) : progressPct > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
                <span>In Progress</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full theme-bg-neutral" />
                <span>Not Started</span>
              </>
            )}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-bold theme-text-primary leading-snug">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs theme-text-secondary flex-wrap">
            <span className="flex items-center gap-1.5">
              <ClassIcon className="w-4 h-4 theme-accent shrink-0" />
              <strong className="theme-text-primary font-semibold">
                {item.className || 'All Classes'}{item.sectionName ? ` (Section: ${item.sectionName})` : ''}
              </strong>
            </span>
            {item.periodName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium theme-text-accent">
                  <TimerIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.periodName}</span>
                </span>
              </>
            )}
            <span>•</span>
            <span>Teacher: <strong className="theme-text-primary font-semibold">{resolvedTeacherName}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Progress & Milestone Metrics Card */}
      <div className="p-4 rounded-2xl border theme-border theme-bg-surface space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold theme-text-primary uppercase tracking-wider">
              Reading & Syllabus Milestones
            </h4>
          </div>
          <span
            className={`text-sm font-extrabold ${
              progressPct >= 100
                ? 'text-emerald-500 dark:text-emerald-400'
                : progressPct >= 50
                ? 'theme-accent'
                : 'text-amber-500 dark:text-amber-400'
            }`}
          >
            {progressPct}% Covered
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 rounded-full theme-bg-elevated overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct >= 100
                  ? 'bg-emerald-500'
                  : progressPct >= 50
                  ? 'theme-bg-accent'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold theme-text-secondary">
            <span>Page {start} (Start)</span>
            <span>Current: Page {cur}</span>
            <span>Target: Page {end}</span>
          </div>
        </div>

        {/* 3 Grid Stats */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t theme-border">
          <div className="p-2.5 rounded-xl theme-bg-sub/60 border theme-border text-center">
            <div className="text-[10px] uppercase font-bold theme-text-secondary">Total Pages</div>
            <div className="text-sm font-bold theme-text-primary mt-0.5">{total}</div>
          </div>
          <div className="p-2.5 rounded-xl theme-bg-sub/60 border theme-border text-center">
            <div className="text-[10px] uppercase font-bold theme-text-secondary">Completed</div>
            <div className="text-sm font-bold text-emerald-500 dark:text-emerald-400 mt-0.5">{covered}</div>
          </div>
          <div className="p-2.5 rounded-xl theme-bg-sub/60 border theme-border text-center">
            <div className="text-[10px] uppercase font-bold theme-text-secondary">Remaining</div>
            <div className="text-sm font-bold theme-accent mt-0.5">{remaining}</div>
          </div>
        </div>
      </div>

      {/* 3. Kitab Volumes Breakdown (If Multi-Volume) */}
      {hasVolumes && volumesList.length > 0 && (
        <div className="p-4 rounded-2xl border theme-border theme-bg-surface space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold theme-text-primary uppercase tracking-wider flex items-center gap-2">
              <BookOpenIcon className="w-4 h-4 theme-accent" />
              <span>Kitab Volumes & Parts ({volumesList.length} Volumes)</span>
            </h4>
            <span className="text-xs font-mono font-bold theme-text-accent">
              {total} Pages Total
            </span>
          </div>

          <div className="space-y-2">
            {volumesList.map((vol, idx) => {
              const vStart = Number(vol.startPage) || 1;
              const vEnd = Number(vol.endPage) || vStart;
              const vTotal = Number(vol.totalPages) || Math.max(1, vEnd - vStart + 1);

              return (
                <div
                  key={vol.id || idx}
                  className="p-3 rounded-xl border theme-border theme-bg-sub/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg theme-bg-accent text-white flex items-center justify-center font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold theme-text-primary">{vol.name || `Volume ${idx + 1}`}</div>
                      {(vol.startChapter || vol.endChapter) && (
                        <div className="text-[11px] font-medium theme-accent mt-0.5">
                          {vol.startChapter && vol.endChapter
                            ? `${vol.startChapter} → ${vol.endChapter}`
                            : vol.startChapter || vol.endChapter}
                        </div>
                      )}
                      <div className="text-[11px] theme-text-secondary mt-0.5">
                        {vol.semester ? `Semester: ${vol.semester}` : 'All Semesters'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold theme-text-primary">
                      Page {vStart} – {vEnd}
                    </div>
                    <div className="text-[11px] font-bold theme-text-accent">
                      {vTotal} pages
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Additional Metadata & Notes */}
      <div className="p-4 rounded-2xl border theme-border theme-bg-surface space-y-3 shadow-xs">
        <h4 className="text-xs font-bold theme-text-primary uppercase tracking-wider flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 theme-accent" />
          <span>Timeline & Target Info</span>
        </h4>

        <div className="space-y-2 text-xs">
          {item.periodName && (
            <div className="flex items-center justify-between py-1.5 border-b theme-border">
              <span className="theme-text-secondary">Routine Schedule</span>
              <span className="font-semibold theme-text-primary">
                {item.periodName}{' '}
                <span className="theme-accent font-medium">
                  ({weeklyHolidaysStore.formatScheduleDaysSummary(item.scheduleDays, item.scheduleType, activeTenantId)})
                </span>
              </span>
            </div>
          )}
          {(item.startChapter || item.endChapter) && (
            <div className="flex items-center justify-between py-1.5 border-b theme-border">
              <span className="theme-text-secondary">Chapter / Topic Scope</span>
              <span className="font-semibold theme-text-primary">
                {item.startChapter && item.endChapter
                  ? `${item.startChapter} → ${item.endChapter}`
                  : item.startChapter || item.endChapter}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-1.5 border-b theme-border">
            <span className="theme-text-secondary">Target Completion Date</span>
            <span className="font-semibold theme-text-primary">
              {item.targetDate || 'Not specified'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b theme-border">
            <span className="theme-text-secondary">Covered Semesters</span>
            <span className="font-semibold theme-text-primary">
              {semestersList.join(', ')}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b theme-border">
            <span className="theme-text-secondary">Class / Section</span>
            <span className="font-semibold theme-text-primary">
              {item.className || 'General Class'}
            </span>
          </div>
        </div>

        {item.notes && (
          <div className="pt-2">
            <div className="text-[11px] font-bold theme-text-secondary uppercase mb-1">
              Syllabus Outline & Teacher Notes
            </div>
            <div className="p-3 rounded-xl theme-bg-sub/60 border theme-border text-xs theme-text-primary leading-relaxed whitespace-pre-wrap">
              {item.notes}
            </div>
          </div>
        )}
      </div>

      {/* 5. Action Buttons in Footer */}
      <div className="pt-3 border-t theme-border flex items-center justify-between gap-2.5 mt-auto flex-wrap">
        <div className="flex items-center gap-2">
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={BookOpenIcon}
            onClick={() => onUpdateProgress(item)}
          >
            Update Progress
          </CustomButton>
          <CustomButton
            type="button"
            variant="sub"
            size="sm"
            icon={EditIcon}
            onClick={() => onEdit(item)}
          >
            Edit
          </CustomButton>
        </div>

        <CustomButton
          type="button"
          variant="danger"
          size="sm"
          icon={TrashIcon}
          onClick={() => onDelete(item)}
          className="ml-auto"
        >
          Delete
        </CustomButton>
      </div>
    </div>
  );
}
