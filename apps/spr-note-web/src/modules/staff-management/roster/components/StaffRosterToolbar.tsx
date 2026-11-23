import React from 'react';
import FilterBox from '@/components/ui/FilterBox';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { RoleSelect } from '@/components/selectors';
import IconButton from '@/components/ui/IconButton';
import ViewModeToggle from '@/components/ui/ViewModeToggle';
import { SearchIcon, RefreshIcon } from '@/components/ui/Icons';
import { useStaffTranslation } from '../../locales';
import type { StaffDisplayMode } from '../../types';

export interface StaffRosterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  roleFilter: string;
  onRoleChange: (val: string) => void;
  rankFilter: string;
  onRankChange: (val: string) => void;
  rankFilterOptions: Array<{ value: string; label: string }>;
  deptFilter: string;
  onDeptChange: (val: string) => void;
  departmentOptions: Array<{ value: string; label: string }>;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  statusOptions: Array<{ value: string; label: string }>;
  displayMode: StaffDisplayMode;
  onToggleDisplayMode: (mode: StaffDisplayMode) => void;
  matchingCount: number;
  totalCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  activeFilterCount?: number;
}

export const StaffRosterToolbar: React.FC<StaffRosterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleChange,
  rankFilter,
  onRankChange,
  rankFilterOptions,
  deptFilter,
  onDeptChange,
  departmentOptions,
  statusFilter,
  onStatusChange,
  statusOptions,
  displayMode,
  onToggleDisplayMode,
  matchingCount,
  totalCount,
  onRefresh,
  isRefreshing = false,
  hasActiveFilters = false,
  onResetFilters,
  activeFilterCount = 0,
}) => {
  const { t } = useStaffTranslation();

  return (
    <FilterBox
      storageKey="spr_staff_filterbox_expanded"
      collapsible={true}
      defaultExpanded={false}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={onResetFilters}
      activeFilterCount={activeFilterCount}
      moreLabel={t('moreFilters', 'More Filters')}
      hideMoreLabel={t('hideFilters', 'Hide Filters')}
      scopeItems={[
        ...(roleFilter !== 'ALL' && roleFilter ? [{ label: 'Role', value: roleFilter }] : []),
        ...(deptFilter !== 'ALL' && deptFilter
          ? [
              {
                label: 'Department',
                value: departmentOptions.find((d) => d.value === deptFilter)?.label || deptFilter,
              },
            ]
          : []),
        ...(rankFilter !== 'ALL' && rankFilter
          ? [
              {
                label: 'Rank',
                value: rankFilterOptions.find((r) => r.value === rankFilter)?.label || rankFilter,
              },
            ]
          : []),
        ...(statusFilter !== 'ALL' && statusFilter
          ? [
              {
                label: 'Status',
                value: statusOptions.find((s) => s.value === statusFilter)?.label || statusFilter,
              },
            ]
          : []),
      ]}
      primaryRow={
        <div className="grid grid-cols-1 @[540px]:grid-cols-3 gap-3 items-end">
          {/* 1. Search Query */}
          <div className="min-w-0">
            <CustomInput
              label={t('search', 'Search')}
              size="md"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={t('searchPlaceholder', 'Search by name, ID, phone...')}
              icon={SearchIcon}
              clearable={Boolean(searchQuery)}
              onClear={() => onSearchChange('')}
            />
          </div>

          {/* 2. Role Filter */}
          <div className="min-w-0">
            <RoleSelect
              value={roleFilter === 'ALL' ? '' : roleFilter}
              onChange={(val: any) => onRoleChange(val || 'ALL')}
              valueKey="code"
              allowAll={true}
              allLabel={t('allRoles', 'All Roles')}
              placeholder={t('allRoles', 'Filter by Role')}
              label={t('role', 'Role')}
              size="md"
            />
          </div>

          {/* 3. Department Filter */}
          <div className="min-w-0">
            <CustomSelect
              label={t('department', 'Department')}
              options={departmentOptions}
              value={deptFilter}
              onChange={(val) => onDeptChange(val)}
              placeholder={t('allDepartments', 'All Departments')}
              size="md"
            />
          </div>
        </div>
      }
      secondaryRow={
        <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-3 items-end">
          {/* 1. Designation / Rank Filter */}
          <div className="min-w-0">
            <CustomSelect
              label={t('designation', 'Designation / Rank')}
              options={rankFilterOptions}
              value={rankFilter}
              onChange={(val) => onRankChange(val)}
              placeholder={t('allRanks', 'All Designations')}
              searchable={true}
              size="md"
            />
          </div>

          {/* 2. Employment Status Filter */}
          <div className="min-w-0">
            <CustomSelect
              label={t('status', 'Employment Status')}
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => onStatusChange(val)}
              placeholder={t('allStatus', 'All Statuses')}
              size="md"
            />
          </div>
        </div>
      }
    >
      {({ moreButton }) => (
        <div className="flex flex-col @[640px]:flex-row @[640px]:items-center justify-between gap-3 pt-3 border-t theme-border">
          {/* Left: Matching record count + More/Hide toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold theme-text-secondary">
              {t('showing', 'Showing')}{' '}
              <strong className="theme-text-primary font-bold font-mono">{matchingCount}</strong>{' '}
              {t('of', 'of')}{' '}
              <strong className="theme-text-primary font-bold font-mono">{totalCount}</strong>{' '}
              {t('personnel', 'personnel')}
            </span>
            {moreButton}
          </div>

          {/* Right: Refresh button and ViewModeSwitcher */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <IconButton
                icon={RefreshIcon}
                size="md"
                variant="sub"
                loading={isRefreshing}
                disabled={isRefreshing}
                onClick={onRefresh}
                title={t('refresh', 'Refresh')}
                ariaLabel={t('refresh', 'Refresh')}
              />
            )}

            <ViewModeToggle
              viewMode={displayMode}
              onChange={onToggleDisplayMode}
              tableLabel={t('tableView', 'Table View')}
              cardsLabel={t('cardGrid', 'Card Grid')}
            />
          </div>
        </div>
      )}
    </FilterBox>
  );
};

export default StaffRosterToolbar;
