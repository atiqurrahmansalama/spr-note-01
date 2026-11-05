import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardLayoutItem, DashboardMetric, DashboardQuickAction } from '../types';
import { useTenant } from '../../../context/TenantContext';
import {
  BanknotesIcon,
  AdmissionIcon,
  BuildingOfficeIcon,
  AttendanceIcon,
  DocumentTextIcon,
} from '../../../components/ui/Icons';

export interface StaffOperatorDashboardViewProps {
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
}

export default function StaffOperatorDashboardView({
  isEditMode = false,
  onOpenWidgetCatalog,
}: StaffOperatorDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const {
    pulseData,
    pendingAdmissionsCount,
    upcomingEvents,
  } = useDashboardData();

  const [layoutItems, setLayoutItems] = React.useState<DashboardLayoutItem[]>(() =>
    getSavedLayout(activeTenantId || 'default', 'STAFF')
  );

  const handleUpdateLayout = (newItems: DashboardLayoutItem[]) => {
    setLayoutItems(newItems);
    saveLayout(activeTenantId || 'default', 'STAFF', newItems);
  };

  const metrics: DashboardMetric[] = [
    {
      id: 'staff_counter_collection',
      label: "Today's Fee Collection",
      value: '৳ 48,500',
      subLabel: '14 transactions completed',
      trend: { value: 'Counter Active', isPositive: true },
      icon: BanknotesIcon,
      color: 'emerald',
      onClick: () => navigate('/finance/ledger'),
    },
    {
      id: 'staff_admissions',
      label: 'Pending Admissions',
      value: pendingAdmissionsCount,
      subLabel: 'Awaiting birth certificate verification',
      trend: { value: 'Urgent', isPositive: false },
      icon: AdmissionIcon,
      color: 'amber',
      onClick: () => navigate('/student-management/admission?tab=applications'),
    },
    {
      id: 'staff_dorm_beds',
      label: 'Allocated Hostel Beds',
      value: '164 / 180',
      subLabel: '16 vacancies remaining',
      trend: { value: '91% Full', isPositive: true },
      icon: BuildingOfficeIcon,
      color: 'purple',
      onClick: () => navigate('/academy/residential'),
    },
    {
      id: 'staff_attendance',
      label: 'Staff Presence Today',
      value: '23 / 24',
      subLabel: '96% staff attendance',
      trend: { value: '1 on leave', isPositive: true },
      icon: AttendanceIcon,
      color: 'accent',
      onClick: () => navigate('/staff/attendance'),
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'fee_counter',
      title: 'Quick Cash Fee Receipt',
      description: 'Issue student monthly tuition receipt with barcode',
      icon: BanknotesIcon,
      color: 'emerald',
      path: '/finance/ledger',
    },
    {
      id: 'new_admission',
      title: 'Fast Track Admission Entry',
      description: 'Register incoming applicant and Guardian contact',
      icon: AdmissionIcon,
      color: 'accent',
      path: '/student-management/admission',
    },
    {
      id: 'id_card_studio',
      title: 'ID Cards & Certificate Print',
      description: 'Batch export student smart cards & badges',
      icon: DocumentTextIcon,
      color: 'purple',
      path: '/print-studio',
    },
  ];

  const widgetPropsMap = {
    kpi_metrics: {
      metrics,
      cols: 4,
    },
    attendance_pulse: {
      data: pulseData,
      title: 'Campus Attendance Pulse',
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
      role="STAFF"
      isEditMode={isEditMode}
      onUpdateItems={handleUpdateLayout}
      onOpenWidgetCatalog={onOpenWidgetCatalog}
      widgetPropsMap={widgetPropsMap}
    />
  );
}
