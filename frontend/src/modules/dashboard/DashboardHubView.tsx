import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth as authStore } from '../../utils/localStore';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import { PageContainer } from '../../components/layout';
import DashboardHeader from './components/DashboardHeader';
import DashboardCustomizerPanel from './components/DashboardCustomizerPanel';
import WidgetRoleGovernancePanel from './components/WidgetRoleGovernancePanel';
import SuperAdminDashboardView from './views/SuperAdminDashboardView';
import AdminPrincipalDashboardView from './views/AdminPrincipalDashboardView';
import TeacherUstadhDashboardView from './views/TeacherUstadhDashboardView';
import StaffOperatorDashboardView from './views/StaffOperatorDashboardView';
import StudentDashboardView from './views/StudentDashboardView';
import GuardianDashboardView from './views/GuardianDashboardView';
import { getSavedLayout, saveLayout, resetLayout } from './widgetRegistry';
import type { DashboardRole, DashboardLayoutItem, RoleDashboardViewProps } from './types';
import { useRoleManagement } from '../admin/role-management/hooks/useRoleManagement';
import type { RoleRecord } from '../admin/role-management/types';
import './locales'; // Self-contained 4-language i18n registration

/**
 * Pure dynamic conversion from role code to URL slug.
 * Works for standard roles as well as dynamically created custom roles.
 * e.g., 'SUPER_ADMIN' -> 'super-admin', 'TEACHER' -> 'teacher', 'HOSTEL_SUPER' -> 'hostel-super'
 */
export const roleCodeToSlug = (code: string): string =>
  String(code || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

/**
 * Pure dynamic conversion from URL slug to standard role code.
 * e.g., 'super-admin' -> 'SUPER_ADMIN', 'teacher' -> 'TEACHER'
 */
export const slugToRoleCode = (slug: string): string =>
  String(slug || '').trim().toUpperCase().replace(/-/g, '_');

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
 * by direct match or hierarchy-based archetype resolution from /role-management.
 */
function resolveViewComponent(
  roleCode: string,
  roles: RoleRecord[]
): React.ComponentType<RoleDashboardViewProps> {
  const normalized = String(roleCode || '').toUpperCase();
  if (ROLE_VIEW_REGISTRY[normalized]) {
    return ROLE_VIEW_REGISTRY[normalized];
  }

  // Hierarchy and archetype fallback for custom dynamic roles
  const roleRecord = roles.find((r) => r.code?.toUpperCase() === normalized);
  if (roleRecord) {
    if (roleRecord.hierarchy_level === 1) return SuperAdminDashboardView;
    if (roleRecord.hierarchy_level <= 3) return AdminPrincipalDashboardView;
    if (roleRecord.hierarchy_level <= 5) return TeacherUstadhDashboardView;
    if (roleRecord.hierarchy_level <= 9) return StaffOperatorDashboardView;
    if (roleRecord.hierarchy_level === 10) return GuardianDashboardView;
  }

  return AdminPrincipalDashboardView;
}

export default function DashboardHubView() {
  const { isMultiTenantAdmin, activeTenant, activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { roleSlug } = useParams<{ roleSlug?: string }>();
  const navigate = useNavigate();
  const currentUser = useMemo(() => authStore.getUser() || {}, []);

  // Retrieve dynamic system & custom roles from /role-management
  const { roles = [] } = useRoleManagement();

  // Dynamically resolve actual system role of the logged in user against role-management
  const initialRole: DashboardRole = useMemo(() => {
    if (isMultiTenantAdmin || currentUser.is_superuser || currentUser.role === 'SUPER_ADMIN') {
      return 'SUPER_ADMIN';
    }
    const userRoleStr = String(currentUser.role || currentUser.user_type || '').trim().toUpperCase();

    // Match against dynamic roles repository by ID, code, or name
    const matchedRole = roles.find(
      (r) =>
        (currentUser.role_id != null && r.id === currentUser.role_id) ||
        (r.code && r.code.toUpperCase() === userRoleStr) ||
        (r.name && r.name.trim().toUpperCase() === userRoleStr)
    );

    if (matchedRole?.code) {
      return matchedRole.code;
    }

    return userRoleStr || 'ADMIN';
  }, [isMultiTenantAdmin, currentUser, roles]);

  const isSuperAdmin = isMultiTenantAdmin || currentUser.is_superuser || currentUser.role === 'SUPER_ADMIN';

  // Redirect /dashboard (without role slug) to role-specific dashboard URL dynamically
  useEffect(() => {
    if (!roleSlug) {
      navigate(`/dashboard/${roleCodeToSlug(initialRole)}`, { replace: true });
    }
  }, [roleSlug, initialRole, navigate]);

  // Derive effective role from URL slug with access boundary protection
  const effectiveRole: DashboardRole = useMemo(() => {
    if (roleSlug) {
      const targetRoleCode = slugToRoleCode(roleSlug);
      const existsInRoles = roles.some((r) => r.code?.toUpperCase() === targetRoleCode);
      if (existsInRoles || targetRoleCode === initialRole || targetRoleCode === 'SUPER_ADMIN') {
        if (isSuperAdmin || targetRoleCode === initialRole) {
          return targetRoleCode;
        }
      }
    }
    return initialRole;
  }, [roleSlug, isSuperAdmin, initialRole, roles]);

  // Edit mode state for on-screen drag & resize
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Current layout state for the active effective role
  const [currentRoleLayout, setCurrentRoleLayout] = useState<DashboardLayoutItem[]>(() =>
    getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id)
  );
  const [governanceTick, setGovernanceTick] = useState<number>(0);

  // Synchronize layout when effective role changes or when updated by Super Admin template save
  useEffect(() => {
    setCurrentRoleLayout(getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id));

    const handleLayoutUpdate = (e: any) => {
      if (e?.detail?.role === effectiveRole || !e?.detail?.role) {
        setCurrentRoleLayout(getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id));
      }
    };
    const handleGovernanceUpdate = () => {
      setGovernanceTick((t) => t + 1);
    };
    window.addEventListener('spr_dashboard_layout_updated', handleLayoutUpdate);
    window.addEventListener('spr_dashboard_governance_updated', handleGovernanceUpdate);
    return () => {
      window.removeEventListener('spr_dashboard_layout_updated', handleLayoutUpdate);
      window.removeEventListener('spr_dashboard_governance_updated', handleGovernanceUpdate);
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

  const handleOpenGovernance = useCallback(() => {
    openDrawer('widget-governance');
  }, [openDrawer]);

  // Requirement 2: Register Dashboard Customizer directly in SPR Note's standard Right Sidebar
  useDrawerRegistration(
    'dashboard-customizer',
    () => ({
      title: `Customize ${effectiveRole.replace('_', ' ')} Workspace`,
      category: 'Workspace Customizer',
      size: 'lg',
      content: (
        <DashboardCustomizerPanel
          key={`dashboard-customizer-${effectiveRole}-${governanceTick}`}
          role={effectiveRole}
          currentLayout={currentRoleLayout}
          onSaveLayout={handleSaveLayout}
          onResetLayout={handleResetLayout}
          isSuperAdmin={isSuperAdmin}
          onClose={closeDrawer}
        />
      ),
    }),
    [effectiveRole, currentRoleLayout, isSuperAdmin, handleSaveLayout, handleResetLayout, closeDrawer, governanceTick]
  );

  // Requirement 3: Register Widget Role & Academy Governance Drawer for Super Admin
  useDrawerRegistration(
    'widget-governance',
    () => ({
      title: 'Widget Role & Academy Governance',
      category: 'Governance Matrix',
      size: 'lg',
      content: (
        <WidgetRoleGovernancePanel
          key={`widget-governance-${activeTenantId}`}
          activeTenantId={activeTenantId}
          onClose={closeDrawer}
        />
      ),
    }),
    [activeTenantId, closeDrawer]
  );

  const displayName = currentUser.first_name 
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : currentUser.username || currentUser.phone_number || 'Administrator';

  const academicSessionName = activeTenant?.academic_year || '2026-2027';

  // Resolve presentation view component dynamically
  const ActiveViewComponent = resolveViewComponent(effectiveRole, roles);

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
        onOpenGovernanceDrawer={handleOpenGovernance}
      />

      {/* 2. Role-Driven Dynamic View Dispatcher */}
      <div className="w-full min-w-0 transition-all duration-300">
        <ActiveViewComponent
          role={effectiveRole}
          isEditMode={isEditMode}
          onOpenWidgetCatalog={handleOpenCustomizer}
          layoutItems={currentRoleLayout}
          onUpdateLayout={handleSaveLayout}
        />
      </div>
    </PageContainer>
  );
}
