import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../utils/authService";
import { useAuth } from "./AuthContext";

// ─── Cache key for per-user evaluated config ────────────────────────────────
const getCacheKey = (userId: string | number | null) => `spr_evaluated_config_${userId || "anon"}_v4`;

export const HARD_DEFAULTS: Record<string, boolean> = {
  headerDate: true,
  studentSelect: true,
  sessionSelect: true,
  juzPageInput: true,
  mistakeTracker: true,
  stuckTracker: true,
  commentSection: true,
  actionButtons: true,
  pdfExport: true,

  // Navigation / Sidebar Features
  nav_dashboard: true,
  nav_institution: true,
  settings_institution: true,
  app_institutions: true,
  academic_branches: true,
  campus_profile: true,
  class_sections: true,
  class_period_slots: true,
  academic_periods: true,
  student_departments: true,
  student_classes: true,
  student_groups: true,
  sp_management: true,

  nav_student_management: true,
  student_roster: true,
  monthly_attendance_matrix: true,
  residential_attendance: true,
  student_attendance: true,
  student_gate_tracker: true,
  student_adhoc_headcount: true,
  student_quick_admission: true,
  student_admission: true,
  quran_hifz_tracker: true,

  // Academic Studies Features
  nav_academic_studies: true,
  academic_studies: true,
  daily_classroom: true,
  daily_lessons: true,
  recitation_adai: true,
  homework_tasks: true,

  // Examination & Result Management Features
  nav_examinations: true,
  examinations: true,
  exam_schedules: true,
  exam_mark_entry: true,
  exam_tabulation: true,
  exam_transcripts: true,
  exam_grading_rules: true,

  nav_staff_management: true,
  staff_roster: true,
  staff_onboarding: true,
  staff_management: true,

  nav_attendance_management: true,
  attendance_policies_slots: true,
  biometric_device_manager: true,
  institutional_calendar: true,
  institutional_tasks: true,

  nav_report_generator: true,
  report_builder: true,
  report_sessions_comments: true,
  report_history: true,
  report_copy_settings: true,

  nav_app_management: true,
  app_section_control: true,
  app_user_management: true,
  app_role_management: true,
  app_activity_analytics: true,
  app_role_invites: true,
  notification_management: true,

  nav_settings: true,
  settings_profile: true,
  settings_security: true,
  settings_datetime: true,
  settings_appearance: true,
  settings_language: true,
  settings_backup: true,
  nav_trash: true,

  nav_shortcuts: true,
  nav_app_guide: true,
  nav_about: true,
};

const getCachedConfig = (userId: string | number | null): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...HARD_DEFAULTS };
};

const setCachedConfig = (userId: string | number | null, config: Record<string, boolean>) => {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(config));
  } catch {}
};

export interface FeatureControlContextType {
  config: Record<string, boolean>;
  origins: Record<string, string>;
  loading: boolean;
  isFeatureEnabled: (featureKey?: string) => boolean;
  isSectionEnabled: (sectionKey?: string) => boolean;
  getFeatureOrigin: (featureKey?: string) => string;
  refetchConfig: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const FeatureControlContext = createContext<FeatureControlContextType>({
  config: {},
  origins: {},
  loading: true,
  isFeatureEnabled: (_featureKey?: string) => true,
  isSectionEnabled: (_sectionKey?: string) => true,
  getFeatureOrigin: (_featureKey?: string) => "GLOBAL",
  refetchConfig: async () => {},
});

export function FeatureControlProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth() as any;
  const userId = user?.id ?? null;

  const [config, setConfig] = useState<Record<string, boolean>>(() => getCachedConfig(userId));
  const [origins, setOrigins] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const currentVersionRef = useRef<number>(0);
  const lastUserIdRef = useRef<string | number | null>(userId);

  // ── Fetch evaluated config from server ────────────────────────────────────
  const fetchEvaluatedConfig = useCallback(async (forUserId: string | number | null) => {
    setLoading(true);
    try {
      const candidatePaths = [
        `/api/v1/section-control/evaluate/?_t=${Date.now()}`,
        `/api/v1/control-panel/evaluated-config/?_t=${Date.now()}`,
      ];

      let resData: any = null;
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
  useEffect(() => {
    if (userId !== lastUserIdRef.current) {
      lastUserIdRef.current = userId;

      if (userId === null) {
        setConfig({ ...HARD_DEFAULTS });
        setOrigins({});
        currentVersionRef.current = 0;
        setLoading(false);
      } else {
        setConfig(getCachedConfig(userId));
        currentVersionRef.current = 0;
        fetchEvaluatedConfig(userId);
      }
    }
  }, [userId, fetchEvaluatedConfig]);

  // ── Initial mount: fetch from server + set up listeners + polling ─────────
  useEffect(() => {
    fetchEvaluatedConfig(userId);

    const handleUpdate = () => {
      currentVersionRef.current = 0;
      fetchEvaluatedConfig(userId);
    };

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel("spr_section_control_channel");
        broadcastChannel.onmessage = handleUpdate;
      }
    } catch {}

    window.addEventListener("spr_auth_updated", handleUpdate);
    window.addEventListener("spr_section_config_updated", handleUpdate);
    window.addEventListener("focus", checkVersionAndSync);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkVersionAndSync();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch {}
      }
      window.removeEventListener("spr_auth_updated", handleUpdate);
      window.removeEventListener("spr_section_config_updated", handleUpdate);
      window.removeEventListener("focus", checkVersionAndSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchEvaluatedConfig, checkVersionAndSync, userId]);

  // ── isFeatureEnabled: checks config, falls back to HARD_DEFAULTS or true ──
  const isFeatureEnabled = useCallback(
    (featureKey?: string): boolean => {
      if (!featureKey) return true;
      if (config && config[featureKey] !== undefined) return !!config[featureKey];
      if (HARD_DEFAULTS[featureKey] !== undefined) return !!HARD_DEFAULTS[featureKey];
      return true;
    },
    [config]
  );

  const getFeatureOrigin = useCallback(
    (featureKey?: string): string => {
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

export function useFeatureControl(): FeatureControlContextType {
  const context = useContext(FeatureControlContext);
  if (!context) {
    throw new Error("useFeatureControl must be used within a FeatureControlProvider");
  }
  return context;
}

// ─── FeatureGuard: hide section if disabled; show loading skeleton if loading ─
export function FeatureGuard({
  featureKey,
  sectionKey,
  children,
  fallback = null,
}: {
  featureKey?: string;
  sectionKey?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isFeatureEnabled, loading } = useFeatureControl();

  if (loading) return null;

  const key = sectionKey || featureKey;
  if (!isFeatureEnabled(key)) {
    if (fallback !== null) return <>{fallback}</>;
    return null;
  }

  return <>{children}</>;
}
