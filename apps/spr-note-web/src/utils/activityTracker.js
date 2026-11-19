import { fetchWithAuth } from "./authService";
import { auth as authStore } from "./localStore";

let heartbeatInterval = null;
let currentStatus = "INACTIVE";
let isInitialized = false;

/**
 * Send Login or Logout event to backend
 */
export async function sendLoginLog(status = "LOGIN", locationInfo = {}) {
  const user = authStore.getUser();
  if (!user && !locationInfo.username) return;

  try {
    await fetchWithAuth("/activity/log-login/", {
      method: "POST",
      body: JSON.stringify({
        status,
        username: user?.username || locationInfo.username,
        country: locationInfo.country || "--",
        city: locationInfo.city || "--",
      }),
    });
  } catch (err) {
    console.warn("[activityTracker] Log login failed:", err.message);
  }
}

let statusDebounceTimer = null;

/**
 * Send Active or Inactive status ping to backend
 */
export async function sendActivityLog(status = "ACTIVE") {
  const user = authStore.getUser();
  if (!user) return;
  if (currentStatus === status) return;

  try {
    currentStatus = status;
    await fetchWithAuth("/activity/log-status/", {
      method: "POST",
      body: JSON.stringify({
        status,
        username: user.username,
      }),
    });
  } catch (err) {
    console.warn("[activityTracker] Log activity status failed:", err.message);
  }
}

/**
 * Safely schedule activity state update with debounce to avoid duplicate events on tab switch
 */
function scheduleStatusUpdate(targetStatus) {
  if (statusDebounceTimer) clearTimeout(statusDebounceTimer);
  statusDebounceTimer = setTimeout(() => {
    if (authStore.getUser()) {
      sendActivityLog(targetStatus);
    }
  }, 500);
}

/**
 * Initialize global event listeners for window focus, blur, and periodic active pings
 */
export function initActivityTracker() {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  const user = authStore.getUser();
  if (user && currentStatus === "INACTIVE" && !document.hidden) {
    sendActivityLog("ACTIVE");
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      scheduleStatusUpdate("INACTIVE");
    } else {
      scheduleStatusUpdate("ACTIVE");
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", () => scheduleStatusUpdate("INACTIVE"));

  // Heartbeat ping every 5 minutes when tab is actively open
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (authStore.getUser() && !document.hidden) {
      sendActivityLog("ACTIVE");
    }
  }, 5 * 60 * 1000);
}

/**
 * Fetch current user activity summary from backend
 */
export async function fetchUserActivitySummary() {
  const user = authStore.getUser();
  try {
    const res = await fetchWithAuth(
      user ? `/activity/user-summary/?username=${encodeURIComponent(user.username)}` : "/activity/user-summary/"
    );
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("[activityTracker] Fetch user activity summary failed:", err.message);
  }

  // Fallback if backend is unavailable or user has no past logs
  return {
    unique_key: user ? `USR-${user.id || "0001"}` : "--",
    username: user ? user.username : "--",
    formatted_created_at: user?.date_joined || "--",
    total_lifetime_activity: "--",
    recent_login_logs: [],
  };
}
