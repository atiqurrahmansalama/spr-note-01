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

// Active in-memory timers for delayed grace period sync
const activeGraceTimers = new Map();

export const scheduleGracePeriodSync = (reportId, delayMs = 10 * 60 * 1000, onComplete) => {
  if (activeGraceTimers.has(reportId)) {
    clearTimeout(activeGraceTimers.get(reportId));
    activeGraceTimers.delete(reportId);
  }

  const timer = setTimeout(async () => {
    activeGraceTimers.delete(reportId);
    try {
      await commitReportToCloud(reportId);
      if (onComplete) onComplete();
    } catch (err) {
      console.warn("[SyncEngine] Auto grace sync failed for", reportId, err);
    }
  }, delayMs);

  activeGraceTimers.set(reportId, timer);
  return timer;
};

export const clearGracePeriodTimer = (reportId) => {
  if (activeGraceTimers.has(reportId)) {
    clearTimeout(activeGraceTimers.get(reportId));
    activeGraceTimers.delete(reportId);
  }
};

// 1. Save Report Locally (Offline-First with configurable Grace Period)
export const saveReportLocally = (reportData, options = {}) => {
  const reports = getLocalReports();
  const pendingQueue = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");

  const now = new Date().toISOString();
  const report_unique_id = reportData.report_unique_id || `REP-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

  const graceMinutes = options.graceMinutes !== undefined ? options.graceMinutes : 10;
  const graceExpiresAt = options.skipGrace
    ? null
    : (reportData.grace_expires_at || (graceMinutes > 0 ? Date.now() + graceMinutes * 60 * 1000 : null));

  const initialStatus = options.syncStatus || (graceExpiresAt ? "GRACE_PERIOD" : "PENDING");

  const updatedReport = {
    ...reportData,
    id: reportData.id || crypto.randomUUID(),
    report_unique_id,
    client_updated_at: now,
    grace_expires_at: graceExpiresAt,
    sync_status: initialStatus,
  };

  const existingIndex = reports.findIndex(
    (r) => (r.id && r.id === updatedReport.id) || (r.report_unique_id && r.report_unique_id === updatedReport.report_unique_id)
  );

  if (existingIndex > -1) {
    reports[existingIndex] = {
      ...reports[existingIndex],
      ...updatedReport,
      id: reports[existingIndex].id,
      report_unique_id: reports[existingIndex].report_unique_id || updatedReport.report_unique_id,
    };
  } else {
    reports.unshift(updatedReport);
  }

  if (!pendingQueue.includes(updatedReport.id)) {
    pendingQueue.push(updatedReport.id);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingQueue));

  return existingIndex > -1 ? reports[existingIndex] : updatedReport;
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

// 3. Commit a Specific Report to Cloud Immediately
export const commitReportToCloud = async (reportId) => {
  if (!navigator.onLine) {
    return { success: false, isOffline: true };
  }

  const reports = getLocalReports();
  const reportIndex = reports.findIndex((r) => r.id === reportId || r.report_unique_id === reportId);
  if (reportIndex === -1) {
    return { success: false, error: "Report not found" };
  }

  const item = reports[reportIndex];
  if (item.sync_status === "SYNCED" && item.server_id) {
    return { success: true, data: item };
  }

  try {
    const apiResult = await createReport(item);
    if (apiResult.success && apiResult.data) {
      const serverReport = apiResult.data;
      reports[reportIndex] = {
        ...reports[reportIndex],
        ...serverReport,
        id: serverReport.id || reports[reportIndex].id,
        server_id: serverReport.id,
        report_unique_id: serverReport.report_unique_id || reports[reportIndex].report_unique_id,
        sync_status: "SYNCED",
        grace_expires_at: null,
      };

      const pendingQueue = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");
      const updatedQueue = pendingQueue.filter((id) => id !== reportId && id !== serverReport.id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedQueue));

      window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "database", data: serverReport } }));
      return { success: true, data: serverReport };
    }
    return apiResult;
  } catch (err) {
    console.warn("[SyncEngine] commitReportToCloud failed:", err);
    return { success: false, error: err.message };
  }
};

// 4. Trigger Delta Cloud Sync with DRF Backend API
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
    // Grace Period check: if report is currently within its 10-minute buffer, postpone cloud sync
    if (item.grace_expires_at && Date.now() < item.grace_expires_at) {
      continue;
    }

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
            grace_expires_at: null,
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

// 5. Periodic check for grace period expiry and background sync
export const checkGracePeriodReports = async () => {
  if (!navigator.onLine) return;
  const reports = getLocalReports();
  const now = Date.now();

  for (const rep of reports) {
    if (rep.sync_status === "GRACE_PERIOD" && rep.grace_expires_at) {
      if (now >= rep.grace_expires_at) {
        await commitReportToCloud(rep.id);
      } else {
        const remainingMs = rep.grace_expires_at - now;
        scheduleGracePeriodSync(rep.id, remainingMs);
      }
    }
  }
};

if (typeof window !== "undefined") {
  setTimeout(() => checkGracePeriodReports(), 2000);
  setInterval(() => {
    checkGracePeriodReports();
  }, 60 * 1000);
}

// 4. Sync local students, sessions & comment templates to the database
export const syncLocalStudentsToBackend = async () => {
  if (!navigator.onLine) return;
  try {
    const res = await fetchWithAuth("/students/");
    if (res.ok) {
      const raw = await res.json();
      const apiStudents = (Array.isArray(raw) ? raw : []).map((s) => {
        const subVal =
          typeof s === "object" && typeof s?.section_name === "string" && s.section_name
            ? s.section_name
            : typeof s === "object" && typeof s?.student_section_name === "string" && s.student_section_name
            ? s.student_section_name
            : typeof s === "object" && typeof s?.sub === "string" && s.sub
            ? s.sub
            : typeof s === "object" && (s?.group_name || s?.group)
            ? String(s.group_name || s.group)
            : "";
        return {
          id: typeof s === "object" ? s?.id : null,
          label: typeof s === "object" ? s?.name_en || s?.name || s?.student_name || s?.label || "" : String(s || ""),
          sub: subVal,
        };
      });
      const apiKeys = new Set(
        apiStudents.map((s) => `${(s.label || "").toLowerCase().trim()}___${(s.sub || "").toLowerCase().trim()}`)
      );

      const localStudents = studentStore.getAll();
      const unsyncedLocal = (Array.isArray(localStudents) ? localStudents : []).filter(
        (s) => {
          if (!s || (!s.label && !s.name)) return false;
          if (!s._local) return false;
          const sSub =
            typeof s === "object" && typeof s?.section_name === "string" && s.section_name
              ? s.section_name
              : typeof s === "object" && typeof s?.student_section_name === "string" && s.student_section_name
              ? s.student_section_name
              : typeof s === "object" && typeof s?.sub === "string" && s.sub
              ? s.sub
              : typeof s === "object" && (s?.group || s?.group_name)
              ? String(s.group || s.group_name)
              : "";
          const key = `${(s.label || s.name || "").toLowerCase().trim()}___${sSub.toLowerCase().trim()}`;
          return !apiKeys.has(key);
        }
      );

      for (const stu of unsyncedLocal) {
        const name = typeof stu === "object" ? stu.label || stu.name : String(stu || "");
        const group =
          typeof stu === "object" && typeof stu?.section_name === "string" && stu.section_name
            ? stu.section_name
            : typeof stu === "object" && typeof stu?.student_section_name === "string" && stu.student_section_name
            ? stu.student_section_name
            : typeof stu === "object" && typeof stu?.sub === "string" && stu.sub
            ? stu.sub
            : typeof stu === "object" && (stu?.group || stu?.group_name)
            ? String(stu.group || stu.group_name)
            : "";
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
    const res = await fetchWithAuth("/messages/?category=report_builder_comments");
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
            body: JSON.stringify({ text: commentText, category: "report_builder_comments" }),
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