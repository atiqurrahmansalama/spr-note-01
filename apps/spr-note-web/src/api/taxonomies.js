import { fetchWithAuth } from "../utils/authService";

/**
 * Enterprise Tenant Taxonomies API Client
 * Facilitates two-way live sync between local browser storage and central Django cloud database.
 */
export const taxonomiesApi = {
  fetchTaxonomies: async (tenantId) => {
    try {
      const url = tenantId && tenantId !== "default" 
        ? `/api/tenant-taxonomies/?tenant_id=${tenantId}`
        : `/api/tenant-taxonomies/`;
      const res = await fetchWithAuth(url);
      if (!res.ok) return { success: false, taxonomies: {} };
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        console.warn("[TaxonomiesApi] Unexpected HTML response from:", url);
        return { success: false, taxonomies: {} };
      }
      const data = await res.json();
      return { success: true, taxonomies: data.taxonomies || {} };
    } catch (err) {
      console.warn("[TaxonomiesApi] Fetch failed:", err);
      return { success: false, taxonomies: {} };
    }
  },

  bulkSyncTaxonomies: async (tenantId, taxonomiesPayload) => {
    try {
      const url = tenantId && tenantId !== "default" 
        ? `/api/tenant-taxonomies/bulk-sync/?tenant_id=${tenantId}`
        : `/api/tenant-taxonomies/bulk-sync/`;
      const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify({ taxonomies: taxonomiesPayload }),
      });
      if (!res.ok) return { success: false };
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        console.warn("[TaxonomiesApi] Unexpected HTML response from:", url);
        return { success: false };
      }
      const data = await res.json();
      return { success: true, data };
    } catch (err) {
      console.warn("[TaxonomiesApi] Bulk sync failed:", err);
      return { success: false };
    }
  },
};
