import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
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

  // 1. Dashboard
  nav_dashboard: true,

  // 2. Academy Structure
  nav_institution: true,
  settings_institution: true,
  campus_profile: true,
  campus_tab_academies: true,
  campus_tab_branches: true,
  campus_tab_academic_years: true,
  campus_tab_departments: true,
  student_classes: true,
  classes_tab_classes: true,
  classes_tab_sections: true,
  classes_tab_groups: true,
  class_period_slots: true,
  period_tab_slots: true,
  period_tab_routines: true,
  period_tab_curriculum: true,
  academy_calendar_events: true,
  calendar_tab_working_hours: true,
  calendar_tab_events: true,
  calendar_tab_agenda: true,
  residential_quarters: true,
  residential_tab_buildings: true,
  residential_tab_rooms: true,
  residential_tab_beds: true,
  residential_tab_supervisors: true,

  // 3. Daily Classroom
  nav_academic_studies: true,
  monthly_attendance_matrix: true,
  lesson_management: true,
  lesson_tab_daily_lessons: true,
  lesson_tab_assessments: true,
  lesson_tab_analytics: true,
  progress_management: true,
  progress_tab_daily_progress: true,
  progress_tab_reports: true,
  progress_tab_analytics: true,

  // 4. Examination & Results
  nav_examinations: true,
  exam_schedules: true,
  exam_tab_details: true,
  exam_tab_routine: true,
  exam_tab_invigilation: true,
  exam_hall_logistics: true,
  hall_tab_admit_cards: true,
  hall_tab_seat_plan: true,
  hall_tab_attendance_sheets: true,
  exam_tabulation: true,
  marksheet_tab_entry: true,
  marksheet_tab_ledger: true,
  marksheet_tab_transcripts: true,

  // 5. Student
  nav_student_management: true,
  student_roster: true,
  residential_attendance: true,
  student_admission: true,

  // 6. Staff Management
  nav_staff_management: true,
  staff_roster: true,
  teacher_class_attendance: true,
  staff_daily_attendance: true,
  staff_onboarding: true,

  // 7. Print Studio
  nav_print_studio: true,

  // 8. Finance & Accounts
  nav_finance: true,
  finance_dashboard: true,
  finance_student_billing: true,
  finance_staff_payroll: true,
  finance_general_ledger: true,
  finance_reports: true,

  // 9. App Management
  nav_app_management: true,
  app_section_control: true,
  app_user_management: true,
  app_role_management: true,
  app_activity_analytics: true,
  notification_management: true,

  // 10. Settings
  nav_settings: true,
  settings_profile: true,
  attendance_policies_slots: true,
  settings_security: true,
  settings_personalize: true,
  personalize_tab_appearance: true,
  personalize_tab_datetime: true,
  personalize_tab_language: true,
  settings_backup: true,
  admin_tools: true,

  // 11. System & Standalone
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
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !Boolean(localStorage.getItem(getCacheKey(userId)));
    } catch {
      return false;
    }
  });

  const currentVersionRef = useRef<number>(0);
  const lastUserIdRef = useRef<string | number | null>(userId);

  // ── Fetch evaluated config from server ────────────────────────────────────
  const fetchEvaluatedConfig = useCallback(async (forUserId: string | number | null) => {
    const hasCached = (() => {
      try {
        return Boolean(localStorage.getItem(getCacheKey(forUserId ?? userId)));
      } catch {
        return false;
      }
    })();
    if (!hasCached) {
      setLoading(true);
    }
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

  const contextValue = useMemo<FeatureControlContextType>(
    () => ({
      config,
      origins,
      loading,
      isFeatureEnabled,
      isSectionEnabled: isFeatureEnabled,
      getFeatureOrigin,
      refetchConfig: () => fetchEvaluatedConfig(userId),
    }),
    [
      config,
      origins,
      loading,
      isFeatureEnabled,
      getFeatureOrigin,
      fetchEvaluatedConfig,
      userId,
    ]
  );

  return (
    <FeatureControlContext.Provider value={contextValue}>
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
