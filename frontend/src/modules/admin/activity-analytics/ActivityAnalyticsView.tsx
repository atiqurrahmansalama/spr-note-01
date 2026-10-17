import React, { useMemo } from 'react';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import PageContainer from '../../../components/layout/PageContainer';
import PageHeader from '../../../components/ui/PageHeader';
import DataViewToolbar from '../../../components/ui/DataViewToolbar';
import DataViewFooter from '../../../components/ui/DataViewFooter';
import CustomSelect from '../../../components/ui/CustomSelect';
import IconButton from '../../../components/ui/IconButton';
import {
  DashboardIcon,
  RefreshIcon,
  DownloadIcon,
} from '../../../components/ui/Icons';
import { useActivityAnalytics, useActivityTranslation } from './hooks';
import {
  ActivityMetricsGrid,
  ActivityAnalyticsTable,
  ActivityAnalyticsCardGrid,
  ActivityUserDetailDrawer,
} from './components';
import { DatePreset, DeviceTypeFilter } from './types';

export const ActivityAnalyticsView: React.FC = () => {
  const { t, formatNumber } = useActivityTranslation();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const {
    analyticsData,
    filteredData,
    loading,
    metrics,
    viewMode,
    filters,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    handleToggleViewMode,
    loadAnalytics,
    exportCsv,
  } = useActivityAnalytics();

  // Preset Date Options
  const datePresetOptions = useMemo(
    () => [
      { value: 'today', label: t('filters.presetToday', 'Today') },
      { value: '7d', label: t('filters.preset7d', 'Last 7 Days') },
      { value: '30d', label: t('filters.preset30d', 'Last 30 Days') },
      { value: 'all', label: t('filters.presetAll', 'All Time') },
      { value: 'custom', label: t('filters.presetCustom', 'Custom Range') },
    ],
    [t]
  );

  // Device Type Options
  const deviceOptions = useMemo(
    () => [
      { value: 'ALL', label: t('filters.allDevices', 'All Devices') },
      { value: 'web', label: t('filters.deviceWeb', 'Web Browser') },
      { value: 'android', label: t('filters.deviceAndroid', 'Android App') },
      { value: 'ios', label: t('filters.deviceIos', 'iOS App') },
    ],
    [t]
  );

  // Role Type Options dynamically gathered from data
  const roleOptions = useMemo(() => {
    const rolesSet = new Set<string>();
    analyticsData.forEach((d) => {
      if (d.user_type) rolesSet.add(d.user_type);
    });

    const list = Array.from(rolesSet).map((role) => ({
      value: role,
      label: role,
    }));

    return [{ value: 'ALL', label: t('filters.allRoles', 'All Roles') }, ...list];
  }, [analyticsData, t]);

  // Compute maximum duration for progress bars
  const maxMinutes = useMemo(() => {
    const values = analyticsData.map((d) => d.total_active_duration_minutes || 0);
    return Math.max(...values, 1);
  }, [analyticsData]);

  // Universal Drawer Registration for Detailed User Inspection
  useDrawerRegistration(
    'activity-detail',
    (params) => {
      const userId = params.get('id');
      const foundUser = userId
        ? analyticsData.find((u) => String(u.user_id) === String(userId)) || null
        : null;
      const userName = foundUser?.name || 'User';

      return {
        title: t('drawer.title', `Activity & Audit: ${userName}`, { name: userName }),
        category: t('drawer.category', 'Activity Analytics'),
        size: 'md',
        content: (
          <ActivityUserDetailDrawer
            key={`activity-drawer-${userId}`}
            user={foundUser}
            onClose={closeDrawer}
          />
        ),
      };
    },
    [analyticsData, closeDrawer, t]
  );

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Page Header */}
      <PageHeader
        icon={DashboardIcon}
        title={t('title', 'Activity & Session Analytics')}
        subtitle={t(
          'subtitle',
          'Monitor user engagement, device sessions, active time windows, and security audit logs'
        )}
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary tracking-wide">
            {t('totalTrackedBadge', `${formatNumber(metrics.totalUsersTracked)} Tracked Accounts`, {
              count: formatNumber(metrics.totalUsersTracked),
            })}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <IconButton
              icon={RefreshIcon}
              size="md"
              variant="sub"
              loading={loading}
              disabled={loading}
              onClick={loadAnalytics}
              title={t('refresh', 'Refresh Metrics')}
              ariaLabel={t('refresh', 'Refresh Metrics')}
            />
          </div>
        }
      />

      {/* 2. Top Statistics Metrics Grid */}
      <ActivityMetricsGrid metrics={metrics} />

      {/* 3. Reusable Search & Multi-Filters Toolbar */}
      <DataViewToolbar
        searchLabel={t('filters.searchPlaceholder', 'Search Activity')}
        searchQuery={filters.search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder={t('filters.searchPlaceholder', 'Search by user name, phone, or role...')}
        stackedSwitcher={true}
        filterGridClassName="grid-cols-1 sm:grid-cols-3"
        searchSpanClassName="col-span-1"
        filterElement={
          <>
            {/* Time Horizon Preset */}
            <CustomSelect
              label={t('filters.timeHorizon', 'Time Frame')}
              value={filters.datePreset}
              onChange={(val: any) => updateFilters({ datePreset: val as DatePreset })}
              options={datePresetOptions}
              placeholder={t('filters.timeHorizon', 'Time Frame')}
              size="md"
            />

            {/* Role Filter */}
            <CustomSelect
              label={t('filters.role', 'Role')}
              value={filters.user_type}
              onChange={(val: any) => updateFilters({ user_type: String(val) })}
              options={roleOptions}
              placeholder={t('filters.allRoles', 'All Roles')}
              size="md"
            />

            {/* Device Type Filter */}
            <CustomSelect
              label={t('filters.device', 'Device')}
              value={filters.device_type}
              onChange={(val: any) => updateFilters({ device_type: val as DeviceTypeFilter })}
              options={deviceOptions}
              placeholder={t('filters.allDevices', 'All Devices')}
              size="md"
            />
          </>
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onRefresh={loadAnalytics}
        loading={loading}
        filteredCount={filteredData.length}
        totalCount={analyticsData.length}
        itemLabel="accounts"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        actions={
          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
            title={t('export.exportCsv', 'Export CSV')}
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>{t('export.exportCsv', 'Export CSV')}</span>
          </button>
        }
      />

      {/* 4. Custom Date Range Pickers (Rendered when Custom Range is active) */}
      {filters.datePreset === 'custom' && (
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="theme-text-secondary">{t('filters.fromDate', 'From')}:</span>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => updateFilters({ from_date: e.target.value })}
              className="px-3 py-1.5 rounded-xl theme-bg-surface border theme-border theme-text-primary text-xs outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="theme-text-secondary">{t('filters.toDate', 'To')}:</span>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => updateFilters({ to_date: e.target.value })}
              className="px-3 py-1.5 rounded-xl theme-bg-surface border theme-border theme-text-primary text-xs outline-none"
            />
          </div>
        </div>
      )}

      {/* 5. Main Content: Table or Card Grid */}
      <div className="space-y-4">
        {viewMode === 'grid' ? (
          <ActivityAnalyticsCardGrid
            records={filteredData}
            loading={loading}
            onInspectUser={(record) =>
              openDrawer('activity-detail', { id: String(record.user_id) })
            }
            maxMinutes={maxMinutes}
          />
        ) : (
          <ActivityAnalyticsTable
            records={filteredData}
            loading={loading}
            onInspectUser={(record) =>
              openDrawer('activity-detail', { id: String(record.user_id) })
            }
            maxMinutes={maxMinutes}
          />
        )}

        {/* DataViewFooter Counter */}
        {!loading && analyticsData.length > 0 && (
          <DataViewFooter
            filteredCount={filteredData.length}
            totalCount={analyticsData.length}
            itemLabel="activity records"
          />
        )}
      </div>
    </PageContainer>
  );
};

export default ActivityAnalyticsView;
