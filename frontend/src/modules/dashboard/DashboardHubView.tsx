import React, { useState, useMemo } from 'react';
import { auth as authStore } from '../../utils/localStore';
import { useTenant } from '../../context/TenantContext';
import { PageContainer } from '../../components/layout';
import DashboardHeader from './components/DashboardHeader';
import DashboardCustomizerDrawer from './components/DashboardCustomizerDrawer';
import SuperAdminDashboardView from './views/SuperAdminDashboardView';
import AdminPrincipalDashboardView from './views/AdminPrincipalDashboardView';
import TeacherUstadhDashboardView from './views/TeacherUstadhDashboardView';
import StaffOperatorDashboardView from './views/StaffOperatorDashboardView';
import StudentDashboardView from './views/StudentDashboardView';
import GuardianDashboardView from './views/GuardianDashboardView';
import { getSavedLayout, saveLayout, resetLayout } from './widgetRegistry';
import type { DashboardRole, DashboardLayoutItem } from './types';
import './locales'; // Self-contained 4-language i18n registration

export default function DashboardHubView() {
  const { isMultiTenantAdmin, activeTenant, activeTenantId } = useTenant();
  const currentUser = useMemo(() => authStore.getUser() || {}, []);

  // Determine actual system role of the logged in user
  const initialRole: DashboardRole = useMemo(() => {
    if (isMultiTenantAdmin || currentUser.is_superuser || currentUser.role === 'SUPER_ADMIN') {
      return 'SUPER_ADMIN';
    }
    const roleUpper = String(currentUser.role || currentUser.user_type || '').toUpperCase();
    if (roleUpper === 'TEACHER') return 'TEACHER';
    if (roleUpper === 'STAFF' || roleUpper === 'ACCOUNTANT') return 'STAFF';
    if (roleUpper === 'STUDENT') return 'STUDENT';
    if (roleUpper === 'GUARDIAN' || roleUpper === 'PARENT') return 'GUARDIAN';
    return 'ADMIN'; // Default institutional head/admin
  }, [isMultiTenantAdmin, currentUser]);

  const isSuperAdmin = isMultiTenantAdmin || currentUser.is_superuser || currentUser.role === 'SUPER_ADMIN';

  // Effective role state (Super Admin can switch views to preview any role)
  const [effectiveRole, setEffectiveRole] = useState<DashboardRole>(initialRole);

  // Edit / Customizer mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isCustomizerDrawerOpen, setIsCustomizerDrawerOpen] = useState<boolean>(false);

  // Current layout state for the active effective role
  const [currentRoleLayout, setCurrentRoleLayout] = useState<DashboardLayoutItem[]>(() =>
    getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id)
  );

  // Synchronize layout when effective role changes
  React.useEffect(() => {
    setCurrentRoleLayout(getSavedLayout(activeTenantId || 'default', effectiveRole, currentUser.id));
  }, [effectiveRole, activeTenantId, currentUser.id]);

  const handleSaveLayout = (newLayout: DashboardLayoutItem[], saveAsRoleDefault = false) => {
    setCurrentRoleLayout(newLayout);
    saveLayout(activeTenantId || 'default', effectiveRole, newLayout, currentUser.id, saveAsRoleDefault);
  };

  const handleResetLayout = () => {
    const defaultLayout = resetLayout(activeTenantId || 'default', effectiveRole, currentUser.id);
    setCurrentRoleLayout(defaultLayout);
  };

  const displayName = currentUser.first_name 
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : currentUser.username || currentUser.phone_number || 'Administrator';

  const academicSessionName = activeTenant?.academic_year || '2026-2027';

  return (
    <PageContainer>
      {/* 1. Global Header with Greeting, Date, Edit Mode Toggle & Super Admin Role Switcher */}
      <DashboardHeader
        userName={displayName}
        userRole={initialRole}
        effectiveRole={effectiveRole}
        onRoleChange={setEffectiveRole}
        isSuperAdmin={isSuperAdmin}
        academicYearName={academicSessionName}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
      />

      {/* 2. Role-Driven Dynamic View Dispatcher */}
      <div className="w-full min-w-0 transition-all duration-300">
        {effectiveRole === 'SUPER_ADMIN' && (
          <SuperAdminDashboardView
            isEditMode={isEditMode}
            onOpenWidgetCatalog={() => setIsCustomizerDrawerOpen(true)}
          />
        )}
        {effectiveRole === 'ADMIN' && (
          <AdminPrincipalDashboardView
            isEditMode={isEditMode}
            onOpenWidgetCatalog={() => setIsCustomizerDrawerOpen(true)}
          />
        )}
        {effectiveRole === 'TEACHER' && (
          <TeacherUstadhDashboardView
            isEditMode={isEditMode}
            onOpenWidgetCatalog={() => setIsCustomizerDrawerOpen(true)}
          />
        )}
        {effectiveRole === 'STAFF' && (
          <StaffOperatorDashboardView
            isEditMode={isEditMode}
            onOpenWidgetCatalog={() => setIsCustomizerDrawerOpen(true)}
          />
        )}
        {effectiveRole === 'STUDENT' && (
          <StudentDashboardView
            isEditMode={isEditMode}
            onOpenWidgetCatalog={() => setIsCustomizerDrawerOpen(true)}
          />
        )}
        {effectiveRole === 'GUARDIAN' && (
          <GuardianDashboardView
            isEditMode={isEditMode}
            onOpenWidgetCatalog={() => setIsCustomizerDrawerOpen(true)}
          />
        )}
      </div>

      {/* 3. Dashboard Customizer / Toolsetter Drawer */}
      <DashboardCustomizerDrawer
        isOpen={isCustomizerDrawerOpen}
        onClose={() => setIsCustomizerDrawerOpen(false)}
        role={effectiveRole}
        currentLayout={currentRoleLayout}
        onSaveLayout={handleSaveLayout}
        onResetLayout={handleResetLayout}
        isSuperAdmin={isSuperAdmin}
      />
    </PageContainer>
  );
}
