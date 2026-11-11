import React, { useState } from 'react';
import { useTranslation } from '../../../i18n';
import DashboardGridEngine from '../components/DashboardGridEngine';
import { useDashboardData } from '../hooks/useDashboardData';
import { getSavedLayout, saveLayout } from '../widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, DashboardMetric } from '../types';
import { useTenant } from '../../../context/TenantContext';
import {
  BookOpenIcon,
  AttendanceIcon,
  BanknotesIcon,
  UserCheckIcon,
  UsersIcon,
} from '../../../components/ui/Icons';

export interface GuardianDashboardViewProps {
  role?: DashboardRole;
  isEditMode?: boolean;
  onOpenWidgetCatalog?: () => void;
  layoutItems?: DashboardLayoutItem[];
  onUpdateLayout?: (newItems: DashboardLayoutItem[]) => void;
  isFeatureEnabled?: (featureKey?: string) => boolean;
  isSuperAdmin?: boolean;
}

export default function GuardianDashboardView({
  role = 'GUARDIAN',
  isEditMode = false,
  onOpenWidgetCatalog,
  layoutItems: propLayoutItems,
  onUpdateLayout,
  isFeatureEnabled,
  isSuperAdmin = false,
}: GuardianDashboardViewProps) {
  const { t, formatNumber } = useTranslation('dashboard');
  const { activeTenantId } = useTenant();
  const { pulseData, upcomingEvents, activeAcademyName } = useDashboardData();

  // Multi-child switcher state
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  const children = [
    { id: 'c-1', name: 'Muhammad Abdullah', class: 'Hifz Senior - Juz 18', roll: 12, photo: null },
    { id: 'c-2', name: 'Fatima Zahra', class: 'Nazira Fast-Track', roll: 5, photo: null },
  ];

  const currentChild = children[selectedChildIndex] || children[0];

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
      id: 'child_hifz',
      label: 'Hifz Memorization',
      value: selectedChildIndex === 0 ? '17 Juz' : 'Nazira Ampara',
      subLabel: selectedChildIndex === 0 ? 'Surah Al-Kahf' : 'Juz Amma',
      trend: { value: 'On Track', isPositive: true },
      icon: BookOpenIcon,
      color: 'purple',
    },
    {
      id: 'child_attendance',
      label: 'Presence Today',
      value: 'Present',
      subLabel: 'Morning Session',
      trend: { value: '99% Month', isPositive: true },
      icon: AttendanceIcon,
      color: 'emerald',
    },
    {
      id: 'child_dues',
      label: 'Pending Monthly Tuition',
      value: selectedChildIndex === 0 ? '৳ 0' : '৳ 2,500',
      subLabel: selectedChildIndex === 0 ? 'Cleared through Nov' : 'Due by 15th Nov',
      trend: { value: selectedChildIndex === 0 ? 'Paid' : 'Unpaid', isPositive: selectedChildIndex === 0 },
      icon: BanknotesIcon,
      color: selectedChildIndex === 0 ? 'accent' : 'rose',
    },
    {
      id: 'child_standing',
      label: 'Conduct & Tarbiyah',
      value: 'Mumtaz (A+)',
      subLabel: 'Teacher Remarks: Very attentive',
      trend: { value: 'Exemplary', isPositive: true },
      icon: UserCheckIcon,
      color: 'sky',
    },
  ];

  const widgetPropsMap = {
    kpi_metrics: {
      metrics,
      cols: 4,
    },
    attendance_pulse: {
      data: pulseData,
      title: `${currentChild.name}'s Attendance Pulse`,
    },
    upcoming_events: {
      items: upcomingEvents,
      title: 'Academic Calendar & Exams',
    },
    finance_overview: {},
    notice_board: {},
    hifz_tracker: {},
  };

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Multi-Child Selector Ribbon */}
      <div className="p-3.5 rounded-2xl theme-bg-surface shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 theme-accent" />
          <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
            Viewing Registered Child:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {children.map((child, idx) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChildIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedChildIndex === idx
                  ? 'theme-bg-accent theme-accent-text shadow-xs'
                  : 'theme-bg-sub theme-text-primary hover:theme-bg-elevated'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                {idx + 1}
              </div>
              <span>{child.name}</span>
              <span className="text-[10px] opacity-80 font-normal">({child.class})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Engine */}
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
    </div>
  );
}
