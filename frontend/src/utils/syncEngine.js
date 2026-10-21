import { fetchWithAuth } from "./authService";
import { auth as authStore, students as studentStore, sessions as sessionStore, savedComments as commentStore } from "./localStore";
import { createReport, updateReport } from "../api/reports";

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

  // Mirror into Central Offline IndexedDB entities for high-capacity local persistence
  import("../offline").then(({ dailyProgressRepository }) => {
    dailyProgressRepository.bulkHydrate([updatedReport]).catch(() => {});
  }).catch(() => {});

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

/**
 * Authoritative check if a report has pending sync changes to the cloud database
 */
export const isReportUnsynced = (r) => {
  if (!r) return false;
  if (r.sync_status === "SYNCED") return false;

  const hasNumericId =
    (typeof r.id === "number" && !isNaN(r.id)) ||
    (typeof r.id === "string" && /^\d+$/.test(r.id.trim()) && !r.id.includes("-"));
  const hasNumericServerId =
    (typeof r.server_id === "number" && !isNaN(r.server_id)) ||
    (typeof r.server_id === "string" && /^\d+$/.test(r.server_id.trim()));

  if (hasNumericServerId || (hasNumericId && r.sync_status !== "PENDING" && r.sync_status !== "GRACE_PERIOD")) {
    return false;
  }

  return r.sync_status === "PENDING" || r.sync_status === "GRACE_PERIOD" || (!hasNumericId && !hasNumericServerId);
};

/**
 * Human-readable parser for Django REST Framework error payloads
 */
export const parseErrorReason = (errorData) => {
  if (!errorData) return "Unknown server error";
  if (typeof errorData === "string") return errorData;

  // Unwrap backend custom exception payloads (e.g. { error_type, details: { ... } })
  const target = errorData.details || errorData.errors || errorData;

  if (typeof target === "string") return target;
  if (target.detail && typeof target.detail === "string") return target.detail;
  if (target.message && typeof target.message === "string") return target.message;
  if (target.error && typeof target.error === "string") return target.error;

  if (typeof target === "object" && target !== null) {
    const entries = Object.entries(target)
      .filter(([key]) => !["success", "status_code", "error_type", "request_id", "timestamp"].includes(key))
      .map(([key, val]) => {
        let msg = "";
        if (Array.isArray(val)) {
          msg = val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
        } else if (typeof val === "object" && val !== null) {
          msg = JSON.stringify(val);
        } else {
          msg = String(val);
        }
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        return `${formattedKey}: ${msg}`;
      });

    if (entries.length > 0) return entries.join(" • ");
  }

  return errorData.error_type || errorData.message || JSON.stringify(errorData);
};

// 3. Commit a Specific Report to Cloud Immediately
export const commitReportToCloud = async (reportId) => {
  if (!navigator.onLine) {
    return { success: false, isOffline: true, error: "Network offline" };
  }
  if (!authStore.getAccessToken() && !authStore.getRefreshToken()) {
    return { success: false, isOffline: false, error: "Unauthenticated" };
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
    const targetServerId = item.server_id || (typeof item.id === "number" ? item.id : null);
    let apiResult;
    if (targetServerId) {
      apiResult = await updateReport(targetServerId, item);
    } else {
      apiResult = await createReport(item);
    }

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

    const reason = parseErrorReason(apiResult.errors || apiResult.error || apiResult.data);
    reports[reportIndex] = {
      ...reports[reportIndex],
      sync_status: "FAILED",
      sync_error: reason,
      last_sync_error_at: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
    return { success: false, status: apiResult.status, error: reason, errors: apiResult.errors };
  } catch (err) {
    console.warn("[SyncEngine] commitReportToCloud failed:", err);
    if (reports[reportIndex]) {
      reports[reportIndex] = {
        ...reports[reportIndex],
        sync_status: "FAILED",
        sync_error: err.message,
        last_sync_error_at: Date.now(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
    }
    return { success: false, error: err.message };
  }
};

let isSyncInProgress = false;

// 4. Trigger Delta Cloud Sync with DRF Backend API
export const triggerCloudSync = async (options = {}) => {
  const force = Boolean(options?.force);

  if (isSyncInProgress) {
    console.log("[SyncEngine] Sync already in progress. Skipping redundant concurrent run.");
    return { success: false, inProgress: true, errors: [] };
  }
  isSyncInProgress = true;

  try {
    if (!navigator.onLine) {
      console.warn("[SyncEngine] Network offline. Sync postponed.");
      return {
        success: false,
        isOffline: true,
        errors: [{ id: "err-offline", student_name: "Network Connection", reason: "You are currently offline. Check your internet connection." }],
      };
    }
    if (!authStore.getAccessToken() && !authStore.getRefreshToken()) {
      return {
        success: false,
        isOffline: false,
        errors: [{ id: "err-auth", student_name: "Authentication", reason: "Unauthenticated. Please log in again to sync records." }],
      };
    }

    const reports = getLocalReports();
    let pendingIds = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");

    // Enterprise Resilience: Automatically detect and include any local reports that are unsynced
    const unsyncedReports = reports.filter(isReportUnsynced);
    unsyncedReports.forEach((r) => {
      const rId = r.id || r.report_unique_id;
      if (rId && !pendingIds.includes(rId)) {
        pendingIds.push(rId);
      }
    });

    // Filter out any IDs in pendingQueue that are already SYNCED in local storage
    pendingIds = pendingIds.filter((pId) => {
      const found = reports.find((r) => r.id === pId || r.report_unique_id === pId);
      return !found || isReportUnsynced(found);
    });

    if (pendingIds.length === 0) {
      console.log("[SyncEngine] Local storage is in sync.");
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([]));
      return { success: true, syncedCount: 0, failedCount: 0, remainingCount: 0, errors: [] };
    }

    const pendingItems = reports.filter((r) => pendingIds.includes(r.id) || pendingIds.includes(r.report_unique_id));
    let updatedIds = [...pendingIds];
    let syncedCount = 0;
    const syncErrors = [];

    for (const item of pendingItems) {
      // Unless forced (manual click on "Retry Sync" or "Sync to DB"), do NOT repeatedly retry items that already failed
      if (!force && (item.sync_status === "FAILED" || item.sync_error)) {
        continue;
      }

      // Grace Period check: unless forced, postpone cloud sync if within grace buffer
      if (!force && item.grace_expires_at && Date.now() < item.grace_expires_at) {
        continue;
      }

      // Safety check: skip and prune completely blank or default empty reports (student is N/A/empty and no pages/errors)
      const isBlank = (
        (!item.student || item.student === "N/A") &&
        (!item.student_name || item.student_name === "N/A") &&
        (!item.juz_and_pages || item.juz_and_pages.length === 0) &&
        (!item.portions || item.portions.length === 0) &&
        (!item.mistakes || item.mistakes.length === 0) &&
        (!item.stucks || item.stucks.length === 0)
      );

      if (isBlank) {
        console.warn("[SyncEngine] Skipping and pruning blank pending report:", item.id);
        const pruneIdx = reports.findIndex((r) => r.id === item.id || r.report_unique_id === item.report_unique_id);
        if (pruneIdx > -1) {
          reports.splice(pruneIdx, 1);
        }
        updatedIds = updatedIds.filter((id) => id !== item.id && id !== item.report_unique_id);
        continue;
      }

      try {
        const targetServerId = item.server_id || (typeof item.id === "number" ? item.id : null);
        let apiResult;
        if (targetServerId) {
          apiResult = await updateReport(targetServerId, item);
        } else {
          apiResult = await createReport(item);
        }

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
              server_id: serverReport.id,
              report_unique_id: serverReport.report_unique_id || reports[itemIdx].report_unique_id,
              sync_status: "SYNCED",
              sync_error: null,
              grace_expires_at: null,
            };
          }
          updatedIds = updatedIds.filter((id) => id !== item.id && id !== item.report_unique_id && id !== serverReport.id);
          syncedCount += 1;
        } else {
          const reason = parseErrorReason(apiResult.errors || apiResult.error || apiResult.data);
          const itemIdx = reports.findIndex(
            (r) => r.id === item.id || (item.report_unique_id && r.report_unique_id === item.report_unique_id)
          );
          if (itemIdx > -1) {
            reports[itemIdx] = {
              ...reports[itemIdx],
              sync_status: "FAILED",
              sync_error: reason,
              last_sync_error_at: Date.now(),
            };
          }
          syncErrors.push({
            id: item.id || item.report_unique_id,
            report_unique_id: item.report_unique_id,
            student_name: item.student_name || (item.student ? `Student #${item.student}` : "Unknown Student"),
            status: apiResult.status || 400,
            reason,
          });

          if (apiResult.status === 401 || apiResult.status === 403) {
            console.warn("[SyncEngine] Authentication credentials invalid or expired. Aborting pending queue sync.");
            break;
          }
        }
      } catch (error) {
        console.error("[SyncEngine] Failed to sync item:", item.id, error);
        syncErrors.push({
          id: item.id || item.report_unique_id,
          report_unique_id: item.report_unique_id,
          student_name: item.student_name || (item.student ? `Student #${item.student}` : "Unknown Student"),
          reason: error.message || "Network error",
        });
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedIds));
    if (syncedCount > 0) {
      window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "sync", count: syncedCount } }));
    }

    // Trigger Central Universal Outbox sync across all modules simultaneously
    import("../offline").then(({ processUniversalOutbox }) => {
      processUniversalOutbox({ force }).catch(() => {});
    }).catch(() => {});

    return {
      success: syncErrors.length === 0,
      syncedCount,
      failedCount: syncErrors.length,
      remainingCount: updatedIds.length,
      errors: syncErrors,
    };
  } finally {
    isSyncInProgress = false;
  }
};

// 5. Periodic check for grace period expiry and background sync
export const checkGracePeriodReports = async () => {
  if (!navigator.onLine) return;
  if (!authStore.getAccessToken() && !authStore.getRefreshToken()) return;
  const reports = getLocalReports();
  const now = Date.now();

  for (const rep of reports) {
    if (rep.sync_status === "FAILED" || rep.sync_error) {
      continue; // Do not repeatedly hit database if report has already encountered a validation/server error
    }
    if (rep.sync_status === "PENDING" && !rep.server_id) {
      // Immediately attempt cloud commit for pending items
      const res = await commitReportToCloud(rep.id);
      if (res && (res.status === 401 || res.status === 403)) {
        break;
      }
    } else if (rep.sync_status === "GRACE_PERIOD" && rep.grace_expires_at) {
      if (now >= rep.grace_expires_at) {
        const res = await commitReportToCloud(rep.id);
        if (res && (res.status === 401 || res.status === 403)) {
          console.warn("[SyncEngine] Session expired during grace period sync. Aborting.");
          break;
        }
      } else {
        const remainingMs = rep.grace_expires_at - now;
        if (!activeGraceTimers.has(rep.id)) {
          scheduleGracePeriodSync(rep.id, remainingMs);
        }
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