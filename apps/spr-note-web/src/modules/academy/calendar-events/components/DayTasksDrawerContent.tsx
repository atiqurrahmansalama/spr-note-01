import React, { useState, useEffect, useMemo } from 'react';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import CustomButton from '../../../../components/ui/CustomButton';
import {
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  ChecklistIcon,
} from '../../../../components/ui/Icons';
import { userTaskStore } from '../tasks/userTaskStore';
import { useTenant } from '../../../../context/TenantContext';
import { useAuth } from '../../../../context/AuthContext';
import { useCalendarTranslation } from '../locales';
import type { UserPersonalTask } from '../types';
import { formatTime12 } from './calendar/utils/calendarUtils';

export interface DayTasksDrawerContentProps {
  dateStr: string;
  initialTasks?: UserPersonalTask[];
  onEditTask: (task: UserPersonalTask) => void;
  onAddTask: () => void;
  onClose: () => void;
}

export const DayTasksDrawerContent: React.FC<DayTasksDrawerContentProps> = ({
  dateStr,
  initialTasks,
  onEditTask,
  onAddTask,
  onClose,
}) => {
  const { t, formatDate, formatNumber } = useCalendarTranslation();
  const { activeTenantId } = useTenant();
  const { user } = useAuth() as any;
  const userId = user?.id || user?.username || user?.email || 'me';

  const [tasks, setTasks] = useState<UserPersonalTask[]>(() => {
    if (initialTasks && initialTasks.length > 0) return initialTasks;
    return userTaskStore.getTasksForDate(activeTenantId, userId, dateStr);
  });

  useEffect(() => {
    const handleUpdate = () => {
      setTasks(userTaskStore.getTasksForDate(activeTenantId, userId, dateStr));
    };
    const unsubscribe = userTaskStore.subscribe(handleUpdate);
    return () => {
      unsubscribe();
    };
  }, [activeTenantId, userId, dateStr]);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'COMPLETED').length,
    [tasks]
  );

  const handleToggleStatus = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    userTaskStore.toggleTaskStatus(activeTenantId, userId, taskId);
  };

  return (
    <DrawerContainer padding="none">
      <div className="space-y-6 pt-2 pb-6">
        {/* ─── 1. Header Summary Section ─── */}
        <DrawerSection
          title={`${t('personalTasks', 'Personal Tasks')} (${formatNumber(tasks.length)})`}
          icon={ChecklistIcon}
          variant="streamlined"
        >
          <div className="flex items-center justify-between p-3.5 rounded-2xl theme-bg-surface border-0 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold theme-text-primary block font-mono">
                {formatDate(dateStr)}
              </span>
              <span className="text-[11px] theme-text-secondary">
                {formatNumber(completedCount)} of {formatNumber(tasks.length)} completed
              </span>
            </div>
            <button
              type="button"
              onClick={onAddTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold hover:opacity-90 transition border-0 cursor-pointer shadow-xs active:scale-95"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{t('createTask', 'Add Task')}</span>
            </button>
          </div>
        </DrawerSection>

        {/* ─── 2. Tasks List Section ─── */}
        <DrawerSection
          title={t('tasksList', 'Scheduled Tasks')}
          icon={CheckCircleIcon}
          variant="streamlined"
        >
          {tasks.length === 0 ? (
            <div className="p-6 text-center rounded-2xl theme-bg-tile border-0 text-xs theme-text-secondary shadow-xs">
              {t('noTasksForDay', 'No personal tasks scheduled for this day.')}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === 'COMPLETED';
                const subtasksCount = task.subtasks?.length || 0;
                const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="p-3.5 rounded-2xl theme-bg-surface hover:theme-bg-elevated/70 transition-all border-0 shadow-xs flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(task.id, e)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border-0 transition-colors cursor-pointer ${
                          isCompleted
                            ? 'theme-bg-accent theme-accent-text'
                            : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20'
                        }`}
                        title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                        aria-label="Toggle task status"
                      >
                        {isCompleted && <CheckCircleIcon className="w-3.5 h-3.5" />}
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <span
                          className={`text-xs block font-semibold leading-snug transition-colors ${
                            isCompleted
                              ? 'line-through opacity-50 theme-text-secondary'
                              : 'theme-text-primary group-hover:theme-accent'
                          }`}
                        >
                          {task.title}
                        </span>

                        {task.description && (
                          <p className="text-[11px] theme-text-secondary line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Metadata Tags Row */}
                        <div className="flex items-center flex-wrap gap-2 pt-0.5">
                          {task.priority && task.priority !== 'MEDIUM' && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs ${
                                task.priority === 'URGENT'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}

                          {task.category && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 theme-text-secondary">
                              {task.category}
                            </span>
                          )}

                          {task.dueTime && (
                            <span className="text-[9px] font-mono theme-text-secondary flex items-center gap-1">
                              <ClockIcon className="w-2.5 h-2.5 opacity-70" />
                              <span>{formatTime12(task.dueTime)}</span>
                            </span>
                          )}

                          {subtasksCount > 0 && (
                            <span className="text-[9px] font-mono theme-text-secondary flex items-center gap-1">
                              <ChecklistIcon className="w-2.5 h-2.5 opacity-70" />
                              <span>
                                {completedSubtasks}/{subtasksCount}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit chevron / action hint */}
                    <div className="shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-semibold theme-accent">
                        {t('edit', 'Edit')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DrawerSection>
      </div>

      <DrawerFooter>
        <CustomButton
          variant="secondary"
          size="md"
          onClick={onClose}
        >
          {t('close', 'Close')}
        </CustomButton>
      </DrawerFooter>
    </DrawerContainer>
  );
};

export default DayTasksDrawerContent;
