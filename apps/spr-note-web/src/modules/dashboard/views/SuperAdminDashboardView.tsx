import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, DashboardMetric, DashboardQuickAction } from '../types';
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
  role?: DashboardRole;
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
  layoutItems?: DashboardLayoutItem[];
  onUpdateLayout?: (newItems: DashboardLayoutItem[]) => void;
  isFeatureEnabled?: (featureKey?: string) => boolean;
  isSuperAdmin?: boolean;
}

export default function SuperAdminDashboardView({
  role = 'SUPER_ADMIN',
  isEditMode = false,
  onOpenWidgetCatalog,
  layoutItems: propLayoutItems,
  onUpdateLayout,
  isFeatureEnabled,
  isSuperAdmin = true,
}: SuperAdminDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const { 
    totalStudents, 
    totalStaff, 
    totalTenantsCount, 
    recentActivities,
    upcomingEvents,
    pulseData,
    activeAcademyName,
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
      value: totalStudents,
      subLabel: `${formatNumber(totalStudents)} pupils • Enrolled across network`,
      trend: { value: '+8.4%', isPositive: true },
      icon: GroupsIcon,
      color: 'emerald',
      onClick: () => navigate('/students'),
    },
    {
      id: 'staff_total',
      label: t('activeStaff', 'Active Staff & Faculty'),
      value: totalStaff,
      subLabel: `${formatNumber(totalStaff)} members • Faculty & operations`,
      trend: { value: '100% active', isPositive: true },
      icon: TeacherIcon,
      color: 'purple',
      onClick: () => navigate('/staff/roster'),
    },
    {
      id: 'system_health',
      label: 'SaaS Platform Health',
      value: '99.98%',
      subLabel: 'Realtime sync & operations',
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
    attendance_pulse: {
      data: pulseData,
      title: 'Institutional Attendance Pulse',
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
    system_gateways: {},
    finance_overview: {},
    notice_board: {},
    working_hours: {},
    academic_events: {},
    agenda_schedule: {},
  };

  return (
    <DashboardGridEngine
      items={activeLayout}
      role={role}
      isEditMode={isEditMode}
      onUpdateItems={handleUpdateLayout}
      onOpenWidgetCatalog={onOpenWidgetCatalog}
      widgetPropsMap={widgetPropsMap}
      isFeatureEnabled={isFeatureEnabled}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
