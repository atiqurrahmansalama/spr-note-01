import { useState, useCallback } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import type { BackupStatusData, CloudStorageStatus } from "../types";

export function useBackupTelemetry() {
  const { showToast } = useToast();
  const [statusData, setStatusData] = useState<BackupStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState<boolean>(() => {
    return localStorage.getItem("spr_auto_download_backup") === "true";
  });
  const [cloudTestStatus, setCloudTestStatus] = useState<CloudStorageStatus>({
    isTesting: false,
    tested: false,
  });

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
      console.warn("[useBackupTelemetry] Status load error:", err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

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

  return {
    statusData,
    isLoadingStatus,
    autoDownloadEnabled,
    cloudTestStatus,
    loadBackupStatus,
    handleToggleAutoDownload,
    handleTestCloudConnection,
  };
}
