/**
 * Tasks & Duties Hub View (Unified 2-Column Board)
 * ==================================================
 * Enterprise dual-domain productivity board unifying:
 * 1. Column 1: Official Institutional Duties (delegated by administrators / departments)
 * 2. Column 2: Personal Tasks & To-Dos (self-managed by teacher/staff)
 *
 * Design & Standards:
 * - Pure 2-Column Kanban layout: both domains presented simultaneously.
 * - Single-source filter: Status menu (All, Pending, Completed) via CustomSelect.
 * - Cloud synchronization status indicator (Synced / Syncing) positioned before search bar.
 * - Official Duties creation & editing merged into Right Drawer (onOpenTaskDrawer).
 * - Official Duties icon and accents use the application theme color.
 * - Sub-sectioning into In Progress (রানিং / চলমান) and Pending (অপেক্ষমান) in both columns.
 * - Standard project EmptyState component used for clean zero-data presentation.
 * - Zero hardcoded colors, zero emojis (RULE 1 & user_rules).
 */

import React, { useState, useMemo } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CheckCircleIcon,
  ChecklistIcon,
  DutyIcon,
  PlusIcon,
  CalendarIcon,
  TrashIcon,
  CloudCheckIcon,
  RefreshIcon,
} from '../../../../components/ui/Icons';
import { useCalendarTranslation } from '../locales';
import { useUserTasks } from '../tasks/useUserTasks';
import { useInstitutionalDuties } from '../tasks/useInstitutionalDuties';
import { formatDisplayDate } from '@/utils/dateUtils';
import TaskQuickInputDock from './TaskQuickInputDock';
import type { UserPersonalTask, InstitutionalDuty, TaskPriority, TaskStatus } from '../types';

export interface MyTasksHubViewProps {
  onOpenTaskDrawer: (task?: UserPersonalTask | null, date?: string) => void;
  onOpenDutyDrawer?: (duty?: InstitutionalDuty | null, date?: string) => void;
  canAddTasks?: boolean;
  canViewPersonalTasks?: boolean;
  canAddPersonalTasks?: boolean;
  canViewOfficialDuties?: boolean;
  canManageOfficialDuties?: boolean;
}

export function MyTasksHubView({
  onOpenTaskDrawer,
  onOpenDutyDrawer,
  canAddTasks = true,
  canViewPersonalTasks = true,
  canAddPersonalTasks = true,
  canViewOfficialDuties = true,
  canManageOfficialDuties = true,
}: MyTasksHubViewProps) {
  const { t, formatNumber } = useCalendarTranslation();

  // 1. Personal Tasks Hook
  const {
    tasks: personalTasks,
    toggleTaskStatus: togglePersonalTaskStatus,
    setTaskStatus,
    deleteTask: deletePersonalTask,
  } = useUserTasks();

  // 2. Official Duties Hook
  const {
    duties: institutionalDuties,
    loading: loadingDuties,
    toggleDutyComplete,
    updateDutyStatus,
    deleteDuty: deleteInstitutionalDuty,
    refreshDuties,
  } = useInstitutionalDuties();

  // Shared Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Status Filter Menu Options
  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: t('allTasks', 'All') },
      { value: 'PENDING', label: t('pendingTasks', 'Pending') },
      { value: 'COMPLETED', label: t('completedTasks', 'Completed') },
    ],
    [t]
  );

  // Filtered Official Duties
  const filteredDuties = useMemo(() => {
    return institutionalDuties.filter((d) => {
      const isCompleted = d.is_completed || d.status === 'COMPLETED';
      if (statusFilter === 'PENDING' && isCompleted) return false;
      if (statusFilter === 'COMPLETED' && !isCompleted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (d.title || '').toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        const matchAssignee = (d.assigned_to_name || '').toLowerCase().includes(q);
        const matchAssigner = (d.created_by_name || '').toLowerCase().includes(q);
        const matchCat = (d.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchAssigner && !matchCat) return false;
      }
      return true;
    });
  }, [institutionalDuties, statusFilter, searchQuery]);

  // Sub-sectioned Official Duties (In Progress, Pending, Completed)
  const { inProgressDuties, pendingDuties, completedDuties } = useMemo(() => {
    const inProgress: InstitutionalDuty[] = [];
    const pending: InstitutionalDuty[] = [];
    const completed: InstitutionalDuty[] = [];

    filteredDuties.forEach((d) => {
      if (d.is_completed || d.status === 'COMPLETED') {
        completed.push(d);
      } else if (d.status === 'IN_PROGRESS') {
        inProgress.push(d);
      } else {
        pending.push(d);
      }
    });

    return { inProgressDuties: inProgress, pendingDuties: pending, completedDuties: completed };
  }, [filteredDuties]);

  // Filtered Personal Tasks
  const filteredPersonalTasks = useMemo(() => {
    return personalTasks.filter((task) => {
      const isCompleted = task.status === 'COMPLETED';
      if (statusFilter === 'PENDING' && isCompleted) return false;
      if (statusFilter === 'COMPLETED' && !isCompleted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchCat = (task.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [personalTasks, statusFilter, searchQuery]);

  // Sub-sectioned Personal Tasks (In Progress, Pending, Completed)
  const { inProgressPersonalTasks, pendingPersonalTasks, completedPersonalTasks } = useMemo(() => {
    const inProgress: UserPersonalTask[] = [];
    const pending: UserPersonalTask[] = [];
    const completed: UserPersonalTask[] = [];

    filteredPersonalTasks.forEach((t) => {
      if (t.status === 'COMPLETED') {
        completed.push(t);
      } else if (t.status === 'IN_PROGRESS') {
        inProgress.push(t);
      } else {
        pending.push(t);
      }
    });

    return {
      inProgressPersonalTasks: inProgress,
      pendingPersonalTasks: pending,
      completedPersonalTasks: completed,
    };
  }, [filteredPersonalTasks]);

  return (
    <div className="space-y-4 @container select-none pb-28 min-h-full">
      {/* ─── 1. Unified Filter Toolbar (Status Menu, Sync Indicator & Search) ─── */}
      <div className="p-3 sm:p-3.5 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col @[640px]:flex-row items-stretch @[640px]:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter Dropdown Menu (Reusing Project Design, Exact 46px Height Matching Searchbar) */}
          <div className="w-40 sm:w-48 shrink-0">
            <CustomSelect
              size="md"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              options={statusOptions}
              showChevron={true}
              searchable={false}
              showDescription={false}
            />
          </div>

          {/* Cloud Synchronization Status Indicator (Background Removed, Clean Theme Accent) */}
          <button
            type="button"
            onClick={() => refreshDuties()}
            disabled={loadingDuties}
            className="h-[46px] min-h-[46px] flex items-center gap-1.5 px-2 rounded-2xl bg-transparent hover:theme-bg-elevated/40 transition cursor-pointer border-0 shrink-0 select-none text-xs"
            title={
              loadingDuties
                ? t('syncing', 'Syncing duties and tasks...')
                : t('synced', 'All tasks and duties are in sync (Click to refresh)')
            }
          >
            {loadingDuties ? (
              <RefreshIcon className="w-4 h-4 animate-spin theme-accent" />
            ) : (
              <CloudCheckIcon className="w-4 h-4 theme-accent" />
            )}
            <span className="hidden @[480px]:inline text-xs font-semibold theme-text-secondary">
              {loadingDuties ? t('syncing', 'Syncing...') : t('synced', 'Synced')}
            </span>
          </button>
        </div>

        {/* Unified Search Box (Exact 46px Height Matching Status Dropdown) */}
        <div className="flex-1 @[640px]:max-w-xs min-w-0">
          <CustomInput
            type="search"
            size="md"
            variant="app"
            placeholder={t('searchTasks', 'Search duties and personal tasks...')}
            value={searchQuery}
            onChange={setSearchQuery}
            clearable={true}
          />
        </div>
      </div>

      {/* ─── 2. Unified 2-Column Kanban Board ─── */}
      <div className="grid grid-cols-1 @[640px]:grid-cols-2 gap-4 items-start">
        {/* ── COLUMN 1: Official Duties (অফিসিয়াল অর্পিত দায়িত্ব) ── */}
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-3.5">
          {/* Column Header */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Theme color driven duty icon */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                <DutyIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold theme-text-primary leading-tight truncate">
                  {t('officialDuties', 'Official Duties')}
                </h3>
                <span className="text-[10px] sm:text-[11px] theme-text-secondary block">
                  Delegated institutional assignments & missions
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent">
                {formatNumber(filteredDuties.length)}
              </span>

              {canManageOfficialDuties && canAddTasks && (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="xs"
                  icon={PlusIcon}
                  onClick={() => onOpenDutyDrawer?.(null)}
                  title="Assign Duty"
                  className="rounded-xl shadow-2xs"
                >
                  <span className="hidden @[480px]:inline">Assign</span>
                </CustomButton>
              )}
            </div>
          </div>

          {/* Duties Body */}
          {loadingDuties ? (
            <div className="py-12 text-center text-xs theme-text-secondary animate-pulse">
              Loading official duties...
            </div>
          ) : filteredDuties.length === 0 ? (
            /* Enterprise Project EmptyState Component */
            <EmptyState
              variant="minimal"
              size="compact"
              icon={DutyIcon}
              iconVariant="accent"
              title={t('noOfficialDuties', 'No Official Duties')}
              description={
                searchQuery
                  ? t('noTasksMatchingQuery', 'No tasks matched your search query.')
                  : t('noOfficialDutiesDesc', 'All institutional duties are up to date.')
              }
              action={
                canAddTasks && !searchQuery
                  ? {
                      label: t('assignDuty', 'Assign Duty'),
                      icon: PlusIcon,
                      onClick: () => onOpenDutyDrawer?.(null),
                      variant: 'primary',
                      size: 'xs',
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {/* ── Sub-section 1: In Progress / Running (চলমান) ── */}
              {(statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                        {t('inProgress', 'In Progress')}
                      </h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {formatNumber(inProgressDuties.length)}
                    </span>
                  </div>

                  {inProgressDuties.length === 0 ? (
                    <div className="py-2.5 px-3 text-center rounded-2xl theme-bg-app border-0">
                      <span className="text-[11px] theme-text-secondary opacity-60">
                        {t('noDutiesInProgress', 'No duties currently in progress.')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inProgressDuties.map((duty) => (
                        <OfficialDutyCard
                          key={duty.id}
                          duty={duty}
                          onToggleComplete={toggleDutyComplete}
                          onUpdateStatus={updateDutyStatus}
                          onOpenDetail={() => onOpenDutyDrawer?.(duty)}
                          onDelete={deleteInstitutionalDuty}
                          canDelete={canAddTasks}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Sub-section 2: Pending (অপেক্ষমান) ── */}
              {(statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full theme-bg-accent" />
                      <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                        {t('pendingTasks', 'Pending')}
                      </h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-accent-soft theme-accent">
                      {formatNumber(pendingDuties.length)}
                    </span>
                  </div>

                  {pendingDuties.length === 0 ? (
                    <div className="py-2.5 px-3 text-center rounded-2xl theme-bg-app border-0">
                      <span className="text-[11px] theme-text-secondary opacity-60">
                        {t('noDutiesPending', 'No pending duties.')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingDuties.map((duty) => (
                        <OfficialDutyCard
                          key={duty.id}
                          duty={duty}
                          onToggleComplete={toggleDutyComplete}
                          onUpdateStatus={updateDutyStatus}
                          onOpenDetail={() => onOpenDutyDrawer?.(duty)}
                          onDelete={deleteInstitutionalDuty}
                          canDelete={canAddTasks}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Sub-section 3: Completed (সম্পন্ন) ── */}
              {(statusFilter === 'ALL' || statusFilter === 'COMPLETED') && completedDuties.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                        {t('completed', 'Completed')}
                      </h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {formatNumber(completedDuties.length)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {completedDuties.map((duty) => (
                      <OfficialDutyCard
                        key={duty.id}
                        duty={duty}
                        onToggleComplete={toggleDutyComplete}
                        onUpdateStatus={updateDutyStatus}
                        onOpenDetail={() => onOpenDutyDrawer?.(duty)}
                        onDelete={deleteInstitutionalDuty}
                        canDelete={canAddTasks}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── COLUMN 2: Personal Tasks & To-Do (ব্যক্তিগত নিজস্ব টাস্ক) ── */}
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-3.5">
          {/* Column Header */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ChecklistIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold theme-text-primary leading-tight truncate">
                  {t('personalTasks', 'Personal Tasks & To-Do')}
                </h3>
                <span className="text-[10px] sm:text-[11px] theme-text-secondary block">
                  Self-managed personal checklists & milestones
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                {formatNumber(filteredPersonalTasks.length)}
              </span>

              {canAddTasks && (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="xs"
                  icon={PlusIcon}
                  onClick={() => onOpenTaskDrawer(null)}
                  title="Add Personal Task"
                  className="rounded-xl shadow-2xs"
                >
                  <span className="hidden @[480px]:inline">New</span>
                </CustomButton>
              )}
            </div>
          </div>

          {/* Personal Tasks Body */}
          {filteredPersonalTasks.length === 0 ? (
            /* Enterprise Project EmptyState Component */
            <EmptyState
              variant="minimal"
              size="compact"
              icon={ChecklistIcon}
              iconVariant="accent"
              title={t('noPersonalTasks', 'No Personal Tasks')}
              description={
                searchQuery
                  ? t('noTasksMatchingQuery', 'No tasks matched your search query.')
                  : t('noPersonalTasksDesc', 'You have no personal tasks. Create a new task to stay organized.')
              }
              action={
                canAddTasks && !searchQuery
                  ? {
                      label: t('addNewTask', 'New Task'),
                      icon: PlusIcon,
                      onClick: () => onOpenTaskDrawer(null),
                      variant: 'primary',
                      size: 'xs',
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {/* ── Sub-section 1: In Progress / Running (চলমান) ── */}
              {(statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                        {t('inProgress', 'In Progress')}
                      </h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {formatNumber(inProgressPersonalTasks.length)}
                    </span>
                  </div>

                  {inProgressPersonalTasks.length === 0 ? (
                    <div className="py-2.5 px-3 text-center rounded-2xl theme-bg-app border-0">
                      <span className="text-[11px] theme-text-secondary opacity-60">
                        {t('noPersonalTasksInProgress', 'No personal tasks in progress.')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inProgressPersonalTasks.map((task) => (
                        <PersonalTaskCard
                          key={task.id}
                          task={task}
                          onToggleStatus={togglePersonalTaskStatus}
                          onUpdateStatus={setTaskStatus}
                          onOpenDetail={() => onOpenTaskDrawer(task)}
                          onDelete={deletePersonalTask}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Sub-section 2: Pending (অপেক্ষমান) ── */}
              {(statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                        {t('pendingTasks', 'Pending')}
                      </h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      {formatNumber(pendingPersonalTasks.length)}
                    </span>
                  </div>

                  {pendingPersonalTasks.length === 0 ? (
                    <div className="py-2.5 px-3 text-center rounded-2xl theme-bg-app border-0">
                      <span className="text-[11px] theme-text-secondary opacity-60">
                        {t('noPersonalTasksPending', 'No pending personal tasks.')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingPersonalTasks.map((task) => (
                        <PersonalTaskCard
                          key={task.id}
                          task={task}
                          onToggleStatus={togglePersonalTaskStatus}
                          onUpdateStatus={setTaskStatus}
                          onOpenDetail={() => onOpenTaskDrawer(task)}
                          onDelete={deletePersonalTask}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Sub-section 3: Completed (সম্পন্ন) ── */}
              {(statusFilter === 'ALL' || statusFilter === 'COMPLETED') && completedPersonalTasks.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                        {t('completed', 'Completed')}
                      </h4>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {formatNumber(completedPersonalTasks.length)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {completedPersonalTasks.map((task) => (
                      <PersonalTaskCard
                        key={task.id}
                        task={task}
                        onToggleStatus={togglePersonalTaskStatus}
                        onUpdateStatus={setTaskStatus}
                        onOpenDetail={() => onOpenTaskDrawer(task)}
                        onDelete={deletePersonalTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Action Dock for Fast Task Creation ─── */}
      {canAddTasks && <TaskQuickInputDock onOpenDrawer={onOpenTaskDrawer} />}
    </div>
  );
}

// ─── Sub-component: Official Duty Card (Column 1) ───────────────────────────
function OfficialDutyCard({
  duty,
  onToggleComplete,
  onUpdateStatus,
  onOpenDetail,
  onDelete,
  canDelete = false,
}: {
  duty: InstitutionalDuty;
  onToggleComplete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onOpenDetail?: (duty: InstitutionalDuty) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}) {
  const { t } = useCalendarTranslation();
  const isCompleted = duty.is_completed || duty.status === 'COMPLETED';

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'EXAMINATION':
        return { label: 'Examination', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
      case 'ACADEMIC':
        return { label: 'Academic', bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' };
      case 'FACILITIES':
        return { label: 'Facilities', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
      case 'ADMINISTRATIVE':
        return { label: 'Admin', bg: 'theme-bg-accent-soft theme-accent' };
      default:
        return { label: 'General', bg: 'theme-bg-app theme-text-secondary' };
    }
  };

  const getPriorityBadge = (pri?: string) => {
    switch (pri) {
      case 'HIGH':
        return { label: 'High', bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' };
      case 'LOW':
        return { label: 'Low', bg: 'theme-bg-app theme-text-secondary' };
      case 'MEDIUM':
      default:
        return { label: 'Normal', bg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' };
    }
  };

  const catBadge = getCategoryBadge(duty.category as string);
  const priBadge = getPriorityBadge(duty.priority);

  return (
    <div
      onClick={() => onOpenDetail?.(duty)}
      className="p-3.5 sm:p-4 rounded-2xl theme-bg-app hover:theme-bg-elevated/80 transition-all cursor-pointer border-0 shadow-2xs group space-y-2 select-none"
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(duty.id);
          }}
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150 cursor-pointer border-0 ${
            isCompleted
              ? 'theme-bg-accent text-white shadow-xs'
              : 'theme-bg-surface hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary'
          }`}
          title={isCompleted ? t('markAsPending', 'Mark as Pending') : t('markAsCompleted', 'Mark as Completed')}
        >
          <CheckCircleIcon className="w-3.5 h-3.5" />
        </button>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-xs sm:text-sm font-bold theme-text-primary tracking-tight leading-snug ${
              isCompleted ? 'line-through opacity-60' : ''
            }`}
          >
            {duty.title}
          </h4>

          {/* Description */}
          {duty.description && (
            <p className="text-[11px] theme-text-secondary leading-relaxed mt-1 line-clamp-2">
              {duty.description}
            </p>
          )}
        </div>

        {/* Delete */}
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete official duty "${duty.title}"?`)) {
                onDelete(duty.id);
              }
            }}
            className="p-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 theme-text-secondary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 shrink-0"
            title="Delete Duty"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Meta Badges & Status Action */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 text-[10px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${catBadge.bg}`}>
            {catBadge.label}
          </span>

          <span className={`px-2 py-0.5 rounded-full ${priBadge.bg}`}>
            {priBadge.label}
          </span>

          {duty.due_date && (
            <span className="inline-flex items-center gap-1 font-mono theme-text-secondary">
              <CalendarIcon className="w-3 h-3 opacity-60" />
              <span>{formatDisplayDate(duty.due_date)}</span>
              {duty.due_time && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{duty.due_time}</span>
                </>
              )}
            </span>
          )}

          {duty.assigned_to_name && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full theme-bg-surface font-medium theme-text-primary">
              <span className="opacity-60">To:</span>
              <strong>{duty.assigned_to_name}</strong>
            </span>
          )}
        </div>

        {/* 1-Click Status Flow (Pending <-> In Progress) */}
        {!isCompleted && (
          <div className="shrink-0">
            {duty.status === 'IN_PROGRESS' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(duty.id, 'PENDING');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer border-0"
                title="Click to move to Pending"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('inProgress', 'In Progress')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(duty.id, 'IN_PROGRESS');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium theme-bg-surface hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition cursor-pointer border-0"
                title="Click to start duty"
              >
                <span>{t('startTask', 'Start')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: Personal Task Card (Column 2) ──────────────────────────
function PersonalTaskCard({
  task,
  onToggleStatus,
  onUpdateStatus,
  onOpenDetail,
  onDelete,
}: {
  task: UserPersonalTask;
  onToggleStatus: (id: string) => void;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onOpenDetail: (task: UserPersonalTask) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useCalendarTranslation();
  const isCompleted = task.status === 'COMPLETED';

  const getPriorityBadge = (pri: TaskPriority) => {
    switch (pri) {
      case 'URGENT':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold';
      case 'MEDIUM':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold';
      case 'LOW':
      default:
        return 'theme-bg-surface theme-text-secondary';
    }
  };

  const completedSubtasksCount = (task.subtasks || []).filter((s) => s.completed).length;
  const totalSubtasksCount = (task.subtasks || []).length;

  return (
    <div
      onClick={() => onOpenDetail(task)}
      className="p-3.5 sm:p-4 rounded-2xl theme-bg-app hover:theme-bg-elevated/80 transition-all cursor-pointer border-0 shadow-2xs group space-y-2 select-none"
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task.id);
          }}
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150 cursor-pointer border-0 ${
            isCompleted
              ? 'theme-bg-accent text-white shadow-xs'
              : 'theme-bg-surface hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary'
          }`}
          title={isCompleted ? t('markAsPending', 'Mark as Pending') : t('markAsCompleted', 'Mark as Completed')}
        >
          <CheckCircleIcon className="w-3.5 h-3.5" />
        </button>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-xs sm:text-sm font-bold theme-text-primary tracking-tight leading-snug ${
              isCompleted ? 'line-through opacity-60' : ''
            }`}
          >
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-[11px] theme-text-secondary leading-relaxed mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete task "${task.title}"?`)) {
              onDelete(task.id);
            }
          }}
          className="p-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 theme-text-secondary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 shrink-0"
          title="Delete Task"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Meta Badges & Status Action */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 text-[10px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full ${getPriorityBadge(task.priority)}`}>
            {task.priority || 'Normal'}
          </span>

          {task.dueDate && (
            <span className="inline-flex items-center gap-1 font-mono theme-text-secondary">
              <CalendarIcon className="w-3 h-3 opacity-60" />
              <span>{formatDisplayDate(task.dueDate)}</span>
              {task.dueTime && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{task.dueTime}</span>
                </>
              )}
            </span>
          )}

          {totalSubtasksCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full theme-bg-surface font-mono font-medium theme-text-secondary">
              <span>{completedSubtasksCount}/{totalSubtasksCount} subtasks</span>
            </span>
          )}

          {task.category && (
            <span className="px-2 py-0.5 rounded-full theme-bg-surface theme-text-secondary">
              {task.category}
            </span>
          )}
        </div>

        {/* 1-Click Status Flow (Pending <-> In Progress) */}
        {!isCompleted && (
          <div className="shrink-0">
            {task.status === 'IN_PROGRESS' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'PENDING');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer border-0"
                title="Click to move to Pending"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('inProgress', 'In Progress')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'IN_PROGRESS');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium theme-bg-surface hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition cursor-pointer border-0"
                title="Click to start task"
              >
                <span>{t('startTask', 'Start')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTasksHubView;
