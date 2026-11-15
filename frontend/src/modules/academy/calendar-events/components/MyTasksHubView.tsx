/**
 * My Tasks & Personal To-Do Hub View
 * ====================================
 * Dedicated productivity view for personal to-dos, checklists, and daily milestones.
 * Fully responsive (@container), borderless soft surfaces, bilingual/i18n compliant.
 */

import React, { useState, useMemo } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import {
  CheckCircleIcon,
  ChecklistIcon,
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  SearchIcon,
  TrashIcon,
  FilterIcon,
  GridIcon,
  ListBulletIcon,
} from '../../../../components/ui/Icons';
import { useCalendarTranslation } from '../locales';
import { useUserTasks } from '../tasks/useUserTasks';
import { EVENT_COLOR_MAP } from '../constants/eventColors';
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
  const [viewMode, setViewMode] = useState<'checklist' | 'kanban'>('checklist');

  // Quick Add Bar state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('MEDIUM');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    saveTask({
      title: quickTitle.trim(),
      dueDate: todayStr,
      priority: quickPriority,
      status: 'PENDING',
      category: 'General',
      color: quickPriority === 'URGENT' ? 'radicchio' : quickPriority === 'HIGH' ? 'blueberry' : 'eucalyptus',
    });

    setQuickTitle('');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Status filter
      if (statusFilter === 'PENDING' && t.status === 'COMPLETED') return false;
      if (statusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
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
    <div className="space-y-4 @container select-none">
      
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

      {/* ─── 2. One-Click Quick Add Bar ─── */}
      <form
        onSubmit={handleQuickAdd}
        className="p-2 sm:p-2.5 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center gap-2"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--accent-main)]/10 theme-accent flex items-center justify-center shrink-0 ml-1">
          <PlusIcon className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder={t('quickAddPlaceholder', 'Add a task for today... (Press Enter to save)')}
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="flex-1 bg-transparent border-0 ring-0 outline-none text-xs sm:text-sm font-medium theme-text-primary placeholder:theme-text-secondary"
        />
        <select
          value={quickPriority}
          onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
          className="hidden @[440px]:block text-[11px] font-bold px-2 py-1 rounded-xl theme-bg-app border-0 theme-text-secondary cursor-pointer outline-none shrink-0"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <CustomButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={!quickTitle.trim()}
          className="shrink-0"
        >
          <span>{t('add', 'Add')}</span>
        </CustomButton>
      </form>

      {/* ─── 3. Filter & View Controls Bar ─── */}
      <div className="p-3 sm:p-3.5 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col @[600px]:flex-row items-stretch @[600px]:items-center justify-between gap-2.5">
        
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

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 shrink-0 p-1 rounded-xl theme-bg-app">
            <button
              type="button"
              onClick={() => setViewMode('checklist')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                viewMode === 'checklist'
                  ? 'theme-bg-surface theme-accent shadow-2xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              title={t('checklistView', 'Checklist View')}
            >
              <ListBulletIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                viewMode === 'kanban'
                  ? 'theme-bg-surface theme-accent shadow-2xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              title={t('kanbanView', 'Kanban Board View')}
            >
              <GridIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Task Button */}
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={() => onOpenTaskDrawer(null, todayStr)}
            className="shrink-0"
          >
            <span className="hidden @[480px]:inline">{t('newTask', 'New Task')}</span>
          </CustomButton>
        </div>
      </div>

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
                  : t('allCaughtUp', "You're all caught up! Use the quick add bar above to create a new task.")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── 5. Kanban Board View ─── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 @[640px]:grid-cols-3 gap-3 items-start">
          {/* To Do Column */}
          <KanbanColumn
            title={t('toDo', 'To Do')}
            badgeColor="bg-amber-500/15 text-amber-600 dark:text-amber-400"
            tasks={filteredTasks.filter((t) => t.status === 'PENDING')}
            onToggleStatus={toggleTaskStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
          />

          {/* In Progress Column */}
          <KanbanColumn
            title={t('inProgress', 'In Progress')}
            badgeColor="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
            tasks={filteredTasks.filter((t) => t.status === 'IN_PROGRESS')}
            onToggleStatus={toggleTaskStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
          />

          {/* Completed Column */}
          <KanbanColumn
            title={t('completed', 'Completed')}
            badgeColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            tasks={filteredTasks.filter((t) => t.status === 'COMPLETED')}
            onToggleStatus={toggleTaskStatus}
            onOpenDetail={onOpenTaskDrawer}
            onDelete={deleteTask}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
          />
        </div>
      )}
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

// ─── Sub-component: Individual Task Row Item ────────────────────────────────
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
  onOpenDetail,
  onDelete,
  getPriorityBadgeClass,
  formatDate,
}: any) {
  return (
    <div className="p-3.5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-3 min-h-[300px]">
      <div className="flex items-center justify-between pb-1 border-b theme-border">
        <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
          {title}
        </h4>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task: UserPersonalTask) => (
          <TaskRowItem
            key={task.id}
            task={task}
            onToggleStatus={onToggleStatus}
            onOpenDetail={onOpenDetail}
            onDelete={onDelete}
            getPriorityBadgeClass={getPriorityBadgeClass}
            formatDate={formatDate}
          />
        ))}

        {tasks.length === 0 && (
          <div className="py-8 text-center text-xs theme-text-secondary italic opacity-60">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTasksHubView;
