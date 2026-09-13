import React, { useState, useMemo } from 'react';
import { auth as authStore } from '../../utils/localStore';
import { useTenant } from '../../context/TenantContext';
import DashboardHeader from './components/DashboardHeader';
import SuperAdminDashboardView from './views/SuperAdminDashboardView';
import AdminPrincipalDashboardView from './views/AdminPrincipalDashboardView';
import TeacherUstadhDashboardView from './views/TeacherUstadhDashboardView';
import StaffOperatorDashboardView from './views/StaffOperatorDashboardView';
import GuardianStudentDashboardView from './views/GuardianStudentDashboardView';
import type { DashboardRole } from './types';

export default function DashboardHubView() {
  const { isMultiTenantAdmin, activeTenant } = useTenant();
  const currentUser = useMemo(() => authStore.getUser() || {}, []);

  // Determine actual system role of the logged in user
  const initialRole: DashboardRole = useMemo(() => {
    if (isMultiTenantAdmin || currentUser.is_superuser || currentUser.role === 'SUPER_ADMIN') {
      return 'SUPER_ADMIN';
    }
    if (currentUser.role === 'TEACHER') return 'TEACHER';
    if (currentUser.role === 'STAFF') return 'STAFF';
    if (currentUser.role === 'GUARDIAN' || currentUser.role === 'STUDENT') return 'GUARDIAN';
    return 'ADMIN'; // Default institutional head/admin
  }, [isMultiTenantAdmin, currentUser]);

  const isSuperAdmin = isMultiTenantAdmin || currentUser.is_superuser || currentUser.role === 'SUPER_ADMIN';

  // Effective role state (Super Admin can switch views to preview any role)
  const [effectiveRole, setEffectiveRole] = useState<DashboardRole>(initialRole);

  const displayName = currentUser.first_name 
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : currentUser.username || currentUser.phone_number || 'Administrator';

  const academicSessionName = activeTenant?.academic_year || '2026-2027';

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 animate-fade-in text-left rtl:text-right select-none">
      {/* 1. Global Header with Greeting & Super Admin Role Switcher */}
      <DashboardHeader
        userName={displayName}
        userRole={initialRole}
        effectiveRole={effectiveRole}
        onRoleChange={setEffectiveRole}
        isSuperAdmin={isSuperAdmin}
        academicYearName={academicSessionName}
      />

      {/* 2. Role-Driven Dynamic View Dispatcher */}
      <div className="w-full min-w-0 transition-all duration-300">
        {effectiveRole === 'SUPER_ADMIN' && <SuperAdminDashboardView />}
        {effectiveRole === 'ADMIN' && <AdminPrincipalDashboardView />}
        {effectiveRole === 'TEACHER' && <TeacherUstadhDashboardView />}
        {effectiveRole === 'STAFF' && <StaffOperatorDashboardView />}
        {effectiveRole === 'GUARDIAN' && <GuardianStudentDashboardView />}
      </div>
    </div>
  );
}
