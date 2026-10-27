import { useState, useEffect } from "react";
import { auth as authStore } from "../../../utils/localStore";
import { initActivityTracker } from "../../../utils/activityTracker";
import { triggerCloudSync, syncTenantTaxonomies } from "../../../utils/syncEngine";
import { fetchWithAuth } from "../../../utils/authService";

export interface UseAppSyncAndAuthProps {
  activeTenantId?: string | number | null;
  showToast: (msg: string, variant?: string) => void;
}

/**
 * Enterprise Background Sync & Auth Lifecycle Hook
 * Coordinates background cloud sync queues, tenant taxonomies, pending invite claiming,
 * and reactive auth session tracking.
 */
export function useAppSyncAndAuth({
  activeTenantId,
  showToast,
}: UseAppSyncAndAuthProps) {
  const [user, setUser] = useState<any>(() => authStore.getUser());

  // Reactive user session tracking & activity tracker
  useEffect(() => {
    initActivityTracker();
    const handleAuthUpdate = () => setUser(authStore.getUser());
    window.addEventListener("storage", handleAuthUpdate);
    window.addEventListener("spr_auth_updated", handleAuthUpdate);
    return () => {
      window.removeEventListener("storage", handleAuthUpdate);
      window.removeEventListener("spr_auth_updated", handleAuthUpdate);
    };
  }, []);

  // Automatic Offline-to-Online Sync & Cloud Taxonomy Sync triggers
  useEffect(() => {
    triggerCloudSync();
    if (activeTenantId) {
      syncTenantTaxonomies(activeTenantId);
    }

    const handleOnline = () => {
      triggerCloudSync();
      if (activeTenantId) {
        syncTenantTaxonomies(activeTenantId);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [activeTenantId]);

  // Auto-Claim pending invite token if present in sessionStorage
  useEffect(() => {
    const claimPendingInvite = async () => {
      const token = sessionStorage.getItem("pending_invite_token");
      if (!token) return;

      try {
        const res = await fetchWithAuth("/api/v1/invites/claim/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          showToast(data.message || "Invitation claimed successfully!", "success");
          sessionStorage.removeItem("pending_invite_token");
          window.dispatchEvent(new Event("spr_auth_updated"));
          window.location.reload();
        } else {
          const errData = await res.json();
          if (errData.role === "SUPER_ADMIN") {
            showToast(errData.message, "info");
          } else {
            showToast(errData.error || "Failed to claim invite.", "error");
          }
          sessionStorage.removeItem("pending_invite_token");
        }
      } catch (err) {
        console.error("Error claiming pending invite:", err);
      }
    };
    claimPendingInvite();
  }, [showToast]);

  const avatarChar = user 
    ? (user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username ? user.username.charAt(0).toUpperCase() : "U")
    : "S";

  return { user, avatarChar };
}
