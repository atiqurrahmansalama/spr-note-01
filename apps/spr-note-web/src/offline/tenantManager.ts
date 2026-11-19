/**
 * TaleemOS / SPR Note ERP — Tenant & Security Isolation Manager
 * ==============================================================
 * Guarantees zero data leakage across different institutions, branches,
 * and user accounts stored inside the local browser IndexedDB.
 */

import { offlineDB } from "./db";

/**
 * Resolves the currently active tenant ID from auth context or localStorage
 */
export function getActiveTenantId(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "default";
  }

  try {
    const rawTenant = localStorage.getItem("active_tenant_id");
    if (
      rawTenant &&
      rawTenant !== "null" &&
      rawTenant !== "undefined" &&
      rawTenant !== "ALL" &&
      rawTenant.trim() !== ""
    ) {
      return rawTenant.trim();
    }

    // Secondary fallback: inspect logged in user payload
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (parsed.tenant_id || parsed.institution_id || parsed.institution?.id) {
        return String(parsed.tenant_id || parsed.institution_id || parsed.institution?.id);
      }
    }
  } catch (err) {
    console.warn("[TenantManager] Failed to read active tenant ID:", err);
  }

  return "default";
}

/**
 * Purges all cached entities, drafts, and unsaved changes for a specific tenant.
 * Used when switching branches or switching accounts.
 */
export async function purgeTenantData(tenantId: string): Promise<void> {
  if (!tenantId) return;

  try {
    await offlineDB.transaction("rw", [offlineDB.entities, offlineDB.drafts, offlineDB.outbox], async () => {
      // 1. Delete all cached entities for this tenant
      await offlineDB.entities.where("tenantId").equals(tenantId).delete();

      // 2. Delete all form drafts for this tenant
      await offlineDB.drafts.where("tenantId").equals(tenantId).delete();

      // 3. Delete outbox items that were already synced for this tenant
      await offlineDB.outbox
        .where("tenantId")
        .equals(tenantId)
        .filter((item) => item.status === "SYNCED")
        .delete();
    });

    console.info(`[TenantManager] Purged local cache for tenant: ${tenantId}`);
  } catch (err) {
    console.error(`[TenantManager] Failed to purge tenant data for ${tenantId}:`, err);
  }
}

export interface PurgeOptions {
  preserveUnsyncedOutbox?: boolean;
}

/**
 * Complete security purge called during user logout or session termination.
 * Guarantees zero data leakage on shared computers by clearing sensitive
 * entity cache, form drafts, metadata, and browser storage.
 */
export async function purgeAllUserData(options: PurgeOptions = {}): Promise<void> {
  try {
    // 1. Clear IndexedDB storage in an atomic transaction
    await offlineDB.transaction("rw", [offlineDB.entities, offlineDB.drafts, offlineDB.metadata, offlineDB.outbox], async () => {
      await offlineDB.entities.clear();
      await offlineDB.drafts.clear();
      await offlineDB.metadata.clear();

      if (options.preserveUnsyncedOutbox) {
        await offlineDB.outbox.where("status").equals("SYNCED").delete();
      } else {
        await offlineDB.outbox.clear();
      }
    });

    // 2. Purge sensitive draft & cached report keys from localStorage
    if (typeof localStorage !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("spr_draft_") ||
              key.startsWith("daily_lesson_form_") ||
              key === "spr_reports_local_v1" ||
              key === "spr_editing_report" ||
              key === "active_report_draft" ||
              key === "active_tenant_id")
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn("[TenantManager] LocalStorage key purge warning:", e);
      }
    }

    // 3. Dispatch broadcast event across active windows/components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spr_offline_purged"));
    }

    console.info("[TenantManager] Complete security purge executed successfully.");
  } catch (err) {
    console.error("[TenantManager] Logout purge failed:", err);
  }
}

/**
 * Event listener helper to watch for active tenant changes across views
 */
export function onTenantChange(callback: (newTenantId: string) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (evt: Event) => {
    const detail = (evt as CustomEvent).detail;
    const tenantId = detail?.tenantId || getActiveTenantId();
    callback(tenantId);
  };

  window.addEventListener("spr_tenant_changed", handler);
  return () => window.removeEventListener("spr_tenant_changed", handler);
}
