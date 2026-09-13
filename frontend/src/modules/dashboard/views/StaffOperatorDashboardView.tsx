import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import KpiMetricsWidget from '../components/widgets/KpiMetricsWidget';
import QuickActionsWidget from '../components/widgets/QuickActionsWidget';
import UpcomingEventsWidget from '../components/widgets/UpcomingEventsWidget';
import { useDashboardData } from '../hooks/useDashboardData';
import type { DashboardMetric, DashboardQuickAction, CalendarEventItem } from '../types';
import { 
  HomeIcon, 
  DutyIcon, 
  GateIcon, 
  LeaveIcon, 
  BuildingOfficeIcon,
  GroupsIcon,
} from '../../../components/ui/Icons';

export default function StaffOperatorDashboardView() {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { 
    totalBeds, 
    allocatedBeds, 
    dormitoryOccupancyRate, 
    totalStaff 
  } = useDashboardData();

  const vacantBeds = Math.max(0, totalBeds - allocatedBeds);

  const metrics: DashboardMetric[] = [
    {
      id: 'bed_occupancy',
      label: t('bedOccupancy', 'Dormitory Occupancy'),
      value: `${formatNumber(dormitoryOccupancyRate)}%`,
      subLabel: `${formatNumber(allocatedBeds)} of ${formatNumber(totalBeds)} beds allocated`,
      trend: { value: `${formatNumber(vacantBeds)} beds vacant`, isPositive: true },
      icon: HomeIcon,
      color: 'accent',
      onClick: () => navigate('/academy/residential-quarters'),
    },
    {
      id: 'gate_passes',
      label: t('gatePasses', 'Gate Passes Today'),
      value: 16,
      subLabel: '14 returned, 2 active',
      trend: { value: 'Normal flow', isPositive: true },
      icon: GateIcon,
      color: 'emerald',
      onClick: () => navigate('/shortcuts'),
    },
    {
      id: 'staff_on_duty',
      label: 'Staff On Duty Today',
      value: totalStaff > 0 ? Math.round(totalStaff * 0.75) : 18,
      subLabel: 'Shift 1 & Shift 2 active',
      trend: { value: 'Full roster', isPositive: true },
      icon: DutyIcon,
      color: 'purple',
      onClick: () => navigate('/staff/attendance'),
    },
    {
      id: 'pending_leaves',
      label: 'Pending Leave Requests',
      value: 3,
      subLabel: '2 students, 1 staff',
      trend: { value: 'Awaiting approval', isPositive: false },
      icon: LeaveIcon,
      color: 'amber',
      onClick: () => navigate('/staff/roster'),
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'residential',
      title: 'Residential Quarters',
      description: 'Bed allocations & dorms',
      icon: HomeIcon,
      color: 'accent',
      path: '/academy/residential-quarters',
      onClick: () => navigate('/academy/residential-quarters'),
    },
    {
      id: 'staff_duty',
      title: t('dutySchedule', 'Daily Staff Duty'),
      description: 'Roster & shift management',
      icon: DutyIcon,
      color: 'purple',
      path: '/staff/attendance',
      onClick: () => navigate('/staff/attendance'),
    },
    {
      id: 'staff_roster',
      title: 'Staff Directory',
      description: 'Employee profiles & records',
      icon: GroupsIcon,
      color: 'emerald',
      path: '/staff/roster',
      onClick: () => navigate('/staff/roster'),
    },
    {
      id: 'campus_structure',
      title: 'Campus Structure',
      description: 'Buildings & facilities',
      icon: BuildingOfficeIcon,
      color: 'sky',
      path: '/academy/campus-profile',
      onClick: () => navigate('/academy/campus-profile'),
    },
  ];

  const dutyEvents: CalendarEventItem[] = [
    { id: '1', title: 'Main Gate Supervision (Evening Shift)', date: '2026-09-14', type: 'EVENT', impact: 'Ustadh Rayhan' },
    { id: '2', title: 'Dormitory Headcount Inspection', date: '2026-09-14', type: 'MEETING', impact: 'Warden Team' },
    { id: '3', title: 'Campus Facility Maintenance Check', date: '2026-09-18', type: 'EVENT', impact: 'Operations Dept' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Staff & Operations KPI Row */}
      <KpiMetricsWidget metrics={metrics} />

      {/* 2. Operations Quick Action Hub */}
      <QuickActionsWidget actions={quickActions} />

      {/* 3. Daily Facility & Duty Schedules */}
      <UpcomingEventsWidget 
        events={dutyEvents} 
        title="Today's Operational Duties & Shifts" 
        onViewCalendar={() => navigate('/academy/calendar-events')} 
      />
    </div>
  );
}
