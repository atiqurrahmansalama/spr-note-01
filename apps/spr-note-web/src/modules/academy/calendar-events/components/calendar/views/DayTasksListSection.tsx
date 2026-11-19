import React from 'react';
import type { UserPersonalTask } from '../../../types';

interface DayTasksListSectionProps {
  tasks: UserPersonalTask[];
  selectedDateStr: string;
  onToggleTaskStatus: (taskId: string) => void;
  onOpenTaskDrawer: (params: { task?: UserPersonalTask | null; date: string }) => void;
}

export const DayTasksListSection: React.FC<DayTasksListSectionProps> = ({
  tasks,
  selectedDateStr,
  onToggleTaskStatus,
  onOpenTaskDrawer,
}) => {
  return (
    <div className="pt-3 border-t theme-border space-y-2.5 mt-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-xs" />
          <span className="text-xs font-bold theme-text-primary">
            Personal Tasks ({tasks.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenTaskDrawer({ date: selectedDateStr })}
          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition cursor-pointer"
        >
          + Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="p-3.5 text-center border-0 rounded-2xl theme-bg-tile text-[11px] theme-text-secondary shadow-2xs">
          No personal tasks scheduled for this day.
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-2 sm:p-2.5 rounded-xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition-all flex items-center justify-between gap-2 shadow-2xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={task.status === 'COMPLETED'}
                  onChange={() => onToggleTaskStatus(task.id)}
                  className="w-4 h-4 rounded border-0 accent-indigo-600 cursor-pointer shrink-0"
                />
                <span
                  onClick={() => onOpenTaskDrawer({ task, date: selectedDateStr })}
                  className={`text-xs truncate cursor-pointer select-none ${
                    task.status === 'COMPLETED'
                      ? 'line-through opacity-50 theme-text-secondary'
                      : 'font-medium theme-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {task.priority && task.priority !== 'MEDIUM' && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs ${
                    task.priority === 'URGENT'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : task.priority === 'HIGH'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                  }`}>
                    {task.priority}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenTaskDrawer({ task, date: selectedDateStr })}
                  className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(DayTasksListSection);
