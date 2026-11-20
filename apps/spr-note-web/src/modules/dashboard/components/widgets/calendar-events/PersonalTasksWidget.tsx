/**
 * Personal Tasks Dashboard Widget
 * =================================
 * Minimal, responsive (@container) productivity widget for personal to-do tasks.
 * Complies strictly with Rule 14 (borderless, soft surfaces, ring-0, Apple/Linear minimalist).
 * Fully synchronized with Feature & Module Control.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
} from '../../../../../components/ui/Icons';
import { useUserTasks } from '../../../../academy/calendar-events/tasks/useUserTasks';
import { useFeatureControl } from '../../../../../context/FeatureControlContext';
import { useRightSidebar } from '../../../../../context/RightSidebarContext';
import { EVENT_COLOR_MAP } from '../../../../academy/calendar-events/constants/eventColors';
import type { UserPersonalTask } from '../../../../academy/calendar-events/types';

export interface PersonalTasksWidgetProps {
  title?: string;
  className?: string;
  [key: string]: any;
}

export default function PersonalTasksWidget({
  title = 'My Tasks & Personal To-Do',
  className = '',
}: PersonalTasksWidgetProps) {
  const navigate = useNavigate();
  const { openDrawer } = useRightSidebar();
  const { isSectionEnabled } = useFeatureControl();
  const { tasks, toggleTaskStatus } = useUserTasks();

  const canAddTasks =
    isSectionEnabled('calendar_tab_personal_tasks') &&
    isSectionEnabled('calendar_add_personal_tasks');

  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const completedCount = tasks.length - pendingTasks.length;

  const handleOpenTaskDrawer = () => {
    openDrawer('user-task', {
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleNavigateToHub = () => {
    navigate('/academy/calendar-events?tab=MY_TASKS');
  };

  return (
    <div
      className={`p-3.5 @sm:p-5 rounded-3xl theme-bg-surface shadow-xs h-auto @[640px]:h-full flex flex-col justify-start space-y-2.5 @sm:space-y-3 select-none min-w-0 border-0 @container ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 pb-1 shrink-0">
        <div className="flex items-center gap-2 @sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 @sm:w-8 @sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs @sm:text-sm font-bold theme-text-primary leading-tight truncate">
              {title}
            </h3>
            <p className="hidden @[820px]:block text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 truncate">
              {pendingTasks.length} pending milestone{pendingTasks.length === 1 ? '' : 's'}
              {completedCount > 0 ? ` (${completedCount} completed)` : ''}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 @sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNavigateToHub}
            className="px-1.5 py-1 text-[11px] @sm:text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:underline transition-colors cursor-pointer border-0 bg-transparent select-none shrink-0"
          >
            Full View
          </button>

          {canAddTasks && (
            <button
              type="button"
              onClick={handleOpenTaskDrawer}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold border-0 theme-bg-accent theme-accent-text hover:brightness-105 transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
              title="Add New Task"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span className="hidden @[480px]:inline">Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List or Clean Empty State */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
        {pendingTasks.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-2xl theme-bg-app border-0">
            <div className="w-9 h-9 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center mb-2">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold theme-text-primary">All caught up!</p>
            <p className="text-[10px] theme-text-secondary mt-0.5">
              No pending tasks. Great job staying on top of your schedule.
            </p>
          </div>
        ) : (
          pendingTasks.slice(0, 6).map((task) => {
            const colorMeta = EVENT_COLOR_MAP[task.colorTag || 'slate'] || EVENT_COLOR_MAP.slate;
            return (
              <div
                key={task.id}
                className="p-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 transition-colors flex items-center justify-between gap-2.5 border-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleTaskStatus(task.id)}
                    className="w-4 h-4 rounded-full border theme-border flex items-center justify-center hover:theme-border-accent transition-colors shrink-0 cursor-pointer bg-transparent"
                    title="Mark as completed"
                  >
                    <span className="w-2 h-2 rounded-full bg-transparent" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium theme-text-primary truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.dueDate && (
                        <span className="text-[10px] theme-text-secondary flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 opacity-60" />
                          <span>{task.dueDate}</span>
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${colorMeta.bg} ${colorMeta.text} font-bold`}
                      >
                        {task.priority || 'MEDIUM'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
