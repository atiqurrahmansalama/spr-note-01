import React, { useState, useMemo, useCallback } from 'react';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';

// Project UI Tokens & Components
import PageContainer from '../../../components/layout/PageContainer';
import PageHeader from '../../../components/ui/PageHeader';
import DataViewToolbar from '../../../components/ui/DataViewToolbar';
import DataViewFooter from '../../../components/ui/DataViewFooter';
import CustomSelect from '../../../components/ui/CustomSelect';
import IconButton from '../../../components/ui/IconButton';
import {
  KeyIcon,
  PlusIcon,
  DownloadIcon,
  ArrowLeftIcon,
} from '../../../components/ui/Icons';

// Submodule Hooks & Components
import { useRoleManagement, useRoleActions, useRoleTranslation } from './hooks';
import {
  RoleMetricsGrid,
  RoleTable,
  RoleCardGrid,
  RoleDrawerForm,
  RoleDetailDrawer,
  RoleDeleteModal,
} from './components';
import { RoleRecord, RoleTypeFilter } from './types';

export interface RoleManagementViewProps {
  showHeaderCard?: boolean;
  onBack?: () => void;
  onRoleUpdated?: () => void;
}

export const RoleManagementView: React.FC<RoleManagementViewProps> = ({
  showHeaderCard = true,
  onBack,
  onRoleUpdated,
}) => {
  const { t, formatNumber } = useRoleTranslation();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const {
    roles,
    loading,
    viewMode,
    filters,
    filteredRoles,
    metrics,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    handleToggleViewMode,
    loadRoles,
  } = useRoleManagement();

  const handleRefreshAll = useCallback(() => {
    loadRoles();
    onRoleUpdated?.();
  }, [loadRoles, onRoleUpdated]);

  const {
    submitting,
    cloneRole,
    deleteRole,
    setGoogleDefault,
    exportRolesCsv,
  } = useRoleActions(handleRefreshAll);

  // Local Modal States
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<RoleRecord | null>(null);

  // Filter Dropdown Options using project translations
  const typeOptions = useMemo(
    () => [
      { value: 'ALL', label: t('allTypes', 'All Role Types') },
      { value: 'SYSTEM', label: t('typeSystem', 'System Protected') },
      { value: 'CUSTOM', label: t('typeCustom', 'Custom Roles') },
    ],
    [t]
  );

  const hierarchyOptions = useMemo(
    () => [
      { value: 'ALL', label: t('allLevels', 'All Authority Levels') },
      { value: '1', label: t('levelSuperAdmin', 'Level 1 (Super Admin)') },
      { value: '2', label: t('levelAdmin', 'Level 2 (Admin)') },
      { value: '3', label: t('levelStaff', 'Level 3-4 (Staff)') },
      { value: '5', label: t('levelTeacher', 'Level 5 (Teacher)') },
      { value: '10', label: t('levelGuardian', 'Level 10 (Guardian)') },
    ],
    [t]
  );

  // Universal Drawer Registrations
  useDrawerRegistration(
    'role',
    (params) => {
      const mode = (params.get('mode') as 'add' | 'edit') || 'add';
      const roleId = params.get('id');
      const foundRole = roleId ? roles.find((r) => String(r.id) === String(roleId)) : null;
      const roleName = foundRole?.name || '';

      return {
        title:
          mode === 'edit'
            ? t('drawers.editTitle', `Edit Role: ${roleName}`, { name: roleName })
            : t('drawers.createTitle', 'Create Custom Role'),
        category: t('title', 'Role & Access Control'),
        size: 'sm',
        content: (
          <RoleDrawerForm
            key={roleId ? `role-${roleId}` : 'new-role'}
            role={foundRole}
            mode={mode}
            existingRoles={roles}
            onSaved={() => {
              handleRefreshAll();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [roles, handleRefreshAll, closeDrawer, t]
  );

  useDrawerRegistration(
    'role-details',
    (params) => {
      const roleId = params.get('id');
      const foundRole = roleId ? roles.find((r) => String(r.id) === String(roleId)) : null;
      const roleName = foundRole?.name || 'Role';

      return {
        title: t('drawers.detailsTitle', `Role Permissions: ${roleName}`, { name: roleName }),
        category: t('title', 'Role & Access Control'),
        size: 'md',
        content: (
          <RoleDetailDrawer
            key={`role-details-${roleId}`}
            role={foundRole || ({} as RoleRecord)}
            onEdit={(r) => openDrawer('role', { mode: 'edit', id: String(r.id) })}
            onClone={(r) => cloneRole(r)}
            onClose={closeDrawer}
          />
        ),
      };
    },
    [roles, cloneRole, openDrawer, closeDrawer, t]
  );

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Page Header Overview & Actions */}
      {showHeaderCard && (
        <PageHeader
          icon={KeyIcon}
          title={t('title', 'Role & Access Control')}
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary tracking-wide">
              {t('totalRolesBadge', `${formatNumber(roles.length)} Total Roles`, {
                count: formatNumber(roles.length),
              })}
            </span>
          }
          subtitle={t(
            'subtitle',
            'Configure system authority levels, action permissions, and custom role definitions'
          )}
          actions={
            <div className="flex items-center gap-2">
              {onBack && (
                <IconButton
                  icon={ArrowLeftIcon}
                  size="md"
                  variant="sub"
                  onClick={onBack}
                  title="Back"
                  ariaLabel="Back"
                />
              )}

              <button
                type="button"
                onClick={() => openDrawer('role', { mode: 'add' })}
                className="theme-bg-accent theme-accent-text px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-90 transition-all cursor-pointer flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                <span>{t('createRole', 'Create Role')}</span>
              </button>
            </div>
          }
        />
      )}

      {/* 2. Aggregate Metrics Grid */}
      <RoleMetricsGrid metrics={metrics} />

      {/* 3. Filter & View Controls Toolbar */}
      <DataViewToolbar
        searchPlaceholder={t('searchPlaceholder', 'Search roles by name, code or description...')}
        searchQuery={filters.searchQuery}
        onSearchChange={(val) => updateFilters({ searchQuery: val })}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        viewMode={viewMode}
        onViewModeChange={handleToggleViewMode}
        onRefresh={handleRefreshAll}
        loading={loading}
        filterElement={
          <>
            <CustomSelect
              value={filters.typeFilter}
              options={typeOptions}
              onChange={(val) => updateFilters({ typeFilter: val as RoleTypeFilter })}
              size="md"
              className="w-full sm:w-44"
            />

            <CustomSelect
              value={filters.hierarchyFilter}
              options={hierarchyOptions}
              onChange={(val) => updateFilters({ hierarchyFilter: val })}
              size="md"
              className="w-full sm:w-48"
            />
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => exportRolesCsv(filteredRoles)}
            className="px-3 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated border theme-border rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title={t('exportCsv', 'Export CSV')}
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('exportCsv', 'Export')}</span>
          </button>
        }
      />

      {/* 4. Main Data Container (Table / Grid) */}
      <div className="w-full">
        {viewMode === 'table' ? (
          <RoleTable
            roles={filteredRoles}
            loading={loading}
            searchQuery={filters.searchQuery}
            hasActiveFilters={hasActiveFilters}
            onViewDetails={(r) => openDrawer('role-details', { id: String(r.id) })}
            onEditRole={(r) => openDrawer('role', { mode: 'edit', id: String(r.id) })}
            onCloneRole={(r) => cloneRole(r)}
            onDeleteRole={(r) => setDeleteConfirmRole(r)}
            onSetGoogleDefault={(r) => setGoogleDefault(r)}
            onResetFilters={resetFilters}
            onOpenCreateDrawer={() => openDrawer('role', { mode: 'add' })}
          />
        ) : (
          <RoleCardGrid
            roles={filteredRoles}
            loading={loading}
            searchQuery={filters.searchQuery}
            hasActiveFilters={hasActiveFilters}
            onViewDetails={(r) => openDrawer('role-details', { id: String(r.id) })}
            onEditRole={(r) => openDrawer('role', { mode: 'edit', id: String(r.id) })}
            onCloneRole={(r) => cloneRole(r)}
            onDeleteRole={(r) => setDeleteConfirmRole(r)}
            onSetGoogleDefault={(r) => setGoogleDefault(r)}
            onResetFilters={resetFilters}
            onOpenCreateDrawer={() => openDrawer('role', { mode: 'add' })}
          />
        )}
      </div>

      {/* 5. Data View Footer */}
      {!loading && roles.length > 0 && (
        <DataViewFooter
          filteredCount={filteredRoles.length}
          totalCount={roles.length}
          itemLabel="roles"
        />
      )}

      {/* 6. Delete Role Confirmation Modal */}
      {deleteConfirmRole && (
        <RoleDeleteModal
          isOpen={Boolean(deleteConfirmRole)}
          role={deleteConfirmRole}
          submitting={submitting}
          onClose={() => setDeleteConfirmRole(null)}
          onConfirm={async (r) => {
            const ok = await deleteRole(r);
            if (ok) {
              setDeleteConfirmRole(null);
            }
          }}
        />
      )}
    </PageContainer>
  );
};

export default RoleManagementView;
