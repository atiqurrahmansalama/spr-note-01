import React, { useMemo } from 'react';
import type { DashboardRole, WidgetDefinition } from '../types';
import {
  getKpiCardsForRole,
  isWidgetFeaturePermitted,
  ROLE_KPI_CARDS_CATALOG,
  type KpiCardCatalogItem,
} from '../widgetRegistry';
import { AVAILABLE_APP_SHORTCUTS } from './widgets/QuickActionsWidget';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import {
  ChevronIcon,
  LockClosedIcon,
  ExternalLinkIcon,
  SparklesIcon,
  TrendingUpIcon,
  CalendarIcon,
} from '../../../components/ui/Icons';

export const CONFIGURABLE_WIDGET_IDS = new Set([
  'kpi_metrics',
  'recitation_trends',
  'quick_actions',
  'academic_calendar',
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
  onNavigateToFeatureControl,
  disabled = false,
}: DashboardWidgetCardItemProps) {
  const { isFeatureEnabled } = useFeatureControl();

  const isFeaturePermitted = isWidgetFeaturePermitted(widgetDef, isFeatureEnabled);
  const isFeatureBlocked = !isFeaturePermitted;

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
    return getKpiCardsForRole(role as DashboardRole);
  }, [role]);

  return (
    <div
      className={`rounded-2xl border theme-border theme-bg-surface transition-all duration-150 overflow-hidden ${
        isFeatureBlocked ? 'opacity-70 bg-opacity-40' : ''
      } ${
        isCardExpanded
          ? 'border-[var(--accent-main)]/50 shadow-md ring-1 ring-[var(--accent-main)]/20'
          : 'shadow-xs hover:border-[var(--accent-main)]/30'
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
            : 'cursor-pointer hover:theme-bg-sub/40'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 flex items-center"
          >
            <CustomCheckbox
              checked={checked}
              indeterminate={indeterminate}
              onChange={() => !isFeatureBlocked && !disabled && onToggle()}
              disabled={isFeatureBlocked || disabled}
              size="sm"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold theme-text-primary truncate flex items-center gap-2">
              <span>{widgetDef.title}</span>
            </div>
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

        {/* Expand/Collapse Chevron Indicator */}
        {hasConfigurableDetails && onToggleExpand && (
          <div className="flex items-center gap-1 shrink-0">
            <div
              className={`p-1 rounded-lg theme-text-secondary transition-transform duration-200 ${
                isCardExpanded ? 'rotate-180' : ''
              }`}
            >
              <ChevronIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>

      {/* Accordion Expanded Settings Body */}
      {hasConfigurableDetails && isCardExpanded && (
        <div className="px-4 pb-4 pt-2 border-t theme-border space-y-3.5 animate-fade-in">
          {/* 1. KPI Metrics & Executive Counters */}
          {widgetDef.id === 'kpi_metrics' && (() => {
            const allRoleIds = roleKpis
              .filter((i) => !i.requiredFeatureKey || isFeatureEnabled(i.requiredFeatureKey))
              .map((i) => i.id);
            const currentIds = settings.visibleMetricIds || allRoleIds;

            return (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-1 border-b theme-border">
                  <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                    <span>Included Executive KPI Cards</span>
                  </div>
                  <span className="text-[10px] theme-text-secondary">
                    {currentIds.length} Active
                  </span>
                </div>

                <div className="space-y-1.5 pr-1">
                  {roleKpis.map((kpiItem) => {
                    const isCardBlocked =
                      kpiItem.requiredFeatureKey && !isFeatureEnabled(kpiItem.requiredFeatureKey);
                    if (!isSuperAdmin && isCardBlocked) return null;

                    const isChecked = currentIds.includes(kpiItem.id) && !isCardBlocked;

                    return (
                      <div key={kpiItem.id} className="py-1 flex items-center justify-between">
                        <CustomCheckbox
                          checked={isChecked}
                          onChange={(kpiChecked: boolean) => {
                            if (isCardBlocked || !onUpdateSettings) return;
                            const nextIds = kpiChecked
                              ? [...currentIds, kpiItem.id]
                              : currentIds.filter((id: string) => id !== kpiItem.id);
                            onUpdateSettings({ visibleMetricIds: nextIds });
                          }}
                          label={kpiItem.label}
                          disabled={isCardBlocked || disabled}
                          size="sm"
                        />
                        {isCardBlocked && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            (Feature Disabled)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 2. Recitation Trends Analytics */}
          {widgetDef.id === 'recitation_trends' && (
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5 pb-1 border-b theme-border">
                <TrendingUpIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Recitation Analytics Display Options</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <CustomCheckbox
                  checked={settings.showKpis !== false}
                  onChange={(checkVal: boolean) =>
                    onUpdateSettings?.({ showKpis: checkVal })
                  }
                  disabled={disabled}
                  label="Show Top Sparkline KPI Cards"
                  size="sm"
                />

                <CustomCheckbox
                  checked={settings.showTrendsChart !== false}
                  onChange={(checkVal: boolean) =>
                    onUpdateSettings?.({ showTrendsChart: checkVal })
                  }
                  disabled={disabled}
                  label="Show Daily Recitation Trends Chart"
                  size="sm"
                />

                <CustomCheckbox
                  checked={settings.showBreakdown !== false}
                  onChange={(checkVal: boolean) =>
                    onUpdateSettings?.({ showBreakdown: checkVal })
                  }
                  disabled={disabled}
                  label="Show Right Session Distribution Gauge"
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* 3. Quick Actions Shortcuts */}
          {widgetDef.id === 'quick_actions' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between pb-1 border-b theme-border">
                <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                  <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>Included Quick Action Shortcuts</span>
                </div>
                <span className="text-[10px] theme-text-secondary">
                  {(
                    settings.selectedActionIds ||
                    AVAILABLE_APP_SHORTCUTS.slice(0, 4).map((i) => i.id)
                  ).length}{' '}
                  Selected
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {AVAILABLE_APP_SHORTCUTS.map((action) => {
                  const isShortcutBlocked =
                    action.requiredFeatureKey && !isFeatureEnabled(action.requiredFeatureKey);
                  if (!isSuperAdmin && isShortcutBlocked) return null;

                  const selectedIds =
                    settings.selectedActionIds ||
                    AVAILABLE_APP_SHORTCUTS.slice(0, 4).map((i) => i.id);
                  const isChecked = selectedIds.includes(action.id) && !isShortcutBlocked;

                  return (
                    <div
                      key={action.id}
                      className="py-1 flex items-center justify-between gap-2"
                    >
                      <CustomCheckbox
                        checked={isChecked}
                        onChange={(actionChecked: boolean) => {
                          if (isShortcutBlocked || !onUpdateSettings) return;
                          const nextIds = actionChecked
                            ? [...selectedIds, action.id]
                            : selectedIds.filter((id: string) => id !== action.id);
                          onUpdateSettings({ selectedActionIds: nextIds });
                        }}
                        disabled={isShortcutBlocked || disabled}
                        label={
                          <div className="min-w-0">
                            <div className="text-xs font-bold theme-text-primary leading-tight flex items-center gap-1.5">
                              <span>{action.title}</span>
                              {isShortcutBlocked && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-normal">
                                  (Disabled in System)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] theme-text-secondary truncate mt-0.5">
                              {action.category} • {action.path}
                            </div>
                          </div>
                        }
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Master Academic Calendar */}
          {widgetDef.id === 'academic_calendar' && (
            <div className="space-y-3 pt-1 text-xs">
              <div className="font-bold theme-text-primary flex items-center gap-1.5 pb-1 border-b theme-border">
                <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Default Calendar Category</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: 'ALL', label: 'All Entries' },
                  { id: 'ACADEMIC_EVENT', label: 'Events' },
                  { id: 'WORKING_HOURS', label: 'Shifts' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings?.({ defaultCategory: cat.id })
                    }
                    disabled={disabled}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (settings.defaultCategory || 'ALL') === cat.id
                        ? 'theme-bg-accent theme-accent-text border-transparent shadow-xs'
                        : 'theme-bg-sub theme-text-secondary border theme-border hover:theme-text-primary'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

