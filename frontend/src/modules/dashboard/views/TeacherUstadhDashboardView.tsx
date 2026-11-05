import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardLayoutItem, DashboardMetric, DashboardQuickAction } from '../types';
import { useTenant } from '../../../context/TenantContext';
import {
  GroupsIcon,
  AttendanceIcon,
  BookOpenIcon,
  SparklesIcon,
  TimerIcon,
} from '../../../components/ui/Icons';

export interface TeacherUstadhDashboardViewProps {
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
}

export default function TeacherUstadhDashboardView({
  isEditMode = false,
  onOpenWidgetCatalog,
}: TeacherUstadhDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const {
    pulseData,
    scheduleItems,
    upcomingEvents,
  } = useDashboardData();

  const [layoutItems, setLayoutItems] = React.useState<DashboardLayoutItem[]>(() =>
    getSavedLayout(activeTenantId || 'default', 'TEACHER')
  );

  const handleUpdateLayout = (newItems: DashboardLayoutItem[]) => {
    setLayoutItems(newItems);
    saveLayout(activeTenantId || 'default', 'TEACHER', newItems);
  };

  const metrics: DashboardMetric[] = [
    {
      id: 'my_students',
      label: 'My Assigned Students',
      value: 32,
      subLabel: 'Class: Hifz Senior (Cohort A)',
      trend: { value: '100% Active', isPositive: true },
      icon: GroupsIcon,
      color: 'accent',
      onClick: () => navigate('/learning/daily-classroom'),
    },
    {
      id: 'class_attendance',
      label: "Today's Class Presence",
      value: '31 / 32',
      subLabel: '97% present • 1 on leave',
      trend: { value: 'Completed', isPositive: true },
      icon: AttendanceIcon,
      color: 'emerald',
      onClick: () => navigate('/learning/daily-classroom?tab=attendance'),
    },
    {
      id: 'sabaq_passed',
      label: 'Today Sabaq Recited',
      value: '28 / 32',
      subLabel: '4 students pending verification',
      trend: { value: '88% cleared', isPositive: true },
      icon: BookOpenIcon,
      color: 'purple',
      onClick: () => navigate('/learning/daily-classroom?tab=hifz'),
    },
    {
      id: 'dawr_progress',
      label: 'Avg Dawr Velocity',
      value: '2.5 Juz',
      subLabel: 'Weekly revision cycle pace',
      trend: { value: 'Exemplary', isPositive: true },
      icon: SparklesIcon,
      color: 'sky',
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'daily_attendance',
      title: 'Take Period Roll Call',
      description: 'Record morning attendance & auto-dispatch SMS',
      icon: AttendanceIcon,
      color: 'emerald',
      path: '/learning/daily-classroom?tab=attendance',
    },
    {
      id: 'sabaq_entry',
      title: 'Daily Sabaq & Dawr Entry',
      description: 'Log mistakes, stucks, and completed verses',
      icon: BookOpenIcon,
      color: 'purple',
      path: '/learning/daily-classroom?tab=hifz',
    },
    {
      id: 'period_timetable',
      title: 'Class Routine & Schedule',
      description: 'Inspect assigned periods and upcoming rooms',
      icon: TimerIcon,
      color: 'accent',
      path: '/routine',
    },
  ];

  const widgetPropsMap = {
    kpi_metrics: {
      metrics,
      cols: 4,
    },
    attendance_pulse: {
      data: pulseData,
      title: 'My Cohort Attendance Pulse',
      onTakeAttendance: () => navigate('/learning/daily-classroom?tab=attendance'),
    },
    timetable_schedule: {
      items: scheduleItems,
      onViewAll: () => navigate('/routine'),
    },
    upcoming_events: {
      items: upcomingEvents,
    },
    quick_actions: {
      actions: quickActions,
    },
  };

  return (
    <DashboardGridEngine
      items={layoutItems}
      role="TEACHER"
      isEditMode={isEditMode}
      onUpdateItems={handleUpdateLayout}
      onOpenWidgetCatalog={onOpenWidgetCatalog}
      widgetPropsMap={widgetPropsMap}
    />
  );
}
