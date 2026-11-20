import React from 'react';
import {
  TeacherIcon,
  ClassIcon,
  DutyIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import MetricsGrid from '@/components/ui/MetricsGrid';
import { useStaffTranslation } from '../../locales';
import type { StaffMetrics } from '../../types';

interface StaffRosterHeaderProps {
  metrics: StaffMetrics;
  matchingCount: number;
}

export const StaffRosterHeader: React.FC<StaffRosterHeaderProps> = ({
  metrics,
  matchingCount,
}) => {
  const { t } = useStaffTranslation();

  return (
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
          subLabel:
            metrics.on_leave_today > 0
              ? t('substitutesRequired', 'Substitutes required')
              : t('fullAttendance', 'Full attendance'),
          color: metrics.on_leave_today > 0 ? 'amber' : 'default',
        },
      ]}
    />
  );
};

export default StaffRosterHeader;

