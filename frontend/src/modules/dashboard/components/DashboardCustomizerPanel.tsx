import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRole, DashboardLayoutItem, WidgetDefinition } from '../types';
import { 
  getWidgetsForRole, 
  WIDGET_REGISTRY, 
  isWidgetFeaturePermitted,
  resetLayout 
} from '../widgetRegistry';
import { SECTION_CATEGORIES } from '../widgetCategories';
import DashboardWidgetCardItem from './DashboardWidgetCardItem';
import DrawerContainer from '../../../components/layout/DrawerContainer';
import CustomButton from '../../../components/ui/CustomButton';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import CustomSelect from '../../../components/ui/CustomSelect';
import { useRoleManagement } from '../../admin/role-management/hooks/useRoleManagement';
import { useTenant } from '../../../context/TenantContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { getRoleIcon } from './DashboardHeader';
import {
  CheckCircleIcon,
  RefreshIcon,
  SparklesIcon,
  ChevronIcon,
  CalendarIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  AdjustmentsHorizontalIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ExternalLinkIcon,
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
 * Set of widget IDs that offer interactive sub-configuration panels.
 */
const CONFIGURABLE_WIDGET_IDS = new Set([
  'kpi_metrics',
  'recitation_trends',
  'quick_actions',
  'academic_calendar',
]);

export default function DashboardCustomizerPanel({
  role,
  currentLayout,
  onSaveLayout,
  onResetLayout,
  isSuperAdmin,
  onClose,
}: DashboardCustomizerPanelProps) {
  const [draftLayout, setDraftLayout] = useState<DashboardLayoutItem[]>(currentLayout);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  // All cards collapsed by default
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { roles = [] } = useRoleManagement();
  const { activeTenantId } = useTenant();
  const { isFeatureEnabled } = useFeatureControl();
  const { openDrawer } = useRightSidebar();

  // Re-sync eligible widgets when widget governance permissions are saved
  const [governanceTick, setGovernanceTick] = useState(0);
  useEffect(() => {
    const handleGovUpdate = () => setGovernanceTick((t) => t + 1);
    window.addEventListener('spr_dashboard_governance_updated', handleGovUpdate);
    return () => window.removeEventListener('spr_dashboard_governance_updated', handleGovUpdate);
  }, []);

  // Load layout whenever currentLayout changes
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
    () => new Set(SECTION_CATEGORIES.flatMap((s) => s.widgetIds)),
    []
  );

  const uncategorizedWidgets = useMemo(
    () => eligibleWidgets.filter((w) => !allCategorizedWidgetIds.has(w.id)),
    [eligibleWidgets, allCategorizedWidgetIds]
  );

  // Toggle widget visibility
  const handleToggleWidget = (widgetId: string) => {
    const widgetDef = WIDGET_REGISTRY[widgetId];
    if (widgetDef && !isWidgetFeaturePermitted(widgetDef, isFeatureEnabled)) {
      return; // Cannot enable a disabled feature
    }

    const existing = draftLayout.find((i) => i.widgetId === widgetId);
    if (existing) {
      setDraftLayout(
        draftLayout.map((i) =>
          i.widgetId === widgetId ? { ...i, isVisible: !i.isVisible } : i
        )
      );
    } else {
      const newItem: DashboardLayoutItem = {
        widgetId,
        order: draftLayout.length + 1,
        colSpan: widgetDef ? widgetDef.defaultColSpan : 1,
        isVisible: true,
      };
      setDraftLayout([...draftLayout, newItem]);
    }
  };

  // Update widget-specific sub-settings (e.g. for Recitation Trends, Quick Actions, Calendar)
  const handleUpdateWidgetSettings = (widgetId: string, updatedSettings: Record<string, any>) => {
    setDraftLayout(
      draftLayout.map((i) => {
        if (i.widgetId !== widgetId) return i;
        return {
          ...i,
          settings: {
            ...(i.settings || {}),
            ...updatedSettings,
          },
        };
      })
    );
  };

  const handleApply = () => {
    onSaveLayout(draftLayout, isSuperAdmin ? saveAsDefault : false, role);
    onClose();
  };

  const handleReset = () => {
    const defaultLayout = resetLayout(activeTenantId || 'default', role);
    setDraftLayout(defaultLayout);
    onResetLayout(role);
  };

  /**
   * Render individual widget item row in customizer using shared reusable DashboardWidgetCardItem.
   */
  const renderWidgetCard = (widgetDef: WidgetDefinition) => {
    const layoutItem = draftLayout.find((i) => i.widgetId === widgetDef.id);
    const isVisible = layoutItem ? layoutItem.isVisible !== false : false;

    return (
      <DashboardWidgetCardItem
        key={widgetDef.id}
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
                onChange={(checked: boolean) => setSaveAsDefault(checked)}
                label={`Save as institutional default layout for all ${roleDisplayName}s`}
                size="sm"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5">
            <CustomButton
              type="button"
              variant="sub"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </CustomButton>
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={CheckCircleIcon}
              onClick={handleApply}
              className="rounded-xl"
            >
              Save & Apply
            </CustomButton>
          </div>
        </div>
      }
    >
      {/* 1. Top Description Banner with Reset Defaults Action Button */}
      <div className="p-4 rounded-2xl theme-bg-sub/50 border theme-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center shrink-0">
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs min-w-0">
            <div className="font-bold theme-text-primary">
              Workspace Customizer for {roleDisplayName}
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

      {/* 2. Categorized Sections with Clean Streamlined Headers or Empty State */}
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
          {SECTION_CATEGORIES.map((section) => {
            const eligibleSectionWidgets = eligibleWidgets.filter((w) =>
              section.widgetIds.includes(w.id)
            );

            if (eligibleSectionWidgets.length === 0) return null;

            const SectionIcon = section.icon;

            return (
              <div key={section.id} className="space-y-3">
                {/* Clean Streamlined Section Header */}
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <SectionIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    {section.title}
                  </h4>
                </div>

                {/* Widget Cards */}
                <div className="space-y-2.5">
                  {eligibleSectionWidgets.map(renderWidgetCard)}
                </div>
              </div>
            );
          })}

          {/* Safeguard: Uncategorized Widgets Section */}
          {uncategorizedWidgets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <SparklesIcon className="w-4 h-4 theme-accent" />
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
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
