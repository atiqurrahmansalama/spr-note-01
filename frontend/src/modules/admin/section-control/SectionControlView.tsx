import React, { useMemo } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import {
  SectionControlIcon,
  GlobeIcon,
  UsersIcon,
  StudentIcon,
  TimerIcon,
} from '../../../components/ui/Icons';
import { useSectionTranslation } from './hooks/useSectionTranslation';
import { useSectionControl } from './hooks/useSectionControl';
import { ScopeType } from './types';
import {
  SectionHeaderActions,
  SectionTargetBar,
  SectionCategoryGroup,
  SectionAuditLogTable,
} from './components';

/**
 * SectionControlView
 * Enterprise orchestrator for Feature & Module Control (Multi-Tier Feature Toggles).
 * Supports Global, Role, Group, and User scopes with real-time inheritance evaluation and audit logs.
 */
export const SectionControlView: React.FC = () => {
  const { t, formatNumber } = useSectionTranslation();
  const {
    activeScope,
    setActiveScope,
    selectedRole,
    setSelectedRole,
    selectedUser,
    setSelectedUser,
    dbRoles,
    dbUsers,
    categories,
    modifiedFlags,
    modifiedCount,
    totalSectionsCount,
    searchFilter,
    setSearchFilter,
    loading,
    saving,
    resetting,
    auditLogs,
    loadingLogs,
    handleToggle,
    handleSaveBatch,
    handleResetOverrides,
    handleClearOverridesGlobally,
    loadAuditLogs,
  } = useSectionControl();

  const [auditSearchQuery, setAuditSearchQuery] = React.useState<string>('');
  const [auditScopeFilter, setAuditScopeFilter] = React.useState<string>('ALL');

  // Filtered audit records with instant client-side responsiveness
  const filteredAuditLogs = useMemo(() => {
    let result = auditLogs;
    if (auditScopeFilter && auditScopeFilter !== 'ALL') {
      result = result.filter(
        (log) => (log.scope_type || '').toUpperCase() === auditScopeFilter.toUpperCase()
      );
    }
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase().trim();
      result = result.filter(
        (log) =>
          (log.section_key || '').toLowerCase().includes(q) ||
          (log.changed_by || '').toLowerCase().includes(q) ||
          (log.target_identifier || '').toLowerCase().includes(q) ||
          (log.scope_type || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [auditLogs, auditScopeFilter, auditSearchQuery]);

  // Tab definitions for TabSwitcher
  const tabs = [
    {
      id: 'global',
      label: t('tabs.global', 'Global Defaults'),
      icon: GlobeIcon,
    },
    {
      id: 'role',
      label: t('tabs.role', 'Role Scopes'),
      icon: UsersIcon,
    },
    {
      id: 'user',
      label: t('tabs.user', 'User Overrides'),
      icon: StudentIcon,
    },
    {
      id: 'audit',
      label: t('tabs.audit', 'Audit Trail'),
      icon: TimerIcon,
      badge: auditLogs.length > 0 ? formatNumber(auditLogs.length) : undefined,
    },
  ];

  // Check if any sections match active search filter
  const hasMatchingSections = useMemo(() => {
    if (!searchFilter.trim()) return categories.length > 0;
    const q = searchFilter.toLowerCase();
    const checkMatch = (item: any): boolean => {
      if (
        item.section_key?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      ) {
        return true;
      }
      return Boolean(item.children && item.children.some(checkMatch));
    };

    return categories.some((cat) => cat.sections.some(checkMatch));
  }, [categories, searchFilter]);

  return (
    <PageContainer maxWidth="7xl" className="space-y-4 sm:space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        icon={SectionControlIcon}
        title={t('header.title', 'Feature & Module Control')}
        subtitle={t(
          'header.subtitle',
          'Configure feature visibility, module access, and multi-tier override scopes across your institution.'
        )}
      />

      {/* 2. Scope Tabs with Save Changes Action on the right line */}
      <TabSwitcher
        tabs={tabs}
        activeTab={activeScope}
        onChange={(scopeId: string) => setActiveScope(scopeId as ScopeType)}
        rightContent={
          <SectionHeaderActions
            activeScope={activeScope}
            modifiedCount={modifiedCount}
            saving={saving}
            resetting={resetting}
            onSaveBatch={handleSaveBatch}
            onClearOverridesGlobally={handleClearOverridesGlobally}
            onResetOverrides={handleResetOverrides}
          />
        }
      />

      {/* 3. Reusable Scope Target & Section Filter Toolbar below tabs (Reused across ALL tabs including Audit Trail) */}
      <SectionTargetBar
        activeScope={activeScope}
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        dbRoles={dbRoles}
        dbUsers={dbUsers}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        searchFilter={activeScope === 'audit' ? auditSearchQuery : searchFilter}
        onSearchFilterChange={activeScope === 'audit' ? setAuditSearchQuery : setSearchFilter}
        auditScopeFilter={auditScopeFilter}
        onAuditScopeFilterChange={setAuditScopeFilter}
        onRefreshAuditLogs={() => loadAuditLogs(auditScopeFilter, auditSearchQuery)}
        loadingAuditLogs={loadingLogs}
        totalSectionsCount={totalSectionsCount}
      />

      {/* 5. Main Content Viewport */}
      {activeScope === 'audit' ? (
        <SectionAuditLogTable
          logs={filteredAuditLogs}
          loading={loadingLogs}
        />
      ) : loading && categories.length === 0 ? (
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((skeletonIdx) => (
            <div
              key={skeletonIdx}
              className="p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs animate-pulse space-y-3"
            >
              <div className="h-4 w-44 rounded-md theme-bg-sub" />
              <div className="space-y-2">
                <div className="h-12 rounded-xl theme-bg-sub/60" />
                <div className="h-12 rounded-xl theme-bg-sub/60" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`space-y-5 transition-opacity duration-150 ${
            loading ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {categories.length === 0 ? (
            <div className="p-8 text-center rounded-2xl theme-bg-surface border theme-border shadow-xs">
              <p className="text-xs sm:text-sm theme-text-secondary">
                {t('empty.noSections', 'No configuration sections found.')}
              </p>
            </div>
          ) : searchFilter && !hasMatchingSections ? (
            <div className="p-8 text-center rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3">
              <p className="text-xs sm:text-sm theme-text-secondary">
                {t(
                  'empty.noSearchResults',
                  `No features matched "${searchFilter}". Try a different search term.`,
                  { query: searchFilter }
                )}
              </p>
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-primary hover:theme-bg-elevated cursor-pointer transition shadow-2xs"
              >
                {t('empty.clearSearch', 'Clear Search')}
              </button>
            </div>
          ) : (
            categories.map((category) => (
              <SectionCategoryGroup
                key={category.key}
                category={category}
                modifiedFlags={modifiedFlags}
                searchFilter={searchFilter}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default SectionControlView;
