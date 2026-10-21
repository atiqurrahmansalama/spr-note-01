/**
 * TaleemOS / SPR Note ERP — Universal Background Sync Worker 2.0
 * ==============================================================
 * Idempotent, resilient background sync engine handling universal outbox mutations,
 * exponential backoff retry policies, and network re-connection triggers.
 */

import { offlineDB } from "./db";
import { OutboxMutation, SyncExecutionResult } from "./types";
import {
  getPendingMutations,
  markMutationSyncing,
  markMutationSynced,
  markMutationFailed,
} from "./outboxManager";
import { getActiveTenantId } from "./tenantManager";
import { parseBackendError } from "./errorParser";
import { fetchWithAuth } from "@/utils/authService";
import { auth as authStore } from "@/utils/localStore";

let isUniversalSyncInProgress = false;
let autoSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface UniversalSyncOptions {
  force?: boolean;
  tenantId?: string;
  module?: string;
}

/**
 * Executes a full or selective sync pass over all pending mutations in the Universal Outbox
 */
export async function processUniversalOutbox(
  options: UniversalSyncOptions = {}
): Promise<SyncExecutionResult> {
  const force = Boolean(options.force);
  const tenantId = options.tenantId || getActiveTenantId();

  if (isUniversalSyncInProgress) {
    console.log("[SyncWorker 2.0] Sync already active. Skipping duplicate concurrency pass.");
    return {
      totalProcessed: 0,
      syncedCount: 0,
      failedCount: 0,
      remainingCount: 0,
      errors: [],
    };
  }

  isUniversalSyncInProgress = true;

  try {
    // 1. Guard: Network status check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("[SyncWorker 2.0] Offline: Postponing outbox synchronization.");
      return {
        totalProcessed: 0,
        syncedCount: 0,
        failedCount: 0,
        remainingCount: 0,
        errors: [{ id: "err-offline", module: "network", reason: "Network is currently offline" }],
      };
    }

    // 2. Guard: Authentication check
    if (!authStore.getAccessToken() && !authStore.getRefreshToken()) {
      return {
        totalProcessed: 0,
        syncedCount: 0,
        failedCount: 0,
        remainingCount: 0,
        errors: [{ id: "err-auth", module: "auth", reason: "Unauthenticated session" }],
      };
    }

    // 3. Retrieve eligible mutations for the active tenant
    let pendingMutations = await getPendingMutations(tenantId);
    if (options.module) {
      pendingMutations = pendingMutations.filter((m) => m.module === options.module);
    }

    if (pendingMutations.length === 0) {
      return {
        totalProcessed: 0,
        syncedCount: 0,
        failedCount: 0,
        remainingCount: 0,
        errors: [],
      };
    }

    let syncedCount = 0;
    const errors: SyncExecutionResult["errors"] = [];
    const now = Date.now();

    for (const mutation of pendingMutations) {
      // Exponential Backoff Check:
      // If mutation has failed repeatedly and this run is not forced, delay retry
      if (!force && mutation.status === "FAILED" && mutation.lastAttemptAt) {
        const backoffMs = Math.min(300000, 1000 * Math.pow(2, Math.min(mutation.retryCount, 6))); // Max 5 mins
        if (now - mutation.lastAttemptAt < backoffMs) {
          continue;
        }
      }

      await markMutationSyncing(mutation.id);

      try {
        const httpMethod =
          mutation.action === "CREATE"
            ? "POST"
            : mutation.action === "DELETE"
            ? "DELETE"
            : mutation.action === "PATCH"
            ? "PATCH"
            : "PUT";

        const headers: Record<string, string> = {
          "X-Idempotency-Key": mutation.idempotencyKey,
        };

        const res = await fetchWithAuth(mutation.endpoint, {
          method: httpMethod,
          headers,
          body: mutation.action !== "DELETE" ? JSON.stringify(mutation.payload) : undefined,
        });

        if (res.ok) {
          let responseData = null;
          try {
            responseData = await res.json();
          } catch {
            responseData = null;
          }

          // Mark mutation synced and remove from queue
          await markMutationSynced(mutation.id);

          // Update corresponding entity in IndexedDB if it exists
          const entityId = (mutation.payload && mutation.payload.id) || (responseData && responseData.id);
          if (entityId !== undefined && entityId !== null) {
            const existingEntity = await offlineDB.entities.get([mutation.tenantId, mutation.module, entityId]);
            if (existingEntity) {
              await offlineDB.entities.put({
                ...existingEntity,
                data: responseData || existingEntity.data,
                isDirty: false,
                syncStatus: "SYNCED",
                serverUpdatedAt: Date.now(),
              });
            }
          }

          syncedCount++;
        } else {
          let errData = null;
          try {
            errData = await res.json();
          } catch {
            errData = res.statusText;
          }

          const reason = parseBackendError(errData);
          await markMutationFailed(mutation.id, reason);

          errors.push({
            id: mutation.id,
            module: mutation.module,
            status: res.status,
            reason,
          });

          // Abort if credentials expired
          if (res.status === 401 || res.status === 403) {
            console.warn("[SyncWorker 2.0] Authentication invalid or session expired. Aborting queue pass.");
            break;
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || "Network error occurred";
        await markMutationFailed(mutation.id, errorMsg);
        errors.push({
          id: mutation.id,
          module: mutation.module,
          reason: errorMsg,
        });
      }
    }

    const remainingCount = (await getPendingMutations(tenantId)).length;

    const result: SyncExecutionResult = {
      totalProcessed: pendingMutations.length,
      syncedCount,
      failedCount: errors.length,
      remainingCount,
      errors,
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("spr_universal_sync_completed", { detail: result })
      );
    }

    return result;
  } finally {
    isUniversalSyncInProgress = false;
  }
}

/**
 * Debounced trigger called whenever a mutation is enqueued
 */
export function scheduleUniversalSync(delayMs = 1200): void {
  if (autoSyncDebounceTimer) {
    clearTimeout(autoSyncDebounceTimer);
  }

  autoSyncDebounceTimer = setTimeout(() => {
    processUniversalOutbox().catch((err) => {
      console.warn("[SyncWorker 2.0] Auto sync error:", err);
    });
  }, delayMs);
}

// ─── Automated Event Watchers & Heartbeats ─────────────────────────────────

if (typeof window !== "undefined") {
  // Watch online restoration
  window.addEventListener("online", () => {
    console.info("[SyncWorker 2.0] Connection online. Triggering universal outbox sync.");
    processUniversalOutbox({ force: false });
  });

  // Watch mutation enqueued events
  window.addEventListener("spr_outbox_mutation_enqueued", () => {
    scheduleUniversalSync(1000);
  });

  // Periodic heartbeat every 60 seconds
  setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      processUniversalOutbox({ force: false });
    }
  }, 60 * 1000);
}
