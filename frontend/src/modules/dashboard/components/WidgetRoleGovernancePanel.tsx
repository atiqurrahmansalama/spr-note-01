import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRole, WidgetDefinition } from '../types';
import {
  WIDGET_REGISTRY,
  getWidgetRoleEntitlements,
  saveWidgetRoleEntitlements,
  resetWidgetRoleEntitlements,
  isWidgetFeaturePermitted,
} from '../widgetRegistry';
import { SECTION_CATEGORIES } from '../widgetCategories';
import DashboardWidgetCardItem from './DashboardWidgetCardItem';
import DrawerContainer from '../../../components/layout/DrawerContainer';
import CustomButton from '../../../components/ui/CustomButton';
import CustomSelect from '../../../components/ui/CustomSelect';
import SegmentedSwitch, { SegmentedSwitchOption } from '../../../components/ui/SegmentedSwitch';
import { useRoleManagement } from '../../admin/role-management/hooks/useRoleManagement';
import { useTenant } from '../../../context/TenantContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useToast } from '../../../context/ToastContext';
import { getRoleIcon } from './DashboardHeader';
import {
  ShieldCheckIcon,
  GlobeIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  RefreshIcon,
  GroupsIcon,
  SparklesIcon,
} from '../../../components/ui/Icons';

export interface WidgetRoleGovernancePanelProps {
  activeTenantId?: string;
  onClose: () => void;
}

export default function WidgetRoleGovernancePanel({
  activeTenantId,
  onClose,
}: WidgetRoleGovernancePanelProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { roles = [] } = useRoleManagement();
  const { institutions = [] } = useTenant();
  const { isFeatureEnabled } = useFeatureControl();

  // Governance Dimension: Choose between configuring by Role Scope OR by Academy Override Scope (mutually exclusive)
  const [governanceMode, setGovernanceMode] = useState<'role' | 'academy'>('role');

  // 1. Role Scope Selector (active when governanceMode === 'role')
  const [selectedRole, setSelectedRole] = useState<DashboardRole | 'ALL'>('ALL');

  // 2. Academy Override Scope Selector (active when governanceMode === 'academy')
  const [selectedAcademyScope, setSelectedAcademyScope] = useState<string>('ALL');

  // In-memory Entitlements state
  const [entitlements, setEntitlements] = useState<Record<string, string[]>>(() => {
    const scopeKey = selectedAcademyScope === 'ALL' ? 'GLOBAL' : selectedAcademyScope;
    return getWidgetRoleEntitlements(scopeKey);
  });

  // Widget-specific settings configuration (e.g. for KPI cards, calendar categories)
  const [widgetSettings, setWidgetSettings] = useState<Record<string, any>>({});
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Reload entitlements when governance mode or selected academy scope changes
  useEffect(() => {
    const scopeKey =
      governanceMode === 'role'
        ? 'GLOBAL'
        : selectedAcademyScope === 'ALL'
        ? 'GLOBAL'
        : selectedAcademyScope;
    setEntitlements(getWidgetRoleEntitlements(scopeKey));
    setHasUnsavedChanges(false);
  }, [governanceMode, selectedAcademyScope]);

  // Dynamic role options with "All Roles" at top
  const roleSelectOptions = useMemo(() => {
    const list = [
      {
        value: 'ALL',
        label: 'All Roles (Global)',
        description: 'Universal across all system & dynamic roles',
        icon: GroupsIcon,
      },
    ];

    roles.forEach((r) => {
      const RoleIcon = getRoleIcon(r.code, r.hierarchy_level);
      list.push({
        value: r.code,
        label: r.name,
        description: r.description || `Hierarchy level ${r.hierarchy_level}`,
        icon: RoleIcon as any,
      });
    });

    return list;
  }, [roles]);

  // Selected role metadata
  const selectedRoleRecord = useMemo(() => {
    if (selectedRole === 'ALL') return null;
    return roles.find((r) => r.code?.toUpperCase() === String(selectedRole).toUpperCase());
  }, [roles, selectedRole]);

  const selectedRoleDisplayName =
    selectedRole === 'ALL' ? 'All Roles' : selectedRoleRecord?.name || String(selectedRole).replace(/_/g, ' ');
  const SelectedRoleIcon = (selectedRole === 'ALL' ? GroupsIcon : getRoleIcon(selectedRole, selectedRoleRecord?.hierarchy_level)) as any;

  // Dynamic academy scope options with "All Academies" at top
  const academyScopeOptions = useMemo(() => {
    const list = [
      {
        value: 'ALL',
        label: 'All Academies / Campuses',
        description: 'Universal across global standard and all branch overrides',
        icon: GlobeIcon,
      },
      {
        value: 'GLOBAL',
        label: 'Institutional Global Standard (All Campuses)',
        description: 'Baseline policy across all academy branches',
        icon: GlobeIcon,
      },
    ];

    institutions.forEach((inst: any) => {
      const instId = String(inst.id);
      list.push({
        value: instId,
        label: inst.name || inst.code || `Campus #${instId}`,
        description: `Campus-specific policy override (${inst.code || 'Branch'})`,
        icon: BuildingOfficeIcon,
      });
    });

    return list;
  }, [institutions]);

  const selectedAcademyRecord = useMemo(
    () => academyScopeOptions.find((a) => a.value === selectedAcademyScope),
    [academyScopeOptions, selectedAcademyScope]
  );
  const selectedAcademyDisplayName = selectedAcademyRecord?.label || 'All Campuses';

  // Governance Dimension Options for canonical SegmentedSwitch
  const governanceModeOptions: SegmentedSwitchOption<'role' | 'academy'>[] = useMemo(
    () => [
      {
        value: 'role',
        label: 'Role Scopes',
        icon: GroupsIcon,
      },
      {
        value: 'academy',
        label: 'Academy Overrides',
        icon: GlobeIcon,
      },
    ],
    []
  );

  // All registered widgets
  const allWidgets = useMemo(() => Object.values(WIDGET_REGISTRY), []);

  // Determine whether widget is permitted for the active governance dimension
  const getWidgetStatus = useCallback(
    (widgetId: string) => {
      const allowedRoles = entitlements[widgetId] || WIDGET_REGISTRY[widgetId]?.allowedRoles || [];

      // 1. When configuring by Academy Override:
      if (governanceMode === 'academy') {
        const isPermittedInAcademy = allowedRoles.length > 0;
        return { permitted: isPermittedInAcademy, indeterminate: false };
      }

      // 2. When configuring by Role Scope:
      if (selectedRole === 'ALL') {
        const hasAllToken = allowedRoles.some(
          (r) => String(r).toUpperCase() === 'ALL' || String(r).toUpperCase() === 'ALL_ROLES'
        );
        if (hasAllToken) {
          return { permitted: true, indeterminate: false };
        }

        const permittedCount = roles.filter((r) =>
          allowedRoles.some((ar) => String(ar).toUpperCase() === String(r.code).toUpperCase())
        ).length;

        if (permittedCount === roles.length && roles.length > 0) {
          return { permitted: true, indeterminate: false };
        }
        if (permittedCount > 0) {
          return { permitted: false, indeterminate: true };
        }
        return { permitted: false, indeterminate: false };
      }

      const target = String(selectedRole).toUpperCase();
      const permitted = allowedRoles.some((r) => {
        const u = String(r).toUpperCase();
        return u === target || u === 'ALL' || u === 'ALL_ROLES';
      });

      return { permitted, indeterminate: false };
    },
    [entitlements, governanceMode, selectedRole, roles]
  );

  // Toggle entitlement for a single widget based on active dimension
  const handleToggleWidget = useCallback(
    (widgetId: string) => {
      setEntitlements((prev) => {
        const currentAllowed = prev[widgetId] ? [...prev[widgetId]] : (WIDGET_REGISTRY[widgetId]?.allowedRoles || []);

        // 1. Academy Override Dimension
        if (governanceMode === 'academy') {
          const isCurrentlyPermitted = currentAllowed.length > 0;
          return {
            ...prev,
            [widgetId]: isCurrentlyPermitted ? [] : (WIDGET_REGISTRY[widgetId]?.allowedRoles || ['ALL']),
          };
        }

        // 2. Role Scope Dimension
        if (selectedRole === 'ALL') {
          const status = getWidgetStatus(widgetId);
          if (status.permitted) {
            return {
              ...prev,
              [widgetId]: [],
            };
          }
          const allRoleCodes = Array.from(new Set(['ALL', ...roles.map((r) => r.code)]));
          return {
            ...prev,
            [widgetId]: allRoleCodes,
          };
        }

        const target = String(selectedRole).toUpperCase();
        const exists = currentAllowed.some((r) => {
          const u = String(r).toUpperCase();
          return u === target || u === 'ALL' || u === 'ALL_ROLES';
        });

        let nextAllowed: string[];
        if (exists) {
          nextAllowed = currentAllowed.filter((r) => {
            const u = String(r).toUpperCase();
            return u !== target && u !== 'ALL' && u !== 'ALL_ROLES';
          });
        } else {
          nextAllowed = [...currentAllowed, selectedRole];
        }

        return {
          ...prev,
          [widgetId]: nextAllowed,
        };
      });
      setHasUnsavedChanges(true);
    },
    [governanceMode, selectedRole, getWidgetStatus, roles]
  );

  // Batch toggle category widgets
  const handleToggleAllInCategory = useCallback(
    (widgetIds: string[], enable: boolean) => {
      setEntitlements((prev) => {
        const next = { ...prev };

        if (governanceMode === 'academy') {
          widgetIds.forEach((wId) => {
            next[wId] = enable ? (WIDGET_REGISTRY[wId]?.allowedRoles || ['ALL']) : [];
          });
        } else {
          const allRoleCodes = Array.from(new Set(['ALL', ...roles.map((r) => r.code)]));

          widgetIds.forEach((wId) => {
            const currentAllowed = next[wId] ? [...next[wId]] : (WIDGET_REGISTRY[wId]?.allowedRoles || []);

            if (selectedRole === 'ALL') {
              next[wId] = enable ? allRoleCodes : [];
            } else {
              const target = String(selectedRole).toUpperCase();
              const exists = currentAllowed.some((r) => {
                const u = String(r).toUpperCase();
                return u === target || u === 'ALL' || u === 'ALL_ROLES';
              });

              if (enable && !exists) {
                next[wId] = [...currentAllowed, selectedRole];
              } else if (!enable && exists) {
                next[wId] = currentAllowed.filter((r) => {
                  const u = String(r).toUpperCase();
                  return u !== target && u !== 'ALL' && u !== 'ALL_ROLES';
                });
              }
            }
          });
        }

        return next;
      });
      setHasUnsavedChanges(true);
    },
    [governanceMode, selectedRole, roles]
  );

  // Update widget settings (like KPI cards, calendar filters)
  const handleUpdateWidgetSettings = (widgetId: string, updatedSettings: Record<string, any>) => {
    setWidgetSettings((prev) => ({
      ...prev,
      [widgetId]: {
        ...(prev[widgetId] || {}),
        ...updatedSettings,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Reset to system defaults
  const handleResetDefaults = () => {
    const scopeToReset =
      governanceMode === 'role'
        ? 'GLOBAL'
        : selectedAcademyScope === 'ALL'
        ? 'GLOBAL'
        : selectedAcademyScope;

    resetWidgetRoleEntitlements(scopeToReset);
    if (selectedAcademyScope === 'ALL') {
      resetWidgetRoleEntitlements('ALL');
    }
    setEntitlements(getWidgetRoleEntitlements(scopeToReset));
    setHasUnsavedChanges(false);
    showToast?.('Widget permissions reset to system baseline defaults.', 'info');
  };

  // Save changes and broadcast across application layers
  const handleSave = () => {
    if (governanceMode === 'role') {
      saveWidgetRoleEntitlements('GLOBAL', entitlements);
      saveWidgetRoleEntitlements('ALL', entitlements);
      showToast?.(`Widget permissions saved for ${selectedRoleDisplayName}`, 'success');
    } else {
      if (selectedAcademyScope === 'ALL') {
        saveWidgetRoleEntitlements('GLOBAL', entitlements);
        institutions.forEach((inst: any) => {
          saveWidgetRoleEntitlements(String(inst.id), entitlements);
        });
        saveWidgetRoleEntitlements('ALL', entitlements);
      } else {
        saveWidgetRoleEntitlements(selectedAcademyScope, entitlements);
      }
      showToast?.(`Academy widget permissions saved for ${selectedAcademyDisplayName}`, 'success');
    }

    setHasUnsavedChanges(false);
    onClose();
  };

  // Calculate statistics for active scope
  const stats = useMemo(() => {
    let permittedCount = 0;
    let blockedByFeatureCount = 0;

    allWidgets.forEach((w) => {
      const status = getWidgetStatus(w.id);
      if (status.permitted) {
        permittedCount += 1;
      }
      if (!isWidgetFeaturePermitted(w, isFeatureEnabled)) {
        blockedByFeatureCount += 1;
      }
    });

    return {
      total: allWidgets.length,
      permitted: permittedCount,
      blockedByFeature: blockedByFeatureCount,
    };
  }, [allWidgets, getWidgetStatus, isFeatureEnabled]);

  const allCategorizedWidgetIds = useMemo(
    () => new Set(SECTION_CATEGORIES.flatMap((s) => s.widgetIds)),
    []
  );

  const uncategorizedWidgets = useMemo(
    () => allWidgets.filter((w) => !allCategorizedWidgetIds.has(w.id)),
    [allWidgets, allCategorizedWidgetIds]
  );

  return (
    <DrawerContainer
      padding="none"
      className="space-y-6 pt-2 pb-16 @container text-left rtl:text-right"
      footer={
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-surface shadow-md flex items-center justify-between gap-3">
          <div className="text-xs theme-text-secondary truncate">
            {hasUnsavedChanges ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                You have unsaved permission changes.
              </span>
            ) : (
              <span>All permissions synced with governance storage.</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              onClick={handleSave}
              className="rounded-xl"
            >
              Save Permissions
            </CustomButton>
          </div>
        </div>
      }
    >
      {/* 1. Top Governance Header & Reset Action */}
      <div className="p-4 rounded-2xl theme-bg-sub/50 border theme-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs min-w-0">
            <div className="font-bold theme-text-primary">
              Widget Role & Academy Scopes Governance
            </div>
          </div>
        </div>

        <CustomButton
          type="button"
          variant="sub"
          size="xs"
          icon={RefreshIcon}
          onClick={handleResetDefaults}
          className="shrink-0 rounded-xl"
          title="Reset to Factory Defaults"
        >
          Reset Defaults
        </CustomButton>
      </div>

      {/* 2. Top Controls: Exclusive Option Switcher (Role Scopes OR Academy Overrides) */}
      <div className="p-3.5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-4">
        {/* Dimension Mode Segmented Switcher */}
        <SegmentedSwitch<'role' | 'academy'>
          value={governanceMode}
          onChange={(val) => {
            setGovernanceMode(val);
            if (val === 'role') {
              setEntitlements(getWidgetRoleEntitlements('GLOBAL'));
            } else {
              const scopeKey = selectedAcademyScope === 'ALL' ? 'GLOBAL' : selectedAcademyScope;
              setEntitlements(getWidgetRoleEntitlements(scopeKey));
            }
          }}
          options={governanceModeOptions}
          fullWidth
          size="sm"
        />

        {/* Single Exclusive Selector Displayed */}
        {governanceMode === 'role' ? (
          <CustomSelect
            label="Role Scope"
            value={selectedRole}
            onChange={(val: any) => setSelectedRole(val as (DashboardRole | 'ALL'))}
            options={roleSelectOptions}
            icon={SelectedRoleIcon}
            size="sm"
            placeholder="Select a role..."
            searchable={roleSelectOptions.length > 5}
          />
        ) : (
          <CustomSelect
            label="Academy Override Scope"
            value={selectedAcademyScope}
            onChange={(val: any) => setSelectedAcademyScope(String(val))}
            options={academyScopeOptions}
            icon={GlobeIcon}
            size="sm"
            placeholder="Select campus scope..."
            searchable={academyScopeOptions.length > 5}
          />
        )}

        {/* Live Scope Status & KPI Indicator */}
        <div className="pt-2 border-t theme-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="theme-text-secondary">Active Policy:</span>
            <span className="font-semibold theme-text-primary">
              {governanceMode === 'role' ? selectedRoleDisplayName : selectedAcademyDisplayName}
            </span>
            <span className="opacity-40">|</span>
            <span className="theme-text-secondary">
              {governanceMode === 'role' ? 'Role-Based Policy' : 'Campus-Level Policy'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] theme-bg-accent-soft text-[var(--accent-main)]">
              {stats.permitted} of {stats.total} Permitted
            </span>
            {stats.blockedByFeature > 0 && (
              <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {stats.blockedByFeature} Module Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Categorized Widget Entitlement Rows (Reusing Reusable DashboardWidgetCardItem with Full Expand Options) */}
      <div className="space-y-6 pt-2">
        {SECTION_CATEGORIES.map((section) => {
          const categoryWidgets = allWidgets.filter((w) => section.widgetIds.includes(w.id));
          if (categoryWidgets.length === 0) return null;

          const SectionIcon = section.icon;
          const sectionWidgetIds = categoryWidgets.map((w) => w.id);
          const allEnabled = sectionWidgetIds.every((id) => getWidgetStatus(id).permitted);

          return (
            <div key={section.id} className="space-y-3">
              {/* Streamlined Section Header with Quick Actions */}
              <div className="flex items-center justify-between pb-2 border-b theme-border select-none">
                <div className="flex items-center gap-2">
                  <SectionIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    {section.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAllInCategory(sectionWidgetIds, !allEnabled)}
                    className="text-[11px] font-semibold text-[var(--accent-main)] hover:underline cursor-pointer"
                  >
                    {allEnabled ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Widget List reusing DashboardWidgetCardItem with Accordion Expands */}
              <div className="space-y-2.5">
                {categoryWidgets.map((widgetDef) => {
                  const status = getWidgetStatus(widgetDef.id);

                  return (
                    <DashboardWidgetCardItem
                      key={widgetDef.id}
                      widgetDef={widgetDef}
                      role={governanceMode === 'role' ? selectedRole : 'ALL'}
                      checked={status.permitted}
                      indeterminate={status.indeterminate}
                      onToggle={() => handleToggleWidget(widgetDef.id)}
                      isExpanded={expandedWidgetId === widgetDef.id}
                      onToggleExpand={() =>
                        setExpandedWidgetId(expandedWidgetId === widgetDef.id ? null : widgetDef.id)
                      }
                      settings={widgetSettings[widgetDef.id]}
                      onUpdateSettings={(newSettings) =>
                        handleUpdateWidgetSettings(widgetDef.id, newSettings)
                      }
                      isSuperAdmin={true}
                      onNavigateToFeatureControl={() => {
                        onClose();
                        navigate('/section-control');
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Safeguard: Uncategorized Widgets */}
        {uncategorizedWidgets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b theme-border select-none">
              <SparklesIcon className="w-4 h-4 theme-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Additional Widgets
              </h4>
            </div>

            <div className="space-y-2.5">
              {uncategorizedWidgets.map((widgetDef) => {
                const status = getWidgetStatus(widgetDef.id);
                return (
                  <DashboardWidgetCardItem
                    key={widgetDef.id}
                    widgetDef={widgetDef}
                    role={governanceMode === 'role' ? selectedRole : 'ALL'}
                    checked={status.permitted}
                    indeterminate={status.indeterminate}
                    onToggle={() => handleToggleWidget(widgetDef.id)}
                    isExpanded={expandedWidgetId === widgetDef.id}
                    onToggleExpand={() =>
                      setExpandedWidgetId(expandedWidgetId === widgetDef.id ? null : widgetDef.id)
                    }
                    settings={widgetSettings[widgetDef.id]}
                    onUpdateSettings={(newSettings) =>
                      handleUpdateWidgetSettings(widgetDef.id, newSettings)
                    }
                    isSuperAdmin={true}
                    onNavigateToFeatureControl={() => {
                      onClose();
                      navigate('/section-control');
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DrawerContainer>
  );
}
