import React from 'react';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout, resetLayout } from '../widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, DashboardMetric } from '../types';
import { useTenant } from '../../../context/TenantContext';
import {
  BookOpenIcon,
  AttendanceIcon,
  SparklesIcon,
  AcademicCapIcon,
} from '../../../components/ui/Icons';

export interface StudentDashboardViewProps {
  role?: DashboardRole;
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
  layoutItems?: DashboardLayoutItem[];
  onUpdateLayout?: (newItems: DashboardLayoutItem[]) => void;
}

export default function StudentDashboardView({
  role = 'STUDENT',
  isEditMode = false,
  onOpenWidgetCatalog,
  layoutItems: propLayoutItems,
  onUpdateLayout,
}: StudentDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const { activeTenantId } = useTenant();
  const { pulseData, scheduleItems, upcomingEvents } = useDashboardData();

  const [internalLayout, setInternalLayout] = React.useState<DashboardLayoutItem[]>(() =>
    propLayoutItems || getSavedLayout(activeTenantId || 'default', role)
  );

  React.useEffect(() => {
    if (propLayoutItems) {
      setInternalLayout(propLayoutItems);
    }
  }, [propLayoutItems]);

  const activeLayout = propLayoutItems || internalLayout;

  const handleUpdateLayout = (newItems: DashboardLayoutItem[]) => {
    if (onUpdateLayout) {
      onUpdateLayout(newItems);
    } else {
      setInternalLayout(newItems);
      saveLayout(activeTenantId || 'default', role, newItems);
    }
  };

  // Student Personalized KPI Metrics
  const metrics: DashboardMetric[] = [
    {
      id: 'hifz_juz',
      label: t('hifzCompletion', 'Completed Juz'),
      value: '17 / 30',
      subLabel: 'Surah Al-Kahf • Ayah 46',
      trend: { value: '+2 pages this week', isPositive: true },
      icon: BookOpenIcon,
      color: 'purple',
    },
    {
      id: 'my_attendance',
      label: t('todayAttendance', 'My Attendance Rate'),
      value: '98.5%',
      subLabel: '182 Present • 2 Late',
      trend: { value: 'Punctual', isPositive: true },
      icon: AttendanceIcon,
      color: 'emerald',
    },
    {
      id: 'sabaq_streak',
      label: 'Sabaq Daily Streak',
      value: '14 Days',
      subLabel: 'Continuous flawless recitation',
      trend: { value: 'Top 5%', isPositive: true },
      icon: SparklesIcon,
      color: 'accent',
    },
    {
      id: 'exam_standing',
      label: 'Terminal Exam Score',
      value: '94.2%',
      subLabel: 'Grade: Mumtaz (A+)',
      trend: { value: 'Position: 2nd', isPositive: true },
      icon: AcademicCapIcon,
      color: 'sky',
    },
  ];

  // Visual widgets props map
  const widgetPropsMap = {
    kpi_metrics: {
      metrics,
      cols: 4,
    },
    attendance_pulse: {
      data: pulseData,
      title: 'My Attendance Ledger',
    },
    timetable_schedule: {
      items: scheduleItems,
      title: "Today's Study Schedule",
    },
    upcoming_events: {
      items: upcomingEvents,
      title: 'Upcoming Assessments & Holidays',
    },
  };

  return (
    <DashboardGridEngine
      items={activeLayout}
      role={role}
      isEditMode={isEditMode}
      onUpdateItems={handleUpdateLayout}
      onOpenWidgetCatalog={onOpenWidgetCatalog}
      widgetPropsMap={widgetPropsMap}
    />
  );
}

