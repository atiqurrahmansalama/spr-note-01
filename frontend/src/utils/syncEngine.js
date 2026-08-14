import { fetchWithAuth } from "./authService";
import { students as studentStore, sessions as sessionStore, savedComments as commentStore } from "./localStore";

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
  const report_unique_id = reportData.report_unique_id || `REP-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

  const updatedReport = {
    ...reportData,
    id: reportData.id || crypto.randomUUID(),
    report_unique_id,
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
export const triggerCloudSync = async () => {
  if (!navigator.onLine) {
    console.warn("[SyncEngine] Network offline. Sync postponed.");
    return;
  }

  const reports = getLocalReports();
  const pendingIds = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");

  if (pendingIds.length === 0) {
    console.log("[SyncEngine] Local storage is in sync.");
    return;
  }

  const pendingItems = reports.filter((r) => pendingIds.includes(r.id));
  let updatedIds = [...pendingIds];

  const { createReport } = await import("../api/reports");

  for (const item of pendingItems) {
    try {
      const apiResult = await createReport(item);

      if (apiResult.success && apiResult.data) {
        const serverReport = apiResult.data;
        const itemIdx = reports.findIndex((r) => r.id === item.id);
        if (itemIdx > -1) {
          reports[itemIdx] = {
            ...reports[itemIdx],
            id: serverReport.id,
            report_unique_id: serverReport.report_unique_id,
            sync_status: "SYNCED",
          };
        }
        updatedIds = updatedIds.filter((id) => id !== item.id);
      }
    } catch (error) {
      console.error("[SyncEngine] Failed to sync item:", item.id, error);
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedIds));
  window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "sync" } }));
};

// 4. Sync local students, sessions & comment templates to the database
export const syncLocalStudentsToBackend = async () => {
  if (!navigator.onLine) return;
  try {
    const res = await fetchWithAuth("/students/");
    if (res.ok) {
      const raw = await res.json();
      const apiStudents = (Array.isArray(raw) ? raw : []).map((s) => ({
        id: s.id,
        label: s.name || s.student_name || s.label || String(s),
        sub: s.group_name || s.group || s.sub || "General Group",
      }));
      const apiKeys = new Set(
        apiStudents.map((s) => `${(s.label || "").toLowerCase().trim()}___${(s.sub || "General Group").toLowerCase().trim()}`)
      );

      const localStudents = studentStore.getAll();
      const unsyncedLocal = (Array.isArray(localStudents) ? localStudents : []).filter(
        (s) => {
          if (!s || (!s.label && !s.name)) return false;
          if (!s._local) return false;
          const key = `${(s.label || s.name || "").toLowerCase().trim()}___${(s.sub || s.group || "General Group").toLowerCase().trim()}`;
          return !apiKeys.has(key);
        }
      );

      for (const stu of unsyncedLocal) {
        const name = stu.label || stu.name;
        const group = stu.sub || stu.group || "General Group";
        if (!name || !name.trim()) continue;

        try {
          const postRes = await fetchWithAuth("/students/", {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), group: group }),
          });
          if (postRes.ok) {
            console.log("[SyncEngine] Synced local student to database:", name);
          }
        } catch (err) {
          console.error("[SyncEngine] Failed to sync student:", name, err);
        }
      }
    }
  } catch (err) {
    console.error("[SyncEngine] Student sync failed:", err);
  }
};

export const syncSessionsAndComments = async () => {
  if (!navigator.onLine) return;

  // 4a. Sync Students
  await syncLocalStudentsToBackend();

  // 4b. Sync Sessions
  try {
    const localSessions = sessionStore.getAll();
    const localOnlySessions = localSessions.filter((s) => s._local);

    for (const session of localOnlySessions) {
      try {
        const res = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name: session.name }),
        });
        if (res.ok) {
          const apiSession = await res.json();
          const currentSessions = sessionStore.getAll();
          const updated = currentSessions.map((s) =>
            s.name.toLowerCase() === session.name.toLowerCase()
              ? { id: apiSession.id, name: apiSession.name }
              : s
          );
          sessionStore.saveAll(updated);
          console.log("[SyncEngine] Synced session preset:", session.name);
        }
      } catch (err) {
        console.error("[SyncEngine] Failed to sync session:", session.name, err);
      }
    }
  } catch (err) {
    console.error("[SyncEngine] Session sync failed:", err);
  }

  // 4c. Sync Comment Templates
  try {
    const res = await fetchWithAuth("/messages/");
    if (res.ok) {
      const localComments = commentStore.getAll();
      const localOnlyComments = (Array.isArray(localComments) ? localComments : []).filter((c) => {
        if (typeof c === "object" && c !== null) {
          return c._local === true;
        }
        return false;
      });

      for (const commentItem of localOnlyComments) {
        const commentText = typeof commentItem === "object" ? commentItem.text : String(commentItem);
        if (!commentText) continue;
        try {
          const postRes = await fetchWithAuth("/messages/", {
            method: "POST",
            body: JSON.stringify({ text: commentText }),
          });
          if (postRes.ok) {
            console.log("[SyncEngine] Synced comment template:", commentText);
          }
        } catch (err) {
          console.error("[SyncEngine] Failed to sync comment template:", commentText, err);
        }
      }
    }
  } catch (err) {
    console.error("[SyncEngine] Comment template sync failed:", err);
  }
};