import React from 'react';
import {
  ClockIcon,
  TimelineIcon,
  TeacherIcon,
  TimerIcon,
  InfoIcon,
} from '../ui/Icons';

/**
 * Universal Schedule Timeline & Change History Content
 * Integrates directly into the project's standard Right Sidebar System (openRightSidebar).
 * Inspects chronological evolution, teacher reassignments, time shifts, and validity windows
 * for Period Slots, Residential Checkpoints, and Shift Schedules.
 */
export default function ScheduleTimelineDrawer({
  item,
  onClose,
}) {
  if (!item) return null;

  const history = Array.isArray(item.history_log) && item.history_log.length > 0
    ? [...item.history_log].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    : [];

  const effectiveFrom = item.effective_from || item.createdAt?.slice(0, 10) || 'Routine Inception';
  const effectiveTo = item.effective_to || (item.is_deleted ? item.deleted_at?.slice(0, 10) : null);
  const isArchived = Boolean(item.is_deleted || (item.effective_to && new Date(item.effective_to) <= new Date()));

  return (
    <div className="flex flex-col h-full space-y-5 p-1 sm:p-2">
      {/* Target Entity Overview Card */}
      <div className="p-4 rounded-2xl border theme-border theme-bg-sub/30 space-y-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold theme-accent uppercase tracking-wider">
              {item.descriptorLabel || 'Schedule Slot Configuration'}
            </div>
            <div className="text-base font-bold theme-text-primary mt-0.5 truncate">
              {item.period_name || item.checkpoint_name || item.name || item.sub_title || 'Unnamed Slot'}
            </div>
            {item.class_name && (
              <div className="text-xs theme-text-secondary mt-0.5">
                Class: <span className="font-semibold theme-text-primary">{item.class_name}</span>
              </div>
            )}
            {item.department_name && (
              <div className="text-xs theme-text-secondary mt-0.5">
                Department: <span className="font-semibold theme-text-primary">{item.department_name}</span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border shrink-0 ${
              isArchived
                ? 'theme-bg-sub theme-border theme-text-secondary'
                : 'theme-bg-accent-soft theme-accent theme-border'
            }`}
          >
            {isArchived ? 'Archived / Inactive' : 'Active Routine'}
          </span>
        </div>

        {/* Timing & Teacher/Warden Badges */}
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t theme-border text-xs">
          <div className="flex items-center gap-1.5 theme-text-secondary">
            <TimerIcon className="w-3.5 h-3.5 shrink-0 theme-accent" />
            <span className="truncate">
              {item.start_time && item.end_time
                ? `${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}`
                : item.time || item.schedule_time || 'Daily Schedule'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 theme-text-secondary truncate">
            <TeacherIcon className="w-3.5 h-3.5 shrink-0 theme-accent" />
            <span className="truncate" title={item.teacher_name || item.warden_name || item.name || 'Unassigned'}>
              {item.teacher_name || item.warden_name || item.name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Validity Range */}
        <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
          <span>
            Effective From: <strong className="theme-text-primary">{effectiveFrom}</strong>
          </span>
          <span>
            Valid Until: <strong className="theme-text-primary">{effectiveTo || 'Ongoing'}</strong>
          </span>
        </div>
      </div>

      {/* Change History Timeline Section */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
            <ClockIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Evolution & Audit Log</span>
          </h3>
          <span className="text-[11px] font-mono theme-text-secondary">
            {history.length} {history.length === 1 ? 'event' : 'events'} recorded
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed theme-border theme-bg-sub/20 text-center space-y-2">
            <InfoIcon className="w-6 h-6 theme-accent mx-auto opacity-70" />
            <div className="text-xs font-bold theme-text-primary">
              Initial Schedule Configuration
            </div>
            <p className="text-[11px] theme-text-secondary max-w-xs mx-auto leading-relaxed">
              This slot is active from <span className="font-mono font-medium theme-text-primary">{effectiveFrom}</span>. No post-creation modifications or deletions have been recorded.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:theme-bg-sub">
            {history.map((log, idx) => {
              const actionType = (log.action || 'MODIFIED').toUpperCase();
              const isCreated = actionType === 'CREATED';
              const isDeleted = actionType === 'DELETED';

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 theme-bg-surface flex items-center justify-center shrink-0 ${
                      isCreated
                        ? 'border-[var(--accent-main)] theme-text-primary'
                        : isDeleted
                        ? 'border-red-500 text-red-500'
                        : 'border-amber-500 text-amber-500'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCreated
                          ? 'theme-bg-accent'
                          : isDeleted
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </div>

                  {/* Log Entry Card */}
                  <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/20 hover:theme-bg-sub/40 transition-colors space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isCreated
                            ? 'theme-bg-accent-soft theme-accent'
                            : isDeleted
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {actionType}
                      </span>
                      <span className="text-[10px] font-mono theme-text-secondary">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : (log.effective_date || 'Date Recorded')}
                      </span>
                    </div>

                    {/* Details Message */}
                    <div className="text-xs font-medium theme-text-primary leading-relaxed">
                      {log.details || 'Routine schedule details adjusted.'}
                    </div>

                    {/* Specific Diffs Breakdown if available */}
                    {Array.isArray(log.diffs) && log.diffs.length > 0 && (
                      <ul className="text-[11px] theme-text-secondary space-y-0.5 pt-1 border-t theme-border/60">
                        {log.diffs.map((diff, dIdx) => (
                          <li key={dIdx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full theme-bg-accent shrink-0" />
                            <span>{diff}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Actor & Effective Date */}
                    <div className="flex items-center justify-between text-[10px] theme-text-secondary pt-1">
                      <span>
                        Effective Date: <strong className="theme-text-primary">{log.effective_date || effectiveFrom}</strong>
                      </span>
                      {log.changed_by && (
                        <span>
                          By: <span className="font-medium">{log.changed_by}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
