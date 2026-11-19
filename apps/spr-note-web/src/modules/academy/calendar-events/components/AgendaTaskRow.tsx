import React from 'react';
import { ClockIcon, UsersIcon, CheckCircleIcon } from '../../../../components/ui/Icons';
import type { ResolvedAgendaItem } from '../calendarDataResolver';

export interface AgendaTaskRowProps {
  item: ResolvedAgendaItem;
  onClick?: () => void;
  className?: string;
}

export const AgendaTaskRow: React.FC<AgendaTaskRowProps> = ({
  item,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 border-0 ${
        item.isOngoing
          ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/20 shadow-xs'
          : 'theme-bg-app hover:theme-bg-elevated/40'
      } ${item.isCompleted ? 'opacity-60' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            item.isOngoing
              ? 'theme-bg-accent theme-accent-text shadow-xs'
              : item.isCompleted
              ? 'theme-bg-elevated text-emerald-600 dark:text-emerald-400'
              : 'theme-bg-surface theme-text-secondary group-hover:theme-text-primary'
          }`}
        >
          {item.isCompleted ? (
            <CheckCircleIcon className="w-4 h-4" />
          ) : (
            <ClockIcon className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-semibold truncate ${
                item.isCompleted
                  ? 'line-through theme-text-secondary'
                  : 'theme-text-primary'
              }`}
            >
              {item.title}
            </h4>

            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                item.colorStyle?.bg || 'theme-bg-elevated'
              } ${item.colorStyle?.text || 'theme-text-secondary'}`}
            >
              {item.displayType || item.category}
            </span>

            {item.isOngoing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold theme-bg-accent theme-accent-text">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Now
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs theme-text-secondary">
            <span className="font-mono text-[11px]">{item.timeSlot}</span>
            {item.audience && item.audience !== 'ALL' && (
              <>
                <span className="text-[10px] opacity-40">•</span>
                <span className="flex items-center gap-1 truncate text-[11px]">
                  <UsersIcon className="w-3 h-3 opacity-60 shrink-0" />
                  {item.audience}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgendaTaskRow;

