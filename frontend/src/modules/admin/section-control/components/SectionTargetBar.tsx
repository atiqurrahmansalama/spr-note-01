import React, { useMemo } from 'react';
import CustomSelect from '../../../../components/ui/CustomSelect';
import IconButton from '../../../../components/ui/IconButton';
import { RefreshIcon } from '../../../../components/ui/Icons';
import { useHorizontalScroll } from '../../../../hooks';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { ScopeType, RoleOption, UserSearchResult, AcademyOption } from '../types';
import SectionSearchInput from './SectionSearchInput';

export interface SectionTargetBarProps {
  activeScope: ScopeType;
  selectedRole: string;
  onSelectRole: (roleCode: string) => void;
  dbRoles: RoleOption[];
  selectedAcademy?: string;
  onSelectAcademy?: (academyId: string) => void;
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
  // New prop: total number of feature switches (sections) across all categories
  totalSectionsCount?: number;
}

export const SectionTargetBar: React.FC<SectionTargetBarProps> = ({
  activeScope,
  selectedRole,
  onSelectRole,
  dbRoles,
  selectedAcademy,
  onSelectAcademy,
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
  totalSectionsCount,
}) => {
  const { t, formatNumber } = useSectionTranslation();
  const rolesScrollRef = useHorizontalScroll();

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
    <div className="p-3 sm:p-4 theme-bg-surface border theme-border rounded-2xl shadow-xs transition-all w-full">
      {/* 1. Global Scope: Global Defaults Label (Left) + Single Medium Search Bar (Right) */}
      {activeScope === 'global' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-1 text-xs font-bold theme-text-secondary uppercase tracking-wider">
            {t('tabs.totalFeatures', 'Total Features:')}
            {typeof totalSectionsCount === 'number' && (
              <span className="text-xs theme-text-secondary ml-1">{formatNumber(totalSectionsCount)}</span>
            )}
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
          </div>
        </div>
      )}

      {/* 2. Target Role Scope: Scrollable Role Pills (Left) + Single Medium Search Bar (Right) */}
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
                    <button
                      key={roleObj.id}
                      type="button"
                      onClick={() => onSelectRole(roleObj.id)}
                      title={roleObj.name || roleObj.label}
                      className={`h-[38px] px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer border whitespace-nowrap select-none shrink-0 flex items-center justify-center text-center w-[130px] min-w-[120px] max-w-[120px] ${
                        isSelected
                          ? 'theme-bg-accent theme-accent-text border-transparent shadow-xs'
                          : 'theme-bg-sub theme-text-secondary hover:theme-text-primary theme-border hover:theme-bg-elevated'
                      }`}
                    >
                      <span className="truncate">{roleObj.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
          </div>
        </div>
      )}

      {/* 3. Target Academy Scope: Academy Dropdown (Left) + Single Medium Search Bar (Right) */}
      {activeScope === 'academy' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider shrink-0 whitespace-nowrap">
              {t('targets.targetAcademy', 'Target Academy:')}
            </span>

            <div className="w-full sm:w-72 md:w-80">
              <CustomSelect
                options={academyOptions}
                value={selectedAcademy || ''}
                onChange={(val) => onSelectAcademy?.(String(val))}
                placeholder={t('targets.academySearchPlaceholder', 'Select target academy...')}
                searchable={true}
                size="sm"
              />
            </div>

            {selectedAcademy && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs">
                  {t('targets.selectedAcademyId', `Selected Academy: #${selectedAcademy}`, { id: selectedAcademy })}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectAcademy?.('')}
                  className="text-xs theme-text-secondary hover:text-[var(--danger-text)] font-semibold transition cursor-pointer"
                >
                  {t('empty.clearSearch', 'Clear')}
                </button>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 shrink-0">
            <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
          </div>
        </div>
      )}

      {/* 4. Target User Scope: User Dropdown (Left) + Single Medium Search Bar (Right) */}
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

          <div className="w-full sm:w-80 shrink-0">
            <SectionSearchInput value={searchFilter} onChange={onSearchFilterChange} />
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
