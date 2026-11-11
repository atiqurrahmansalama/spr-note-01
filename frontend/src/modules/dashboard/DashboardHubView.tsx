import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth as authStore } from '../../utils/localStore';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useFeatureControl } from '../../context/FeatureControlContext';
import {
  extractRoleCode,
  extractRoleId,
  extractRoleName,
  isUserSuperAdmin,
  normalizeRoleCode,
  resolveEffectiveDashboardRole,
} from '../../utils/roleUtils';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import { PageContainer } from '../../components/layout';
import DashboardHeader from './components/DashboardHeader';
import DashboardCustomizerPanel from './components/DashboardCustomizerPanel';
import SuperAdminDashboardView from './views/SuperAdminDashboardView';
import AdminPrincipalDashboardView from './views/AdminPrincipalDashboardView';
import TeacherUstadhDashboardView from './views/TeacherUstadhDashboardView';
import StaffOperatorDashboardView from './views/StaffOperatorDashboardView';
import StudentDashboardView from './views/StudentDashboardView';
import GuardianDashboardView from './views/GuardianDashboardView';
import { getSavedLayout, saveLayout, resetLayout, syncDashboardConfigFromCloud } from './widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, RoleDashboardViewProps } from './types';
import { useRoleManagement } from '../admin/role-management/hooks/useRoleManagement';
import './locales'; // Self-contained 4-language i18n registration

/**
 * Pure dynamic conversion from role code to URL slug.
 * Works for standard roles as well as dynamically created custom roles.
 * e.g., 'SUPER_ADMIN' -> 'super-admin', 'TEACHER' -> 'teacher', 'HOSTEL_SUPER' -> 'hostel-super'
 */
export const roleCodeToSlug = (code: unknown): string => {
  const safeCode = normalizeRoleCode(code) || 'ADMIN';
  return safeCode.toLowerCase().replace(/[_\s]+/g, '-');
};

/**
 * Pure dynamic conversion from URL slug to standard role code.
 * e.g., 'super-admin' -> 'SUPER_ADMIN', 'teacher' -> 'TEACHER'
 */
export const slugToRoleCode = (slug: string): string =>
  normalizeRoleCode(String(slug || '').replace(/-/g, '_'));

/**
 * Centralized presentation view component registry for role archetypes.
 */
const ROLE_VIEW_REGISTRY: Record<string, React.ComponentType<RoleDashboardViewProps>> = {
  SUPER_ADMIN: SuperAdminDashboardView,
  ADMIN: AdminPrincipalDashboardView,
  TEACHER: TeacherUstadhDashboardView,
  STAFF: StaffOperatorDashboardView,
  STUDENT: StudentDashboardView,
  GUARDIAN: GuardianDashboardView,
};

/**
 * Dynamically resolves the presentation view component for any role code
 * by direct match or canonical role-code archetype pattern.
 */
function resolveViewComponent(
  roleCode: string
): React.ComponentType<RoleDashboardViewProps> {
  const normalized = String(roleCode || '').toUpperCase();
  if (ROLE_VIEW_REGISTRY[normalized]) {
    return ROLE_VIEW_REGISTRY[normalized];
  }
  if (normalized.includes('SUPER')) return SuperAdminDashboardView;
  if (normalized.includes('TEACHER') || normalized.includes('USTADH')) return TeacherUstadhDashboardView;
  if (normalized.includes('STUDENT')) return StudentDashboardView;
  if (normalized.includes('GUARDIAN') || normalized.includes('PARENT')) return GuardianDashboardView;
  if (
    normalized.includes('STAFF') ||
    normalized.includes('HOSTEL') ||
    normalized.includes('ACCOUNT') ||
    normalized.includes('OPERAT')
  ) {
    return StaffOperatorDashboardView;
  }
  return AdminPrincipalDashboardView;
}

export default function DashboardHubView() {
  const { isMultiTenantAdmin, isAcademyAdmin, activeTenant, activeTenantId } = useTenant();
  const { config: featureConfig, isFeatureEnabled, refetchConfig, fetchPreviewFlagsForRole } = useFeatureControl();
  const { user: authUser } = useAuth() as { user?: any };
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { roleSlug } = useParams<{ roleSlug?: string }>();
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    if (authUser && typeof authUser === 'object') return authUser;
    return authStore.getUser() || {};
  }, [authUser]);

  // Retrieve dynamic system & custom roles from /role-management
  const { roles = [] } = useRoleManagement();

  const isSuperAdmin = useMemo(
    () => isUserSuperAdmin(currentUser, isMultiTenantAdmin),
    [currentUser, isMultiTenantAdmin]
  );

  // Dynamically resolve actual system role of the logged-in user without ever coercing objects to [OBJECT OBJECT]
  const initialRole: DashboardRole = useMemo(() => {
    if (isSuperAdmin) {
      return 'SUPER_ADMIN';
    }
    const userRoleCode = extractRoleCode(currentUser);
    const userRoleId = extractRoleId(currentUser);
    const userRoleName = extractRoleName(currentUser).trim().toUpperCase();

    // Match against dynamic roles repository by ID, code, or name
    const matchedRole = roles.find(
      (r) =>
        (userRoleId != null && r.id != null && String(r.id) === String(userRoleId)) ||
        (r.code && userRoleCode && r.code.toUpperCase() === userRoleCode) ||
        (r.name && userRoleName && r.name.trim().toUpperCase() === userRoleName)
    );

    if (matchedRole?.code) {
      return matchedRole.code;
    }

    return userRoleCode || 'ADMIN';
  }, [isSuperAdmin, currentUser, roles]);

  // Redirect /dashboard (without role slug) to role-specific dashboard URL dynamically
  useEffect(() => {
    if (!roleSlug) {
      navigate(`/dashboard/${roleCodeToSlug(initialRole)}`, { replace: true });
    }
  }, [roleSlug, initialRole, navigate]);

  // Derive effective role from URL slug using single canonical boundary resolver
  const effectiveRole: DashboardRole = useMemo(
    () =>
      resolveEffectiveDashboardRole({
        roleSlug,
        initialRole,
        isSuperAdmin,
        isMultiTenantAdmin,
        isAcademyAdminFlag: isAcademyAdmin,
        currentUser,
        roles,
      }),
    [roleSlug, initialRole, isSuperAdmin, isMultiTenantAdmin, isAcademyAdmin, currentUser, roles]
  );

  // Self-heal invalid/stale URL slugs (such as /dashboard/[object-object]) cleanly
  useEffect(() => {
    if (!roleSlug || isSuperAdmin) return;
    const slugCode = slugToRoleCode(roleSlug);
    const expectedSlug = roleCodeToSlug(effectiveRole);
    if (!slugCode || (slugCode !== effectiveRole && roleSlug !== expectedSlug)) {
      navigate(`/dashboard/${expectedSlug}`, { replace: true });
    }
  }, [roleSlug, isSuperAdmin, effectiveRole, navigate]);

  // Edit mode state for on-screen drag & resize
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Current layout state for the active effective role
  const [currentRoleLayout, setCurrentRoleLayout] = useState<DashboardLayoutItem[]>(() =>
    getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id)
  );
  const [previewFlags, setPreviewFlags] = useState<Record<string, boolean> | null>(null);
  const [sectionSyncTick, setSectionSyncTick] = useState<number>(0);

  // Immediately sync evaluated Feature & Module Control flags on dashboard mount & broadcast updates
  useEffect(() => {
    refetchConfig();
  }, [refetchConfig, activeTenantId]);

  useEffect(() => {
    const triggerRefresh = () => {
      refetchConfig();
      setSectionSyncTick((t) => t + 1);
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('spr_section_control_channel');
        bc.onmessage = triggerRefresh;
      }
    } catch {}

    window.addEventListener('spr_section_config_updated', triggerRefresh);
    return () => {
      window.removeEventListener('spr_section_config_updated', triggerRefresh);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [refetchConfig]);

  // When Super Admin previews a non-super-admin role, evaluate real Feature & Module Control flags for that role
  useEffect(() => {
    let active = true;
    const normalizedEff = normalizeRoleCode(effectiveRole) || 'ADMIN';
    if (!isSuperAdmin || normalizedEff === 'SUPER_ADMIN') {
      setPreviewFlags(null);
      return;
    }
    fetchPreviewFlagsForRole(normalizedEff, activeTenantId).then((flags) => {
      if (active) {
        setPreviewFlags(flags);
      }
    });
    return () => {
      active = false;
    };
  }, [isSuperAdmin, effectiveRole, activeTenantId, fetchPreviewFlagsForRole, featureConfig, sectionSyncTick]);

  const effectiveFeatureEnabled = useCallback(
    (featureKey?: string): boolean => {
      if (!featureKey) return true;
      if (isSuperAdmin && normalizeRoleCode(effectiveRole) !== 'SUPER_ADMIN' && previewFlags) {
        if (previewFlags[featureKey] !== undefined) {
          return !!previewFlags[featureKey];
        }
      }
      return isFeatureEnabled(featureKey);
    },
    [isSuperAdmin, effectiveRole, previewFlags, isFeatureEnabled]
  );

  // Hydrate Role Default Templates from PostgreSQL across browsers/users
  useEffect(() => {
    let mounted = true;
    syncDashboardConfigFromCloud(activeTenantId).then((didSync) => {
      if (mounted && didSync) {
        setCurrentRoleLayout(getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id));
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeTenantId, currentUser.id, effectiveRole]);

  // Synchronize layout when effective role changes or when updated by Super Admin template save
  useEffect(() => {
    setCurrentRoleLayout(getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id));

    const handleLayoutUpdate = (e: any) => {
      if (e?.detail?.role === effectiveRole || !e?.detail?.role) {
        setCurrentRoleLayout(getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id));
      }
    };
    window.addEventListener('spr_dashboard_layout_updated', handleLayoutUpdate);
    return () => {
      window.removeEventListener('spr_dashboard_layout_updated', handleLayoutUpdate);
    };
  }, [effectiveRole, activeTenantId, currentUser.id]);

  const handleRoleChange = useCallback((newRole: DashboardRole) => {
    navigate(`/dashboard/${roleCodeToSlug(newRole)}`);
  }, [navigate]);

  const handleSaveLayout = useCallback((newLayout: DashboardLayoutItem[], saveAsRoleDefault = false, targetRole?: DashboardRole) => {
    const roleToPersist = targetRole || effectiveRole;
    if (roleToPersist === effectiveRole) {
      setCurrentRoleLayout(newLayout);
    }
    // Super Admin can toggle saving as institutional default or personal override
    const shouldSaveAsRoleDefault = isSuperAdmin ? Boolean(saveAsRoleDefault) : false;
    saveLayout(activeTenantId || 'default', roleToPersist, newLayout, currentUser.id, shouldSaveAsRoleDefault);
  }, [activeTenantId, effectiveRole, currentUser.id, isSuperAdmin]);

  const handleResetLayout = useCallback((targetRole?: DashboardRole) => {
    const roleToReset = targetRole || effectiveRole;
    const defaultLayout = resetLayout(activeTenantId || 'default', roleToReset, currentUser.id);
    if (roleToReset === effectiveRole) {
      setCurrentRoleLayout(defaultLayout);
    }
  }, [activeTenantId, effectiveRole, currentUser.id]);

  const handleOpenCustomizer = useCallback(() => {
    openDrawer('dashboard-customizer', { role: effectiveRole });
  }, [openDrawer, effectiveRole]);

  // Register Dashboard Workspace Customizer directly in SPR Note's standard Right Sidebar
  useDrawerRegistration(
    'dashboard-customizer',
    () => ({
      title: `Customize ${effectiveRole.replace('_', ' ')} Workspace`,
      category: 'Workspace Customizer',
      size: 'lg',
      content: (
        <DashboardCustomizerPanel
          key={`dashboard-customizer-${effectiveRole}`}
          role={effectiveRole}
          currentLayout={currentRoleLayout}
          onSaveLayout={handleSaveLayout}
          onResetLayout={handleResetLayout}
          isSuperAdmin={isSuperAdmin}
          isFeatureEnabledOverride={effectiveFeatureEnabled}
          onClose={closeDrawer}
        />
      ),
    }),
    [effectiveRole, currentRoleLayout, isSuperAdmin, effectiveFeatureEnabled, handleSaveLayout, handleResetLayout, closeDrawer]
  );

  const displayName =
    currentUser.name ||
    currentUser.full_name ||
    (currentUser.first_name
      ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
      : currentUser.username || currentUser.phone_number || 'Administrator');

  const academicSessionName = activeTenant?.academic_year || '2026-2027';

  // Resolve presentation view component dynamically
  const ActiveViewComponent = resolveViewComponent(effectiveRole);

  return (
    <PageContainer>
      {/* 1. Global Header with Greeting, Date, Edit Mode Toggle, Configure Drawer & Super Admin Role Switcher */}
      <DashboardHeader
        userName={displayName}
        userRole={initialRole}
        effectiveRole={effectiveRole}
        onRoleChange={handleRoleChange}
        isSuperAdmin={isSuperAdmin}
        academicYearName={academicSessionName}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onOpenCustomizerDrawer={handleOpenCustomizer}
      />

      {/* 2. Role-Driven Dynamic View Dispatcher */}
      <div className="w-full min-w-0 transition-all duration-300">
        <ActiveViewComponent
          role={effectiveRole}
          isEditMode={isEditMode}
          onOpenWidgetCatalog={handleOpenCustomizer}
          layoutItems={currentRoleLayout}
          onUpdateLayout={handleSaveLayout}
          isFeatureEnabled={effectiveFeatureEnabled}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </PageContainer>
  );
}
