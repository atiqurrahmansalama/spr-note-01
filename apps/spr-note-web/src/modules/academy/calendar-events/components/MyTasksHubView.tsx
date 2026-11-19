/**
 * My Tasks & Personal To-Do Hub View
 * ====================================
 * Dedicated productivity view for personal to-dos, checklists, and daily milestones.
 * Fully responsive (@container), borderless soft surfaces, Rule 14 compliant, bilingual/i18n.
 * Default view: Kanban Board View with seamless 1-click status transitions.
 * Instant task creation powered by TaskQuickInputDock (FloatingActionDock).
 */

import React, { useState, useMemo } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomButton from '../../../../components/ui/CustomButton';
import {
  CheckCircleIcon,
  ChecklistIcon,
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  TrashIcon,
  GridIcon,
  ListBulletIcon,
  ArrowRightIcon,
  UndoIcon,
} from '../../../../components/ui/Icons';
import { useCalendarTranslation } from '../locales';
import { useUserTasks } from '../tasks/useUserTasks';
import { EVENT_COLOR_MAP } from '../constants/eventColors';
import TaskQuickInputDock from './TaskQuickInputDock';
import type { UserPersonalTask, TaskPriority, TaskStatus } from '../types';

export interface MyTasksHubViewProps {
  onOpenTaskDrawer: (task?: UserPersonalTask | null, date?: string) => void;
}

export function MyTasksHubView({ onOpenTaskDrawer }: MyTasksHubViewProps) {
  const { t, formatDate, formatNumber } = useCalendarTranslation();
  const { tasks, metrics, saveTask, toggleTaskStatus, deleteTask } = useUserTasks();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Default view is Board (Kanban) View as per user instruction
  const [viewMode, setViewMode] = useState<'checklist' | 'kanban'>('kanban');

  const handleSetViewMode = (mode: 'checklist' | 'kanban') => {
    setViewMode(mode);
    try {
      localStorage.setItem('spr_tasks_view_mode', mode);
    } catch {}
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1-Click status mover for Kanban board
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    saveTask({ id: taskId, status: newStatus });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (statusFilter === 'PENDING' && task.status === 'COMPLETED') return false;
      if (statusFilter === 'COMPLETED' && task.status !== 'COMPLETED') return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchCat = (task.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Grouped tasks for Checklist view
  const groupedTasks = useMemo(() => {
    const pinned: UserPersonalTask[] = [];
    const today: UserPersonalTask[] = [];
    const upcoming: UserPersonalTask[] = [];
    const completed: UserPersonalTask[] = [];

    filteredTasks.forEach((t) => {
      if (t.status === 'COMPLETED') {
        completed.push(t);
      } else if (t.isPinned) {
        pinned.push(t);
      } else if (t.dueDate === todayStr) {
        today.push(t);
      } else {
        upcoming.push(t);
      }
    });

    return { pinned, today, upcoming, completed };
  }, [filteredTasks, todayStr]);

  // Priority color badge helper
  const getPriorityBadgeClass = (pri: TaskPriority) => {
    switch (pri) {
      case 'URGENT':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold';
      case 'MEDIUM':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold';
      case 'LOW':
      default:
        return 'theme-bg-app theme-text-secondary';
    }
  };

  return (
    <div className="space-y-4 @container select-none pb-28 min-h-full">
      {/* ─── 1. Executive Metrics Cards Bar ─── */}
      <div className="grid grid-cols-2 @[640px]:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Tasks */}
        <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider theme-text-secondary block">
              {t('totalTasks', 'Total Tasks')}
            </span>
            <span className="text-lg sm:text-2xl font-black theme-text-primary mt-0.5 block">
              {formatNumber(metrics.total)}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ChecklistIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Due Today */}
        <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider theme-text-secondary block">
              {t('dueToday', 'Due Today')}
            </span>
            <span className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
              {formatNumber(metrics.dueToday)}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* High Priority */}
        <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider theme-text-secondary block">
              {t('highPriority', 'Urgent & High')}
            </span>
            <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
              {formatNumber(metrics.highPriority)}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider theme-text-secondary block">
              {t('completionRate', 'Completed')}
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatNumber(metrics.completionRate)}%
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* ─── 2. Filter & View Controls Bar ─── */}
      <div className="p-3 sm:p-3.5 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col @[640px]:flex-row items-stretch @[640px]:items-center justify-between gap-2.5">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border-0 ring-0 shrink-0 ${
                statusFilter === st
                  ? 'theme-bg-accent text-white shadow-xs'
                  : 'theme-bg-app hover:theme-bg-elevated/60 theme-text-secondary hover:theme-text-primary'
              }`}
            >
              {st === 'ALL'
                ? t('allTasks', 'All')
                : st === 'PENDING'
                ? t('pendingTasks', 'Pending')
                : t('completedTasks', 'Completed')}
            </button>
          ))}
        </div>

        {/* Right Tools: Search, View Switcher & New Task Button */}
        <div className="flex items-center gap-2 justify-end min-w-0">
          {/* Quick Search */}
          <div className="flex-1 @[480px]:w-44 @[680px]:w-56 min-w-0">
            <CustomInput
              type="search"
              size="sm"
              variant="app"
              placeholder={t('searchTasks', 'Search tasks...')}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              clearable={true}
            />
          </div>

          {/* View Mode Toggle: Kanban Board vs Checklist */}
          <div className="flex items-center gap-1 shrink-0 p-1 rounded-xl theme-bg-app">
            <button
              type="button"
              onClick={() => handleSetViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                viewMode === 'kanban'
                  ? 'theme-bg-surface theme-accent shadow-2xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              title={t('kanbanView', 'Kanban Board View')}
            >
              <GridIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('checklist')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                viewMode === 'checklist'
                  ? 'theme-bg-surface theme-accent shadow-2xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              title={t('checklistView', 'Checklist View')}
            >
              <ListBulletIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. Main View: Kanban Board View (Default) ─── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 @[640px]:grid-cols-3 gap-3 items-start">
          {/* To Do Column */}
          <KanbanColumn
            title={t('toDo', 'To Do')}
            badgeColor="bg-amber-500/15 text-amber-600 dark:text-amber-400"
            tasks={filteredTasks.filter((t) => t.status === 'PENDING')}
            onToggleStatus={toggleTaskStatus}
            onUpdateStatus={handleUpdateStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
            columnType="PENDING"
          />

          {/* In Progress Column */}
          <KanbanColumn
            title={t('inProgress', 'In Progress')}
            badgeColor="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
            tasks={filteredTasks.filter((t) => t.status === 'IN_PROGRESS')}
            onToggleStatus={toggleTaskStatus}
            onUpdateStatus={handleUpdateStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
            columnType="IN_PROGRESS"
          />

          {/* Completed Column */}
          <KanbanColumn
            title={t('completed', 'Completed')}
            badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            tasks={filteredTasks.filter((t) => t.status === 'COMPLETED')}
            onToggleStatus={toggleTaskStatus}
            onUpdateStatus={handleUpdateStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
            columnType="COMPLETED"
          />
        </div>
      )}

      {/* ─── 4. Main View: Checklist / Grouped List ─── */}
      {viewMode === 'checklist' && (
        <div className="space-y-4">
          {/* Pinned Tasks */}
          {groupedTasks.pinned.length > 0 && (
            <TaskSectionGroup
              title={t('pinnedTasks', 'Pinned Tasks')}
              count={groupedTasks.pinned.length}
              tasks={groupedTasks.pinned}
              onToggleStatus={toggleTaskStatus}
              onOpenDetail={onOpenTaskDrawer}
              onDelete={deleteTask}
              getPriorityBadgeClass={getPriorityBadgeClass}
              formatDate={formatDate}
            />
          )}

          {/* Today Tasks */}
          <TaskSectionGroup
            title={t('todayTasks', "Today's Agenda")}
            count={groupedTasks.today.length}
            tasks={groupedTasks.today}
            onToggleStatus={toggleTaskStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
            emptyMessage={t('noTasksToday', 'No tasks scheduled for today.')}
          />

          {/* Upcoming Tasks */}
          {groupedTasks.upcoming.length > 0 && (
            <TaskSectionGroup
              title={t('upcomingTasks', 'Upcoming Tasks')}
              count={groupedTasks.upcoming.length}
              tasks={groupedTasks.upcoming}
              onToggleStatus={toggleTaskStatus}
              onOpenDetail={onOpenTaskDrawer}
              onDelete={deleteTask}
              getPriorityBadgeClass={getPriorityBadgeClass}
              formatDate={formatDate}
            />
          )}

          {/* Completed Tasks */}
          {groupedTasks.completed.length > 0 && statusFilter !== 'PENDING' && (
            <TaskSectionGroup
              title={t('completedTasks', 'Completed Tasks')}
              count={groupedTasks.completed.length}
              tasks={groupedTasks.completed}
              onToggleStatus={toggleTaskStatus}
              onOpenDetail={onOpenTaskDrawer}
              onDelete={deleteTask}
              getPriorityBadgeClass={getPriorityBadgeClass}
              formatDate={formatDate}
              collapsible={true}
            />
          )}

          {filteredTasks.length === 0 && (
            <div className="p-12 text-center rounded-3xl theme-bg-surface shadow-xs border-0 space-y-2">
              <CheckCircleIcon className="w-10 h-10 theme-accent opacity-40 mx-auto" />
              <h4 className="text-sm font-bold theme-text-primary">
                {t('noTasksFound', 'No tasks found')}
              </h4>
              <p className="text-xs theme-text-secondary max-w-sm mx-auto">
                {searchQuery
                  ? t('noTasksMatchingQuery', 'No tasks matched your search query.')
                  : t('allCaughtUp', "You're all caught up! Use the quick add dock below to create a new task.")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── 5. Pinned Bottom-Center Quick Input Dock (FloatingActionDock) ─── */}
      <TaskQuickInputDock onOpenDrawer={onOpenTaskDrawer} />
    </div>
  );
}

// ─── Sub-component: Section Group for Checklist ────────────────────────────
function TaskSectionGroup({
  title,
  count,
  tasks,
  onToggleStatus,
  onOpenDetail,
  onDelete,
  getPriorityBadgeClass,
  formatDate,
  emptyMessage,
  collapsible = false,
}: any) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="p-3.5 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-2.5">
      <div
        className={`flex items-center justify-between pb-1 ${
          collapsible ? 'cursor-pointer select-none' : ''
        }`}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold theme-text-primary tracking-wide">
            {title}
          </h4>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-app theme-text-secondary">
            {count}
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-1.5">
          {tasks.length > 0 ? (
            tasks.map((task: UserPersonalTask) => (
              <TaskRowItem
                key={task.id}
                task={task}
                onToggleStatus={onToggleStatus}
                onOpenDetail={onOpenDetail}
                onDelete={onDelete}
                getPriorityBadgeClass={getPriorityBadgeClass}
                formatDate={formatDate}
              />
            ))
          ) : emptyMessage ? (
            <p className="text-xs theme-text-secondary py-3 text-center italic opacity-75">
              {emptyMessage}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Individual Task Row Item (Checklist) ─────────────────────
function TaskRowItem({
  task,
  onToggleStatus,
  onOpenDetail,
  onDelete,
  getPriorityBadgeClass,
  formatDate,
}: any) {
  const isCompleted = task.status === 'COMPLETED';
  const colorStyle = EVENT_COLOR_MAP[task.color || 'blueberry'] || EVENT_COLOR_MAP.blueberry;

  const completedSubtasksCount = (task.subtasks || []).filter((s: any) => s.completed).length;
  const totalSubtasksCount = (task.subtasks || []).length;

  return (
    <div
      onClick={() => onOpenDetail(task, task.dueDate)}
      className="p-2.5 sm:p-3 rounded-2xl theme-bg-app hover:theme-bg-elevated/70 transition-all cursor-pointer flex items-center justify-between gap-2.5 border-0 shadow-2xs group min-w-0 select-none"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task.id);
          }}
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 shrink-0 ${
            isCompleted
              ? 'theme-bg-accent text-white shadow-xs'
              : 'theme-bg-surface hover:theme-bg-elevated theme-text-secondary'
          }`}
          title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
        >
          {isCompleted && <CheckCircleIcon className="w-3.5 h-3.5" />}
        </button>

        {/* Task Details */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span
              className={`text-xs sm:text-sm font-semibold truncate ${
                isCompleted
                  ? 'line-through opacity-50 theme-text-secondary'
                  : 'theme-text-primary'
              }`}
            >
              {task.title}
            </span>

            {/* Category Pill */}
            {task.category && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${colorStyle.bg} ${colorStyle.text} shrink-0`}>
                {task.category}
              </span>
            )}

            {/* Priority Pill */}
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${getPriorityBadgeClass(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          </div>

          {/* Subtitle meta: Due date, time, and subtasks */}
          <div className="flex items-center gap-3 text-[10px] font-mono theme-text-secondary">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 theme-accent shrink-0" />
                <span>{formatDate(task.dueDate)}</span>
              </span>
            )}
            {task.dueTime && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3 theme-accent shrink-0" />
                <span>{task.dueTime}</span>
              </span>
            )}
            {totalSubtasksCount > 0 && (
              <span className="flex items-center gap-1 font-sans">
                <ChecklistIcon className="w-3 h-3 theme-accent shrink-0" />
                <span>
                  {completedSubtasksCount}/{totalSubtasksCount} steps
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete Shortcut */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:theme-bg-surface opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 shrink-0"
        title="Delete Task"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Sub-component: Kanban Column ──────────────────────────────────────────
function KanbanColumn({
  title,
  badgeColor,
  tasks,
  onToggleStatus,
  onUpdateStatus,
  onOpenDetail,
  onDelete,
  getPriorityBadgeClass,
  formatDate,
  columnType,
}: any) {
  return (
    <div className="p-3.5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-3 min-h-[360px]">
      {/* Column Header without bottom border (Rule 14 borderless compliance) */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
          {title}
        </h4>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {tasks.length}
        </span>
      </div>

      {/* Column Cards */}
      <div className="space-y-2">
        {tasks.map((task: UserPersonalTask) => (
          <KanbanCardItem
            key={task.id}
            task={task}
            onToggleStatus={onToggleStatus}
            onUpdateStatus={onUpdateStatus}
            onOpenDetail={onOpenDetail}
            onDelete={onDelete}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
            columnType={columnType}
          />
        ))}

        {tasks.length === 0 && (
          <div className="py-12 text-center text-xs theme-text-secondary italic opacity-60 rounded-2xl theme-bg-app/40 border-0">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: Kanban Card Item with 1-Click State Transitions ────────
function KanbanCardItem({
  task,
  onToggleStatus,
  onUpdateStatus,
  onOpenDetail,
  onDelete,
  getPriorityBadgeClass,
  formatDate,
  columnType,
}: any) {
  const isCompleted = task.status === 'COMPLETED';
  const colorStyle = EVENT_COLOR_MAP[task.color || 'blueberry'] || EVENT_COLOR_MAP.blueberry;

  const completedSubtasksCount = (task.subtasks || []).filter((s: any) => s.completed).length;
  const totalSubtasksCount = (task.subtasks || []).length;

  return (
    <div
      onClick={() => onOpenDetail(task, task.dueDate)}
      className="p-3 rounded-2xl theme-bg-app hover:theme-bg-elevated/80 transition-all cursor-pointer border-0 shadow-2xs group space-y-2.5 select-none"
    >
      {/* Card Header: Checkbox + Title */}
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task.id);
          }}
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 shrink-0 mt-0.5 ${
            isCompleted
              ? 'theme-bg-accent text-white shadow-xs'
              : 'theme-bg-surface hover:theme-bg-elevated theme-text-secondary'
          }`}
          title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
        >
          {isCompleted && <CheckCircleIcon className="w-3.5 h-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-2 ${
              isCompleted
                ? 'line-through opacity-50 theme-text-secondary'
                : 'theme-text-primary'
            }`}
          >
            {task.title}
          </p>
        </div>

        {/* Delete action */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 rounded-lg text-rose-500/70 hover:text-rose-500 hover:theme-bg-surface opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 shrink-0"
          title="Delete Task"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {task.category && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${colorStyle.bg} ${colorStyle.text} shrink-0`}>
            {task.category}
          </span>
        )}
        <span
          className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${getPriorityBadgeClass(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>

      {/* Footer Info & Quick Status Move Transitions */}
      <div className="flex items-center justify-between pt-1 gap-2 text-[10px] theme-text-secondary">
        <div className="flex items-center gap-2 font-mono">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 theme-accent shrink-0" />
              <span>{formatDate(task.dueDate)}</span>
            </span>
          )}
          {totalSubtasksCount > 0 && (
            <span className="flex items-center gap-1 font-sans">
              <ChecklistIcon className="w-3 h-3 theme-accent shrink-0" />
              <span>
                {completedSubtasksCount}/{totalSubtasksCount}
              </span>
            </span>
          )}
        </div>

        {/* 1-Click Status Movers */}
        <div className="flex items-center gap-1 shrink-0">
          {columnType === 'PENDING' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(task.id, 'IN_PROGRESS');
              }}
              className="px-2 py-0.5 rounded-lg theme-bg-surface hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-[10px] font-bold flex items-center gap-1 border-0 transition-colors"
              title="Move to In Progress"
            >
              <span>Start</span>
              <ArrowRightIcon className="w-2.5 h-2.5" />
            </button>
          )}

          {columnType === 'IN_PROGRESS' && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'PENDING');
                }}
                className="p-1 rounded-lg theme-bg-surface hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border-0 transition-colors"
                title="Move back to To Do"
              >
                <UndoIcon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'COMPLETED');
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 border-0 transition-colors"
                title="Mark Completed"
              >
                <span>Done</span>
                <CheckCircleIcon className="w-2.5 h-2.5" />
              </button>
            </>
          )}

          {columnType === 'COMPLETED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(task.id, 'PENDING');
              }}
              className="px-2 py-0.5 rounded-lg theme-bg-surface hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-[10px] font-bold flex items-center gap-1 border-0 transition-colors"
              title="Reopen Task"
            >
              <UndoIcon className="w-2.5 h-2.5" />
              <span>Reopen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyTasksHubView;
