/**
 * Hybrid Sync Engine (LocalStorage <-> Django PostgreSQL)
 * Handles offline persistence, background queueing, and delta sync with API.
 */

const LOCAL_STORAGE_KEY = "spr_reports_local_v1";
const PENDING_SYNC_KEY = "spr_reports_pending_queue";

// 1. Save Report Locally (Offline-First)
export const saveReportLocally = (reportData) => {
  const reports = getLocalReports();
  const pendingQueue = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");

  const now = new Date().toISOString();
  const updatedReport = {
    ...reportData,
    id: reportData.id || crypto.randomUUID(),
    client_updated_at: now,
    sync_status: "PENDING",
  };

  const existingIndex = reports.findIndex((r) => r.id === updatedReport.id);
  if (existingIndex > -1) {
    reports[existingIndex] = updatedReport;
  } else {
    reports.unshift(updatedReport);
  }

  if (!pendingQueue.includes(updatedReport.id)) {
    pendingQueue.push(updatedReport.id);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingQueue));

  return updatedReport;
};

// 2. Fetch All Local Reports
export const getLocalReports = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch (error) {
    console.error("[SyncEngine] Failed to parse local storage:", error);
    return [];
  }
};

// 3. Trigger Delta Cloud Sync with DRF Backend API
export const triggerCloudSync = async (apiClient) => {
  if (!navigator.onLine) {
    console.warn("[SyncEngine] Network offline. Sync postponed.");
    return;
  }

  const reports = getLocalReports();
  const pendingIds = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");
  const lastSyncedAt = localStorage.getItem("spr_last_synced_at");

  if (pendingIds.length === 0 && !lastSyncedAt) return;

  const pendingItems = reports.filter((r) => pendingIds.includes(r.id));

  try {
    const response = await apiClient.post("/api/reports/sync/", {
      changes: pendingItems,
      last_synced_at: lastSyncedAt,
    });

    const { applied_changes, server_updates, conflicts, sync_timestamp } = response.data;

    let updatedList = [...reports];

    [...applied_changes, ...server_updates, ...conflicts].forEach((serverReport) => {
      const idx = updatedList.findIndex((r) => r.id === serverReport.id);
      const cleanItem = { ...serverReport, sync_status: "SYNCED" };

      if (idx > -1) {
        updatedList[idx] = cleanItem;
      } else {
        updatedList.unshift(cleanItem);
      }
    });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([]));
    localStorage.setItem("spr_last_synced_at", sync_timestamp);

    console.log("[SyncEngine] Hybrid sync completed successfully.");
  } catch (error) {
    console.error("[SyncEngine] Cloud sync failed:", error);
  }
};