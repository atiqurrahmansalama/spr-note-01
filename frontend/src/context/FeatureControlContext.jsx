import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../utils/authService";
import { useAuth } from "./AuthContext";

// ─── Cache key for per-user evaluated config ────────────────────────────────
// We cache the last server-evaluated config in localStorage so that on page
// refresh the correct (server-evaluated) state is shown immediately — no flash.
const getCacheKey = (userId) => `spr_evaluated_config_${userId || "anon"}_v2`;

const HARD_DEFAULTS = {
  headerDate: false,     // start false → force server to confirm ON
  studentSelect: false,
  sessionSelect: false,
  juzPageInput: false,
  mistakeTracker: false,
  stuckTracker: false,
  commentSection: false,
  actionButtons: false,
  pdfExport: false,
};

// Read the last cached server-evaluated config for this user id.
// Falls back to HARD_DEFAULTS (all false) so nothing flashes on first load.
const getCachedConfig = (userId) => {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...HARD_DEFAULTS };
};

const setCachedConfig = (userId, config) => {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(config));
  } catch {}
};

// ─── Context ─────────────────────────────────────────────────────────────────
const FeatureControlContext = createContext({
  config: {},
  origins: {},
  loading: true,
  isFeatureEnabled: () => false,   // safe default: don't show anything until confirmed
  isSectionEnabled: () => false,
  getFeatureOrigin: () => "GLOBAL",
  refetchConfig: async () => {},
});

export function FeatureControlProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Initialize from cache (per-user) so refresh shows correct state immediately
  const [config, setConfig] = useState(() => getCachedConfig(userId));
  const [origins, setOrigins] = useState({});
  // Start true so components can show a loading skeleton instead of flashing wrong content
  const [loading, setLoading] = useState(true);

  const currentVersionRef = useRef(0);
  const lastUserIdRef = useRef(userId);

  // ── Fetch evaluated config from server ────────────────────────────────────
  const fetchEvaluatedConfig = useCallback(async (forUserId) => {
    setLoading(true);
    try {
      const candidatePaths = [
        `/api/v1/section-control/evaluate/?_t=${Date.now()}`,
        `/api/v1/control-panel/evaluated-config/?_t=${Date.now()}`,
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
          // try next path
        }
      }

      const evalData = resData?.flags || resData?.config;
      if (evalData && typeof evalData === "object") {
        setConfig(evalData);
        setOrigins(resData.origins || {});
        // Cache so next page load is instant and flash-free
        setCachedConfig(forUserId ?? userId, evalData);
      }
    } catch (err) {
      console.warn("[FeatureControlContext] Server fetch failed, using cache:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Version check & sync ──────────────────────────────────────────────────
  const checkVersionAndSync = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/v1/section-control/version/?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.version && data.version > currentVersionRef.current) {
          currentVersionRef.current = data.version;
          fetchEvaluatedConfig(userId);
        }
      }
    } catch {}
  }, [fetchEvaluatedConfig, userId]);

  // ── React to user identity changes ────────────────────────────────────────
  // This is THE critical fix: when a different user logs in, immediately
  // load their cached config (no flash) then fetch fresh from server.
  useEffect(() => {
    if (userId !== lastUserIdRef.current) {
      lastUserIdRef.current = userId;

      if (userId === null) {
        // Logged out — reset to hard defaults (all hidden until re-login)
        setConfig({ ...HARD_DEFAULTS });
        setOrigins({});
        currentVersionRef.current = 0;
        setLoading(false);
      } else {
        // New user — load their cache immediately (no flash) then refresh from server
        setConfig(getCachedConfig(userId));
        currentVersionRef.current = 0;
        fetchEvaluatedConfig(userId);
      }
    }
  }, [userId, fetchEvaluatedConfig]);

  // ── Initial mount: fetch from server + set up listeners + polling ─────────
  useEffect(() => {
    // First load — fetch server config
    fetchEvaluatedConfig(userId);

    const handleUpdate = () => {
      currentVersionRef.current = 0;   // force re-fetch on next version check
      fetchEvaluatedConfig(userId);
    };

    // 1. BroadcastChannel: instant cross-tab update (same browser)
    let broadcastChannel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel("spr_section_control_channel");
        broadcastChannel.onmessage = handleUpdate;
      }
    } catch {}

    // 2. Auth change (login/logout from AuthContext)
    window.addEventListener("spr_auth_updated", handleUpdate);
    // 3. Admin saved new config in control panel
    window.addEventListener("spr_section_config_updated", handleUpdate);
    // 4. Window regains focus — re-check version
    window.addEventListener("focus", checkVersionAndSync);

    // 5. Page visibility change — re-check when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkVersionAndSync();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (broadcastChannel) { try { broadcastChannel.close(); } catch {} }
      window.removeEventListener("spr_auth_updated", handleUpdate);
      window.removeEventListener("spr_section_config_updated", handleUpdate);
      window.removeEventListener("focus", checkVersionAndSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── isFeatureEnabled: safe default is FALSE (hide until server confirms ON) ─
  const isFeatureEnabled = useCallback(
    (featureKey) => {
      if (!featureKey) return true;
      // While loading the very first time (no cache), hide everything
      if (loading && config[featureKey] === undefined) return false;
      return config[featureKey] !== undefined ? !!config[featureKey] : true;
    },
    [config, loading]
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
        refetchConfig: () => fetchEvaluatedConfig(userId),
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

// ─── FeatureGuard: hide section if disabled; show loading skeleton if loading ─
export function FeatureGuard({ featureKey, children, fallback = null }) {
  const { isFeatureEnabled, loading } = useFeatureControl();

  // While server config loads, render nothing (prevents flash of hidden content)
  if (loading) return null;

  if (!isFeatureEnabled(featureKey)) {
    if (fallback !== null) return fallback;
    return null;
  }

  return children;
}
