import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, DashboardMetric, DashboardQuickAction } from '../types';
import { useTenant } from '../../../context/TenantContext';
import {
  GroupsIcon,
  AttendanceIcon,
  SparklesIcon,
  AdmissionIcon,
  BanknotesIcon,
  BookOpenIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';

export interface AdminPrincipalDashboardViewProps {
  role?: DashboardRole;
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
  layoutItems?: DashboardLayoutItem[];
  onUpdateLayout?: (newItems: DashboardLayoutItem[]) => void;
}

export default function AdminPrincipalDashboardView({
  role = 'ADMIN',
  isEditMode = false,
  onOpenWidgetCatalog,
  layoutItems: propLayoutItems,
  onUpdateLayout,
}: AdminPrincipalDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const {
    totalStudents,
    pulseData,
    pendingAdmissionsCount,
    recentActivities,
    upcomingEvents,
    todayCollection,
    monthlyCollection,
  } = useDashboardData();

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

  const metrics: DashboardMetric[] = [
    {
      id: 'enrolled_students',
      label: t('totalStudents', 'Active Enrollment'),
      value: totalStudents,
      subLabel: 'Academic Session 2026-2027',
      trend: { value: '+14 this month', isPositive: true },
      icon: GroupsIcon,
      color: 'accent',
      onClick: () => navigate('/students'),
    },
    {
      id: 'attendance_pulse',
      label: t('todayAttendance', "Today's Attendance"),
      value: `${pulseData.presentRate}%`,
      subLabel: `${formatNumber(pulseData.present)} / ${formatNumber(pulseData.total)} present`,
      trend: { value: '96% staff attendance', isPositive: true },
      icon: AttendanceIcon,
      color: 'emerald',
      onClick: () => navigate('/learning/daily-classroom?tab=attendance'),
    },
    {
      id: 'today_collection',
      label: t('todayCollection', "Today's Collection"),
      value: `৳ ${formatNumber(todayCollection)}`,
      subLabel: `Monthly Inflow: ৳ ${formatNumber(monthlyCollection)}`,
      trend: { value: '83% target met', isPositive: true },
      icon: BanknotesIcon,
      color: 'purple',
      onClick: () => navigate('/finance'),
    },
    {
      id: 'pending_admissions',
      label: t('pendingApplications', 'New Applications'),
      value: pendingAdmissionsCount,
      subLabel: 'Pending review & verification',
      trend: { value: '6 interview scheduled', isPositive: true },
      icon: AdmissionIcon,
      color: 'amber',
      onClick: () => navigate('/student-management/admission?tab=applications'),
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'admission_action',
      title: 'New Student Admission',
      description: 'Register student profile, quota & Guardian binding',
      icon: AdmissionIcon,
      color: 'accent',
      path: '/student-management/admission',
    },
    {
      id: 'daily_rollcall',
      title: 'Institutional Roll Call',
      description: 'Audit section-wise live student & staff attendance',
      icon: AttendanceIcon,
      color: 'emerald',
      path: '/learning/daily-classroom?tab=attendance',
    },
    {
      id: 'collection_counter',
      title: 'Fee Collection Desk',
      description: 'Process student fee invoice & generate receipt',
      icon: BanknotesIcon,
      color: 'purple',
      path: '/finance/ledger',
    },
    {
      id: 'hifz_overview',
      title: 'Hifz Velocity Console',
      description: 'Review Quran memorization milestones and sabqi reviews',
      icon: BookOpenIcon,
      color: 'amber',
      path: '/learning/daily-classroom?tab=hifz',
    },
  ];

  const widgetPropsMap = {
    kpi_metrics: {
      metrics,
      cols: 4,
    },
    attendance_pulse: {
      data: pulseData,
      onTakeAttendance: () => navigate('/learning/daily-classroom?tab=attendance'),
    },
    recent_activity: {
      items: recentActivities,
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
      items={activeLayout}
      role={role}
      isEditMode={isEditMode}
      onUpdateItems={handleUpdateLayout}
      onOpenWidgetCatalog={onOpenWidgetCatalog}
      widgetPropsMap={widgetPropsMap}
    />
  );
}
