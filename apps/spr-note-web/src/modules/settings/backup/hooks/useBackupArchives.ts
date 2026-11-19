import { useState, useCallback } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import type { BackupArchiveItem } from "../types";

export function useBackupArchives(onMutationComplete?: () => void) {
  const { showToast } = useToast();
  const [archives, setArchives] = useState<BackupArchiveItem[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState<boolean>(false);
  const [isExportingFull, setIsExportingFull] = useState<boolean>(false);
  const [isCreatingServerBackup, setIsCreatingServerBackup] = useState<boolean>(false);
  const [deletingArchiveName, setDeletingArchiveName] = useState<string | null>(null);
  const [isExecutingNamedRestore, setIsExecutingNamedRestore] = useState<boolean>(false);
  const [isExecutingUploadRestore, setIsExecutingUploadRestore] = useState<boolean>(false);

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
      console.warn("[useBackupArchives] Load archives warning:", err.message);
    } finally {
      setIsLoadingArchives(false);
    }
  }, []);

  const handleCreateServerBackup = async (
    passphrase?: string,
    syncCloud: boolean = true,
    includeMedia: boolean = true
  ): Promise<boolean> => {
    if (passphrase && passphrase.length < 4) {
      showToast("Encryption passphrase must be at least 4 characters long.", "error");
      return false;
    }
    try {
      setIsCreatingServerBackup(true);
      showToast(
        passphrase ? "Generating AES-256 encrypted full backup..." : "Generating full-system backup...",
        "info"
      );
      const res = await fetchWithAuth("/api/v1/system/backup/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passphrase: passphrase?.trim() || undefined,
          sync_cloud: syncCloud,
          include_media: includeMedia,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`Backup archive '${json.archive_name}' saved to server vault!`, "success");
        loadBackupArchives();
        if (onMutationComplete) onMutationComplete();
        return true;
      }
      throw new Error(json.error || "Failed to create backup.");
    } catch (err: any) {
      showToast("Backup generation failed: " + err.message, "error");
      return false;
    } finally {
      setIsCreatingServerBackup(false);
    }
  };

  const handleDownloadFullSystemArchive = async (passphrase?: string) => {
    if (passphrase && passphrase.length < 4) {
      showToast("Encryption passphrase must be at least 4 characters long.", "error");
      return;
    }
    try {
      setIsExportingFull(true);
      showToast(
        passphrase ? "Generating AES-256 encrypted archive for download..." : "Generating full-system archive...",
        "info"
      );

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
      let filename = `enterprise_full_backup_${new Date().toISOString().slice(0, 10)}${
        passphrase ? ".enc.tar.gz" : ".tar.gz"
      }`;
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
      loadBackupArchives();
      if (onMutationComplete) onMutationComplete();
    } catch (err: any) {
      showToast("Full backup generation failed: " + err.message, "error");
    } finally {
      setIsExportingFull(false);
    }
  };

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

  const handleDeleteArchive = async (archiveName: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete backup '${archiveName}'? This action is irreversible.`
    );
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
        if (onMutationComplete) onMutationComplete();
      } else {
        throw new Error(data.error || "Failed to delete archive.");
      }
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingArchiveName(null);
    }
  };

  const handleExecuteNamedRestore = async (
    target: BackupArchiveItem,
    confirmPhrase: string,
    passphrase?: string,
    isDryRun: boolean = false
  ): Promise<boolean> => {
    if (confirmPhrase !== "CONFIRM_RESTORE") {
      showToast("Please type 'CONFIRM_RESTORE' to verify authorization.", "error");
      return false;
    }
    if (target.is_encrypted && !passphrase?.trim()) {
      showToast("Decryption passphrase is required for this encrypted archive.", "error");
      return false;
    }

    try {
      setIsExecutingNamedRestore(true);
      showToast(
        isDryRun
          ? "Validating archive integrity & decrypting..."
          : "Restoring 100% system data and media files...",
        "info"
      );

      const res = await fetchWithAuth("/api/v1/system/backup/restore-named/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archive_name: target.file_name,
          confirm: confirmPhrase,
          dry_run: isDryRun,
          passphrase: passphrase?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isDryRun) {
          showToast("Archive integrity & decryption verified! No database rows modified.", "success");
          return true;
        } else {
          showToast("Full system restored successfully! Reloading...", "success");
          setTimeout(() => window.location.reload(), 2000);
          return true;
        }
      }
      throw new Error(data.error || "System restore failed.");
    } catch (err: any) {
      showToast("Restore failed: " + err.message, "error");
      return false;
    } finally {
      setIsExecutingNamedRestore(false);
    }
  };

  const handleExecuteUploadRestore = async (
    file: File,
    confirmPhrase: string,
    passphrase?: string
  ): Promise<boolean> => {
    if (confirmPhrase !== "CONFIRM_RESTORE") {
      showToast("Please type 'CONFIRM_RESTORE' to verify authorization.", "error");
      return false;
    }

    try {
      setIsExecutingUploadRestore(true);
      showToast("Restoring 100% system data and media files...", "info");

      const formData = new FormData();
      formData.append("backup_file", file);
      formData.append("confirm", confirmPhrase);
      if (passphrase?.trim()) {
        formData.append("passphrase", passphrase.trim());
      }

      const res = await fetchWithAuth("/api/v1/system/backup/restore-full/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Full system restored successfully! Reloading...", "success");
        setTimeout(() => window.location.reload(), 2000);
        return true;
      }
      throw new Error(data.error || "System restore failed.");
    } catch (err: any) {
      showToast("Restore failed: " + err.message, "error");
      return false;
    } finally {
      setIsExecutingUploadRestore(false);
    }
  };

  return {
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
  };
}
