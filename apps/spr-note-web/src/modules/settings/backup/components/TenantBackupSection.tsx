import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BuildingIcon,
  DownloadIcon,
  UploadIcon,
  CheckCircleIcon,
  RefreshIcon,
} from "../../../../components/ui/Icons";
import { useTranslation } from "../../../../i18n";
import { useToast } from "../../../../context/ToastContext";
import { fetchWithAuth } from "../../../../utils/authService";
import type { TenantInstitution, TenantRestoreResult } from "../types";
import "../locales";

export function TenantBackupSection(): React.ReactElement {
  const { t } = useTranslation("backup");
  const { showToast } = useToast();

  const [institutions, setInstitutions] = useState<TenantInstitution[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState<boolean>(true);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDryRun, setIsDryRun] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<TenantRestoreResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadInstitutions = useCallback(async () => {
    try {
      setIsLoadingInstitutions(true);
      const res = await fetchWithAuth("/api/v1/system/backup/institutions/");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.institutions)) {
          setInstitutions(json.institutions);
          setIsSuperAdmin(Boolean(json.is_super_admin));
          const current = json.institutions.find((i: TenantInstitution) => i.is_current_user_tenant);
          if (current) {
            setSelectedTenantId(current.id);
          } else if (json.institutions.length > 0) {
            setSelectedTenantId(json.institutions[0].id);
          }
        }
      }
    } catch (err: any) {
      console.warn("[TenantBackupSection] Institutions load error:", err.message);
    } finally {
      setIsLoadingInstitutions(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  const selectedInstitution = institutions.find((i) => i.id === selectedTenantId) || institutions[0];

  const handleExportTenant = async () => {
    if (!selectedTenantId) {
      showToast("Please select a target institution.", "error");
      return;
    }
    try {
      setIsExporting(true);
      const url = `/api/v1/system/backup/tenant-export/?tenant_id=${encodeURIComponent(selectedTenantId)}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to export tenant backup.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `tenant_backup_${selectedTenantId.slice(0, 8)}.json.gz`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      showToast(
        `Campus partition for "${selectedInstitution?.name || "institution"}" exported successfully.`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to download campus backup.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setRestoreResult(null);
    }
  };

  const handleExecuteRestore = async (overrideDryRun?: boolean) => {
    if (!selectedTenantId) {
      showToast("Please select a target institution.", "error");
      return;
    }
    if (!selectedFile) {
      showToast("Please select a backup archive file (.json.gz).", "error");
      return;
    }

    const actualDryRun = overrideDryRun !== undefined ? overrideDryRun : isDryRun;

    try {
      setIsRestoring(true);
      const formData = new FormData();
      formData.append("tenant_id", selectedTenantId);
      formData.append("backup_file", selectedFile);
      formData.append("dry_run", actualDryRun ? "true" : "false");

      const res = await fetchWithAuth("/api/v1/system/backup/tenant-restore/", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      setRestoreResult(json);

      if (json.success) {
        if (actualDryRun) {
          showToast(
            `Integrity verified! ${json.manifest?.total_records ?? 0} records ready for restoration.`,
            "info"
          );
        } else {
          showToast(
            `Successfully restored ${json.restored_records ?? 0} records for ${json.institution_name || "institution"}.`,
            "success"
          );
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      } else {
        showToast(json.error || "Restoration failed.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error during restore.", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="w-full space-y-6 @container">
      {/* Overview & Partition Selection Card */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary tracking-tight">
                {t("campus_portability_title", "Campus Data Portability & Tenant Backup")}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {t(
                  "campus_portability_subtitle",
                  "Export or restore isolated data partitions belonging strictly to your institution"
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadInstitutions}
            disabled={isLoadingInstitutions}
            className="p-2 self-start sm:self-auto rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
            title={t("refresh", "Refresh")}
          >
            <RefreshIcon className={`w-4 h-4 ${isLoadingInstitutions ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Institution Scope Selector */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold theme-text-secondary">
              {t("select_campus", "Target Institution / Campus")}
            </label>
            {isSuperAdmin ? (
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 theme-ring"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} {inst.eiin_or_reg_no ? `(${inst.eiin_or_reg_no})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 text-xs font-semibold rounded-xl border theme-border theme-bg-sub theme-text-primary">
                {selectedInstitution?.name || "Your Institution"}
              </div>
            )}
            <p className="text-[11px] theme-text-muted">
              {isSuperAdmin
                ? t("all_campuses_notice", "Super Admin Mode: You can export or restore data partitions for any campus.")
                : t("single_campus_notice", "Campus Partition: Your operations are strictly isolated to your assigned institution.")}
            </p>
          </div>

          {/* Quick Details of selected campus */}
          <div className="p-3 rounded-xl border theme-border theme-bg-sub/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>Institution Identifier</span>
              <span className="font-mono text-[11px] theme-text-primary">
                {selectedInstitution?.eiin_or_reg_no ||
                  selectedInstitution?.slug ||
                  selectedInstitution?.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>Partition Isolation</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Guaranteed Scoped
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Columns: Export & Restore */}
      <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-5">
        {/* Export Card */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DownloadIcon className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold theme-text-primary">
                Export Campus Partition
              </h4>
            </div>

            <p className="text-xs theme-text-secondary leading-relaxed">
              Generates an optimized, compressed `.json.gz` package containing all students, classes, branches, attendance, lesson plans, templates, and academic settings for this campus.
            </p>

            <div className="space-y-2 pt-1 text-xs theme-text-secondary">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero cross-institution data leakage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Includes SHA-256 integrity sidecar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Compatible with instant rollback</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t theme-border">
            <button
              type="button"
              onClick={handleExportTenant}
              disabled={isExporting || !selectedTenantId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold theme-bg-accent theme-text-on-accent hover:opacity-95 shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              <DownloadIcon className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
              <span>
                {isExporting
                  ? t("exporting_campus", "Packaging Campus Partition...")
                  : t("export_campus_button", "Export Campus Data (.json.gz)")}
              </span>
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl theme-bg-accent-soft theme-accent">
                <UploadIcon className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold theme-text-primary">
                {t("restore_campus_title", "Restore Campus Data Partition")}
              </h4>
            </div>

            <p className="text-xs theme-text-secondary leading-relaxed">
              {t(
                "restore_campus_desc",
                "Upload a validated campus backup archive (.json.gz). Runs inside an atomic transaction."
              )}
            </p>

            {/* File Input Box */}
            <div className="border border-dashed theme-border rounded-xl p-3.5 text-center theme-bg-sub/50 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json.gz,.json"
                onChange={handleFileChange}
                className="hidden"
                id="tenant_backup_upload"
              />
              <label
                htmlFor="tenant_backup_upload"
                className="block cursor-pointer text-xs font-semibold theme-accent hover:underline"
              >
                {selectedFile ? selectedFile.name : t("choose_archive_file", "Choose Backup Archive (.json.gz)")}
              </label>
              <p className="text-[10px] theme-text-muted">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB selected`
                  : "Supports .json.gz or raw .json campus partitions"}
              </p>
            </div>

            {/* Dry Run Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold theme-text-primary">
                  {t("dry_run_label", "Safe Simulation Mode (Dry-Run / Integrity Check)")}
                </span>
                <p className="text-[11px] theme-text-secondary mt-0.5">
                  {t(
                    "dry_run_help",
                    "Validates checksum, structure, and record count without modifying live database records."
                  )}
                </p>
              </div>
            </label>
          </div>

          {/* Action Button & Results */}
          <div className="pt-4 border-t theme-border space-y-3">
            {restoreResult && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  restoreResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                }`}
              >
                {restoreResult.success ? (
                  <div>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                      {restoreResult.is_dry_run ? "Integrity Check Passed" : "Restore Completed"}
                    </div>
                    <p>{restoreResult.message}</p>
                    {restoreResult.is_dry_run && (
                      <button
                        type="button"
                        onClick={() => handleExecuteRestore(false)}
                        disabled={isRestoring}
                        className="mt-2.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                      >
                        Proceed with Live Restore
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="font-bold mb-1">Restoration Failed</div>
                    <p>{restoreResult.error || "Unknown error during restore."}</p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleExecuteRestore()}
              disabled={isRestoring || !selectedFile || !selectedTenantId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold theme-bg-accent theme-text-on-accent hover:opacity-95 shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              <UploadIcon className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`} />
              <span>
                {isRestoring
                  ? t("restoring_campus", "Restoring Partition...")
                  : isDryRun
                  ? "Run Simulation Check"
                  : t("apply_restore_button", "Apply Campus Partition Restore")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
