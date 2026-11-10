import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRole, DashboardLayoutItem, WidgetDefinition } from '../types';
import { 
  getWidgetsForRole, 
  WIDGET_REGISTRY, 
  isWidgetFeaturePermitted, 
  resetLayout 
} from '../widgetRegistry';
import { MODULE_CATEGORIES } from '../widgetCategories';
import DashboardWidgetCardItem from './DashboardWidgetCardItem';
import DrawerContainer from '../../../components/layout/DrawerContainer';
import CustomButton from '../../../components/ui/CustomButton';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import { useRoleManagement } from '../../admin/role-management/hooks/useRoleManagement';
import { useTenant } from '../../../context/TenantContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import {
  CheckCircleIcon,
  RefreshIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';

export interface DashboardCustomizerPanelProps {
  role: DashboardRole;
  currentLayout: DashboardLayoutItem[];
  onSaveLayout: (newLayout: DashboardLayoutItem[], saveAsRoleDefault?: boolean, targetRole?: DashboardRole) => void;
  onResetLayout: (targetRole?: DashboardRole) => void;
  isSuperAdmin: boolean;
  onClose: () => void;
}

/**
 * Smoothly scrolls the main dashboard viewport to the affected widget and applies a gentle highlight pulse
 */
const scrollAndHighlightDashboardWidget = (widgetId: string) => {
  const attemptScroll = (retryCount = 0) => {
    const el = document.getElementById(`dashboard-widget-${widgetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary soft highlight animation (pure theme-friendly soft pulse)
      el.classList.add('transition-all', 'duration-500');
      const originalOutline = el.style.boxShadow;
      el.style.boxShadow = '0 0 0 4px var(--accent-main, #6366f1)';
      el.style.borderRadius = '1rem';
      setTimeout(() => {
        el.style.boxShadow = originalOutline;
      }, 1500);
    } else if (retryCount < 6) {
      setTimeout(() => attemptScroll(retryCount + 1), 60);
    }
  };

  setTimeout(() => attemptScroll(0), 50);
};

export default function DashboardCustomizerPanel({
  role,
  currentLayout,
  onSaveLayout,
  onResetLayout,
  isSuperAdmin,
  onClose,
}: DashboardCustomizerPanelProps) {
  const [draftLayout, setDraftLayout] = useState<DashboardLayoutItem[]>(currentLayout);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { roles = [] } = useRoleManagement();
  const { activeTenantId } = useTenant();
  const { isFeatureEnabled } = useFeatureControl();
  const { openDrawer } = useRightSidebar();

  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(() => {
    try {
      const templateKey = `spr_dashboard_template_${activeTenantId || 'default'}_${role}_v1`;
      return Boolean(localStorage.getItem(templateKey));
    } catch {
      return false;
    }
  });

  // Re-sync eligible widgets when widget governance permissions are saved
  const [governanceTick, setGovernanceTick] = useState(0);
  useEffect(() => {
    const handleGovUpdate = () => setGovernanceTick((t) => t + 1);
    window.addEventListener('spr_dashboard_governance_updated', handleGovUpdate);
    return () => window.removeEventListener('spr_dashboard_governance_updated', handleGovUpdate);
  }, []);

  // Sync draftLayout whenever currentLayout changes externally
  useEffect(() => {
    setDraftLayout(currentLayout);
  }, [currentLayout]);

  // Resolve active role details
  const roleRecord = useMemo(
    () => roles.find((r) => r.code?.toUpperCase() === String(role).toUpperCase()),
    [roles, role]
  );
  const roleDisplayName = roleRecord?.name || String(role).replace(/_/g, ' ');

  // Filter eligible widgets according to role governance entitlements and Feature Control permissions
  const eligibleWidgets = useMemo(() => {
    const roleWidgets = getWidgetsForRole(role, activeTenantId);
    if (isSuperAdmin) {
      return roleWidgets;
    }
    // Regular users: strictly exclude widgets whose source feature is disabled
    return roleWidgets.filter((w) => isWidgetFeaturePermitted(w, isFeatureEnabled));
  }, [role, activeTenantId, isSuperAdmin, isFeatureEnabled, governanceTick]);

  const allCategorizedWidgetIds = useMemo(
    () => new Set(MODULE_CATEGORIES.flatMap((s) => s.widgetIds)),
    []
  );

  const uncategorizedWidgets = useMemo(
    () => eligibleWidgets.filter((w) => !allCategorizedWidgetIds.has(w.id)),
    [eligibleWidgets, allCategorizedWidgetIds]
  );

  // Toggle widget visibility with INSTANT LIVE SYNC & AUTO-SCROLL
  const handleToggleWidget = (widgetId: string) => {
    const widgetDef = WIDGET_REGISTRY[widgetId];
    if (widgetDef && !isWidgetFeaturePermitted(widgetDef, isFeatureEnabled)) {
      return;
    }

    const existing = draftLayout.find((i) => i.widgetId === widgetId);
    let nextLayout: DashboardLayoutItem[];
    const isCurrentlyVisible = existing ? existing.isVisible !== false : false;
    const willBeVisible = !isCurrentlyVisible;

    if (existing) {
      if (!willBeVisible) {
        // If turning OFF, immediately scroll to where the widget currently is so user sees the change!
        const el = document.getElementById(`dashboard-widget-${widgetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      nextLayout = draftLayout.map((i) =>
        i.widgetId === widgetId ? { ...i, isVisible: willBeVisible } : i
      );
    } else {
      const newItem: DashboardLayoutItem = {
        widgetId,
        order: draftLayout.length + 1,
        colSpan: widgetDef ? widgetDef.defaultColSpan : 1,
        isVisible: true,
      };
      nextLayout = [...draftLayout, newItem];
    }
    setDraftLayout(nextLayout);
    // Instant Live Dashboard Update & Persistence
    onSaveLayout(nextLayout, isSuperAdmin ? saveAsDefault : false, role);

    if (willBeVisible) {
      scrollAndHighlightDashboardWidget(widgetId);
    }
  };

  // Update widget-specific sub-settings with INSTANT LIVE SYNC & AUTO-SCROLL
  const handleUpdateWidgetSettings = (widgetId: string, updatedSettings: Record<string, any>) => {
    const existing = draftLayout.find((i) => i.widgetId === widgetId);
    let nextLayout: DashboardLayoutItem[];
    if (existing) {
      nextLayout = draftLayout.map((i) => {
        if (i.widgetId !== widgetId) return i;
        return {
          ...i,
          isVisible: true,
          settings: {
            ...(i.settings || {}),
            ...updatedSettings,
          },
        };
      });
    } else {
      const widgetDef = WIDGET_REGISTRY[widgetId];
      const newItem: DashboardLayoutItem = {
        widgetId,
        order: draftLayout.length + 1,
        colSpan: widgetDef ? widgetDef.defaultColSpan : 4,
        isVisible: true,
        settings: updatedSettings,
      };
      nextLayout = [...draftLayout, newItem];
    }
    setDraftLayout(nextLayout);
    // Instant Live Dashboard Update & Persistence
    onSaveLayout(nextLayout, isSuperAdmin ? saveAsDefault : false, role);
    scrollAndHighlightDashboardWidget(widgetId);
  };

  // Super Admin institutional default save toggle
  const handleSaveAsDefaultToggle = (checked: boolean) => {
    setSaveAsDefault(checked);
    onSaveLayout(draftLayout, checked, role);
  };

  // Instant Reset to Defaults
  const handleReset = () => {
    const defaultLayout = resetLayout(activeTenantId || 'default', role);
    setDraftLayout(defaultLayout);
    onResetLayout(role);
  };

  /**
   * Render individual widget row using DashboardWidgetCardItem.
   */
  const renderWidgetCard = (widgetDef: WidgetDefinition) => {
    const layoutItem = draftLayout.find((i) => i.widgetId === widgetDef.id);
    const isVisible = layoutItem ? layoutItem.isVisible !== false : false;

    return (
      <DashboardWidgetCardItem
        key={`list-${widgetDef.id}`}
        widgetDef={widgetDef}
        role={role}
        checked={isVisible}
        onToggle={() => handleToggleWidget(widgetDef.id)}
        isExpanded={expandedWidgetId === widgetDef.id}
        onToggleExpand={() =>
          setExpandedWidgetId(expandedWidgetId === widgetDef.id ? null : widgetDef.id)
        }
        settings={layoutItem?.settings}
        onUpdateSettings={(newSettings) =>
          handleUpdateWidgetSettings(widgetDef.id, newSettings)
        }
        isSuperAdmin={isSuperAdmin}
        onNavigateToFeatureControl={() => {
          onClose();
          navigate('/section-control');
        }}
      />
    );
  };

  return (
    <DrawerContainer
      padding="none"
      className="space-y-6 pt-2 pb-16 @container text-left rtl:text-right"
      footer={
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-surface shadow-md flex flex-col gap-3">
          {/* Canonical CustomCheckbox for Super Admin Default Layout Save */}
          {isSuperAdmin && (
            <div className="pb-1">
              <CustomCheckbox
                checked={saveAsDefault}
                onChange={handleSaveAsDefaultToggle}
                label={`Save as institutional default layout for all ${roleDisplayName}s`}
                size="sm"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5">
            {/* Live Sync Active Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Live Synced</span>
            </div>

            <div className="flex items-center gap-2">
              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={CheckCircleIcon}
                onClick={onClose}
                className="rounded-xl px-5"
              >
                Done
              </CustomButton>
            </div>
          </div>
        </div>
      }
    >
      {/* 1. Top Description Banner with Reset Defaults Action Button */}
      <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub/50 border theme-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center shrink-0">
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs min-w-0">
            <div className="font-bold theme-text-primary">
              Workspace Customizer for {roleDisplayName}
            </div>
            <div className="text-[11px] theme-text-secondary truncate">
              Changes reflect live on your workspace in real-time
            </div>
          </div>
        </div>

        <CustomButton
          type="button"
          variant="sub"
          size="xs"
          icon={RefreshIcon}
          onClick={handleReset}
          className="shrink-0 rounded-xl"
        >
          Reset Defaults
        </CustomButton>
      </div>

      {/* 2. Module-Wise Categorized Sections or Empty State */}
      {eligibleWidgets.length === 0 ? (
        <div className="p-8 rounded-2xl theme-bg-sub/40 border-2 border-dashed theme-border text-center flex flex-col items-center justify-center space-y-3 my-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold theme-text-primary">
              No Widgets Permitted for {roleDisplayName}
            </div>
            <p className="text-[11px] theme-text-secondary max-w-xs leading-relaxed">
              No widgets are currently granted to this role in the Governance Matrix. Enable widgets in Widget Role &amp; Academy Governance to make them customizable here.
            </p>
          </div>
          {isSuperAdmin && (
            <CustomButton
              type="button"
              variant="secondary"
              size="xs"
              icon={ShieldCheckIcon}
              onClick={() => openDrawer('widget-governance')}
              className="mt-2 rounded-xl"
            >
              Configure Widget Governance
            </CustomButton>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {MODULE_CATEGORIES.map((moduleCat) => {
            const eligibleModuleWidgets = eligibleWidgets.filter((w) =>
              moduleCat.widgetIds.includes(w.id)
            );

            if (eligibleModuleWidgets.length === 0) return null;

            const ModuleIcon = moduleCat.icon;

            return (
              <div key={moduleCat.id} className="space-y-3">
                {/* Clean Module Section Header */}
                <div className="flex items-center justify-between pb-2 border-b theme-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <ModuleIcon className="w-4 h-4 theme-accent shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
                      {moduleCat.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary shrink-0">
                    {eligibleModuleWidgets.length} {eligibleModuleWidgets.length === 1 ? 'widget' : 'widgets'}
                  </span>
                </div>

                {/* Render Clean Widget Cards List */}
                <div className="space-y-2.5">
                  {eligibleModuleWidgets.map(renderWidgetCard)}
                </div>
              </div>
            );
          })}

          {/* Safeguard: Uncategorized Widgets Section */}
          {uncategorizedWidgets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b theme-border">
                <div className="flex items-center gap-2 min-w-0">
                  <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
                    Additional Widgets
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary shrink-0">
                  {uncategorizedWidgets.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {uncategorizedWidgets.map(renderWidgetCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </DrawerContainer>
  );
}
