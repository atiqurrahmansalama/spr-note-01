import { fetchWithAuth } from "./authService";
import { students as studentStore, sessions as sessionStore, savedComments as commentStore } from "./localStore";
import { createReport } from "../api/reports";

/**
 * Hybrid Sync Engine (LocalStorage <-> Django PostgreSQL)
 * Handles offline persistence, background queueing, and delta sync with API.
 */

const LOCAL_STORAGE_KEY = "spr_reports_local_v1";
const PENDING_SYNC_KEY = "spr_reports_pending_queue";

// Listen to decoupled taxonomy push events from localStore
if (typeof window !== 'undefined') {
  window.addEventListener('spr_taxonomy_changed', (e) => {
    const { tenantId, taxonomyKey, value } = e.detail || {};
    if (tenantId && taxonomyKey) {
      queueTaxonomyPush(tenantId, taxonomyKey, value);
    }
  });
}

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
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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

  for (const item of pendingItems) {
    // Safety check: skip completely blank or default empty reports (student is N/A/empty and no pages/errors)
    const isBlank = (
      (!item.student || item.student === "N/A") &&
      (!item.student_name || item.student_name === "N/A") &&
      (!item.juz_and_pages || item.juz_and_pages.length === 0) &&
      (!item.portions || item.portions.length === 0) &&
      (!item.mistakes || item.mistakes.length === 0) &&
      (!item.stucks || item.stucks.length === 0)
    );

    if (isBlank) {
      console.warn("[SyncEngine] Skipping blank pending report:", item.id);
      updatedIds = updatedIds.filter((id) => id !== item.id);
      continue;
    }

    try {
      const apiResult = await createReport(item);

      if (apiResult.success && apiResult.data) {
        const serverReport = apiResult.data;
        const itemIdx = reports.findIndex(
          (r) => r.id === item.id || (item.report_unique_id && r.report_unique_id === item.report_unique_id)
        );
        if (itemIdx > -1) {
          reports[itemIdx] = {
            ...reports[itemIdx],
            ...serverReport,
            id: serverReport.id,
            report_unique_id: serverReport.report_unique_id || reports[itemIdx].report_unique_id,
            sync_status: "SYNCED",
          };
        }
        updatedIds = updatedIds.filter((id) => id !== item.id && id !== serverReport.id);
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

// 5. Tenant Taxonomies & Developer Tools Two-Way Cloud Sync Engine
let taxonomySyncTimeout = null;
const pendingTaxonomyQueue = {};

export const queueTaxonomyPush = (tenantId, taxonomyKey, data) => {
  if (!taxonomyKey || !data) return;
  const tid = tenantId || "default";
  if (!pendingTaxonomyQueue[tid]) pendingTaxonomyQueue[tid] = {};
  pendingTaxonomyQueue[tid][taxonomyKey] = data;

  if (taxonomySyncTimeout) clearTimeout(taxonomySyncTimeout);
  taxonomySyncTimeout = setTimeout(async () => {
    try {
      const { taxonomiesApi } = await import("../api/taxonomies");
      for (const [tenant, payload] of Object.entries(pendingTaxonomyQueue)) {
        if (Object.keys(payload).length > 0) {
          await taxonomiesApi.bulkSyncTaxonomies(tenant, payload);
          delete pendingTaxonomyQueue[tenant];
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Background taxonomy sync error:", err);
    }
  }, 600);
};

export const syncTenantTaxonomies = async (tenantId) => {
  if (!navigator.onLine) return;
  try {
    const { taxonomiesApi } = await import("../api/taxonomies");
    const res = await taxonomiesApi.fetchTaxonomies(tenantId);
    if (!res.success || !res.taxonomies) return;

    const cloudData = res.taxonomies;
    const tid = tenantId || "default";

    // Map cloud keys to local storage keys
    const taxonomyKeyMap = {
      staff_ranks: `spr_staff_ranks_${tid}`,
      staff_categories: `spr_staff_categories_${tid}`,
      calendar_event_kinds: `spr_calendar_event_kinds_${tid}`,
      calendar_event_types: `spr_calendar_event_types_${tid}`,
      document_types: `spr_document_types_${tid}`,
      working_schedules: `spr_working_schedules_${tid}`,
      impact_scopes: `spr_impact_scopes_${tid}`,
      admission_doc_requirements: `spr_admission_doc_requirements_${tid}`,
      staff_recruitment_requirements: `spr_staff_recruitment_requirements_${tid}`,
    };

    let needsLocalSave = false;
    for (const [apiKey, storageKey] of Object.entries(taxonomyKeyMap)) {
      if (cloudData[apiKey] && Array.isArray(cloudData[apiKey]) && cloudData[apiKey].length > 0) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(cloudData[apiKey]));
          needsLocalSave = true;
        } catch {}
      }
    }

    if (needsLocalSave) {
      window.dispatchEvent(new CustomEvent("spr_taxonomies_synced", { detail: cloudData }));
      window.dispatchEvent(new CustomEvent("spr_calendar_event_kinds_updated"));
      window.dispatchEvent(new CustomEvent("spr_document_types_updated"));
    }
  } catch (err) {
    console.warn("[SyncEngine] Failed to sync tenant taxonomies:", err);
  }
};