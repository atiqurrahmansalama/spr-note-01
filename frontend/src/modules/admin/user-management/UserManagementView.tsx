import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';

// Project UI Tokens & Components
import PageContainer from '../../../components/layout/PageContainer';
import PageHeader from '../../../components/ui/PageHeader';
import DataViewToolbar from '../../../components/ui/DataViewToolbar';
import DataViewFooter from '../../../components/ui/DataViewFooter';
import CustomSelect from '../../../components/ui/CustomSelect';
import ActionMenu from '../../../components/ui/ActionMenu';
import IconButton from '../../../components/ui/IconButton';
import Modal from '../../../components/ui/Modal';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { RoleSelect } from '../../../components/selectors';
import {
  UsersIcon,
  PlusIcon,
  RefreshIcon,
  BuildingOfficeIcon,
  AlertTriangleIcon,
  QrCodeIcon,
} from '../../../components/ui/Icons';

// Submodule Hooks & Components
import { useUserManagement, useUserActions, useUserTranslation, useRoleInvites } from './hooks';
import {
  UserMetricsGrid,
  UserTable,
  UserCardGrid,
  UserBulkActionBar,
  UserDrawerForm,
  UserResetPasswordDrawerForm,
  UserDetailDrawer,
  UserSessionsModal,
  RoleInviteMetricsGrid,
  RoleInviteTable,
  RoleInviteCardGrid,
  RoleInviteQRModal,
  RoleInviteDeleteModal,
  RoleInviteDrawerForm,
} from './components';
import { RoleDrawerForm } from '../role-management/components';
import {
  UserRecord,
  UserStatusFilter,
  UserAuthProviderFilter,
  RoleInviteRecord,
  RoleInviteStatusFilter,
} from './types';
import InstitutionOnboardingForm from '../../academy/campus-structure/academies/InstitutionOnboardingForm';

export const UserManagementView: React.FC = () => {
  const { t, formatNumber } = useUserTranslation();
  const { refreshInstitutions } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();

  // Tab State Synchronized with URL Search Params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';

  const handleTabChange = (tabId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabId === 'users') {
        next.delete('tab');
      } else {
        next.set('tab', tabId);
      }
      return next;
    });
  };

  // 1. Users Workspace Hook
  const {
    users,
    roles,
    loading: usersLoading,
    viewMode: userViewMode,
    filters: userFilters,
    selectedIds,
    filteredUsers,
    metrics: userMetrics,
    hasActiveFilters: userHasActiveFilters,
    updateFilters: updateUserFilters,
    resetFilters: resetUserFilters,
    handleToggleViewMode: handleToggleUserViewMode,
    handleSelectRow,
    handleSelectAll,
    handleClearSelection,
    loadUsersAndRoles,
  } = useUserManagement();

  const {
    submitting: userSubmitting,
    toggleUserStatus,
    deactivateUser,
    revokeAllSessions,
    fetchUserSessions,
    performBulkAction,
    exportUsersCsv,
  } = useUserActions(loadUsersAndRoles);

  // 2. Role Invites Workspace Hook
  const {
    invites,
    loading: invitesLoading,
    submitting: inviteSubmitting,
    viewMode: inviteViewMode,
    filters: inviteFilters,
    filteredInvites,
    metrics: inviteMetrics,
    hasActiveFilters: inviteHasActiveFilters,
    updateFilters: updateInviteFilters,
    resetFilters: resetInviteFilters,
    handleToggleViewMode: handleToggleInviteViewMode,
    loadInvites,
    copyInviteLink,
    revokeInvite,
    deleteInvite,
    exportInvitesCsv,
  } = useRoleInvites();

  // Modal States
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserRecord | null>(null);
  const [sessionModalUser, setSessionModalUser] = useState<UserRecord | null>(null);
  const [qrModalInvite, setQrModalInvite] = useState<RoleInviteRecord | null>(null);
  const [deleteConfirmInvite, setDeleteConfirmInvite] = useState<RoleInviteRecord | null>(null);

  // Filter Dropdown Options
  const userStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: t('allStatuses', 'All Statuses') },
      { value: 'ACTIVE', label: t('statusActive', 'Active Only') },
      { value: 'INACTIVE', label: t('statusInactive', 'Inactive Only') },
    ],
    [t]
  );

  const providerOptions = useMemo(
    () => [
      { value: 'ALL', label: t('allProviders', 'All Providers') },
      { value: 'GOOGLE', label: t('providerGoogle', 'Google') },
      { value: 'EMAIL', label: t('providerEmail', 'Email & Password') },
    ],
    [t]
  );

  const inviteStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: t('invites.allStatuses', 'All Statuses') },
      { value: 'ACTIVE', label: t('invites.statusActive', 'Active & Valid') },
      { value: 'REVOKED', label: t('invites.statusRevoked', 'Revoked') },
      { value: 'EXPIRED', label: t('invites.statusExpired', 'Expired') },
    ],
    [t]
  );

  // Tabs Configuration
  const tabs = useMemo(
    () => [
      {
        id: 'users',
        label: t('tabs.users', 'Users Directory'),
        icon: UsersIcon,
        badge: formatNumber(users.length),
      },
      {
        id: 'invites',
        label: t('tabs.invites', 'Role Invites & QR Tokens'),
        icon: QrCodeIcon,
        badge: formatNumber(inviteMetrics.totalInvites),
      },
    ],
    [t, formatNumber, users.length, inviteMetrics.totalInvites]
  );

  // Universal Drawer Registrations
  useDrawerRegistration(
    'user',
    (params) => {
      const mode = (params.get('mode') as 'add' | 'edit') || 'add';
      const userId = params.get('id');
      const foundUser = userId ? users.find((u) => String(u.id) === String(userId)) : null;
      const userName = foundUser?.first_name || 'Account';

      return {
        title:
          mode === 'edit'
            ? t('drawers.editUserTitle', `Edit User: ${userName}`, { name: userName })
            : t('drawers.createUserTitle', 'Create User Account'),
        category: t('title', 'User Management'),
        size: 'md',
        content: (
          <UserDrawerForm
            key={`user-form-${userId || 'new'}-${mode}`}
            user={foundUser}
            mode={mode}
            onSaved={() => {
              loadUsersAndRoles();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [users, loadUsersAndRoles, closeDrawer, t]
  );

  useDrawerRegistration(
    'user-password',
    (params) => {
      const userId = params.get('id');
      const foundUser = userId ? users.find((u) => String(u.id) === String(userId)) : null;
      const userName = foundUser?.first_name || 'User';

      return {
        title: t('drawers.resetPasswordTitle', `Reset Password: ${userName}`, { name: userName }),
        category: 'Security & Authentication',
        size: 'sm',
        content: (
          <UserResetPasswordDrawerForm
            key={`user-pwd-${userId}`}
            user={foundUser}
            onSaved={() => {
              loadUsersAndRoles();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [users, loadUsersAndRoles, closeDrawer, t]
  );

  useDrawerRegistration(
    'user-details',
    (params) => {
      const userId = params.get('id');
      const foundUser = userId ? users.find((u) => String(u.id) === String(userId)) : null;
      const userName = foundUser?.first_name || 'User';

      return {
        title: t('drawers.userDetailsTitle', `User Profile: ${userName}`, { name: userName }),
        category: t('title', 'User Management'),
        size: 'md',
        content: (
          <UserDetailDrawer
            key={`user-details-${userId}`}
            user={foundUser}
            roles={roles}
            onEdit={(u) => openDrawer('user', { mode: 'edit', id: String(u.id) })}
            onResetPassword={(u) => openDrawer('user-password', { id: String(u.id) })}
            onViewSessions={(u) => setSessionModalUser(u)}
            onRevokeSessions={(u) => revokeAllSessions(u.id)}
            onClose={closeDrawer}
          />
        ),
      };
    },
    [users, roles, revokeAllSessions, openDrawer, closeDrawer, t]
  );

  useDrawerRegistration(
    'institution',
    () => ({
      title: t('onboardAcademy', 'Onboard New Academy'),
      category: 'Institutions',
      size: 'md',
      content: (
        <InstitutionOnboardingForm
          key="onboard-academy"
          showStructureQuotas={true}
          onSuccess={() => {
            loadUsersAndRoles();
            refreshInstitutions();
            closeDrawer();
          }}
          onCancel={closeDrawer}
        />
      ),
    }),
    [loadUsersAndRoles, refreshInstitutions, closeDrawer, t]
  );

  useDrawerRegistration(
    'role',
    (params) => {
      const mode = (params.get('mode') as 'add' | 'edit') || 'add';
      const roleId = params.get('id');
      const foundRole = roleId ? (roles as any[]).find((r) => String(r.id) === String(roleId)) : null;
      const roleName = foundRole?.name || '';

      return {
        title:
          mode === 'edit'
            ? t('drawers.editRoleTitle', `Edit Role: ${roleName}`, { name: roleName })
            : t('drawers.createRoleTitle', 'Create Custom Role'),
        category: t('title', 'User Management'),
        size: 'sm',
        content: (
          <RoleDrawerForm
            key={roleId ? `role-${roleId}` : 'new-role'}
            role={foundRole}
            mode={mode}
            existingRoles={roles as any[]}
            onSaved={() => {
              loadUsersAndRoles();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [roles, loadUsersAndRoles, closeDrawer, t]
  );

  useDrawerRegistration(
    'invite',
    () => ({
      title: t('invites.drawerTitle', 'Generate Role Invite Token'),
      category: t('invites.drawerCategory', 'User Access & Onboarding'),
      size: 'sm',
      content: (
        <RoleInviteDrawerForm
          key="role-invite-form"
          roles={roles}
          onSaved={() => {
            loadInvites();
            closeDrawer();
          }}
          onCancel={closeDrawer}
        />
      ),
    }),
    [roles, loadInvites, closeDrawer, t]
  );

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Page Header Overview & Actions */}
      <PageHeader
        icon={activeTab === 'invites' ? QrCodeIcon : UsersIcon}
        title={activeTab === 'invites' ? t('invites.title', 'Role Invites & Tokens') : t('title', 'User Management')}
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary tracking-wide">
            {activeTab === 'invites'
              ? t('invites.totalInvitesBadge', `${formatNumber(invites.length)} Total Invites`, {
                  count: formatNumber(invites.length),
                })
              : t('totalUsersBadge', `${formatNumber(users.length)} Total Users`, {
                  count: formatNumber(users.length),
                })}
          </span>
        }
        subtitle={
          activeTab === 'invites'
            ? t('invites.subtitle', 'Generate and manage batch QR codes and invitation links for automatic role assignments')
            : t('subtitle', 'Manage user accounts, authority roles, authentication credentials, and institutions')
        }
        actions={
          <div className="flex items-center gap-2">
            <IconButton
              icon={RefreshIcon}
              size="md"
              variant="sub"
              loading={activeTab === 'invites' ? invitesLoading : usersLoading}
              disabled={activeTab === 'invites' ? invitesLoading : usersLoading}
              onClick={activeTab === 'invites' ? loadInvites : loadUsersAndRoles}
              title={t('refresh', 'Refresh Data')}
              ariaLabel={t('refresh', 'Refresh Data')}
            />

            {activeTab === 'users' ? (
              <ActionMenu
                label={t('addUser', 'Add User')}
                icon={PlusIcon}
                size="md"
                variant="primary"
                buttonClassName="px-4 py-2.5 rounded-xl font-bold shadow-sm"
                align="right"
                items={[
                  {
                    label: t('addUser', 'Add User'),
                    title: t('createAccountSubtitle', 'Create individual user account'),
                    icon: UsersIcon,
                    onClick: () => openDrawer('user', { mode: 'add' }),
                  },
                  {
                    label: t('onboardAcademy', 'Onboard Academy'),
                    title: t('onboardAcademySubtitle', 'Register new campus or institution'),
                    icon: BuildingOfficeIcon,
                    onClick: () => openDrawer('institution', { mode: 'add' }),
                  },
                ]}
              />
            ) : (
              <button
                type="button"
                onClick={() => openDrawer('invite')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs theme-bg-accent text-white hover:opacity-90 transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                <span>{t('invites.generateInvite', 'Generate Invite')}</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Unified TabSwitcher Navigation */}
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {/* 3. Conditional Tab Views */}
      {activeTab === 'users' ? (
        <>
          {/* Top Statistics Metrics Grid */}
          <UserMetricsGrid metrics={userMetrics} />

          {/* Reusable Search & Multi-Filters Toolbar */}
          <DataViewToolbar
            searchLabel={t('searchUsers', 'Search Users')}
            searchQuery={userFilters.search}
            onSearchChange={(val) => updateUserFilters({ search: val })}
            searchPlaceholder={t('searchPlaceholder', 'Search users by name, email, or phone...')}
            stackedSwitcher={true}
            filterGridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
            searchSpanClassName="col-span-1"
            filterElement={
              <>
                {/* Role Filter */}
                <RoleSelect
                  value={userFilters.role === 'ALL' ? '' : userFilters.role}
                  onChange={(val: any) => updateUserFilters({ role: val || 'ALL' })}
                  roles={roles}
                  valueKey="code"
                  allowAll={true}
                  allLabel={t('allRoles', 'All Roles')}
                  placeholder={t('allRoles', 'All Roles')}
                  label={t('role', 'Role')}
                  size="md"
                  compactMode={false}
                />

                {/* Status Filter */}
                <CustomSelect
                  label={t('status', 'Status')}
                  value={userFilters.status}
                  onChange={(val: any) => updateUserFilters({ status: val as UserStatusFilter })}
                  options={userStatusOptions}
                  placeholder={t('allStatuses', 'All Statuses')}
                  size="md"
                />

                {/* Auth Provider Filter */}
                <CustomSelect
                  label={t('authProvider', 'Auth Provider')}
                  value={userFilters.provider}
                  onChange={(val: any) => updateUserFilters({ provider: val as UserAuthProviderFilter })}
                  options={providerOptions}
                  placeholder={t('allProviders', 'All Providers')}
                  size="md"
                />
              </>
            }
            viewMode={userViewMode}
            onToggleViewMode={handleToggleUserViewMode}
            onRefresh={loadUsersAndRoles}
            loading={usersLoading}
            filteredCount={filteredUsers.length}
            totalCount={users.length}
            itemLabel={t('usersItemLabel', 'users')}
            hasActiveFilters={userHasActiveFilters}
            onResetFilters={resetUserFilters}
            actions={
              <button
                type="button"
                onClick={() => exportUsersCsv(filteredUsers)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
                title={t('exportCsv', 'Export CSV')}
              >
                <span>{t('exportCsv', 'Export')}</span>
              </button>
            }
          />

          {/* Bulk Action Bar */}
          <UserBulkActionBar
            selectedCount={selectedIds.length}
            roles={roles}
            onClearSelection={handleClearSelection}
            onBulkActivate={() => performBulkAction('activate', selectedIds)}
            onBulkDeactivate={() => performBulkAction('deactivate', selectedIds)}
            onBulkAssignRole={(roleCode) =>
              performBulkAction('assign_role', selectedIds, { role_code: roleCode })
            }
            onExportSelected={() => {
              const selectedUsers = users.filter((u) => selectedIds.includes(u.id));
              exportUsersCsv(selectedUsers);
            }}
            isSubmitting={userSubmitting}
          />

          {/* Users Display: DataTable or DataCardGrid */}
          <div className="space-y-4">
            {userViewMode === 'grid' ? (
              <UserCardGrid
                users={filteredUsers}
                roles={roles}
                loading={usersLoading}
                selectedIds={selectedIds}
                onSelectRow={handleSelectRow}
                onViewDetails={(u) => openDrawer('user-details', { id: String(u.id) })}
                onEditUser={(u) => openDrawer('user', { mode: 'edit', id: String(u.id) })}
                onResetPassword={(u) => openDrawer('user-password', { id: String(u.id) })}
                onViewSessions={(u) => setSessionModalUser(u)}
                onRevokeSessions={(u) => revokeAllSessions(u.id)}
                onConfirmDeactivate={(u) => setDeleteConfirmUser(u)}
                onToggleStatus={(u) => toggleUserStatus(u)}
                searchQuery={userFilters.search}
                hasActiveFilters={userHasActiveFilters}
              />
            ) : (
              <UserTable
                users={filteredUsers}
                roles={roles}
                loading={usersLoading}
                selectedIds={selectedIds}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                onViewDetails={(u) => openDrawer('user-details', { id: String(u.id) })}
                onEditUser={(u) => openDrawer('user', { mode: 'edit', id: String(u.id) })}
                onResetPassword={(u) => openDrawer('user-password', { id: String(u.id) })}
                onViewSessions={(u) => setSessionModalUser(u)}
                onRevokeSessions={(u) => revokeAllSessions(u.id)}
                onConfirmDeactivate={(u) => setDeleteConfirmUser(u)}
                onToggleStatus={(u) => toggleUserStatus(u)}
                searchQuery={userFilters.search}
                hasActiveFilters={userHasActiveFilters}
              />
            )}

            {/* DataViewFooter with Counter */}
            {!usersLoading && users.length > 0 && (
              <DataViewFooter
                filteredCount={filteredUsers.length}
                totalCount={users.length}
                itemLabel="user accounts"
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Invites Metrics Grid */}
          <RoleInviteMetricsGrid metrics={inviteMetrics} />

          {/* Invites Search & Multi-Filters Toolbar */}
          <DataViewToolbar
            searchLabel={t('invites.searchPlaceholder', 'Search Invites')}
            searchQuery={inviteFilters.search}
            onSearchChange={(val) => updateInviteFilters({ search: val })}
            searchPlaceholder={t('invites.searchPlaceholder', 'Search invites by title, role, or token...')}
            stackedSwitcher={true}
            filterGridClassName="grid-cols-1 sm:grid-cols-2"
            searchSpanClassName="col-span-1"
            filterElement={
              <>
                {/* Role Filter */}
                <RoleSelect
                  value={inviteFilters.role === 'ALL' ? '' : inviteFilters.role}
                  onChange={(val: any) => updateInviteFilters({ role: val || 'ALL' })}
                  roles={roles}
                  valueKey="code"
                  allowAll={true}
                  allLabel={t('allRoles', 'All Roles')}
                  placeholder={t('allRoles', 'All Roles')}
                  label={t('role', 'Role')}
                  size="md"
                  compactMode={false}
                />

                {/* Status Filter */}
                <CustomSelect
                  label={t('status', 'Status')}
                  value={inviteFilters.status}
                  onChange={(val: any) =>
                    updateInviteFilters({ status: val as RoleInviteStatusFilter })
                  }
                  options={inviteStatusOptions}
                  placeholder={t('allStatuses', 'All Statuses')}
                  size="md"
                />
              </>
            }
            viewMode={inviteViewMode}
            onToggleViewMode={handleToggleInviteViewMode}
            onRefresh={loadInvites}
            loading={invitesLoading}
            filteredCount={filteredInvites.length}
            totalCount={invites.length}
            itemLabel="invites"
            hasActiveFilters={inviteHasActiveFilters}
            onResetFilters={resetInviteFilters}
            actions={
              <button
                type="button"
                onClick={exportInvitesCsv}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
                title={t('exportCsv', 'Export CSV')}
              >
                <span>{t('exportCsv', 'Export')}</span>
              </button>
            }
          />

          {/* Invites Display: DataTable or DataCardGrid */}
          <div className="space-y-4">
            {inviteViewMode === 'grid' ? (
              <RoleInviteCardGrid
                invites={filteredInvites}
                loading={invitesLoading}
                onViewQR={(inv) => setQrModalInvite(inv)}
                onCopyLink={copyInviteLink}
                onRevoke={revokeInvite}
                onDelete={(inv) => setDeleteConfirmInvite(inv)}
                onResetFilters={resetInviteFilters}
                onOpenCreateDrawer={() => openDrawer('invite')}
              />
            ) : (
              <RoleInviteTable
                invites={filteredInvites}
                loading={invitesLoading}
                onViewQR={(inv) => setQrModalInvite(inv)}
                onCopyLink={copyInviteLink}
                onRevoke={revokeInvite}
                onDelete={(inv) => setDeleteConfirmInvite(inv)}
                onResetFilters={resetInviteFilters}
                onOpenCreateDrawer={() => openDrawer('invite')}
              />
            )}

            {/* DataViewFooter with Counter */}
            {!invitesLoading && invites.length > 0 && (
              <DataViewFooter
                filteredCount={filteredInvites.length}
                totalCount={invites.length}
                itemLabel="invite tokens"
              />
            )}
          </div>
        </>
      )}

      {/* Security Sessions Modal */}
      <UserSessionsModal
        user={sessionModalUser}
        isOpen={Boolean(sessionModalUser)}
        onClose={() => setSessionModalUser(null)}
        onRevokeSessions={revokeAllSessions}
        fetchSessions={fetchUserSessions}
      />

      {/* Account Deactivation Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        title={t('deactivateModal.title', 'Deactivate Account')}
        icon={AlertTriangleIcon}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteConfirmUser(null)}
              disabled={userSubmitting}
              className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              {t('deactivateModal.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              disabled={userSubmitting}
              onClick={async () => {
                if (deleteConfirmUser) {
                  const ok = await deactivateUser(deleteConfirmUser);
                  if (ok) setDeleteConfirmUser(null);
                }
              }}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {userSubmitting
                ? t('deactivateModal.deactivating', 'Deactivating...')
                : t('deactivateModal.confirmButton', 'Confirm Deactivation')}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 theme-text-rose" />
              <span>{t('deactivateModal.warningTitle', 'Warning: Deactivating Account Access')}</span>
            </p>
            <p className="text-[11px] opacity-90">
              {t(
                'deactivateModal.warningMessage',
                'Are you sure you want to deactivate the user account? They will lose access to system login and active sessions immediately.',
                { name: deleteConfirmUser?.first_name || deleteConfirmUser?.email || 'User' }
              )}
            </p>
          </div>
        </div>
      </Modal>

      {/* Role Invite QR Code Preview Modal */}
      <RoleInviteQRModal
        invite={qrModalInvite}
        isOpen={Boolean(qrModalInvite)}
        onClose={() => setQrModalInvite(null)}
      />

      {/* Role Invite Deletion Confirmation Modal */}
      <RoleInviteDeleteModal
        invite={deleteConfirmInvite}
        isOpen={Boolean(deleteConfirmInvite)}
        submitting={inviteSubmitting}
        onConfirm={async (inv) => {
          const ok = await deleteInvite(inv);
          if (ok) setDeleteConfirmInvite(null);
        }}
        onClose={() => setDeleteConfirmInvite(null)}
      />
    </PageContainer>
  );
};

export default UserManagementView;
