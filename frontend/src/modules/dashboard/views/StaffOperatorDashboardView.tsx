import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, DashboardMetric, DashboardQuickAction } from '../types';
import { useTenant } from '../../../context/TenantContext';
import {
  BanknotesIcon,
  AdmissionIcon,
  BuildingOfficeIcon,
  AttendanceIcon,
  DocumentTextIcon,
} from '../../../components/ui/Icons';

export interface StaffOperatorDashboardViewProps {
  role?: DashboardRole;
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
  layoutItems?: DashboardLayoutItem[];
  onUpdateLayout?: (newItems: DashboardLayoutItem[]) => void;
}

export default function StaffOperatorDashboardView({
  role = 'STAFF',
  isEditMode = false,
  onOpenWidgetCatalog,
  layoutItems: propLayoutItems,
  onUpdateLayout,
}: StaffOperatorDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const {
    pulseData,
    pendingAdmissionsCount,
    upcomingEvents,
    todayCollection,
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
      id: 'staff_counter_collection',
      label: "Today's Fee Collection",
      value: `৳ ${formatNumber(todayCollection)}`,
      subLabel: 'Intake',
      trend: { value: 'Counter Active', isPositive: true },
      icon: BanknotesIcon,
      color: 'emerald',
      onClick: () => navigate('/finance/ledger'),
    },
    {
      id: 'staff_admissions',
      label: 'Pending Admissions',
      value: pendingAdmissionsCount,
      subLabel: 'Verification',
      trend: { value: 'Urgent', isPositive: false },
      icon: AdmissionIcon,
      color: 'amber',
      onClick: () => navigate('/student-management/admission?tab=applications'),
    },
    {
      id: 'staff_dorm_beds',
      label: 'Allocated Hostel Beds',
      value: '164 / 180',
      subLabel: 'Hostel',
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
    finance_overview: {},
    residential_occupancy: {},
    admission_pipeline: {},
    notice_board: {},
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
