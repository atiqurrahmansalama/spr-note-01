import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import DrawerContainer from '../../../components/layout/DrawerContainer';
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  DownloadIcon,
  RefreshIcon,
  DevicePhoneIcon,
  ExternalLinkIcon,
  ClockIcon,
} from '../../../components/ui/Icons';
import type { AppRelease } from '../types';

export interface ReleaseNotesDrawerProps {
  release: AppRelease | null;
  currentVersion: string;
  onClose: () => void;
  onReloadAndUpdate?: () => void;
}

export const ReleaseNotesDrawer: React.FC<ReleaseNotesDrawerProps> = ({
  release,
  currentVersion,
  onClose,
  onReloadAndUpdate,
}) => {
  const navigate = useNavigate();
  const { t, formatDate, isRTL } = useTranslation('version_control');

  if (!release) {
    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="p-6 text-center theme-text-secondary">
          {t('no_releases_found', 'No releases recorded yet.')}
        </div>
      </DrawerContainer>
    );
  }

  const isCurrent = currentVersion === release.version;
  const hasFeatures = release.changelog_features && release.changelog_features.length > 0;
  const hasImprovements = release.changelog_improvements && release.changelog_improvements.length > 0;
  const hasFixes = release.changelog_fixes && release.changelog_fixes.length > 0;
  const hasSecurity = release.changelog_security && release.changelog_security.length > 0;

  return (
    <DrawerContainer padding="none" spacing="normal" className="p-4 sm:p-6 @container">
      {/* Release Header Banner */}
      <div className="p-4 rounded-2xl theme-bg-elevated border theme-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono tracking-tight theme-text-primary">
              v{release.version}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase theme-bg-sub border theme-border theme-text-secondary">
              {release.channel}
            </span>
            {release.is_critical_update && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase theme-border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                {t('critical_update', 'Critical Force-Update')}
              </span>
            )}
          </div>
          <div className="text-xs theme-text-secondary flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>
              {release.published_at
                ? formatDate(release.published_at)
                : formatDate(release.created_at)}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-semibold theme-text-primary leading-snug">
          {release.title || `Release v${release.version}`}
        </h3>

        {release.summary && (
          <p className="text-xs theme-text-secondary leading-relaxed">
            {release.summary}
          </p>
        )}

        {/* Client comparison pill */}
        <div className="pt-2 border-t theme-border grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl theme-bg-sub/60 border theme-border">
            <div className="text-[10px] theme-text-secondary">{t('installed_version', 'Installed on this device')}</div>
            <div className="font-mono font-bold theme-text-primary text-xs mt-0.5">
              v{currentVersion}
            </div>
          </div>
          <div className="p-2 rounded-xl theme-bg-sub/60 border theme-border">
            <div className="text-[10px] theme-text-secondary">{t('cloud_latest', 'Latest on cloud')}</div>
            <div className="font-mono font-bold theme-text-primary text-xs mt-0.5 flex items-center gap-1">
              <span>v{release.version}</span>
              {isCurrent ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                  ({t('up_to_date', 'Up to date')})
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                  ({t('update_available', 'Update Available')})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Force-Update Warning Alert */}
      {release.is_critical_update && !isCurrent && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">
              {t('force_update_title', 'Mandatory System Upgrade Required')}
            </h4>
            <p className="text-[11px] text-rose-600/90 dark:text-rose-300/90 leading-relaxed">
              {t('force_update_message', 'Your current client version is no longer supported by the cloud database. Please reload or upgrade immediately to continue using the application.')}
            </p>
          </div>
        </div>
      )}

      {/* Changelog Sections */}
      <div className="space-y-5 pt-1">
        {/* Features */}
        {hasFeatures && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
              <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {t('features', 'New Features')}
              </h4>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {release.changelog_features.length}
              </span>
            </div>
            <ul className="space-y-2">
              {release.changelog_features.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs theme-text-primary leading-relaxed">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {hasImprovements && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
              <RefreshIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {t('improvements', 'Improvements')}
              </h4>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {release.changelog_improvements.length}
              </span>
            </div>
            <ul className="space-y-2">
              {release.changelog_improvements.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs theme-text-primary leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bug Fixes */}
        {hasFixes && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
              <ShieldCheckIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {t('fixes', 'Bug Fixes')}
              </h4>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {release.changelog_fixes.length}
              </span>
            </div>
            <ul className="space-y-2">
              {release.changelog_fixes.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs theme-text-primary leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Security Patches */}
        {hasSecurity && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
              <ShieldCheckIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {t('security', 'Security Patches')}
              </h4>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {release.changelog_security.length}
              </span>
            </div>
            <ul className="space-y-2">
              {release.changelog_security.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs theme-text-primary leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasFeatures && !hasImprovements && !hasFixes && !hasSecurity && (
          <div className="p-4 rounded-xl theme-bg-sub/50 border theme-border text-center text-xs theme-text-secondary">
            {t('no_changelog_items', 'No items recorded for this section.')}
          </div>
        )}
      </div>

      {/* Action Buttons & Downloads */}
      <div className="pt-4 border-t theme-border space-y-2.5">
        {onReloadAndUpdate && !isCurrent && (
          <button
            type="button"
            onClick={onReloadAndUpdate}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold theme-bg-accent text-white hover:opacity-95 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4" />
            <span>{t('reload_and_update', 'Reload & Update Now')}</span>
          </button>
        )}

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2">
          {release.android_apk_url && (
            <a
              href={release.android_apk_url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-medium theme-text-primary transition flex items-center justify-center gap-2 text-center"
            >
              <DevicePhoneIcon className="w-3.5 h-3.5" />
              <span>{t('download_apk', 'Download Android APK')}</span>
              <ExternalLinkIcon className="w-3 h-3 theme-text-secondary" />
            </a>
          )}
          {release.desktop_installer_url && (
            <a
              href={release.desktop_installer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-medium theme-text-primary transition flex items-center justify-center gap-2 text-center"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>{t('download_desktop', 'Download Desktop Installer')}</span>
              <ExternalLinkIcon className="w-3 h-3 theme-text-secondary" />
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/version-control');
          }}
          className="w-full py-2 px-4 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-semibold theme-text-primary transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>{t('manage_releases', 'Manage Releases')}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 px-4 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated text-xs font-medium theme-text-secondary transition text-center cursor-pointer"
        >
          {t('close', 'Close')}
        </button>
      </div>
    </DrawerContainer>
  );
};

export default ReleaseNotesDrawer;
