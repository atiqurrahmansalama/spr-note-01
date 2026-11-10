import React from 'react';
import { ClockIcon, UsersIcon } from '../../../../components/ui/Icons';
import { formatTime12, type ActiveShiftInfo } from '../calendarDataResolver';

export interface WorkingShiftRowProps {
  shift: ActiveShiftInfo;
  onClick?: () => void;
  className?: string;
}

export const WorkingShiftRow: React.FC<WorkingShiftRowProps> = ({
  shift,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 border-0 ${
        shift.isActiveNow
          ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/20 shadow-xs'
          : 'theme-bg-app hover:theme-bg-elevated/40'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            shift.isActiveNow
              ? 'theme-bg-accent theme-accent-text shadow-xs'
              : 'theme-bg-surface theme-text-secondary group-hover:theme-text-primary'
          }`}
        >
          <ClockIcon className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold theme-text-primary truncate">
              {shift.title}
            </h4>
            {shift.isActiveNow && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium theme-bg-accent theme-accent-text">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Active Now
              </span>
            )}
            {!shift.isActiveNow && shift.isUpcomingToday && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium theme-bg-elevated theme-text-secondary">
                Upcoming
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs theme-text-secondary">
            <span>
              {formatTime12(shift.startTime)} – {formatTime12(shift.endTime)}
            </span>
            {shift.audience && shift.audience !== 'ALL' && (
              <>
                <span className="text-[10px] opacity-40">•</span>
                <span className="flex items-center gap-1 truncate">
                  <UsersIcon className="w-3 h-3 opacity-70 shrink-0" />
                  {shift.audience}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingShiftRow;

