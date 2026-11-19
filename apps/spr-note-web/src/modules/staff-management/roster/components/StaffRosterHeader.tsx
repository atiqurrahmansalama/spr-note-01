import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TeacherIcon,
  PlusIcon,
  RefreshIcon,
  ClassIcon,
  DutyIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import PageHeader from '@/components/ui/PageHeader';
import MetricsGrid from '@/components/ui/MetricsGrid';
import { useStaffTranslation } from '../../locales';
import type { StaffMetrics } from '../../types';

interface StaffRosterHeaderProps {
  metrics: StaffMetrics;
  matchingCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const StaffRosterHeader: React.FC<StaffRosterHeaderProps> = ({
  metrics,
  matchingCount,
  isRefreshing,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { t } = useStaffTranslation();

  return (
    <div className="space-y-4">
      <PageHeader
        icon={TeacherIcon}
        title={t('title', 'Teacher & Staff Roster')}
        subtitle={t('subtitle', 'Manage faculty members, institutional hierarchy ranks, department assignments, and duties')}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all cursor-pointer border-0 shadow-xs active:scale-98"
              title={t('refreshRoster', 'Refresh Roster')}
            >
              <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/staff/onboarding')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98 border-0"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{t('onboardStaff', 'Onboard Staff')}</span>
            </button>
          </div>
        }
      />

      <MetricsGrid
        cols={4}
        items={[
          {
            label: t('totalStaff', 'Total Faculty & Staff'),
            value: metrics.total_staff,
            icon: TeacherIcon,
            subLabel: `${matchingCount} ${t('matchingView', 'matching view')}`,
            color: 'default',
          },
          {
            label: t('teachingStaff', 'Teaching Faculty'),
            value: metrics.teaching_staff,
            icon: ClassIcon,
            subLabel: t('activeTeachers', 'Active teachers & ustadhs'),
            color: 'accent',
          },
          {
            label: t('activePersonnel', 'Active Personnel'),
            value: metrics.active_staff,
            icon: SparklesIcon,
            subLabel: t('availableOnRoster', 'Available on active roster'),
            color: 'emerald',
          },
          {
            label: t('onLeaveToday', 'On Leave Today'),
            value: metrics.on_leave_today,
            icon: DutyIcon,
            subLabel: metrics.on_leave_today > 0 ? t('substitutesRequired', 'Substitutes required') : t('fullAttendance', 'Full attendance'),
            color: metrics.on_leave_today > 0 ? 'amber' : 'default',
          },
        ]}
      />
    </div>
  );
};

