import React, { useMemo } from 'react';
import type { DashboardRole, WidgetDefinition } from '../types';
import {
  getKpiCardsForRole,
  isWidgetFeaturePermitted,
  ROLE_KPI_CARDS_CATALOG,
  type KpiCardCatalogItem,
} from '../widgetRegistry';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import SegmentedSwitch from '../../../components/ui/SegmentedSwitch';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import {
  ChevronIcon,
  LockClosedIcon,
  ExternalLinkIcon,
  SparklesIcon,
  TrendingUpIcon,
  CalendarIcon,
  GridIcon,
  TimelineIcon,
  ClockIcon,
  CheckCircleIcon,
} from '../../../components/ui/Icons';

export const CONFIGURABLE_WIDGET_IDS = new Set([
  'kpi_metrics',
  'working_hours',
  'academic_events',
]);

export interface DashboardWidgetCardItemProps {
  widgetDef: WidgetDefinition;
  role: DashboardRole | 'ALL';
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  settings?: Record<string, any>;
  onUpdateSettings?: (updatedSettings: Record<string, any>) => void;
  isSuperAdmin?: boolean;
  isFeatureEnabledOverride?: (featureKey?: string) => boolean;
  onNavigateToFeatureControl?: () => void;
  disabled?: boolean;
}

export default function DashboardWidgetCardItem({
  widgetDef,
  role,
  checked,
  indeterminate = false,
  onToggle,
  isExpanded = false,
  onToggleExpand,
  settings = {},
  onUpdateSettings,
  isSuperAdmin = false,
  isFeatureEnabledOverride,
  onNavigateToFeatureControl,
  disabled = false,
}: DashboardWidgetCardItemProps) {
  const { isFeatureEnabled: contextIsFeatureEnabled } = useFeatureControl();
  const isFeatureEnabled = isFeatureEnabledOverride || contextIsFeatureEnabled;

  const isFeaturePermitted = isWidgetFeaturePermitted(widgetDef, isFeatureEnabled);
  const isFeatureBlocked = !isFeaturePermitted;
  const isMyTasksFeatureEnabled = isFeatureEnabled('calendar_tab_personal_tasks') && isFeatureEnabled('calendar_view_personal_tasks');

  // Regular non-superadmin users never see disabled features
  if (!isSuperAdmin && isFeatureBlocked) {
    return null;
  }

  const hasConfigurableDetails = CONFIGURABLE_WIDGET_IDS.has(widgetDef.id) && !isFeatureBlocked;
  const isCardExpanded = hasConfigurableDetails && isExpanded;

  // Resolve KPI cards: if role is 'ALL', aggregate all unique KPI cards from all roles
  const roleKpis = useMemo<KpiCardCatalogItem[]>(() => {
    if (role === 'ALL') {
      const seen = new Set<string>();
      const combined: KpiCardCatalogItem[] = [];
      Object.values(ROLE_KPI_CARDS_CATALOG).forEach((cards) => {
        cards.forEach((c) => {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            combined.push(c);
          }
        });
      });
      return combined;
    }
    return getKpiCardsForRole(role as DashboardRole, isFeatureEnabled);
  }, [role, isFeatureEnabled]);

  return (
    <div
      className={`rounded-2xl border-0 ring-0 theme-bg-surface transition-all duration-150 overflow-hidden shadow-xs ${
        isFeatureBlocked ? 'opacity-60' : ''
      }`}
    >
      {/* Card Header Row */}
      <div
        onClick={() => {
          if (isFeatureBlocked || disabled) return;
          if (hasConfigurableDetails && onToggleExpand) {
            onToggleExpand();
          } else {
            onToggle();
          }
        }}
        className={`p-3.5 flex items-center justify-between gap-3 select-none transition-colors ${
          isFeatureBlocked || disabled
            ? 'cursor-not-allowed'
            : 'cursor-pointer hover:theme-bg-elevated/30'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs truncate transition-colors ${
              checked
                ? 'font-bold theme-text-primary'
                : 'font-medium theme-text-secondary'
            }`}
          >
            {widgetDef.title}
          </div>
        </div>

        {/* Feature Control Smart Bridge Badge */}
        {isFeatureBlocked && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold shrink-0">
            <LockClosedIcon className="w-3 h-3" />
            <span>Disabled in System</span>
            {onNavigateToFeatureControl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToFeatureControl();
                }}
                className="underline hover:opacity-80 ml-0.5 cursor-pointer flex items-center gap-0.5"
                title="Configure in Feature Control"
              >
                <span>Enable</span>
                <ExternalLinkIcon className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {/* Single-line Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => {
              e.stopPropagation();
              if (!isFeatureBlocked && !disabled) {
                onToggle();
              }
            }}
            disabled={isFeatureBlocked || disabled}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
              isFeatureBlocked || disabled ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              checked ? 'theme-bg-accent' : 'bg-black/15 dark:bg-white/15'
            }`}
            title={checked ? 'Disable Widget' : 'Enable Widget'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Expand/Collapse Chevron Indicator for Configurable Widgets */}
          {hasConfigurableDetails && onToggleExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`p-1 rounded-lg theme-text-secondary hover:theme-text-primary transition-transform duration-200 cursor-pointer ${
                isCardExpanded ? 'rotate-180' : ''
              }`}
              title={isCardExpanded ? 'Collapse' : 'Configure Sub-settings'}
            >
              <ChevronIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Accordion Expanded Settings Body */}
      {hasConfigurableDetails && isCardExpanded && (
        <div className="px-4 pb-4 pt-2 border-0 theme-bg-app/40 space-y-3.5 animate-fade-in">
          {/* 1. KPI Metrics & Executive Counters */}
          {widgetDef.id === 'kpi_metrics' && (() => {
            // Strictly filter by Feature & Module Control: unpermitted cards must never show in customizer
            const permittedKpis = roleKpis.filter(
              (i) => !i.requiredFeatureKey || isFeatureEnabled(i.requiredFeatureKey)
            );
            const allPermittedIds = permittedKpis.map((i) => i.id);
            const currentIds = settings.visibleMetricIds
              ? settings.visibleMetricIds.filter((id: string) => allPermittedIds.includes(id))
              : allPermittedIds;

            // Group KPI cards by module for structured clean subheadings (only permitted cards!)
            const moduleGroups = new Map<string, typeof permittedKpis>();
            permittedKpis.forEach((item) => {
              const mod = item.module || 'General Metrics';
              if (!moduleGroups.has(mod)) {
                moduleGroups.set(mod, []);
              }
              moduleGroups.get(mod)!.push(item);
            });

            return (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-1 border-0">
                  <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5 theme-text-secondary" />
                    <span>Included Executive KPI Cards</span>
                  </div>
                  <span className="text-[10px] theme-text-secondary font-mono">
                    {currentIds.length} Active
                  </span>
                </div>

                {permittedKpis.length === 0 ? (
                  <div className="p-3 text-center text-xs theme-text-secondary">
                    No executive KPI cards are enabled for this role under Feature &amp; Module Control.
                  </div>
                ) : (
                  <div className="space-y-3 pr-1">
                    {Array.from(moduleGroups.entries()).map(([modTitle, items]) => {
                      if (items.length === 0) return null;

                      return (
                        <div key={modTitle} className="space-y-1.5">
                          {moduleGroups.size > 1 && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider theme-text-secondary pt-2 pb-1 border-0 select-none">
                              <span>{modTitle}</span>
                              <span className="ml-auto text-[9px] font-mono theme-text-secondary/70 font-semibold">
                                {items.length} {items.length === 1 ? 'card' : 'cards'}
                              </span>
                            </div>
                          )}
                          <div className="space-y-1">
                            {items.map((kpiItem) => {
                              const isChecked = currentIds.includes(kpiItem.id);

                              return (
                                <div key={kpiItem.id} className="py-1 flex items-center justify-between">
                                  <CustomCheckbox
                                    checked={isChecked}
                                    onChange={(kpiChecked: boolean) => {
                                      if (!onUpdateSettings) return;
                                      const nextIds = kpiChecked
                                        ? [...currentIds, kpiItem.id]
                                        : currentIds.filter((id: string) => id !== kpiItem.id);
                                      onUpdateSettings({ visibleMetricIds: nextIds });
                                    }}
                                    label={kpiItem.label}
                                    disabled={disabled}
                                    size="sm"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. Working Hours & Shifts */}
          {widgetDef.id === 'working_hours' && (
            <div className="space-y-3 pt-1 text-xs">
              <div className="font-bold theme-text-primary flex items-center justify-between pb-1 border-0">
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 theme-text-secondary" />
                  <span>Display View Mode</span>
                </div>
                <span className="text-[10px] font-mono theme-text-secondary capitalize">
                  {settings.displayMode || 'grid'} View
                </span>
              </div>

              {/* Grid & Timeline Single-line Segmented Switch */}
              <div className="pt-0.5">
                <SegmentedSwitch
                  options={[
                    { value: 'grid', label: 'Grid (Month)', icon: GridIcon },
                    { value: 'timeline', label: 'Timeline (Hours)', icon: TimelineIcon },
                  ]}
                  value={settings.displayMode || 'grid'}
                  onChange={(val) => onUpdateSettings?.({ displayMode: val })}
                  fullWidth={true}
                  size="sm"
                  disabled={disabled}
                />
              </div>

              {/* Personal Tasks Visibility Control */}
              <div className="pt-2 border-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 theme-text-secondary" />
                    <span>Personal Tasks</span>
                  </div>
                  <p className="text-[10px] theme-text-secondary mt-0.5">
                    {isMyTasksFeatureEnabled ? 'Show personal checklist in calendar' : 'Disabled in Feature Control'}
                  </p>
                </div>
                <CustomCheckbox
                  checked={isMyTasksFeatureEnabled && settings.showTasks !== false}
                  onChange={(taskChecked: boolean) => {
                    onUpdateSettings?.({ showTasks: taskChecked });
                  }}
                  disabled={disabled || !isMyTasksFeatureEnabled}
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* 3. Academic Events & Milestones */}
          {widgetDef.id === 'academic_events' && (
            <div className="space-y-3 pt-1 text-xs">
              <div className="font-bold theme-text-primary flex items-center justify-between pb-1 border-0">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 theme-text-secondary" />
                  <span>Display View Mode</span>
                </div>
                <span className="text-[10px] font-mono theme-text-secondary capitalize">
                  {settings.displayMode || 'grid'} View
                </span>
              </div>

              {/* Grid & Timeline Single-line Segmented Switch */}
              <div className="pt-0.5">
                <SegmentedSwitch
                  options={[
                    { value: 'grid', label: 'Grid (Month)', icon: GridIcon },
                    { value: 'timeline', label: 'Timeline (Hours)', icon: TimelineIcon },
                  ]}
                  value={settings.displayMode || 'grid'}
                  onChange={(val) => onUpdateSettings?.({ displayMode: val })}
                  fullWidth={true}
                  size="sm"
                  disabled={disabled}
                />
              </div>

              {/* Personal Tasks Visibility Control */}
              <div className="pt-2 border-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 theme-text-secondary" />
                    <span>Personal Tasks</span>
                  </div>
                  <p className="text-[10px] theme-text-secondary mt-0.5">
                    {isMyTasksFeatureEnabled ? 'Show personal checklist in calendar' : 'Disabled in Feature Control'}
                  </p>
                </div>
                <CustomCheckbox
                  checked={isMyTasksFeatureEnabled && settings.showTasks !== false}
                  onChange={(taskChecked: boolean) => {
                    onUpdateSettings?.({ showTasks: taskChecked });
                  }}
                  disabled={disabled || !isMyTasksFeatureEnabled}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

