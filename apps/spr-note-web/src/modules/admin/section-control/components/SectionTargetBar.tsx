import React, { useMemo } from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import FilterBox, { FilterBoxScopeItem } from '../../../../components/ui/FilterBox';
import IconButton from '../../../../components/ui/IconButton';
import { RefreshIcon } from '../../../../components/ui/Icons';
import { useHorizontalScroll } from '../../../../hooks';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { ScopeType, RoleOption, UserSearchResult, AcademyOption, SectionCategory } from '../types';
import SectionSearchInput from './SectionSearchInput';
import SectionStatsMetaCard from './SectionStatsMetaCard';

export interface SectionTargetBarProps {
  activeScope: ScopeType;
  selectedRole: string;
  onSelectRole: (roleCode: string) => void;
  dbRoles: RoleOption[];
  selectedAcademy?: string;
  onSelectAcademy?: (academyId: string) => void;
  selectedAcademyRole?: string;
  onSelectAcademyRole?: (roleCode: string) => void;
  selectedAcademyUser?: string;
  onSelectAcademyUser?: (userId: string) => void;
  filteredAcademyUsers?: UserSearchResult[];
  dbAcademies?: AcademyOption[];
  dbUsers?: UserSearchResult[];
  selectedUser: string;
  onSelectUser: (userId: string) => void;
  searchFilter: string;
  onSearchFilterChange: (query: string) => void;
  // Audit-specific toolbar props
  auditScopeFilter?: string;
  onAuditScopeFilterChange?: (scope: string) => void;
  onRefreshAuditLogs?: () => void;
  loadingAuditLogs?: boolean;
  totalSectionsCount?: number;
  // Real-time authoritative feature stats props for metacard
  enabledSectionsCount?: number;
  disabledSectionsCount?: number;
  activePercentage?: number;
  modifiedCount?: number;
  categories?: SectionCategory[];
  modifiedFlags?: Record<string, boolean>;
}

export const SectionTargetBar: React.FC<SectionTargetBarProps> = ({
  activeScope,
  selectedRole,
  onSelectRole,
  dbRoles,
  selectedAcademy,
  onSelectAcademy,
  selectedAcademyRole = '',
  onSelectAcademyRole,
  selectedAcademyUser = '',
  onSelectAcademyUser,
  filteredAcademyUsers = [],
  dbAcademies = [],
  dbUsers = [],
  selectedUser,
  onSelectUser,
  searchFilter,
  onSearchFilterChange,
  auditScopeFilter,
  onAuditScopeFilterChange,
  onRefreshAuditLogs,
  loadingAuditLogs = false,
  totalSectionsCount = 0,
  enabledSectionsCount = 0,
  disabledSectionsCount = 0,
  activePercentage = 0,
  modifiedCount = 0,
  categories = [],
  modifiedFlags = {},
}) => {
  const { t, formatNumber } = useSectionTranslation();
  const rolesScrollRef = useHorizontalScroll();

  const currentAcademy = useMemo(
    () => dbAcademies.find((a) => String(a.id) === String(selectedAcademy)),
    [dbAcademies, selectedAcademy]
  );
  const activeAcademyName = currentAcademy?.name;

  const currentRole = useMemo(
    () => dbRoles.find((r) => r.code === selectedRole),
    [dbRoles, selectedRole]
  );
  const activeRoleName = currentRole?.name || currentRole?.label;

  const currentAcademyUser = useMemo(
    () => filteredAcademyUsers.find((u) => String(u.id) === String(selectedAcademyUser)),
    [filteredAcademyUsers, selectedAcademyUser]
  );
  const activeAcademyUserName = currentAcademyUser?.name || currentAcademyUser?.first_name;

  const currentUser = useMemo(
    () => dbUsers.find((u) => String(u.id) === String(selectedUser)),
    [dbUsers, selectedUser]
  );
  const activeUserName = currentUser?.name || currentUser?.first_name;

  const roleList: Array<{ id: string; label: string; name?: string }> = useMemo(() => {
    return dbRoles.map((r) => ({
      id: r.code,
      label: r.code,
      name: r.name,
    }));
  }, [dbRoles]);

  const academyOptions = useMemo(() => {
    return dbAcademies.map((a) => ({
      value: String(a.id),
      label: `${a.name}${a.code ? ` (${a.code})` : ''}`,
    }));
  }, [dbAcademies]);

  const userOptions = useMemo(() => {
    return dbUsers.map((u) => ({
      value: String(u.id),
      label: `${u.first_name || u.name || 'User'} (${u.email || u.phone_number || `#${u.id}`})`,
    }));
  }, [dbUsers]);

  const academyRoleOptions = useMemo(() => {
    return [
      { value: 'ALL', label: t('targets.allRolesBase', 'All Roles (Academy Base)') },
      ...dbRoles
        .filter((r) => r.code?.toUpperCase() !== 'SUPER_ADMIN')
        .map((r) => ({
          value: r.code,
          label: `${r.name || r.code} (${r.code})`,
        })),
    ];
  }, [dbRoles, t]);

  const academyUserOptions = useMemo(() => {
    const list = filteredAcademyUsers.length > 0 ? filteredAcademyUsers : [];
    return [
      { value: 'ALL', label: t('targets.allUsersNoOverride', 'All Users (No User Override)') },
      ...list
        .filter((u) => {
          const uType = (u.user_type || '').toUpperCase();
          const rCode = (typeof u.role === 'string' ? u.role : u.role?.code || '').toUpperCase();
          return uType !== 'SUPER_ADMIN' && rCode !== 'SUPER_ADMIN';
        })
        .map((u) => {
          const displayName = u.first_name || u.name || 'User';
          const contact = u.email || u.phone_number || `#${u.id}`;
          const roleTag = u.user_type || (typeof u.role === 'string' ? u.role : u.role?.name || u.role?.code);
          return {
            value: String(u.id),
            label: `${displayName} (${contact})${roleTag ? ` - ${roleTag}` : ''}`,
          };
        }),
    ];
  }, [filteredAcademyUsers, t]);

  const academyScopeItems: FilterBoxScopeItem[] = useMemo(() => {
    const items: FilterBoxScopeItem[] = [];
    const currentInst = dbAcademies.find((a) => String(a.id) === String(selectedAcademy));
    if (currentInst) {
      items.push({
        label: 'Academy',
        value: (
          <span className="font-semibold theme-text-primary">
            {currentInst.name}
          </span>
        ),
      });
    }

    if (selectedAcademyRole && selectedAcademyRole !== 'ALL') {
      items.push({
        label: 'Role Scope',
        value: (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {selectedAcademyRole}
          </span>
        ),
      });
    }

    if (selectedAcademyUser && selectedAcademyUser !== 'ALL') {
      const matchedUser = filteredAcademyUsers.find((u) => String(u.id) === String(selectedAcademyUser));
      items.push({
        label: 'User Override',
        value: (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
            {matchedUser?.name || matchedUser?.first_name || `#${selectedAcademyUser}`}
          </span>
        ),
      });
    }

    return items;
  }, [dbAcademies, selectedAcademy, selectedAcademyRole, selectedAcademyUser, filteredAcademyUsers]);

  const auditScopeOptions = useMemo(
    () => [
      { value: 'ALL', label: t('audit.allScopes', 'All Scopes') },
      { value: 'GLOBAL', label: 'GLOBAL' },
      { value: 'ROLE', label: 'ROLE' },
      { value: 'ACADEMY', label: 'ACADEMY' },
      { value: 'USER', label: 'USER' },
    ],
    [t]
  );

  return (
    <div className="p-3 sm:p-4 theme-bg-surface border-0 rounded-2xl shadow-xs transition-all w-full">
      {/* 1. Global Scope: Global Defaults Label (Left) + Search & Stats More Button (Right) */}
      {activeScope === 'global' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
              {t('tabs.global', 'Global Defaults')}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-sub theme-text-secondary shrink-0">
              {formatNumber(enabledSectionsCount)} / {formatNumber(totalSectionsCount)} {t('stats.enabled', 'Active')}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="w-full sm:w-80">
              <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
            </div>
            <SectionStatsMetaCard
              activeScope={activeScope}
              totalCount={totalSectionsCount}
              enabledCount={enabledSectionsCount}
              disabledCount={disabledSectionsCount}
              percentage={activePercentage}
              categories={categories}
              modifiedFlags={modifiedFlags}
              modifiedCount={modifiedCount}
            />
          </div>
        </div>
      )}

      {/* 2. Target Role Scope: Scrollable Role Pills (Left) + Search & Stats More Button (Right) */}
      {activeScope === 'role' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider shrink-0">
              {t('targets.targetRole', 'Target Role:')}
            </span>
            <div
              ref={rolesScrollRef}
              className="flex items-center gap-2 overflow-x-auto min-w-0 flex-1 scrollbar-none py-0.5 cursor-grab active:cursor-grabbing select-none touch-pan-x overscroll-x-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {roleList.length === 0 ? (
                <span className="text-xs theme-text-secondary italic">
                  {t('targets.noRolesFound', 'No roles found')}
                </span>
              ) : (
                roleList.map((roleObj) => {
                  const isSelected = selectedRole === roleObj.id;
                  return (
                    <CustomButton
                      key={roleObj.id}
                      size="sm"
                      variant={isSelected ? 'primary' : 'sub'}
                      onClick={() => onSelectRole(roleObj.id)}
                      title={roleObj.name || roleObj.label}
                      className="shrink-0 text-xs select-none max-w-[120px]"
                    >
                      <span className="truncate">{roleObj.label}</span>
                    </CustomButton>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="w-full sm:w-80">
              <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
            </div>
            <SectionStatsMetaCard
              activeScope={activeScope}
              totalCount={totalSectionsCount}
              enabledCount={enabledSectionsCount}
              disabledCount={disabledSectionsCount}
              percentage={activePercentage}
              activeRole={selectedRole}
              activeRoleName={activeRoleName}
              categories={categories}
              modifiedFlags={modifiedFlags}
              modifiedCount={modifiedCount}
            />
          </div>
        </div>
      )}

      {/* 3. Target Academy Scope: Reusable FilterBox with Target Academy, Role Scopes, User Overrides & Search Features */}
      {activeScope === 'academy' && (
        <FilterBox
          showCardWrapper={false}
          collapsible={false}
          className="w-full !p-0"
          primaryRow={
            <div className="grid grid-cols-1 @[500px]:grid-cols-2 @[960px]:grid-cols-4 gap-2.5 sm:gap-3 w-full items-end">
              {/* Slot 1: Target Academy */}
              <div className="col-span-1">
                <CustomSelect
                  label={t('targets.targetAcademy', 'Target Academy')}
                  options={academyOptions}
                  value={selectedAcademy || ''}
                  onChange={(val) => onSelectAcademy?.(String(val || ''))}
                  placeholder={t('targets.academySearchPlaceholder', 'Select target academy...')}
                  searchable={true}
                  size="md"
                />
              </div>

              {/* Slot 2: Role Scopes (Academy-scoped) */}
              <div className="col-span-1">
                <CustomSelect
                  label={t('targets.roleScopes', 'Role Scopes')}
                  options={academyRoleOptions}
                  value={selectedAcademyRole || 'ALL'}
                  onChange={(val) => onSelectAcademyRole?.(String(val || 'ALL'))}
                  placeholder={t('targets.selectRoleScope', 'All Roles (Academy Base)')}
                  searchable={false}
                  size="md"
                />
              </div>

              {/* Slot 3: User Overrides (Filtered strictly to picked academy) */}
              <div className="col-span-1">
                <CustomSelect
                  label={t('targets.userOverrides', 'User Overrides')}
                  options={academyUserOptions}
                  value={selectedAcademyUser || 'ALL'}
                  onChange={(val) => onSelectAcademyUser?.(String(val || 'ALL'))}
                  placeholder={
                    !selectedAcademy
                      ? t('targets.selectAcademyFirst', 'Select academy first...')
                      : filteredAcademyUsers.length === 0
                      ? t('targets.noUsersInAcademy', 'No users in this academy')
                      : t('targets.selectUserOverride', 'All Users (No User Override)')
                  }
                  searchable={true}
                  size="md"
                  disabled={!selectedAcademy || filteredAcademyUsers.length === 0}
                />
              </div>

              {/* Slot 4: Search Features */}
              <div className="col-span-1">
                <CustomInput
                  label={t('targets.searchFeatures', 'Search Features')}
                  type="search"
                  size="md"
                  value={searchFilter}
                  onChange={(val: any) => onSearchFilterChange(typeof val === 'string' ? val : val?.target?.value || '')}
                  placeholder={t('search.placeholder', 'Filter features & modules...')}
                  clearable={true}
                />
              </div>
            </div>
          }
          scopeItems={academyScopeItems}
          scopeLabel=""
          hasActiveFilters={Boolean(
            (selectedAcademyRole && selectedAcademyRole !== 'ALL') ||
            (selectedAcademyUser && selectedAcademyUser !== 'ALL') ||
            searchFilter.trim()
          )}
          onResetFilters={() => {
            onSelectAcademyRole?.('ALL');
            onSelectAcademyUser?.('ALL');
            onSearchFilterChange('');
          }}
          resetLabel={t('empty.clearSearch', 'Reset')}
          footerActions={
            <SectionStatsMetaCard
              activeScope={activeScope}
              totalCount={totalSectionsCount}
              enabledCount={enabledSectionsCount}
              disabledCount={disabledSectionsCount}
              percentage={activePercentage}
              activeAcademy={selectedAcademy}
              activeAcademyName={activeAcademyName}
              activeAcademyRole={selectedAcademyRole}
              activeAcademyUser={selectedAcademyUser}
              activeAcademyUserName={activeAcademyUserName}
              categories={categories}
              modifiedFlags={modifiedFlags}
              modifiedCount={modifiedCount}
            />
          }
        />
      )}

      {/* 4. Target User Scope: User Dropdown (Left) + Search & Stats More Button (Right) */}
      {activeScope === 'user' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider shrink-0 whitespace-nowrap">
              {t('targets.targetUser', 'Target User:')}
            </span>

            <div className="w-full sm:w-72 md:w-80">
              <CustomSelect
                options={userOptions}
                value={selectedUser}
                onChange={(val) => onSelectUser(String(val))}
                placeholder={t('targets.userSearchPlaceholder', 'Select target user...')}
                searchable={true}
                size="sm"
              />
            </div>

            {selectedUser && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs">
                  {t('targets.selectedUserId', `Selected User ID: #${selectedUser}`, { id: selectedUser })}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectUser('')}
                  className="text-xs theme-text-secondary hover:text-[var(--danger-text)] font-semibold transition cursor-pointer"
                >
                  {t('empty.clearSearch', 'Clear')}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="w-full sm:w-80">
              <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
            </div>
            <SectionStatsMetaCard
              activeScope={activeScope}
              totalCount={totalSectionsCount}
              enabledCount={enabledSectionsCount}
              disabledCount={disabledSectionsCount}
              percentage={activePercentage}
              activeUser={selectedUser}
              activeUserName={activeUserName}
              categories={categories}
              modifiedFlags={modifiedFlags}
              modifiedCount={modifiedCount}
            />
          </div>
        </div>
      )}

      {/* 4. Target Audit Scope: Scope Filter Dropdown + Refresh Button (Left) + Reused SectionSearchInput (Right) */}
      {activeScope === 'audit' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider shrink-0">
              {t('audit.scope', 'Scope:')}
            </span>

            <div className="w-full sm:w-44">
              <CustomSelect
                size="sm"
                value={auditScopeFilter || 'ALL'}
                onChange={(val: any) => onAuditScopeFilterChange?.(val?.value || val || 'ALL')}
                options={auditScopeOptions}
                placeholder={t('audit.filterByScope', 'Filter by scope')}
              />
            </div>

            {onRefreshAuditLogs && (
              <IconButton
                icon={RefreshIcon}
                size="md"
                variant="sub"
                loading={loadingAuditLogs}
                disabled={loadingAuditLogs}
                onClick={onRefreshAuditLogs}
                title={t('actions.refreshLogs', 'Refresh Logs')}
                ariaLabel={t('actions.refreshLogs', 'Refresh Logs')}
                className="shrink-0"
              />
            )}
          </div>

          <div className="w-full sm:w-80 shrink-0">
            <SectionSearchInput
              value={searchFilter}
              onChange={onSearchFilterChange}
              placeholder={t('audit.searchPlaceholder', 'Search audit logs by user, section key, or target...')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionTargetBar;
