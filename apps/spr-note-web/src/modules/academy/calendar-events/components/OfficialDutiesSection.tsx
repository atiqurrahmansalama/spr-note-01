import React, { useState, useMemo } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import CustomSelect from '@/components/ui/CustomSelect';
import EmptyState from '@/components/ui/EmptyState';
import {
  DutyIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  PlusIcon,
  AcademicCapIcon,
  TrashIcon,
  BuildingOfficeIcon,
} from '@/components/ui/Icons';
import { formatDisplayDate } from '@/utils/dateUtils';
import type { InstitutionalDuty, DutyCategory } from '../types';

export interface OfficialDutiesSectionProps {
  duties: InstitutionalDuty[];
  loading: boolean;
  metrics: {
    total: number;
    completed: number;
    pending: number;
    highPriority: number;
  };
  onToggleComplete: (id: string) => void;
  onDeleteDuty: (id: string) => void;
  onOpenAssignModal: () => void;
  canAssignDuties?: boolean;
}

const CATEGORY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'ACADEMIC', label: 'Academic & Curriculum' },
  { value: 'EXAMINATION', label: 'Examination & Invigilation' },
  { value: 'ADMINISTRATIVE', label: 'Administrative & Official' },
  { value: 'FACILITIES', label: 'Campus & Facilities' },
  { value: 'GENERAL', label: 'General Duties' },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

export const OfficialDutiesSection: React.FC<OfficialDutiesSectionProps> = ({
  duties,
  loading,
  metrics,
  onToggleComplete,
  onDeleteDuty,
  onOpenAssignModal,
  canAssignDuties = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredDuties = useMemo(() => {
    return duties.filter((d) => {
      // Status filter
      if (statusFilter === 'PENDING' && (d.is_completed || d.status === 'COMPLETED')) return false;
      if (statusFilter === 'COMPLETED' && !d.is_completed && d.status !== 'COMPLETED') return false;

      // Category filter
      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && d.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (d.title || '').toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        const matchAssignee = (d.assigned_to_name || '').toLowerCase().includes(q);
        const matchAssigner = (d.created_by_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchAssigner) return false;
      }

      return true;
    });
  }, [duties, statusFilter, categoryFilter, priorityFilter, searchQuery]);

  const completionPercent = Math.round(
    (metrics.completed / (metrics.total || 1)) * 100
  );

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'EXAMINATION':
        return { label: 'Examination', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
      case 'ACADEMIC':
        return { label: 'Academic', bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' };
      case 'FACILITIES':
        return { label: 'Facilities', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
      case 'ADMINISTRATIVE':
        return { label: 'Admin', bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' };
      default:
        return { label: 'General', bg: 'theme-bg-app theme-text-secondary' };
    }
  };

  const getPriorityBadge = (pri?: string) => {
    switch (pri) {
      case 'HIGH':
        return { label: 'High Priority', bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' };
      case 'LOW':
        return { label: 'Low', bg: 'theme-bg-app theme-text-secondary' };
      case 'MEDIUM':
      default:
        return { label: 'Normal', bg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' };
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. Metrics Cards Bar ─── */}
      <div className="grid grid-cols-2 @[640px]:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Duties */}
        <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider theme-text-secondary block">
              Total Duties
            </span>
            <span className="text-lg sm:text-2xl font-black theme-text-primary mt-0.5 block">
              {metrics.total}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DutyIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Pending Duties */}
        <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider theme-text-secondary block">
              Pending / Due
            </span>
            <span className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
              {metrics.pending}
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
              High Priority
            </span>
            <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
              {metrics.highPriority}
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
              Execution Rate
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {completionPercent}%
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* ─── 2. Filter & Action Toolbar ─── */}
      <div className="p-3 sm:p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col @[720px]:flex-row items-stretch @[720px]:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
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
              {st === 'ALL' ? 'All Duties' : st === 'PENDING' ? 'Pending' : 'Completed'}
            </button>
          ))}
        </div>

        {/* Right Tools: Category, Priority, Search & Assign Button */}
        <div className="flex items-center gap-2 flex-wrap @[720px]:flex-nowrap justify-end min-w-0">
          <div className="w-36 min-w-0">
            <CustomSelect
              size="sm"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_FILTER_OPTIONS}
            />
          </div>

          <div className="w-32 min-w-0">
            <CustomSelect
              size="sm"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={PRIORITY_FILTER_OPTIONS}
            />
          </div>

          <div className="w-40 @[860px]:w-52 min-w-0">
            <CustomInput
              type="search"
              size="sm"
              variant="app"
              placeholder="Search duties..."
              value={searchQuery}
              onChange={setSearchQuery}
              clearable={true}
            />
          </div>

          {canAssignDuties && (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={onOpenAssignModal}
              title="Assign New Duty"
              className="shrink-0"
            >
              <span>Assign Duty</span>
            </CustomButton>
          )}
        </div>
      </div>

      {/* ─── 3. Duties Stream ─── */}
      {loading ? (
        <div className="p-12 text-center theme-text-secondary text-xs rounded-3xl theme-bg-surface shadow-xs animate-pulse">
          Loading assigned official duties...
        </div>
      ) : filteredDuties.length === 0 ? (
        <div className="p-8 rounded-3xl theme-bg-surface shadow-xs border-0">
          <EmptyState
            icon={DutyIcon}
            title="No Official Duties Found"
            description="No assigned institutional duties match your selected filter criteria."
            action={
              canAssignDuties
                ? { label: 'Assign First Duty', onClick: onOpenAssignModal }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDuties.map((duty) => {
            const isCompleted = duty.is_completed || duty.status === 'COMPLETED';
            const catBadge = getCategoryBadge(duty.category as string);
            const priBadge = getPriorityBadge(duty.priority);

            return (
              <div
                key={duty.id}
                className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 hover:theme-bg-elevated/40 transition-colors duration-150 flex items-start gap-3.5 sm:gap-4 group"
              >
                {/* Status Toggle Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggleComplete(duty.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150 cursor-pointer border-0 ${
                    isCompleted
                      ? 'theme-bg-accent text-white shadow-xs'
                      : 'theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary'
                  }`}
                  title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <h4
                      className={`text-sm sm:text-base font-bold theme-text-primary tracking-tight leading-snug ${
                        isCompleted ? 'line-through opacity-60' : ''
                      }`}
                    >
                      {duty.title}
                    </h4>

                    {/* Due Date & Time */}
                    {duty.due_date && (
                      <div className="flex items-center gap-1.5 text-xs font-mono theme-text-secondary shrink-0">
                        <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
                        <span>{formatDisplayDate(duty.due_date)}</span>
                        {duty.due_time && (
                          <>
                            <span className="opacity-40">•</span>
                            <ClockIcon className="w-3.5 h-3.5 opacity-60" />
                            <span>{duty.due_time}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Taxonomy & Delegation Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold ${catBadge.bg}`}>
                      {catBadge.label}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full ${priBadge.bg}`}>
                      {priBadge.label}
                    </span>

                    {duty.assigned_to_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full theme-bg-app theme-text-primary font-medium">
                        <span className="opacity-60">Assigned:</span>
                        <strong>{duty.assigned_to_name}</strong>
                      </span>
                    )}

                    {duty.created_by_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full theme-bg-app theme-text-secondary text-[10px]">
                        <span>By: {duty.created_by_name}</span>
                      </span>
                    )}

                    {isCompleted && duty.completed_at && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        Completed: {formatDisplayDate(duty.completed_at)}
                      </span>
                    )}
                  </div>

                  {/* Instructions Narrative */}
                  {duty.description && (
                    <p className="text-xs theme-text-secondary leading-relaxed pt-0.5">
                      {duty.description}
                    </p>
                  )}
                </div>

                {/* Right Action: Delete (Admins only) */}
                {canAssignDuties && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete official duty "${duty.title}"?`)) {
                        onDeleteDuty(duty.id);
                      }
                    }}
                    className="p-1.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 theme-text-secondary transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-0 shrink-0"
                    title="Delete Duty"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OfficialDutiesSection;
