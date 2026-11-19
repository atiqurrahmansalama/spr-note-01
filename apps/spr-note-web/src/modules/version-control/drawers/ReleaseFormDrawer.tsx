import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n';
import DrawerContainer from '../../../components/layout/DrawerContainer';
import CustomInput from '../../../components/ui/CustomInput';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import ChangelogItemInput from '../components/ChangelogItemInput';
import {
  SparklesIcon,
  RefreshIcon,
  ShieldCheckIcon,
  SaveIcon,
  AlertTriangleIcon,
} from '../../../components/ui/Icons';
import type { AppRelease, CreateReleasePayload, ReleaseChannel } from '../types';

export interface ReleaseFormDrawerProps {
  release?: AppRelease | null;
  onSave: (payload: CreateReleasePayload, releaseId?: string) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const ReleaseFormDrawer: React.FC<ReleaseFormDrawerProps> = ({
  release,
  onSave,
  onClose,
  isSubmitting = false,
}) => {
  const { t } = useTranslation('version_control');
  const isEdit = Boolean(release?.id);

  const [version, setVersion] = useState(release?.version || '');
  const [buildNumber, setBuildNumber] = useState<number | ''>(release?.build_number ?? '');
  const [channel, setChannel] = useState<ReleaseChannel>(release?.channel || 'STABLE');
  const [isCriticalUpdate, setIsCriticalUpdate] = useState(Boolean(release?.is_critical_update));
  const [minSupportedVersion, setMinSupportedVersion] = useState(release?.min_supported_version || '1.0.0');
  const [minSupportedBuild, setMinSupportedBuild] = useState<number | ''>(release?.min_supported_build ?? 1);
  const [title, setTitle] = useState(release?.title || '');
  const [summary, setSummary] = useState(release?.summary || '');
  const [androidApkUrl, setAndroidApkUrl] = useState(release?.android_apk_url || '');
  const [desktopInstallerUrl, setDesktopInstallerUrl] = useState(release?.desktop_installer_url || '');
  const [isPublished, setIsPublished] = useState(Boolean(release?.is_published));

  const [features, setFeatures] = useState<string[]>(release?.changelog_features || []);
  const [improvements, setImprovements] = useState<string[]>(release?.changelog_improvements || []);
  const [fixes, setFixes] = useState<string[]>(release?.changelog_fixes || []);
  const [security, setSecurity] = useState<string[]>(release?.changelog_security || []);

  useEffect(() => {
    if (release) {
      setVersion(release.version);
      setBuildNumber(release.build_number);
      setChannel(release.channel);
      setIsCriticalUpdate(Boolean(release.is_critical_update));
      setMinSupportedVersion(release.min_supported_version);
      setMinSupportedBuild(release.min_supported_build);
      setTitle(release.title);
      setSummary(release.summary || '');
      setAndroidApkUrl(release.android_apk_url || '');
      setDesktopInstallerUrl(release.desktop_installer_url || '');
      setIsPublished(Boolean(release.is_published));
      setFeatures(release.changelog_features || []);
      setImprovements(release.changelog_improvements || []);
      setFixes(release.changelog_fixes || []);
      setSecurity(release.changelog_security || []);
    }
  }, [release]);

  const handleSubmit = async (publishImmediately?: boolean) => {
    if (!version.trim() || !title.trim() || buildNumber === '') return;

    const payload: CreateReleasePayload = {
      version: version.trim(),
      build_number: Number(buildNumber),
      channel,
      is_critical_update: isCriticalUpdate,
      min_supported_version: minSupportedVersion.trim() || '1.0.0',
      min_supported_build: Number(minSupportedBuild) || 1,
      title: title.trim(),
      summary: summary.trim(),
      android_apk_url: androidApkUrl.trim() || undefined,
      desktop_installer_url: desktopInstallerUrl.trim() || undefined,
      is_published: publishImmediately !== undefined ? publishImmediately : isPublished,
      changelog_features: features,
      changelog_improvements: improvements,
      changelog_fixes: fixes,
      changelog_security: security,
    };

    await onSave(payload, release?.id);
  };

  return (
    <DrawerContainer padding="none" spacing="normal" className="p-4 sm:p-6 @container">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6 pt-1"
      >
        {/* Section 1: Version Metadata */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('version_label', 'Version (SemVer)')} & {t('release_channel', 'Channel')}
            </h4>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
            <CustomInput
              label={t('version_label', 'Version (SemVer)')}
              placeholder={t('version_placeholder', 'e.g. 1.4.1')}
              value={version}
              onChange={(e: any) => setVersion(e.target.value)}
              required
            />
            <CustomInput
              label={t('build_label', 'Build Number')}
              placeholder={t('build_placeholder', 'e.g. 20261029')}
              type="number"
              value={buildNumber === '' ? '' : String(buildNumber)}
              onChange={(e: any) => setBuildNumber(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                {t('release_channel', 'Channel')}
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ReleaseChannel)}
                className="w-full px-3 py-2 text-xs rounded-xl border theme-border theme-bg-elevated theme-text-primary focus:outline-none"
              >
                <option value="STABLE">STABLE</option>
                <option value="BETA">BETA</option>
                <option value="ALPHA">ALPHA</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <CustomCheckbox
                label={t('critical_update', 'Critical Force-Update')}
                checked={isCriticalUpdate}
                onChange={setIsCriticalUpdate}
              />
            </div>
          </div>

          {isCriticalUpdate && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                {t('is_critical_update_desc', 'Forces all clients running older versions to upgrade immediately before accessing the application.')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
            <CustomInput
              label={t('min_version_label', 'Minimum Supported Version')}
              placeholder={t('min_version_placeholder', 'e.g. 1.3.0')}
              value={minSupportedVersion}
              onChange={(e: any) => setMinSupportedVersion(e.target.value)}
            />
            <CustomInput
              label={t('min_build_label', 'Minimum Supported Build')}
              placeholder={t('min_build_placeholder', 'e.g. 20261001')}
              type="number"
              value={minSupportedBuild === '' ? '' : String(minSupportedBuild)}
              onChange={(e: any) => setMinSupportedBuild(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        {/* Section 2: Release Title & Summary */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('release_title_label', 'Release Title')} & {t('summary_label', 'Executive Summary')}
            </h4>
          </div>

          <CustomInput
            label={t('release_title_label', 'Release Title')}
            placeholder={t('release_title_placeholder', 'e.g. v1.4.0 — Enhanced Analytics & Release Management')}
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              {t('summary_label', 'Executive Summary')}
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('summary_placeholder', 'Brief executive summary of what changed in this version...')}
              className="w-full px-3 py-2 text-xs rounded-xl border theme-border theme-bg-elevated theme-text-primary focus:outline-none resize-y"
            />
          </div>
        </div>

        {/* Section 3: Structured Changelog Management */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('changelog', 'Changelog')}
            </h4>
          </div>

          <ChangelogItemInput
            label={t('features', 'New Features')}
            items={features}
            onChange={setFeatures}
            placeholder={t('feature_placeholder', 'Enter new feature highlight and press Add...')}
            badgeColorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            icon={SparklesIcon}
          />

          <ChangelogItemInput
            label={t('improvements', 'Improvements')}
            items={improvements}
            onChange={setImprovements}
            placeholder={t('improvement_placeholder', 'Enter improvement highlight and press Add...')}
            badgeColorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
            icon={RefreshIcon}
          />

          <ChangelogItemInput
            label={t('fixes', 'Bug Fixes')}
            items={fixes}
            onChange={setFixes}
            placeholder={t('fix_placeholder', 'Enter bug fix and press Add...')}
            badgeColorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            icon={ShieldCheckIcon}
          />

          <ChangelogItemInput
            label={t('security', 'Security Patches')}
            items={security}
            onChange={setSecurity}
            placeholder={t('security_placeholder', 'Enter security improvement and press Add...')}
            badgeColorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
            icon={ShieldCheckIcon}
          />
        </div>

        {/* Section 4: Artifact URLs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('download_apk', 'Download Android APK')} & {t('download_desktop', 'Download Desktop Installer')}
            </h4>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
            <CustomInput
              label={t('android_apk_url', 'Android APK Download URL')}
              placeholder="https://cdn.example.com/spr-note.apk"
              value={androidApkUrl}
              onChange={(e: any) => setAndroidApkUrl(e.target.value)}
            />
            <CustomInput
              label={t('desktop_installer_url', 'Desktop Installer Download URL')}
              placeholder="https://cdn.example.com/spr-note-setup.exe"
              value={desktopInstallerUrl}
              onChange={(e: any) => setDesktopInstallerUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t theme-border flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated text-xs font-medium theme-text-secondary transition cursor-pointer"
          >
            {t('cancel', 'Cancel')}
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !version.trim() || !title.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub text-xs font-semibold theme-text-primary transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>{t('save_draft', 'Save Draft')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !version.trim() || !title.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold theme-bg-accent text-white hover:opacity-95 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span>{t('publish_now', 'Publish Now')}</span>
          </button>
        </div>
      </form>
    </DrawerContainer>
  );
};

export default ReleaseFormDrawer;
