import React from 'react';
import { useTranslation } from '../../../i18n';
import {
  AlertTriangleIcon,
  RefreshIcon,
  DevicePhoneIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from '../../../components/ui/Icons';
import type { AppRelease } from '../types';

export interface ForceUpdateModalProps {
  isOpen: boolean;
  currentVersion: string;
  latestRelease: AppRelease | null;
  minSupportedVersion?: string;
  onReloadAndUpdate: () => void;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  isOpen,
  currentVersion,
  latestRelease,
  minSupportedVersion,
  onReloadAndUpdate,
}) => {
  const { t, isRTL } = useTranslation('version_control');

  if (!isOpen) return null;

  const minVersion = minSupportedVersion || latestRelease?.min_supported_version || '1.0.0';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl theme-bg-elevated border theme-border shadow-2xl space-y-6 text-center animate-scale-up">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangleIcon className="w-8 h-8" />
        </div>

        {/* Title & Body */}
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold theme-text-primary tracking-tight">
            {t('force_update_title', 'Mandatory System Upgrade Required')}
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            {t(
              'force_update_message',
              'Your current client version is no longer supported by the cloud database. Please reload or upgrade immediately to continue using the application.'
            )}
          </p>
        </div>

        {/* Version Comparison Card */}
        <div className="p-3.5 rounded-2xl theme-bg-sub/60 border theme-border grid grid-cols-2 gap-2 text-left">
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider theme-text-secondary">
              {t('current_version', 'Current Version')}
            </div>
            <div className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              v{currentVersion}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider theme-text-secondary">
              {t('min_required_version', 'Minimum Supported Version')}
            </div>
            <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              v{minVersion}
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onReloadAndUpdate}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold theme-bg-accent text-white hover:opacity-95 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4 animate-spin-reverse" />
            <span>{t('reload_and_update', 'Reload & Update Now')}</span>
          </button>

          {/* Direct Platform Download Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {latestRelease?.android_apk_url && (
              <a
                href={latestRelease.android_apk_url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-medium theme-text-primary transition flex items-center justify-center gap-1.5"
              >
                <DevicePhoneIcon className="w-3.5 h-3.5" />
                <span>{t('download_apk', 'Download Android APK')}</span>
                <ExternalLinkIcon className="w-3 h-3 theme-text-secondary" />
              </a>
            )}
            {latestRelease?.desktop_installer_url && (
              <a
                href={latestRelease.desktop_installer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-medium theme-text-primary transition flex items-center justify-center gap-1.5"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>{t('download_desktop', 'Download Desktop Installer')}</span>
                <ExternalLinkIcon className="w-3 h-3 theme-text-secondary" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForceUpdateModal;
