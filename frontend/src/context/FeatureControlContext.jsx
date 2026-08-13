import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../utils/authService";
import { getSectionConfig } from "../config/defaultSectionConfig";
import { useAuth } from "./AuthContext";

const FeatureControlContext = createContext({
  config: {},
  origins: {},
  loading: true,
  isFeatureEnabled: () => true,
  isSectionEnabled: () => true,
  getFeatureOrigin: () => "GLOBAL",
  refetchConfig: async () => {},
});

export function FeatureControlProvider({ children }) {
  const { user, accessToken } = useAuth();

  const getLocalDefaults = () => {
    try {
      const local = getSectionConfig();
      const map = {};
      Object.keys(local).forEach((k) => {
        map[k] = local[k].enabled;
      });
      return map;
    } catch {
      return {};
    }
  };

  const [config, setConfig] = useState(getLocalDefaults);
  const [origins, setOrigins] = useState({});
  const [loading, setLoading] = useState(true);
  const currentVersionRef = useRef(0);
  // Track the last user id we fetched for, to detect user switches
  const lastUserIdRef = useRef(null);

  const fetchEvaluatedConfig = useCallback(async () => {
    setLoading(true);
    try {
      const candidatePaths = [
        "/api/v1/section-control/evaluate/",
        "/api/v1/control-panel/evaluated-config/",
      ];

      let resData = null;
      for (const path of candidatePaths) {
        try {
          const res = await fetchWithAuth(path);
          if (res.ok) {
            resData = await res.json();
            break;
          }
        } catch {
          // try next candidate
        }
      }

      const evalData = resData?.flags || resData?.config;
      if (evalData) {
        setConfig(evalData);
        setOrigins(resData.origins || {});
      }
    } catch (err) {
      console.warn("[FeatureControlContext] Using local fallback config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkVersionAndSync = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/v1/section-control/version/");
      if (res.ok) {
        const data = await res.json();
        if (data.version && data.version > currentVersionRef.current) {
          currentVersionRef.current = data.version;
          fetchEvaluatedConfig();
        }
      }
    } catch {}
  }, [fetchEvaluatedConfig]);

  // ── CRITICAL: Re-evaluate flags whenever user identity changes ──────────────
  // This is what makes admin changes apply to OTHER accounts:
  //   - When a different user logs in, their JWT is sent to /evaluate/ and the
  //     backend returns THEIR 4-tier resolved config (their role, group, user overrides).
  //   - When user logs out, reset to local defaults.
  useEffect(() => {
    const currentUserId = user?.id ?? null;

    if (currentUserId !== lastUserIdRef.current) {
      // User identity changed (login, logout, switch account)
      lastUserIdRef.current = currentUserId;

      if (currentUserId === null) {
        // Logged out — reset to local defaults immediately
        setConfig(getLocalDefaults());
        setOrigins({});
        currentVersionRef.current = 0;
      } else {
        // New user logged in — immediately reset version ref and re-fetch for this user
        currentVersionRef.current = 0;
        fetchEvaluatedConfig();
      }
    }
  }, [user?.id, fetchEvaluatedConfig]);

  // ── INITIAL MOUNT + EVENT LISTENERS + POLLING ──────────────────────────────
  useEffect(() => {
    // Initial fetch on mount (handles page refresh with existing session)
    fetchEvaluatedConfig();
    checkVersionAndSync();

    const handleUpdate = () => {
      fetchEvaluatedConfig();
      checkVersionAndSync();
    };

    // 1. BroadcastChannel: instant update across tabs in the same browser
    let broadcastChannel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel("spr_section_control_channel");
        broadcastChannel.onmessage = () => {
          // Reset version ref so we always get fresh data after admin change
          currentVersionRef.current = 0;
          fetchEvaluatedConfig();
        };
      }
    } catch {}

    // 2. Auth change event — triggers re-fetch for new user immediately
    window.addEventListener("spr_auth_updated", handleUpdate);
    // 3. Section config updated event (fired by control panel after save)
    window.addEventListener("spr_section_config_updated", handleUpdate);
    // 4. Storage sync (cross-tab auth changes)
    window.addEventListener("storage", handleUpdate);
    // 5. Window focus — re-check version when user switches back to tab
    window.addEventListener("focus", checkVersionAndSync);

    // 6. Page visibility — re-check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersionAndSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 7. 10-second polling: propagates admin changes to all live sessions worldwide
    //    Works for users on different devices/browsers — they pick up version bump
    //    and immediately re-fetch their own per-user evaluated config from the server.
    const intervalId = setInterval(() => {
      checkVersionAndSync();
    }, 10000);

    return () => {
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch {}
      }
      window.removeEventListener("spr_auth_updated", handleUpdate);
      window.removeEventListener("spr_section_config_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", checkVersionAndSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchEvaluatedConfig, checkVersionAndSync]);

  const isFeatureEnabled = useCallback(
    (featureKey) => {
      if (!featureKey) return true;
      return config[featureKey] !== undefined ? !!config[featureKey] : true;
    },
    [config]
  );

  const getFeatureOrigin = useCallback(
    (featureKey) => {
      if (!featureKey) return "GLOBAL";
      return origins[featureKey] || "GLOBAL";
    },
    [origins]
  );

  return (
    <FeatureControlContext.Provider
      value={{
        config,
        origins,
        loading,
        isFeatureEnabled,
        isSectionEnabled: isFeatureEnabled,
        getFeatureOrigin,
        refetchConfig: fetchEvaluatedConfig,
      }}
    >
      {children}
    </FeatureControlContext.Provider>
  );
}

export function useFeatureControl() {
  const context = useContext(FeatureControlContext);
  if (!context) {
    throw new Error("useFeatureControl must be used within a FeatureControlProvider");
  }
  return context;
}

export function FeatureGuard({ featureKey, children, fallback = null }) {
  const { isFeatureEnabled, loading } = useFeatureControl();

  if (loading) {
    return children;
  }

  if (!isFeatureEnabled(featureKey)) {
    if (fallback !== null) return fallback;
    return null;
  }

  return children;
}
