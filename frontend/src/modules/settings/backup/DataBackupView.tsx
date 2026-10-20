import React, { useState, useEffect } from "react";
import { CloudIcon } from "../../../components/ui/Icons";
import { useTranslation } from "../../../i18n";
import {
  useBackupTelemetry,
  useBackupArchives,
  useBackupScheduler,
  useFeatureAnalytics,
  useClientEdgeVault,
} from "./hooks";
import {
  DualEngineReplicationCard,
  TelemetryCardsGrid,
  SchedulerSettingsCard,
  DisasterRecoveryActionsMatrix,
  ServerArchivesTable,
  TenantBackupSection,
  ActivityAnalyticsSection,
  CreateBackupModal,
  NamedRestoreModal,
  UploadRestoreModal,
} from "./components";
import type { BackupTabType, BackupArchiveItem } from "./types";
import "./locales";

export function DataBackupView(): React.ReactElement {
  const { t } = useTranslation("backup");
  const [activeTab, setActiveTab] = useState<BackupTabType>("vault");

  // Modals Local UI State
  const [isCreateBackupModalOpen, setIsCreateBackupModalOpen] = useState<boolean>(false);
  const [namedRestoreTarget, setNamedRestoreTarget] = useState<BackupArchiveItem | null>(null);
  const [isUploadRestoreModalOpen, setIsUploadRestoreModalOpen] = useState<boolean>(false);

  // Business Logic Hooks
  const {
    statusData,
    isLoadingStatus,
    autoDownloadEnabled,
    cloudTestStatus,
    loadBackupStatus,
    handleToggleAutoDownload,
    handleTestCloudConnection,
  } = useBackupTelemetry();

  const {
    archives,
    isLoadingArchives,
    isExportingFull,
    isCreatingServerBackup,
    deletingArchiveName,
    isExecutingNamedRestore,
    isExecutingUploadRestore,
    loadBackupArchives,
    handleCreateServerBackup,
    handleDownloadFullSystemArchive,
    handleDownloadNamedArchive,
    handleDeleteArchive,
    handleExecuteNamedRestore,
    handleExecuteUploadRestore,
  } = useBackupArchives(loadBackupStatus);

  const {
    scheduleSettings,
    isSavingSchedule,
    isTriggeringSchedule,
    loadScheduleSettings,
    handleUpdateSchedule,
    handleTriggerScheduleJobNow,
  } = useBackupScheduler(() => {
    loadBackupStatus();
    loadBackupArchives();
  });

  const {
    analyticsData,
    isLoadingAnalytics,
    isArchivingLogs,
    loadAnalytics,
    handleArchiveStaleLogs,
  } = useFeatureAnalytics(loadBackupStatus);

  const { handleExportLocalJson } = useClientEdgeVault();

  // Initial Data Lifecycle
  useEffect(() => {
    loadBackupStatus();
    loadBackupArchives();
    loadScheduleSettings();
  }, [loadBackupStatus, loadBackupArchives, loadScheduleSettings]);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics(30);
    }
  }, [activeTab, loadAnalytics]);

  const formatDateTime = (isoString?: string | null): string => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      {/* Top Header & Tab Navigation Banner */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 theme-bg-accent-soft rounded-xl theme-accent">
              <CloudIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-primary">
                {t("header_title", "3-Tier Enterprise Disaster Recovery & Vault")}
              </h2>
              <p className="text-xs theme-text-secondary">
                {t(
                  "header_subtitle",
                  "Zero-Data-Loss automated pipeline covering 100% of all database tables, media assets, documents, and client edge caches."
                )}
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 theme-bg-sub border theme-border rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("vault")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "vault"
                  ? "theme-bg-accent theme-text-on-accent shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              {t("tab_vault", "Disaster Recovery & Vault")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tenant")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "tenant"
                  ? "theme-bg-accent theme-text-on-accent shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              {t("tab_tenant", "Campus Data Portability")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "analytics"
                  ? "theme-bg-accent theme-text-on-accent shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              {t("tab_analytics", "Activity Logs & Analytics")}
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Disaster Recovery & Full System Vault */}
      {activeTab === "vault" && (
        <>
          <DualEngineReplicationCard onSyncCompleted={loadBackupStatus} />

          <TelemetryCardsGrid
            statusData={statusData}
            isLoadingStatus={isLoadingStatus}
            cloudTestStatus={cloudTestStatus}
            autoDownloadEnabled={autoDownloadEnabled}
            onTestCloudConnection={handleTestCloudConnection}
            onToggleAutoDownload={handleToggleAutoDownload}
          />

          <SchedulerSettingsCard
            scheduleSettings={scheduleSettings}
            isSavingSchedule={isSavingSchedule}
            isTriggeringSchedule={isTriggeringSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onTriggerScheduleJobNow={handleTriggerScheduleJobNow}
            formatDateTime={formatDateTime}
          />

          <DisasterRecoveryActionsMatrix
            onOpenCreateBackup={() => setIsCreateBackupModalOpen(true)}
            onExportEdgeSnapshot={handleExportLocalJson}
            onOpenUploadRestore={() => setIsUploadRestoreModalOpen(true)}
          />

          <ServerArchivesTable
            archives={archives}
            isLoadingArchives={isLoadingArchives}
            deletingArchiveName={deletingArchiveName}
            onRefreshArchives={() => {
              loadBackupArchives();
              loadBackupStatus();
            }}
            onOpenCreateBackup={() => setIsCreateBackupModalOpen(true)}
            onDownloadNamedArchive={handleDownloadNamedArchive}
            onSelectNamedRestore={(item) => setNamedRestoreTarget(item)}
            onDeleteArchive={handleDeleteArchive}
            formatDateTime={formatDateTime}
          />
        </>
      )}

      {/* Tab 2: Campus Data Portability (Tenant-Scoped Partition) */}
      {activeTab === "tenant" && <TenantBackupSection />}

      {/* Tab 3: Activity Logs & Product Intelligence Analytics */}
      {activeTab === "analytics" && (
        <ActivityAnalyticsSection
          analyticsData={analyticsData}
          isLoadingAnalytics={isLoadingAnalytics}
          isArchivingLogs={isArchivingLogs}
          onArchiveStaleLogs={handleArchiveStaleLogs}
        />
      )}

      {/* Modals */}
      <CreateBackupModal
        isOpen={isCreateBackupModalOpen}
        onClose={() => setIsCreateBackupModalOpen(false)}
        isCreatingServerBackup={isCreatingServerBackup}
        isExportingFull={isExportingFull}
        onSaveToServer={async (passphrase, syncCloud, includeMedia) => {
          const success = await handleCreateServerBackup(passphrase, syncCloud, includeMedia);
          if (success) setIsCreateBackupModalOpen(false);
        }}
        onDownloadDirectly={(passphrase) => handleDownloadFullSystemArchive(passphrase)}
      />

      <NamedRestoreModal
        target={namedRestoreTarget}
        onClose={() => setNamedRestoreTarget(null)}
        isExecuting={isExecutingNamedRestore}
        onConfirmRestore={async (target, confirmPhrase, passphrase, isDryRun) => {
          const success = await handleExecuteNamedRestore(target, confirmPhrase, passphrase, isDryRun);
          if (success && isDryRun) setNamedRestoreTarget(null);
        }}
        formatDateTime={formatDateTime}
      />

      <UploadRestoreModal
        isOpen={isUploadRestoreModalOpen}
        onClose={() => setIsUploadRestoreModalOpen(false)}
        isExecuting={isExecutingUploadRestore}
        onExecuteUploadRestore={async (file, confirmPhrase, passphrase) => {
          const success = await handleExecuteUploadRestore(file, confirmPhrase, passphrase);
          if (success) setIsUploadRestoreModalOpen(false);
        }}
      />
    </div>
  );
}

export default DataBackupView;
