import React from 'react';
import { useNavigate } from 'react-router-dom';
import DataViewToolbar from '@/components/ui/DataViewToolbar';
import CustomSelect from '@/components/ui/CustomSelect';
import { RoleSelect } from '@/components/selectors';
import { PlusIcon } from '@/components/ui/Icons';
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
  const navigate = useNavigate();
  const { t } = useStaffTranslation();

  return (
    <DataViewToolbar
      searchLabel="Search"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('searchPlaceholder', 'Search by name, ID, phone...')}
      searchVariant="app"
      stackedSwitcher={true}
      searchSpanClassName="col-span-1"
      filterGridClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 @[900px]:grid-cols-5 gap-2.5 items-end"
      viewMode={displayMode}
      onToggleViewMode={onToggleDisplayMode}
      tableLabel={t('tableView', 'Table View')}
      cardsLabel={t('cardGrid', 'Card Grid')}
      filteredCount={matchingCount}
      totalCount={totalCount}
      itemLabel={t('personnel', 'personnel')}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={onResetFilters}
      activeFilterCount={activeFilterCount}
      onRefresh={onRefresh}
      loading={isRefreshing}
      actions={
        <button
          type="button"
          onClick={() => navigate('/staff/onboarding')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98 border-0 shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{t('onboardStaff', 'Onboard Staff')}</span>
        </button>
      }
      customFilters={
        <>
          {/* 1. Role Filter */}
          <div className="col-span-1">
            <RoleSelect
              value={roleFilter === 'ALL' ? '' : roleFilter}
              onChange={(val: any) => onRoleChange(val || 'ALL')}
              valueKey="code"
              allowAll={true}
              allLabel={t('allRoles', 'All Roles')}
              placeholder={t('allRoles', 'Filter by Role')}
              label="Role"
              size="md"
            />
          </div>

          {/* 2. Rank / Designation Filter */}
          <div className="col-span-1">
            <CustomSelect
              label="Designation"
              options={rankFilterOptions}
              value={rankFilter}
              onChange={(val) => onRankChange(val)}
              placeholder={t('allRanks', 'Filter by Rank')}
              searchable={true}
              size="md"
            />
          </div>

          {/* 3. Department Filter */}
          <div className="col-span-1">
            <CustomSelect
              label="Department"
              options={departmentOptions}
              value={deptFilter}
              onChange={(val) => onDeptChange(val)}
              placeholder={t('allDepartments', 'Filter by Department')}
              size="md"
            />
          </div>

          {/* 4. Employment Status Filter */}
          <div className="col-span-1">
            <CustomSelect
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => onStatusChange(val)}
              placeholder={t('allStatus', 'Filter by Status')}
              size="md"
            />
          </div>
        </>
      }
    />
  );
};

export default StaffRosterToolbar;
