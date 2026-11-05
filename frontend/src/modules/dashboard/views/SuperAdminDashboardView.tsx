import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardLayoutItem, DashboardMetric, DashboardQuickAction } from '../types';
import { useTenant } from '../../../context/TenantContext';
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

export interface SuperAdminDashboardViewProps {
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
}

export default function SuperAdminDashboardView({
  isEditMode = false,
  onOpenWidgetCatalog,
}: SuperAdminDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const { 
    totalStudents, 
    totalStaff, 
    totalTenantsCount, 
    recentActivities,
    upcomingEvents 
  } = useDashboardData();

  const [layoutItems, setLayoutItems] = React.useState<DashboardLayoutItem[]>(() =>
    getSavedLayout(activeTenantId || 'default', 'SUPER_ADMIN')
  );

  const handleUpdateLayout = (newItems: DashboardLayoutItem[]) => {
    setLayoutItems(newItems);
    saveLayout(activeTenantId || 'default', 'SUPER_ADMIN', newItems);
  };

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
      id: 'system_health',
      label: 'SaaS Platform Health',
      value: '99.98%',
      subLabel: 'Realtime edge sync',
      trend: { value: 'Optimal', isPositive: true },
      icon: SparklesIcon,
      color: 'sky',
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'new_tenant',
      title: 'Onboard Academy',
      description: 'Create new tenant instance with isolated database',
      icon: BuildingOfficeIcon,
      color: 'accent',
      path: '/institutions?action=new',
      badge: 'Multi-Tenant',
    },
    {
      id: 'global_audit',
      title: 'Security & Audit Log',
      description: 'Review cross-institution administrative access',
      icon: ShieldCheckIcon,
      color: 'emerald',
      path: '/admin/audit-logs',
    },
    {
      id: 'system_backup',
      title: 'Database Cloud Sync',
      description: 'Execute instant snapshot & restore test',
      icon: CloudIcon,
      color: 'purple',
      path: '/settings/backup',
    },
    {
      id: 'broadcast_alert',
      title: 'System-Wide Notice',
      description: 'Broadcast maintenance banner to all campuses',
      icon: BellIcon,
      color: 'amber',
      path: '/admin/broadcasts',
    },
  ];

  const widgetPropsMap = {
    kpi_metrics: {
      metrics,
      cols: 4,
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
      items={layoutItems}
      role="SUPER_ADMIN"
      isEditMode={isEditMode}
      onUpdateItems={handleUpdateLayout}
      onOpenWidgetCatalog={onOpenWidgetCatalog}
      widgetPropsMap={widgetPropsMap}
    />
  );
}
