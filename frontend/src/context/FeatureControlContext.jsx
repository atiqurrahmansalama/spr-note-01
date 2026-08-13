import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../utils/authService";
import { getSectionConfig } from "../config/defaultSectionConfig";

const FeatureControlContext = createContext({
  config: {},
  origins: {},
  loading: true,
  isFeatureEnabled: () => true,
  getFeatureOrigin: () => "GLOBAL",
  refetchConfig: async () => {},
});

export function FeatureControlProvider({ children }) {
  const [config, setConfig] = useState(() => {
    // Default fallback from local section config
    const local = getSectionConfig();
    const map = {};
    Object.keys(local).forEach((k) => {
      map[k] = local[k].enabled;
    });
    return map;
  });

  const [origins, setOrigins] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchEvaluatedConfig = useCallback(async () => {
    try {
      const candidatePaths = [
        "/api/v1/section-control/evaluate/",
        "/api/v1/control-panel/evaluated-config/",
        "/control-panel/evaluated-config/",
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

      if (resData && resData.config) {
        setConfig(resData.config);
        setOrigins(resData.origins || {});
      }
    } catch (err) {
      console.warn("[FeatureControlContext] Using local fallback config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluatedConfig();

    const handleUpdate = () => fetchEvaluatedConfig();

    // 1. BroadcastChannel across browser tabs
    let broadcastChannel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel("spr_section_control_channel");
        broadcastChannel.onmessage = () => {
          fetchEvaluatedConfig();
        };
      }
    } catch {}

    // 2. Custom DOM Events & Storage Sync
    window.addEventListener("spr_section_config_updated", handleUpdate);
    window.addEventListener("spr_auth_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchEvaluatedConfig();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. 15-Second Background Polling Interval for live updates across logged-in accounts
    const intervalId = setInterval(handleUpdate, 15000);

    return () => {
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch {}
      }
      window.removeEventListener("spr_section_config_updated", handleUpdate);
      window.removeEventListener("spr_auth_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchEvaluatedConfig]);

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
