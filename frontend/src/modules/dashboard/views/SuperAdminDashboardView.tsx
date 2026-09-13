import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import KpiMetricsWidget from '../components/widgets/KpiMetricsWidget';
import QuickActionsWidget from '../components/widgets/QuickActionsWidget';
import SystemGatewaysWidget from '../components/widgets/SystemGatewaysWidget';
import RecentActivityFeedWidget from '../components/widgets/RecentActivityFeedWidget';
import { useDashboardData } from '../hooks/useDashboardData';
import type { DashboardMetric, DashboardQuickAction } from '../types';
import { 
  BuildingOfficeIcon, 
  GroupsIcon, 
  TeacherIcon, 
  SparklesIcon, 
  CloudIcon, 
  ShieldCheckIcon,
  BellIcon,
  SettingsIcon,
} from '../../../components/ui/Icons';

export default function SuperAdminDashboardView() {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { 
    totalStudents, 
    totalStaff, 
    totalTenantsCount, 
    recentActivities 
  } = useDashboardData();

  const metrics: DashboardMetric[] = [
    {
      id: 'tenants',
      label: t('totalTenants', 'Total Institutions'),
      value: totalTenantsCount,
      subLabel: 'Cross-campus network',
      trend: { value: '+2 new', isPositive: true },
      icon: BuildingOfficeIcon,
      color: 'accent',
      onClick: () => navigate('/institutions'),
    },
    {
      id: 'students_total',
      label: t('totalStudents', 'Global Student Roster'),
      value: totalStudents > 320 ? totalStudents : 1420,
      subLabel: `${formatNumber(totalStudents > 320 ? totalStudents : 1420)} enrolled pupils`,
      trend: { value: '+8.4%', isPositive: true },
      icon: GroupsIcon,
      color: 'emerald',
      onClick: () => navigate('/students'),
    },
    {
      id: 'staff_total',
      label: t('activeStaff', 'Active Staff & Faculty'),
      value: totalStaff > 24 ? totalStaff : 94,
      subLabel: 'Instructors & admin',
      trend: { value: '100% active', isPositive: true },
      icon: TeacherIcon,
      color: 'purple',
      onClick: () => navigate('/staff/roster'),
    },
    {
      id: 'storage_used',
      label: t('storageUsed', 'Cloud Storage Used'),
      value: '2.4 GB',
      subLabel: 'Of 50 GB allotted',
      trend: { value: '95% free', isPositive: true },
      icon: CloudIcon,
      color: 'sky',
      onClick: () => navigate('/data-backup'),
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'dev_tools',
      title: t('devTools', 'Developer Tools'),
      description: 'System schemas & configs',
      icon: SparklesIcon,
      color: 'purple',
      badge: 'Admin',
      path: '/admin-tools',
      onClick: () => navigate('/admin-tools'),
    },
    {
      id: 'gateways',
      title: t('gatewayStatus', 'Notification Gateways'),
      description: 'Telegram, WhatsApp, SMS',
      icon: BellIcon,
      color: 'sky',
      badge: 'Live',
      path: '/app-management/notifications',
      onClick: () => navigate('/app-management/notifications'),
    },
    {
      id: 'section_control',
      title: 'Section Toggle Matrix',
      description: 'Feature flags & access',
      icon: SettingsIcon,
      color: 'amber',
      path: '/section-control',
      onClick: () => navigate('/section-control'),
    },
    {
      id: 'roles',
      title: 'Role Permissions',
      description: 'Access hierarchy policies',
      icon: ShieldCheckIcon,
      color: 'emerald',
      path: '/role-management',
      onClick: () => navigate('/role-management'),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Global KPI Metrics Row */}
      <KpiMetricsWidget metrics={metrics} />

      {/* 2. Gateways & Infrastructure Health + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemGatewaysWidget onConfigureGateways={() => navigate('/app-management/notifications')} />
        <QuickActionsWidget actions={quickActions} />
      </div>

      {/* 3. Live System Activity Audit Feed */}
      <RecentActivityFeedWidget 
        activities={recentActivities} 
        onViewAll={() => navigate('/activity-analytics')} 
      />
    </div>
  );
}
