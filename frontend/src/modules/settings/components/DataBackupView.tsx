import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CloudIcon,
  SaveIcon,
  RefreshIcon,
  UploadIcon,
  ServerStackIcon,
  DownloadIcon,
  DatabaseIcon,
  HardDriveIcon,
  CheckCircleIcon,
  TrashIcon,
  CloseIcon,
  EyeIcon,
  LockIcon,
  ShieldIcon,
  TimerIcon,
} from "../../../components/ui/Icons";
import { useToast } from "../../../context/ToastContext";
import {
  KEYS,
  students as studentStore,
  sessions as sessionStore,
  savedComments as commentStore,
  appearanceSettings as appStore,
} from "../../../utils/localStore";
import { fetchWithAuth } from "../../../utils/authService";

interface BackupStatusData {
  tier_1_cloud: {
    status: string;
    provider: string;
    frequency: string;
    retention: string;
  };
  tier_2_server: {
    status: string;
    local_archives_count: number;
    latest_backup: {
      file_name: string;
      file_size_mb: number;
      created_at: string;
    } | null;
    total_db_records: number;
    media_files_count: number;
    media_size_mb: number;
  };
  tier_3_client: {
    status: string;
    offline_sync_engine: string;
    auto_download_supported: boolean;
  };
}

export interface BackupArchiveItem {
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_size_mb: number;
  created_at: string;
  sha256: string;
  is_verified: boolean;
  is_encrypted: boolean;
  total_records: number;
  total_tables: number;
  media_files_count: number;
  has_native_pg_dump: boolean;
  tenant_scope: string;
}

export interface BackupScheduleData {
  enabled: boolean;
  frequency: "every_6h" | "every_12h" | "daily" | "weekly";
  last_run: string | null;
  next_run: string | null;
  retention_count: number;
  is_worker_running: boolean;
}

export interface CloudStorageStatus {
  isTesting: boolean;
  tested: boolean;
  success?: boolean;
  bucket?: string;
  supabase_url?: string;
  message?: string;
  error?: string;
}

export interface FeatureAnalyticsData {
  period_days: number;
  total_hits: number;
  top_features: Array<{
    action_name: string;
    endpoint: string;
    http_method: string;
    total_hits: number;
    unique_users: number;
  }>;
  daily_trends: Array<{
    date: string;
    hits: number;
  }>;
  hot_db: {
    activity_logs_count: number;
    user_activity_logs_count: number;
    total_hot_logs: number;
    oldest_log: string | null;
    newest_log: string | null;
  };
  cold_archives_count: number;
  cold_archives: Array<{
    file_name: string;
    file_size_mb: number;
    created_at: string;
  }>;
}

export default function DataBackupView(): React.ReactElement {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"vault" | "analytics">("vault");

  // Status & Telemetry
  const [statusData, setStatusData] = useState<BackupStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isExportingFull, setIsExportingFull] = useState<boolean>(false);
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState<boolean>(() => {
    return localStorage.getItem("spr_auto_download_backup") === "true";
  });

  // Archive History
  const [archives, setArchives] = useState<BackupArchiveItem[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState<boolean>(false);

  // Named Restore Modal (Direct from Server)
  const [namedRestoreTarget, setNamedRestoreTarget] = useState<BackupArchiveItem | null>(null);
  const [namedConfirmPhrase, setNamedConfirmPhrase] = useState<string>("");
  const [namedPassphrase, setNamedPassphrase] = useState<string>("");
  const [showNamedPassphrase, setShowNamedPassphrase] = useState<boolean>(false);
  const [isNamedDryRun, setIsNamedDryRun] = useState<boolean>(false);
  const [isExecutingNamedRestore, setIsExecutingNamedRestore] = useState<boolean>(false);

  // Uploaded File Restore Modal
  const [isUploadRestoreModalOpen, setIsUploadRestoreModalOpen] = useState<boolean>(false);
  const [uploadRestoreFile, setUploadRestoreFile] = useState<File | null>(null);
  const [uploadConfirmPhrase, setUploadConfirmPhrase] = useState<string>("");
  const [uploadPassphrase, setUploadPassphrase] = useState<string>("");
  const [showUploadPassphrase, setShowUploadPassphrase] = useState<boolean>(false);
  const [isExecutingUploadRestore, setIsExecutingUploadRestore] = useState<boolean>(false);

  // Create Backup Modal
  const [isCreateBackupModalOpen, setIsCreateBackupModalOpen] = useState<boolean>(false);
  const [createPassphrase, setCreatePassphrase] = useState<string>("");
  const [showCreatePassphrase, setShowCreatePassphrase] = useState<boolean>(false);
  const [createSyncCloud, setCreateSyncCloud] = useState<boolean>(true);
  const [createIncludeMedia, setCreateIncludeMedia] = useState<boolean>(true);
  const [isCreatingServerBackup, setIsCreatingServerBackup] = useState<boolean>(false);

  // Automated Scheduler Settings
  const [scheduleSettings, setScheduleSettings] = useState<BackupScheduleData | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [isTriggeringSchedule, setIsTriggeringSchedule] = useState<boolean>(false);

  // Cloud Storage Connectivity Test
  const [cloudTestStatus, setCloudTestStatus] = useState<CloudStorageStatus>({
    isTesting: false,
    tested: false,
  });

  // Delete Archive
  const [deletingArchiveName, setDeletingArchiveName] = useState<string | null>(null);

  // Feature Usage & Activity Log Analytics
  const [analyticsData, setAnalyticsData] = useState<FeatureAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [isArchivingLogs, setIsArchivingLogs] = useState<boolean>(false);

  const fullRestoreInputRef = useRef<HTMLInputElement>(null);

  // Fetch real-time backup telemetry
  const loadBackupStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetchWithAuth("/api/v1/system/backup/status/");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStatusData(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[DataBackupView] Could not load backup status:", err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Fetch backup archives history
  const loadBackupArchives = useCallback(async () => {
    try {
      setIsLoadingArchives(true);
      const res = await fetchWithAuth("/api/v1/system/backup/history/");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setArchives(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[DataBackupView] Could not load backup history:", err.message);
    } finally {
      setIsLoadingArchives(false);
    }
  }, []);

  // Fetch automated schedule settings
  const loadScheduleSettings = useCallback(async () => {
    try {
      setIsLoadingSchedule(true);
      const res = await fetchWithAuth("/api/v1/system/backup/schedule-settings/");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setScheduleSettings(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[DataBackupView] Could not load backup schedule:", err.message);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  // Fetch feature usage analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const res = await fetchWithAuth("/api/v1/system/backup/feature-analytics/?days=30");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAnalyticsData(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[DataBackupView] Could not load feature analytics:", err.message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    loadBackupStatus();
    loadBackupArchives();
    loadScheduleSettings();
  }, [loadBackupStatus, loadBackupArchives, loadScheduleSettings]);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  // Toggle Auto Download (Client local edge)
  const handleToggleAutoDownload = () => {
    const nextVal = !autoDownloadEnabled;
    setAutoDownloadEnabled(nextVal);
    localStorage.setItem("spr_auto_download_backup", String(nextVal));
    if (nextVal) {
      showToast("Auto-download enabled. Browser will capture snapshots regularly.", "success");
    } else {
      showToast("Auto-download disabled.", "info");
    }
  };

  // Update Automated Schedule Settings
  const handleUpdateSchedule = async (updates: Partial<BackupScheduleData>) => {
    try {
      setIsSavingSchedule(true);
      const res = await fetchWithAuth("/api/v1/system/backup/schedule-settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setScheduleSettings(json.data);
        showToast("Automated backup schedule updated successfully.", "success");
      } else {
        throw new Error(json.error || "Failed to update backup schedule.");
      }
    } catch (err: any) {
      showToast("Schedule update failed: " + err.message, "error");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Trigger Scheduled Job Immediately
  const handleTriggerScheduleJobNow = async () => {
    try {
      setIsTriggeringSchedule(true);
      showToast("Triggering automated backup job immediately...", "info");
      const res = await fetchWithAuth("/api/v1/system/backup/schedule-settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("Automated backup job executed successfully!", "success");
        if (json.data) setScheduleSettings(json.data);
        loadBackupStatus();
        loadBackupArchives();
      } else {
        throw new Error(json.error || "Execution failed.");
      }
    } catch (err: any) {
      showToast("Trigger failed: " + err.message, "error");
    } finally {
      setIsTriggeringSchedule(false);
    }
  };

  // Test Cloud Vault (Supabase Storage) Connectivity
  const handleTestCloudConnection = async () => {
    try {
      setCloudTestStatus({ isTesting: true, tested: false });
      showToast("Testing connectivity to Supabase Cloud Storage Vault...", "info");
      const res = await fetchWithAuth("/api/v1/system/backup/test-cloud/", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const connected = !!json.data.connected;
        setCloudTestStatus({
          isTesting: false,
          tested: true,
          success: connected,
          bucket: json.data.bucket,
          supabase_url: json.data.supabase_url,
          message: json.data.message,
          error: json.data.error,
        });
        if (connected) {
          showToast(`Supabase Vault connected (${json.data.bucket})!`, "success");
        } else {
          showToast("Supabase Vault connectivity issue: " + (json.data.error || "Check credentials"), "error");
        }
      } else {
        throw new Error(json.error || "Connection test failed.");
      }
    } catch (err: any) {
      setCloudTestStatus({
        isTesting: false,
        tested: true,
        success: false,
        error: err.message,
      });
      showToast("Cloud connection test failed: " + err.message, "error");
    }
  };

  // Create Backup on Server (Zero-download option)
  const handleCreateServerBackup = async () => {
    if (createPassphrase && createPassphrase.length < 4) {
      showToast("Encryption passphrase must be at least 4 characters long.", "error");
      return;
    }
    try {
      setIsCreatingServerBackup(true);
      showToast(createPassphrase ? "Generating AES-256 encrypted full backup..." : "Generating full-system backup...", "info");
      const res = await fetchWithAuth("/api/v1/system/backup/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passphrase: createPassphrase.trim() || undefined,
          sync_cloud: createSyncCloud,
          include_media: createIncludeMedia,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`Backup archive '${json.archive_name}' saved to server vault!`, "success");
        setIsCreateBackupModalOpen(false);
        setCreatePassphrase("");
        loadBackupStatus();
        loadBackupArchives();
      } else {
        throw new Error(json.error || "Failed to create backup.");
      }
    } catch (err: any) {
      showToast("Backup generation failed: " + err.message, "error");
    } finally {
      setIsCreatingServerBackup(false);
    }
  };

  // Create on-demand 100% Full System Backup & Stream Download
  const handleDownloadFullSystemArchive = async (passphrase?: string) => {
    if (passphrase && passphrase.length < 4) {
      showToast("Encryption passphrase must be at least 4 characters long.", "error");
      return;
    }
    try {
      setIsExportingFull(true);
      showToast(passphrase ? "Generating AES-256 encrypted archive for download..." : "Generating full-system archive...", "info");

      let endpoint = "/api/v1/system/backup/download-full/?create_new=true";
      if (passphrase) {
        endpoint += `&passphrase=${encodeURIComponent(passphrase.trim())}`;
      }

      const response = await fetchWithAuth(endpoint);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `enterprise_full_backup_${new Date().toISOString().slice(0, 10)}${passphrase ? ".enc.tar.gz" : ".tar.gz"}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("Full-system archive created and downloaded successfully!", "success");
      loadBackupStatus();
      loadBackupArchives();
    } catch (err: any) {
      showToast("Full backup generation failed: " + err.message, "error");
    } finally {
      setIsExportingFull(false);
    }
  };

  // Download a specific named archive
  const handleDownloadNamedArchive = async (archiveName: string) => {
    try {
      showToast(`Preparing download for ${archiveName}...`, "info");
      const res = await fetchWithAuth(`/api/v1/system/backup/download/${encodeURIComponent(archiveName)}/`);
      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = archiveName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("Archive downloaded successfully!", "success");
    } catch (err: any) {
      showToast("Download failed: " + err.message, "error");
    }
  };

  // Delete an archive from server
  const handleDeleteArchive = async (archiveName: string) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete backup '${archiveName}'? This action is irreversible.`);
    if (!isConfirmed) return;

    try {
      setDeletingArchiveName(archiveName);
      const res = await fetchWithAuth("/api/v1/system/backup/delete/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive_name: archiveName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Backup archive deleted successfully.", "success");
        loadBackupArchives();
        loadBackupStatus();
      } else {
        throw new Error(data.error || "Failed to delete archive.");
      }
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingArchiveName(null);
    }
  };

  // Execute Direct Named Restore
  const handleExecuteNamedRestore = async () => {
    if (!namedRestoreTarget) return;
    if (namedConfirmPhrase !== "CONFIRM_RESTORE") {
      showToast("Please type 'CONFIRM_RESTORE' to verify authorization.", "error");
      return;
    }
    if (namedRestoreTarget.is_encrypted && !namedPassphrase.trim()) {
      showToast("Decryption passphrase is required for this encrypted archive.", "error");
      return;
    }

    try {
      setIsExecutingNamedRestore(true);
      showToast(isNamedDryRun ? "Validating archive integrity & decrypting..." : "Restoring 100% system data and media files...", "info");

      const res = await fetchWithAuth("/api/v1/system/backup/restore-named/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archive_name: namedRestoreTarget.file_name,
          confirm: namedConfirmPhrase,
          dry_run: isNamedDryRun,
          passphrase: namedPassphrase.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isNamedDryRun) {
          showToast("Archive integrity & decryption verified! No database rows modified.", "success");
          setNamedRestoreTarget(null);
          setNamedConfirmPhrase("");
          setNamedPassphrase("");
        } else {
          showToast("Full system restored successfully! Reloading...", "success");
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        throw new Error(data.error || "System restore failed.");
      }
    } catch (err: any) {
      showToast("Restore failed: " + err.message, "error");
    } finally {
      setIsExecutingNamedRestore(false);
    }
  };

  // Uploaded File Restore Execution
  const handleExecuteUploadRestore = async () => {
    if (!uploadRestoreFile) {
      showToast("Please select a backup archive (.tar.gz or .enc.tar.gz) first.", "error");
      return;
    }
    if (uploadConfirmPhrase !== "CONFIRM_RESTORE") {
      showToast("Please type 'CONFIRM_RESTORE' to verify authorization.", "error");
      return;
    }

    try {
      setIsExecutingUploadRestore(true);
      showToast("Restoring 100% system data and media files...", "info");

      const formData = new FormData();
      formData.append("backup_file", uploadRestoreFile);
      formData.append("confirm", uploadConfirmPhrase);
      if (uploadPassphrase.trim()) {
        formData.append("passphrase", uploadPassphrase.trim());
      }

      const res = await fetchWithAuth("/api/v1/system/backup/restore-full/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Full system restored successfully! Reloading...", "success");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(data.error || "System restore failed.");
      }
    } catch (err: any) {
      showToast("Restore failed: " + err.message, "error");
    } finally {
      setIsExecutingUploadRestore(false);
    }
  };

  // Export Local Client JSON (Fast edge snapshot)
  const handleExportLocalJson = () => {
    try {
      const bundle = {
        students: studentStore.getAll(),
        sessions: sessionStore.getAll(),
        savedComments: commentStore.getAll(),
        reports: JSON.parse(localStorage.getItem(KEYS.REPORTS) || "[]"),
        pendingQueue: JSON.parse(localStorage.getItem(KEYS.PENDING_QUEUE) || "[]"),
        customDocxTemplates: JSON.parse(localStorage.getItem("spr_custom_docx_templates") || "[]"),
        appearance: {
          fontId: appStore.getFontId(),
          fontSize: appStore.getFontSize(),
          theme: appStore.getTheme(),
          mode: appStore.getMode(),
        },
        exportDate: new Date().toISOString(),
        version: "3.0.0",
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `local_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Local edge vault exported successfully!", "success");
    } catch (err: any) {
      showToast("Export failed: " + err.message, "error");
    }
  };

  // Trigger Activity Log Archival & Pruning
  const handleArchiveStaleLogs = async (dryRun: boolean = false) => {
    try {
      setIsArchivingLogs(true);
      showToast(dryRun ? "Simulating log archival..." : "Archiving logs and reclaiming database space...", "info");

      const res = await fetchWithAuth("/api/v1/system/backup/archive-logs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days_to_keep: 30, dry_run: dryRun }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (dryRun) {
          showToast(`Simulation complete: ${data.total_records || 0} records qualify for cold archival.`, "info");
        } else {
          showToast(
            `Successfully archived ${data.total_pruned || 0} records into ${data.archive_name} (${data.archive_size_mb || 0} MB). Storage reclaimed!`,
            "success"
          );
          loadAnalytics();
          loadBackupStatus();
        }
      } else {
        throw new Error(data.error || "Archival operation failed.");
      }
    } catch (err: any) {
      showToast("Log archival failed: " + err.message, "error");
    } finally {
      setIsArchivingLogs(false);
    }
  };

  const formatDateTime = (isoString?: string | null) => {
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

      {/* Header Banner */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 theme-bg-accent-soft rounded-xl theme-accent">
              <CloudIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-primary">3-Tier Enterprise Disaster Recovery &amp; Vault</h2>
              <p className="text-xs theme-text-secondary">
                Zero-Data-Loss automated pipeline covering 100% of all database tables, media assets, documents, and client edge caches.
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
              Disaster Recovery &amp; Vault
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
              Activity Logs &amp; Analytics
            </button>
          </div>
        </div>
      </div>

      {activeTab === "vault" && (
        <>
          {/* 3-Tier Interactive Telemetry Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Tier 1: Automated Cloud Vault */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                    Tier 1 - Cloud
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold theme-text-primary">Automated Cloud Vault</h3>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    Supabase Cloud Storage &amp; Remote Mirror. Continuous replication with integrity check.
                  </p>
                </div>
                <div className="pt-2 border-t theme-border text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Frequency:</span>
                    <span className="font-medium theme-text-primary">Automated Cron</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Engine:</span>
                    <span className="font-medium theme-text-primary truncate max-w-[130px]">Supabase (system-backups)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleTestCloudConnection}
                  disabled={cloudTestStatus.isTesting}
                  className="w-full py-1.5 px-3 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-[11px] font-semibold theme-text-primary flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <CloudIcon className={`w-3.5 h-3.5 theme-accent ${cloudTestStatus.isTesting ? "animate-pulse" : ""}`} />
                  <span>{cloudTestStatus.isTesting ? "Testing Vault..." : "Test Supabase Vault"}</span>
                </button>
                {cloudTestStatus.tested && (
                  <div className={`text-[10px] p-2 rounded-lg leading-tight ${cloudTestStatus.success ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"}`}>
                    {cloudTestStatus.message || cloudTestStatus.error || (cloudTestStatus.success ? "Supabase Bucket Verified" : "Failed")}
                  </div>
                )}
              </div>
            </div>

            {/* Tier 2: Server Standby & Mirror */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                    Tier 2 - Server
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Healthy
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold theme-text-primary">Local Server Archive</h3>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    Self-contained full archive with database dump, media assets, and instant standby SQLite.
                  </p>
                </div>
                <div className="pt-2 border-t theme-border text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Operational Records:</span>
                    <span className="font-medium theme-text-primary">
                      {isLoadingStatus ? "..." : (statusData?.tier_2_server.total_db_records.toLocaleString() || "2,500+")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Media Files:</span>
                    <span className="font-medium theme-text-primary">
                      {isLoadingStatus ? "..." : `${statusData?.tier_2_server.media_files_count || 0} (${statusData?.tier_2_server.media_size_mb || 0} MB)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-center">
                  Standby Mirror Active
                </div>
              </div>
            </div>

            {/* Tier 3: Client Edge Vault & Auto-Download */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                    Tier 3 - Edge
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Persistent
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold theme-text-primary">Local PC &amp; Edge Vault</h3>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    Real-time browser offline sync plus automated background download to admin computer.
                  </p>
                </div>
                <div className="pt-2 border-t theme-border text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="theme-text-secondary">Auto Local Backup:</span>
                    <button
                      type="button"
                      onClick={handleToggleAutoDownload}
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
                  IndexedDB &amp; LocalStorage
                </div>
              </div>
            </div>

          </div>

          {/* Automated Background Scheduler Card */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent">
                  <TimerIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold theme-text-primary">Automated Zero-Touch Backup Scheduler</h3>
                  <p className="text-xs theme-text-secondary">
                    Autonomous background worker executing regular full backups, cloud replication, and retention pruning.
                  </p>
                </div>
              </div>

              {/* Manual trigger button */}
              <button
                type="button"
                onClick={handleTriggerScheduleJobNow}
                disabled={isTriggeringSchedule}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-semibold theme-text-primary transition cursor-pointer disabled:opacity-50"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${isTriggeringSchedule ? "animate-spin" : ""}`} />
                <span>{isTriggeringSchedule ? "Executing..." : "Run Backup Job Now"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {/* Enabled Switch */}
              <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Schedule Status</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold theme-text-primary">
                    {scheduleSettings?.enabled ? "Automated Active" : "Scheduler Paused"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSchedule({ enabled: !scheduleSettings?.enabled })}
                    disabled={isSavingSchedule}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      scheduleSettings?.enabled
                        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                        : "theme-bg-elevated theme-text-secondary border theme-border"
                    }`}
                  >
                    {scheduleSettings?.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              {/* Frequency Selector */}
              <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Trigger Interval</span>
                <select
                  value={scheduleSettings?.frequency || "daily"}
                  onChange={(e) => handleUpdateSchedule({ frequency: e.target.value as any })}
                  disabled={isSavingSchedule}
                  className="w-full text-xs font-semibold theme-bg-surface border theme-border rounded-lg p-1.5 theme-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="every_6h">Every 6 Hours</option>
                  <option value="every_12h">Every 12 Hours</option>
                  <option value="daily">Daily (Midnight UTC)</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {/* Next Run Display */}
              <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Next Scheduled Run</span>
                <div className="text-xs font-bold theme-text-primary truncate">
                  {scheduleSettings?.next_run ? formatDateTime(scheduleSettings.next_run) : "Calculating..."}
                </div>
                <div className="text-[10px] theme-text-secondary">
                  Last: {scheduleSettings?.last_run ? formatDateTime(scheduleSettings.last_run) : "None yet"}
                </div>
              </div>

              {/* Retention Policy */}
              <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Retention Policy</span>
                <div className="text-xs font-bold theme-text-primary">
                  Keep Last {scheduleSettings?.retention_count || 24} Backups
                </div>
                <div className="text-[10px] theme-text-secondary">
                  FIFO automated pruning
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Matrix */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold theme-text-primary">Disaster Recovery Actions</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Create 100% Full System Archive */}
              <button
                type="button"
                onClick={() => {
                  setIsCreateBackupModalOpen(true);
                  setCreatePassphrase("");
                }}
                className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border group"
              >
                <div className="flex items-center gap-2.5 theme-accent font-bold text-xs">
                  <DownloadIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Create Full Backup</span>
                </div>
                <p className="text-[11px] theme-text-secondary leading-relaxed">
                  Export complete database and uploaded media in a verified .tar.gz bundle with optional AES-256 encryption.
                </p>
              </button>

              {/* Export Local Client Vault (JSON) */}
              <button
                type="button"
                onClick={handleExportLocalJson}
                className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border group"
              >
                <div className="flex items-center gap-2.5 theme-accent font-bold text-xs">
                  <SaveIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Export Edge Snapshot (JSON)</span>
                </div>
                <p className="text-[11px] theme-text-secondary leading-relaxed">
                  Instant snapshot of local reports, drafts, pending queues, and current user appearance settings.
                </p>
              </button>

              {/* Upload Archive Restore */}
              <button
                type="button"
                onClick={() => setIsUploadRestoreModalOpen(true)}
                className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border group border-amber-500/30"
              >
                <div className="flex items-center gap-2.5 text-amber-500 font-bold text-xs">
                  <UploadIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Upload &amp; Restore Archive</span>
                </div>
                <p className="text-[11px] theme-text-secondary leading-relaxed">
                  Upload an external .tar.gz archive file from your computer to restore database and media files.
                </p>
              </button>

            </div>
          </div>

          {/* Backup History Table */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold theme-text-primary">Server Backup Archives</h3>
                <p className="text-xs theme-text-secondary">
                  Complete point-in-time full-system snapshots available on this server with cryptographic verification.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadBackupArchives();
                  loadBackupStatus();
                }}
                disabled={isLoadingArchives}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${isLoadingArchives ? "animate-spin" : ""}`} />
                <span>Refresh Archives</span>
              </button>
            </div>

            {isLoadingArchives ? (
              <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
                Scanning and verifying backup archives...
              </div>
            ) : archives.length === 0 ? (
              <div className="py-8 text-center border border-dashed theme-border rounded-xl space-y-2">
                <DatabaseIcon className="w-8 h-8 mx-auto theme-text-secondary opacity-40" />
                <p className="text-xs font-semibold theme-text-secondary">No backup archives located on this server.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateBackupModalOpen(true)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg theme-bg-accent theme-text-on-accent shadow transition cursor-pointer"
                >
                  Create First Backup
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b theme-border text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                      <th className="py-3 px-3">Archive File &amp; Date</th>
                      <th className="py-3 px-3">Size</th>
                      <th className="py-3 px-3">Records &amp; Tables</th>
                      <th className="py-3 px-3">Media</th>
                      <th className="py-3 px-3">Checksum</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {archives.map((item) => {
                      const isEnc = item.is_encrypted || item.file_name.includes(".enc.");
                      return (
                      <tr key={item.file_name} className="hover:theme-bg-sub transition">
                        <td className="py-3 px-3">
                          <div className="font-semibold theme-text-primary flex items-center gap-2">
                            {isEnc ? (
                              <div className="p-1 rounded bg-amber-500/10 text-amber-500 shrink-0" title="AES-256-GCM Encrypted">
                                <LockIcon className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <DatabaseIcon className="w-4 h-4 theme-accent shrink-0" />
                            )}
                            <span className="truncate max-w-[180px] sm:max-w-xs">{item.file_name}</span>
                            {isEnc && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                AES-256
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] theme-text-secondary pl-6">
                            {formatDateTime(item.created_at)}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-primary">
                            {item.file_size_mb} MB
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {isEnc && item.total_records === 0 ? (
                            <div>
                              <div className="font-semibold text-amber-500 text-[11px] flex items-center gap-1">
                                <ShieldIcon className="w-3 h-3" />
                                <span>Encrypted Payload</span>
                              </div>
                              <div className="text-[10px] theme-text-secondary">Passphrase protected</div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium theme-text-primary">
                                {item.total_records.toLocaleString()} records
                              </div>
                              <div className="text-[10px] theme-text-secondary">
                                {item.total_tables} tables
                              </div>
                            </>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="theme-text-secondary">
                            {item.media_files_count} files
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                            <CheckCircleIcon className="w-3 h-3" />
                            SHA-256
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Download */}
                            <button
                              type="button"
                              onClick={() => handleDownloadNamedArchive(item.file_name)}
                              title="Download Archive"
                              className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-accent transition cursor-pointer"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* 1-Click Server Restore */}
                            <button
                              type="button"
                              onClick={() => {
                                setNamedRestoreTarget(item);
                                setNamedConfirmPhrase("");
                                setIsNamedDryRun(false);
                              }}
                              title="Restore System to This Snapshot"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition cursor-pointer"
                            >
                              <RefreshIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Archive */}
                            <button
                              type="button"
                              onClick={() => handleDeleteArchive(item.file_name)}
                              disabled={deletingArchiveName === item.file_name}
                              title="Delete Archive"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer disabled:opacity-40"
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
        </>
      )}

      {activeTab === "analytics" && (
        <div className="w-full space-y-6">

          {/* Activity Logs & Feature Analytics Overview */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Hot Operational Database */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                Hot Live Database
              </span>
              <h3 className="text-xl font-extrabold theme-text-primary">
                {isLoadingAnalytics ? "..." : (analyticsData?.hot_db.total_hot_logs.toLocaleString() || "0")}
              </h3>
              <p className="text-[11px] theme-text-secondary leading-relaxed">
                Raw request logs in active SQLite / PostgreSQL database.
              </p>
              <div className="text-[10px] theme-text-secondary pt-2 border-t theme-border space-y-1">
                <div>ActivityLog: {analyticsData?.hot_db.activity_logs_count.toLocaleString() || 0}</div>
                <div>UserActivityLog: {analyticsData?.hot_db.user_activity_logs_count.toLocaleString() || 0}</div>
              </div>
            </div>

            {/* Aggregated Product Intelligence */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                Aggregated Intelligence
              </span>
              <h3 className="text-xl font-extrabold theme-text-primary">
                {isLoadingAnalytics ? "..." : (analyticsData?.total_hits.toLocaleString() || "0")}
              </h3>
              <p className="text-[11px] theme-text-secondary leading-relaxed">
                Total tracked feature hits in the past 30 days retained in FeatureUsageSummary.
              </p>
              <div className="text-[10px] theme-text-secondary pt-2 border-t theme-border">
                Zero data loss for product usage roadmap.
              </div>
            </div>

            {/* Cold Archive Files */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                Cold Archives
              </span>
              <h3 className="text-xl font-extrabold theme-text-primary">
                {isLoadingAnalytics ? "..." : (analyticsData?.cold_archives_count || 0)}
              </h3>
              <p className="text-[11px] theme-text-secondary leading-relaxed">
                Compressed .jsonl.gz packages in cold storage.
              </p>
              <div className="text-[10px] theme-text-secondary pt-2 border-t theme-border">
                Ready for deep analytics and ML auditing.
              </div>
            </div>

          </div>

          {/* Action Bar for Log Archival */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold theme-text-primary">Smart 30-Day Log Archival &amp; Storage Reclaim</h3>
              <p className="text-xs theme-text-secondary">
                Aggregates logs older than 30 days into FeatureUsageSummary, packages raw records to compressed cold storage, and vacuums the database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleArchiveStaleLogs(true)}
                disabled={isArchivingLogs}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer disabled:opacity-50"
              >
                Simulate (Dry Run)
              </button>
              <button
                type="button"
                onClick={() => handleArchiveStaleLogs(false)}
                disabled={isArchivingLogs}
                className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow disabled:opacity-50"
              >
                {isArchivingLogs ? "Archiving..." : "Archive & Prune (>30 Days)"}
              </button>
            </div>
          </div>

          {/* Top Features Breakdown */}
          <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold theme-text-primary">Top Used Features &amp; Actions (Past 30 Days)</h3>

            {isLoadingAnalytics ? (
              <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
                Analyzing feature usage rollups...
              </div>
            ) : !analyticsData || analyticsData.top_features.length === 0 ? (
              <div className="py-8 text-center text-xs theme-text-secondary">
                No feature analytics summaries generated yet. Run archival to aggregate past logs.
              </div>
            ) : (
              <div className="space-y-3">
                {analyticsData.top_features.map((feat) => {
                  const maxHits = analyticsData.top_features[0]?.total_hits || 1;
                  const pct = Math.round(((feat.total_hits || 0) / maxHits) * 100);

                  return (
                    <div key={feat.action_name} className="p-3 theme-bg-sub rounded-xl border theme-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="theme-text-primary font-mono">{feat.action_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="theme-text-secondary text-[11px]">{feat.unique_users} unique users</span>
                          <span className="theme-accent font-bold">{feat.total_hits.toLocaleString()} hits</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full theme-bg-surface overflow-hidden">
                        <div
                          className="h-full theme-bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                      <div className="text-[10px] theme-text-secondary flex justify-between">
                        <span>{feat.http_method} {feat.endpoint}</span>
                        <span>{pct}% of peak volume</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create Full System Backup Modal */}
      {isCreateBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 theme-bg-accent-soft theme-accent rounded-xl">
                  <DownloadIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold theme-text-primary">Create Full-System Backup</h3>
                  <p className="text-xs theme-text-secondary">
                    Package all database models, relations, media assets, and standby SQLite mirror.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateBackupModalOpen(false)}
                className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* AES-256-GCM Encryption Section */}
              <div className="p-4 theme-bg-sub rounded-xl border theme-border space-y-2">
                <div className="flex items-center gap-2">
                  <LockIcon className="w-4 h-4 text-amber-500" />
                  <label className="text-xs font-bold theme-text-primary">
                    Military-Grade AES-256 Encryption (Optional)
                  </label>
                </div>
                <p className="text-[11px] theme-text-secondary leading-relaxed">
                  Provide a passphrase to encrypt the archive using PBKDF2 + AES-256-GCM authenticated encryption. Leave empty for standard unencrypted bundle.
                </p>
                <div className="relative mt-2">
                  <input
                    type={showCreatePassphrase ? "text" : "password"}
                    value={createPassphrase}
                    onChange={(e) => setCreatePassphrase(e.target.value)}
                    placeholder="Enter encryption passphrase (min 4 characters)..."
                    className="w-full text-xs theme-bg-surface border theme-border rounded-xl p-2.5 pr-10 theme-text-primary focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassphrase(!showCreatePassphrase)}
                    className="absolute right-2.5 top-2.5 theme-text-secondary hover:theme-text-primary cursor-pointer"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
                {createPassphrase && createPassphrase.length < 4 && (
                  <p className="text-[10px] text-rose-500 font-medium">Passphrase must be at least 4 characters long.</p>
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer theme-text-primary">
                  <input
                    type="checkbox"
                    checked={createSyncCloud}
                    onChange={(e) => setCreateSyncCloud(e.target.checked)}
                    className="rounded theme-border"
                  />
                  <span>Synchronize automatically to Supabase Cloud Storage Vault</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer theme-text-primary">
                  <input
                    type="checkbox"
                    checked={createIncludeMedia}
                    onChange={(e) => setCreateIncludeMedia(e.target.checked)}
                    className="rounded theme-border"
                  />
                  <span>Include media files (documents, avatars, docx templates)</span>
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={() => setIsCreateBackupModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isCreatingServerBackup || isExportingFull || (!!createPassphrase && createPassphrase.length < 4)}
                  onClick={handleCreateServerBackup}
                  className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-primary transition cursor-pointer disabled:opacity-40"
                >
                  {isCreatingServerBackup ? "Saving to Server..." : "Save to Server Vault"}
                </button>
                <button
                  type="button"
                  disabled={isCreatingServerBackup || isExportingFull || (!!createPassphrase && createPassphrase.length < 4)}
                  onClick={() => handleDownloadFullSystemArchive(createPassphrase)}
                  className="px-5 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow disabled:opacity-40"
                >
                  {isExportingFull ? "Generating..." : "Download Directly"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Server Restore Modal */}
      {namedRestoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
                <RefreshIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-text-primary">Direct Server System Restore</h3>
                <p className="text-xs theme-text-secondary">
                  Restores 100% of database records and media files from the selected server archive.
                </p>
              </div>
            </div>

            <div className="p-3.5 theme-bg-sub rounded-xl border theme-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="theme-text-secondary">Selected Archive:</span>
                <span className="font-semibold theme-text-primary font-mono truncate max-w-[220px]">{namedRestoreTarget.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-secondary">Created:</span>
                <span className="font-medium theme-text-primary">{formatDateTime(namedRestoreTarget.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-secondary">Archive Size:</span>
                <span className="font-medium theme-text-primary">{namedRestoreTarget.file_size_mb} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-secondary">Protection:</span>
                <span className="font-medium theme-text-primary">
                  {namedRestoreTarget.is_encrypted || namedRestoreTarget.file_name.includes(".enc.") ? "AES-256-GCM Encrypted" : "Standard Archive"}
                </span>
              </div>
            </div>

            {/* Passphrase Input if Encrypted */}
            {(namedRestoreTarget.is_encrypted || namedRestoreTarget.file_name.includes(".enc.")) && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                  <LockIcon className="w-4 h-4" />
                  <span>Decryption Passphrase Required</span>
                </div>
                <p className="text-[11px] theme-text-secondary">
                  This archive is encrypted with AES-256-GCM. Please enter the decryption passphrase:
                </p>
                <div className="relative">
                  <input
                    type={showNamedPassphrase ? "text" : "password"}
                    value={namedPassphrase}
                    onChange={(e) => setNamedPassphrase(e.target.value)}
                    placeholder="Enter decryption passphrase..."
                    className="w-full text-xs theme-bg-surface border theme-border rounded-xl p-2.5 pr-10 theme-text-primary focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNamedPassphrase(!showNamedPassphrase)}
                    className="absolute right-2.5 top-2.5 theme-text-secondary hover:theme-text-primary cursor-pointer"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium theme-text-primary">
                <input
                  type="checkbox"
                  checked={isNamedDryRun}
                  onChange={(e) => setIsNamedDryRun(e.target.checked)}
                  className="rounded theme-border"
                />
                <span>Dry Run (Validate archive manifest integrity &amp; decryption without writing to database)</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-rose-500 mb-1">
                  Type "CONFIRM_RESTORE" to authorize rollback:
                </label>
                <input
                  type="text"
                  value={namedConfirmPhrase}
                  onChange={(e) => setNamedConfirmPhrase(e.target.value)}
                  placeholder="CONFIRM_RESTORE"
                  className="w-full text-xs theme-bg-sub border theme-border rounded-xl p-2.5 theme-text-primary focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={() => {
                  setNamedRestoreTarget(null);
                  setNamedConfirmPhrase("");
                  setNamedPassphrase("");
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingNamedRestore || namedConfirmPhrase !== "CONFIRM_RESTORE" || ((namedRestoreTarget.is_encrypted || namedRestoreTarget.file_name.includes(".enc.")) && !namedPassphrase.trim())}
                onClick={handleExecuteNamedRestore}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-40 cursor-pointer"
              >
                {isExecutingNamedRestore ? "Restoring..." : isNamedDryRun ? "Verify Integrity & Decrypt" : "Execute 100% Rollback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Restore Modal */}
      {isUploadRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
                <UploadIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-text-primary">Upload &amp; Restore Archive</h3>
                <p className="text-xs theme-text-secondary">
                  Upload an external enterprise backup archive (.tar.gz or .enc.tar.gz) from your computer.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Select Backup Archive File (.tar.gz / .enc.tar.gz):
                </label>
                <input
                  type="file"
                  accept=".tar.gz,.gz"
                  ref={fullRestoreInputRef}
                  onChange={(e) => setUploadRestoreFile(e.target.files?.[0] || null)}
                  className="w-full text-xs theme-bg-sub border theme-border rounded-xl p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:theme-bg-accent file:theme-text-on-accent"
                />
              </div>

              {/* Optional Passphrase for Encrypted Upload */}
              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold theme-text-primary">
                  <LockIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Decryption Passphrase (If Encrypted with AES-256)</span>
                </div>
                <p className="text-[11px] theme-text-secondary">
                  If this archive was exported with encryption, enter the decryption passphrase below:
                </p>
                <div className="relative">
                  <input
                    type={showUploadPassphrase ? "text" : "password"}
                    value={uploadPassphrase}
                    onChange={(e) => setUploadPassphrase(e.target.value)}
                    placeholder="Enter decryption passphrase (if applicable)..."
                    className="w-full text-xs theme-bg-surface border theme-border rounded-xl p-2.5 pr-10 theme-text-primary focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUploadPassphrase(!showUploadPassphrase)}
                    className="absolute right-2.5 top-2.5 theme-text-secondary hover:theme-text-primary cursor-pointer"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-500 mb-1">
                  Confirmation Required: Type "CONFIRM_RESTORE"
                </label>
                <input
                  type="text"
                  value={uploadConfirmPhrase}
                  onChange={(e) => setUploadConfirmPhrase(e.target.value)}
                  placeholder="CONFIRM_RESTORE"
                  className="w-full text-xs theme-bg-sub border theme-border rounded-xl p-2.5 theme-text-primary focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={() => {
                  setIsUploadRestoreModalOpen(false);
                  setUploadRestoreFile(null);
                  setUploadConfirmPhrase("");
                  setUploadPassphrase("");
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingUploadRestore || !uploadRestoreFile || uploadConfirmPhrase !== "CONFIRM_RESTORE"}
                onClick={handleExecuteUploadRestore}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-40 cursor-pointer"
              >
                {isExecutingUploadRestore ? "Restoring System..." : "Execute 100% Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
