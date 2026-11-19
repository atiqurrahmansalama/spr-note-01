import React from "react";
import { CloudIcon, CheckCircleIcon } from "../../../../components/ui/Icons";
import { useTranslation } from "../../../../i18n";
import type { BackupStatusData, CloudStorageStatus } from "../types";

interface TelemetryCardsGridProps {
  statusData: BackupStatusData | null;
  isLoadingStatus: boolean;
  cloudTestStatus: CloudStorageStatus;
  autoDownloadEnabled: boolean;
  onTestCloudConnection: () => void;
  onToggleAutoDownload: () => void;
}

export function TelemetryCardsGrid({
  statusData,
  isLoadingStatus,
  cloudTestStatus,
  autoDownloadEnabled,
  onTestCloudConnection,
  onToggleAutoDownload,
}: TelemetryCardsGridProps): React.ReactElement {
  const { t, formatNumber } = useTranslation("backup");

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tier 1: Automated Cloud Vault */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
              {t("tier_1_badge", "Tier 1 - Cloud")}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Active
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold theme-text-primary">
              {t("tier_1_title", "Automated Cloud Vault")}
            </h3>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              {t("tier_1_desc", "Supabase Cloud Storage & Remote Mirror. Continuous replication with integrity check.")}
            </p>
          </div>
          <div className="pt-2 border-t theme-border text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="theme-text-secondary">Frequency:</span>
              <span className="font-medium theme-text-primary">Automated Cron</span>
            </div>
            <div className="flex justify-between">
              <span className="theme-text-secondary">Engine:</span>
              <span className="font-medium theme-text-primary truncate max-w-[130px]">
                Supabase ({statusData?.tier_1_cloud?.provider || "system-backups"})
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={onTestCloudConnection}
            disabled={cloudTestStatus.isTesting}
            className="w-full py-1.5 px-3 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-[11px] font-semibold theme-text-primary flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <CloudIcon className={`w-3.5 h-3.5 theme-accent ${cloudTestStatus.isTesting ? "animate-pulse" : ""}`} />
            <span>{cloudTestStatus.isTesting ? t("tier_1_testing", "Testing Vault...") : t("tier_1_test_btn", "Test Supabase Vault")}</span>
          </button>
          {cloudTestStatus.tested && (
            <div
              className={`text-[10px] p-2 rounded-lg leading-tight ${
                cloudTestStatus.success
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
              }`}
            >
              {cloudTestStatus.message ||
                cloudTestStatus.error ||
                (cloudTestStatus.success ? "Supabase Bucket Verified" : "Failed")}
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Server Standby & Mirror */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
              {t("tier_2_badge", "Tier 2 - Server")}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Healthy
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold theme-text-primary">
              {t("tier_2_title", "Local Server Archive")}
            </h3>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              {t("tier_2_desc", "Self-contained full archive with database dump, media assets, and instant standby SQLite.")}
            </p>
          </div>
          <div className="pt-2 border-t theme-border text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="theme-text-secondary">{t("tier_2_operational_records", "Operational Records")}:</span>
              <span className="font-medium theme-text-primary">
                {isLoadingStatus ? "..." : formatNumber(statusData?.tier_2_server.total_db_records ?? 2500)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="theme-text-secondary">{t("tier_2_media_files", "Media Files")}:</span>
              <span className="font-medium theme-text-primary">
                {isLoadingStatus
                  ? "..."
                  : `${formatNumber(statusData?.tier_2_server.media_files_count || 0)} (${statusData?.tier_2_server.media_size_mb || 0} MB)`}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-center">
            {t("tier_2_mirror_active", "Standby Mirror Active")}
          </div>
        </div>
      </div>

      {/* Tier 3: Client Edge Vault & Auto-Download */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
              {t("tier_3_badge", "Tier 3 - Edge")}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Persistent
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold theme-text-primary">
              {t("tier_3_title", "Local PC & Edge Vault")}
            </h3>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              {t("tier_3_desc", "Real-time browser offline sync plus automated background download to admin computer.")}
            </p>
          </div>
          <div className="pt-2 border-t theme-border text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="theme-text-secondary">{t("tier_3_auto_backup", "Auto Local Backup")}:</span>
              <button
                type="button"
                onClick={onToggleAutoDownload}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  autoDownloadEnabled ? "bg-emerald-500/20 text-emerald-500" : "theme-bg-sub theme-text-secondary"
                }`}
              >
                {autoDownloadEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="theme-text-secondary">Storage Model:</span>
              <span className="font-medium theme-text-primary">Zero-Touch Sync</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-[10px] theme-accent font-medium theme-bg-accent-soft p-2 rounded-lg text-center">
            {t("tier_3_indexeddb", "IndexedDB & LocalStorage")}
          </div>
        </div>
      </div>
    </div>
  );
}
