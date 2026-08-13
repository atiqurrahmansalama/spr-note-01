import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
  const currentVersionRef = useRef(0);

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

  useEffect(() => {
    fetchEvaluatedConfig();
    checkVersionAndSync();

    const handleUpdate = () => {
      fetchEvaluatedConfig();
      checkVersionAndSync();
    };

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
        checkVersionAndSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. 10-Second Feature Version Polling Interval for live updates across all active sessions
    const intervalId = setInterval(() => {
      checkVersionAndSync();
    }, 10000);

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
