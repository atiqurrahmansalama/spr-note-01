import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRole, DashboardLayoutItem, WidgetDefinition } from '../types';
import { 
  getAvailableWidgets, 
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
import { normalizeRoleCode } from '../../../utils/roleUtils';
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
  isFeatureEnabledOverride?: (featureKey?: string) => boolean;
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
  isFeatureEnabledOverride,
  onClose,
}: DashboardCustomizerPanelProps) {
  const [draftLayout, setDraftLayout] = useState<DashboardLayoutItem[]>(currentLayout);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { roles = [] } = useRoleManagement();
  const { activeTenantId } = useTenant();
  const { isFeatureEnabled: contextIsFeatureEnabled } = useFeatureControl();
  const effectiveIsFeatureEnabled = isFeatureEnabledOverride || contextIsFeatureEnabled;

  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(() => {
    try {
      const templateKey = `spr_dashboard_template_${activeTenantId || 'default'}_${role}_v1`;
      return Boolean(localStorage.getItem(templateKey));
    } catch {
      return false;
    }
  });

  // Sync draftLayout whenever currentLayout changes externally
  useEffect(() => {
    setDraftLayout(currentLayout);
  }, [currentLayout]);

  // Resolve active role details safely
  const normalizedRoleCode = normalizeRoleCode(role) || 'ADMIN';
  const roleRecord = useMemo(
    () => roles.find((r) => r.code?.toUpperCase() === normalizedRoleCode),
    [roles, normalizedRoleCode]
  );
  const roleDisplayName = roleRecord?.name || normalizedRoleCode.replace(/_/g, ' ');

  // Filter eligible widgets strictly via Feature & Module Control (`dashboard_widget_*` & module flags)
  const eligibleWidgets = useMemo(
    () => getAvailableWidgets(effectiveIsFeatureEnabled),
    [effectiveIsFeatureEnabled]
  );

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
    if (widgetDef && !isWidgetFeaturePermitted(widgetDef, effectiveIsFeatureEnabled)) {
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
        isFeatureEnabledOverride={effectiveIsFeatureEnabled}
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
        <div className="w-full flex flex-col gap-3 pt-3 border-t theme-border">
          {/* Canonical CustomCheckbox for Super Admin Default Layout Save */}
          {isSuperAdmin && (
            <div className="px-0.5">
              <CustomCheckbox
                checked={saveAsDefault}
                onChange={handleSaveAsDefaultToggle}
                label={`Save as institutional default layout for all ${roleDisplayName}s`}
                size="sm"
              />
            </div>
          )}

          {/* Bottom Action Line outside any card box */}
          <div className="flex items-center justify-between gap-3 w-full">
            <CustomButton
              type="button"
              variant="sub"
              size="sm"
              icon={RefreshIcon}
              onClick={handleReset}
              className="rounded-xl px-4"
            >
              Reset Defaults
            </CustomButton>

            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={CheckCircleIcon}
              onClick={onClose}
              className="rounded-xl px-6"
            >
              Done
            </CustomButton>
          </div>
        </div>
      }
    >
      {/* 1. Top Description Header - Flush with start margin */}
      <div className="space-y-1 pb-1">
        <h3 className="text-xs font-bold theme-text-primary">
          Workspace Customizer for {roleDisplayName}
        </h3>
        <p className="text-[11px] theme-text-secondary leading-relaxed">
          Changes reflect live on your workspace in real-time
        </p>
      </div>

      {/* 2. Module-Wise Categorized Sections or Empty State */}
      {eligibleWidgets.length === 0 ? (
        <div className="p-8 rounded-2xl theme-bg-app border-0 text-center flex flex-col items-center justify-center space-y-3 my-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold theme-text-primary">
              No Widgets Permitted for {roleDisplayName}
            </div>
            <p className="text-[11px] theme-text-secondary max-w-xs leading-relaxed">
              No widgets are currently enabled for this role under App Management &rarr; Feature &amp; Module Control. Enable widgets there to customize them here.
            </p>
          </div>
          {isSuperAdmin && (
            <CustomButton
              type="button"
              variant="secondary"
              size="xs"
              icon={ShieldCheckIcon}
              onClick={() => {
                onClose();
                navigate('/section-control');
              }}
              className="mt-2 rounded-xl"
            >
              Configure in Feature Control
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
                {/* Canonical Streamlined Section Header */}
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <ModuleIcon className="w-4 h-4 theme-accent shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
                    {moduleCat.title}
                  </h4>
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
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
                  Additional Widgets
                </h4>
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
