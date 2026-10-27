import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../../../i18n';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import { versionService } from '../services/versionService';
import { useVersionControl } from '../hooks/useVersionControl';
import { CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER } from '../config';
import { ReleaseNotesDrawer } from '../drawers/ReleaseNotesDrawer';
import { ReleaseFormDrawer } from '../drawers/ReleaseFormDrawer';
import {
  SparklesIcon,
  PlusIcon,
  RefreshIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  FilterIcon,
} from '../../../components/ui/Icons';
import type { AppRelease, CreateReleasePayload, ReleaseChannel } from '../types';

export const ReleaseManagementView: React.FC = () => {
  const { t, formatDate } = useTranslation('version_control');
  const { showToast } = useToast() as any;
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();
  const { checkForUpdates, loading: checkingUpdate, triggerWebReload } = useVersionControl({ autoCheck: false });

  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await versionService.listReleases();
      setReleases(data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to fetch releases', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const handleOpenNotes = useCallback(
    (release: AppRelease) => {
      openRightSidebar({
        title: `${t('release_notes', 'Release Notes')} — v${release.version}`,
        content: (
          <ReleaseNotesDrawer
            release={release}
            currentVersion={CURRENT_APP_VERSION}
            onClose={closeRightSidebar}
            onReloadAndUpdate={triggerWebReload}
          />
        ),
        size: 'md',
        drawerKey: `release-notes-${release.id}`,
        onClose: closeRightSidebar,
      });
    },
    [openRightSidebar, closeRightSidebar, t, triggerWebReload]
  );

  const handleOpenForm = useCallback(
    (release?: AppRelease | null) => {
      const isEdit = Boolean(release?.id);
      openRightSidebar({
        title: isEdit
          ? `${t('edit_release', 'Edit Release')} v${release?.version}`
          : t('create_release', 'New Release'),
        content: (
          <ReleaseFormDrawer
            release={release}
            isSubmitting={isSubmitting}
            onClose={closeRightSidebar}
            onSave={async (payload: CreateReleasePayload, releaseId?: string) => {
              setIsSubmitting(true);
              try {
                if (releaseId) {
                  await versionService.updateRelease(releaseId, payload);
                  showToast(t('save_success', 'Release saved successfully!'), 'success');
                } else {
                  await versionService.createRelease(payload);
                  showToast(t('save_success', 'Release saved successfully!'), 'success');
                }
                closeRightSidebar();
                await fetchReleases();
              } catch (err: any) {
                showToast(err?.message || 'Failed to save release', 'error');
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        ),
        size: 'lg',
        drawerKey: release ? `release-form-${release.id}` : 'release-form-new',
        onClose: closeRightSidebar,
      });
    },
    [openRightSidebar, closeRightSidebar, t, showToast, fetchReleases, isSubmitting]
  );

  const handleTogglePublish = useCallback(
    async (release: AppRelease) => {
      const nextStatus = !release.is_published;
      const confirmMsg = nextStatus
        ? t('confirm_publish', 'Are you sure you want to publish this release to all active clients?')
        : t('confirm_unpublish', 'Are you sure you want to unpublish this release?');

      if (!window.confirm(confirmMsg)) return;

      try {
        if (nextStatus) {
          await versionService.publishRelease(release.id);
        } else {
          await versionService.unpublishRelease(release.id);
        }
        showToast(
          nextStatus
            ? t('publish_success', 'Release published successfully!')
            : t('unpublish_success', 'Release retracted to draft successfully!'),
          'success'
        );
        await fetchReleases();
      } catch (err: any) {
        showToast(err?.message || 'Action failed', 'error');
      }
    },
    [t, showToast, fetchReleases]
  );

  const handleDelete = useCallback(
    async (release: AppRelease) => {
      if (!window.confirm(t('confirm_delete', 'Are you sure you want to permanently delete this release build?'))) {
        return;
      }
      try {
        await versionService.deleteRelease(release.id);
        showToast(t('delete_success', 'Release deleted successfully!'), 'success');
        await fetchReleases();
      } catch (err: any) {
        showToast(err?.message || 'Failed to delete release', 'error');
      }
    },
    [t, showToast, fetchReleases]
  );

  // Filtered releases
  const filteredReleases = useMemo(() => {
    return releases.filter((rel) => {
      const matchSearch =
        !searchQuery.trim() ||
        rel.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rel.summary && rel.summary.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchChannel = selectedChannel === 'ALL' || rel.channel === selectedChannel;
      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'PUBLISHED' && rel.is_published) ||
        (selectedStatus === 'DRAFT' && !rel.is_published);

      return matchSearch && matchChannel && matchStatus;
    });
  }, [releases, searchQuery, selectedChannel, selectedStatus]);

  // Metric counts
  const totalReleases = releases.length;
  const publishedCount = releases.filter((r) => r.is_published).length;
  const activeRelease = releases.find((r) => r.is_published);

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 theme-bg-main font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b theme-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              {t('title', 'Version Control & Releases')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold theme-bg-sub border theme-border theme-text-secondary">
              v{CURRENT_APP_VERSION}
            </span>
          </div>
          <p className="text-xs sm:text-sm theme-text-secondary mt-1">
            {t('subtitle', 'Manage client deployment versions, force-updates, and structured changelogs')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={async () => {
              const res = await checkForUpdates();
              if (res && res.release) {
                handleOpenNotes(res.release);
              }
            }}
            disabled={checkingUpdate}
            className="px-3.5 py-2 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-medium theme-text-primary transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? t('checking', 'Checking...') : t('check_for_updates', 'Check for Updates')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenForm(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent text-white hover:opacity-95 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t('create_release', 'New Release')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-2xl border theme-border theme-bg-elevated space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
            {t('total_releases', 'Total Releases')}
          </div>
          <div className="text-2xl font-bold font-mono theme-text-primary">
            {totalReleases}
          </div>
        </div>

        <div className="p-4 rounded-2xl border theme-border theme-bg-elevated space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
            {t('published_builds', 'Published Builds')}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl border theme-border theme-bg-elevated space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
            {t('current_version', 'Current Client Version')}
          </div>
          <div className="text-2xl font-bold font-mono theme-text-primary">
            v{CURRENT_APP_VERSION}
          </div>
          <div className="text-[10px] theme-text-secondary font-mono">
            {t('build_number', 'Build')}: {CURRENT_BUILD_NUMBER}
          </div>
        </div>

        <div className="p-4 rounded-2xl border theme-border theme-bg-elevated space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
            {t('latest_version', 'Latest Cloud Release')}
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
            {activeRelease ? `v${activeRelease.version}` : '—'}
          </div>
          <div className="text-[10px] theme-text-secondary">
            {activeRelease ? activeRelease.channel : '—'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl border theme-border theme-bg-elevated flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder', 'Search releases by version or title...')}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border theme-border theme-bg-sub/50 theme-text-primary focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border theme-border theme-bg-sub/50 theme-text-primary focus:outline-none"
          >
            <option value="ALL">{t('all_channels', 'All Channels')}</option>
            <option value="STABLE">STABLE</option>
            <option value="BETA">BETA</option>
            <option value="ALPHA">ALPHA</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border theme-border theme-bg-sub/50 theme-text-primary focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">{t('published', 'Published')}</option>
            <option value="DRAFT">{t('draft', 'Draft')}</option>
          </select>
        </div>
      </div>

      {/* Releases Table */}
      <div className="rounded-2xl border theme-border theme-bg-elevated overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs theme-text-secondary flex items-center justify-center gap-2">
            <RefreshIcon className="w-4 h-4 animate-spin" />
            <span>Loading releases...</span>
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm theme-text-secondary">
              {t('no_releases_found', 'No releases recorded yet.')}
            </p>
            <button
              type="button"
              onClick={() => handleOpenForm(null)}
              className="px-4 py-2 text-xs font-semibold theme-bg-accent text-white rounded-xl shadow-sm hover:opacity-95 transition cursor-pointer"
            >
              {t('create_release', 'New Release')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-sub/60 text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
                  <th className="py-3 px-4">{t('version_label', 'Version')}</th>
                  <th className="py-3 px-4">{t('release_channel', 'Channel')}</th>
                  <th className="py-3 px-4">{t('release_title_label', 'Title')}</th>
                  <th className="py-3 px-4">{t('status', 'Status')}</th>
                  <th className="py-3 px-4">{t('release_date', 'Release Date')}</th>
                  <th className="py-3 px-4 text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filteredReleases.map((rel) => {
                  const isCurrent = CURRENT_APP_VERSION === rel.version;
                  return (
                    <tr
                      key={rel.id}
                      className="hover:theme-bg-sub/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold theme-text-primary text-sm">
                            v{rel.version}
                          </span>
                          <span className="text-[10px] font-mono theme-text-secondary">
                            (#{rel.build_number})
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              {t('live_badge', 'Active Live')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase theme-bg-sub border theme-border theme-text-secondary">
                          {rel.channel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-medium theme-text-primary truncate">
                          {rel.title}
                        </div>
                        {rel.summary && (
                          <div className="text-[11px] theme-text-secondary truncate mt-0.5">
                            {rel.summary}
                          </div>
                        )}
                        {rel.is_critical_update && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {t('critical_update', 'Critical Force-Update')}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {rel.is_published ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {t('published', 'Published')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase theme-bg-sub border theme-border theme-text-secondary">
                            {t('draft', 'Draft')}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs theme-text-secondary whitespace-nowrap">
                        {rel.published_at ? formatDate(rel.published_at) : formatDate(rel.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenNotes(rel)}
                            title={t('view_details', 'View Details')}
                            className="p-1.5 rounded-lg border theme-border theme-bg-elevated hover:theme-bg-sub theme-text-primary transition cursor-pointer"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenForm(rel)}
                            title={t('edit_release', 'Edit Release')}
                            className="p-1.5 rounded-lg border theme-border theme-bg-elevated hover:theme-bg-sub theme-text-primary transition cursor-pointer"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePublish(rel)}
                            title={rel.is_published ? t('unpublish_release', 'Retract to Draft') : t('publish_release', 'Publish Release')}
                            className={`p-1.5 rounded-lg border theme-border transition cursor-pointer ${
                              rel.is_published
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(rel)}
                            title={t('delete_release', 'Delete Release')}
                            className="p-1.5 rounded-lg border theme-border bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReleaseManagementView;
