import React from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { RoleSelect } from '@/components/selectors';
import { useStaffTranslation } from '../../locales';
import type { StaffDisplayMode } from '../../types';

interface StaffRosterToolbarProps {
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
}) => {
  const { t } = useStaffTranslation();

  return (
    <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs space-y-4 border-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Search Box */}
        <div>
          <CustomInput
            type="search"
            placeholder={t('searchPlaceholder', 'Search by name, ID, phone...')}
            value={searchQuery}
            onChange={(val) => onSearchChange(val)}
          />
        </div>

        {/* Role Filter */}
        <div>
          <RoleSelect
            value={roleFilter === 'ALL' ? '' : roleFilter}
            onChange={(val: any) => onRoleChange(val || 'ALL')}
            valueKey="code"
            allowAll={true}
            allLabel={t('allRoles', 'All Roles')}
            placeholder={t('allRoles', 'Filter by Role')}
            label={null}
          />
        </div>

        {/* Rank / Designation Filter */}
        <div>
          <CustomSelect
            options={rankFilterOptions}
            value={rankFilter}
            onChange={(val) => onRankChange(val)}
            placeholder={t('allRanks', 'Filter by Rank')}
            searchable={true}
          />
        </div>

        {/* Department Filter */}
        <div>
          <CustomSelect
            options={departmentOptions}
            value={deptFilter}
            onChange={(val) => onDeptChange(val)}
            placeholder={t('allDepartments', 'Filter by Department')}
          />
        </div>

        {/* Employment Status Filter */}
        <div>
          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => onStatusChange(val)}
            placeholder={t('allStatus', 'Filter by Status')}
          />
        </div>
      </div>

      {/* Bottom Toolbar & View Switcher (Zero Harsh Borders) */}
      <div className="flex items-center justify-between gap-3 pt-2 border-0">
        <div className="text-xs theme-text-secondary font-medium">
          {t('showingPersonnel', 'Showing {{count}} of {{total}} personnel', {
            count: matchingCount,
            total: totalCount,
          })}
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl theme-bg-app border-0">
          <button
            type="button"
            onClick={() => onToggleDisplayMode('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              displayMode === 'table'
                ? 'theme-bg-surface theme-accent shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            {t('tableView', 'Table View')}
          </button>
          <button
            type="button"
            onClick={() => onToggleDisplayMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              displayMode === 'grid'
                ? 'theme-bg-surface theme-accent shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            {t('cardGrid', 'Card Grid')}
          </button>
        </div>
      </div>
    </div>
  );
};

