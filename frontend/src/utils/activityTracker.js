import { fetchWithAuth } from "./authService";
import { auth as authStore } from "./localStore";

let heartbeatInterval = null;
let currentStatus = "INACTIVE";

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

/**
 * Send Active or Inactive status ping to backend
 */
export async function sendActivityLog(status = "ACTIVE") {
  const user = authStore.getUser();
  if (!user) return;

  try {
    await fetchWithAuth("/activity/log-status/", {
      method: "POST",
      body: JSON.stringify({
        status,
        username: user.username,
      }),
    });
    currentStatus = status;
  } catch (err) {
    console.warn("[activityTracker] Log activity status failed:", err.message);
  }
}

/**
 * Initialize global event listeners for window focus, blur, and periodic active pings
 */
export function initActivityTracker() {
  if (typeof window === "undefined") return;

  const user = authStore.getUser();
  if (user && currentStatus === "INACTIVE") {
    sendActivityLog("ACTIVE");
  }

  const handleFocus = () => {
    if (authStore.getUser()) {
      sendActivityLog("ACTIVE");
    }
  };

  const handleBlur = () => {
    if (authStore.getUser()) {
      sendActivityLog("INACTIVE");
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      handleBlur();
    } else {
      handleFocus();
    }
  };

  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Heartbeat ping every 2 minutes when tab is open
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (authStore.getUser() && !document.hidden) {
      sendActivityLog("ACTIVE");
    }
  }, 2 * 60 * 1000);
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
