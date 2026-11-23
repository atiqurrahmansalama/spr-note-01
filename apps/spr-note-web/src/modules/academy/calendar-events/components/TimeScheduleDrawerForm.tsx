import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomInput from "../../../../components/ui/CustomInput";
import CustomButton from "../../../../components/ui/CustomButton";
import TemplateTextarea from "../../../../components/ui/TemplateTextarea";
import {
  SaveIcon,
  ChevronIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ShapesIcon,
  UsersIcon,
} from "../../../../components/ui/Icons";
import ReusableCalendar from "../../../../components/common/ReusableCalendar";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  calendarImpactScopesStore,
  calendarWorkingSchedulesStore,
  masterCalendarStore,
  calendarSettings,
  getDynamicPriorityRankOptions,
} from "../../../../utils/localStore";
import { useTenant } from "../../../../context/TenantContext";
import { useToast } from "../../../../context/ToastContext";
import { useRightSidebar } from "../../../../context/RightSidebarContext";
import { fetchWithAuth } from "../../../../utils/authService";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../../../components/layout";
import { EVENT_COLORS, EVENT_COLOR_CATEGORIES, resolveCanonicalEventColor } from "../constants/eventColors";
import { useCalendarTranslation } from "../locales";

export { EVENT_COLORS };

const CATEGORY_OPTIONS = [
  { value: "WORKING_HOURS", label: "Add a Working Schedule" },
  { value: "ACADEMIC_EVENT", label: "Add an Academic Event" },
];

import {
  CalendarDateTimeSection,
  InlineTimePicker,
  UntilWhenPicker,
  formatTime12,
} from "./common/CalendarDateTimeSection";

export { InlineTimePicker, UntilWhenPicker, formatTime12 };

const COLOR_GROUPS = [
  'Emerald & Nature',
  'Ocean & Sky',
  'Purple & Royal',
  'Rose & Coral',
  'Amber & Earth',
] as const;

export function EventColorPickerDropdown({ value, onChange }) {
  const { t } = useCalendarTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const canonicalId = resolveCanonicalEventColor(value, EVENT_COLORS[0].id);
  const selectedColor = useMemo(() => {
    return EVENT_COLORS.find((c) => c.id === canonicalId) || EVENT_COLORS[0];
  }, [canonicalId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Auto-scroll into view when opened so palette is never clipped or hidden at drawer bottom
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
          {t("eventColor", "Event Color")}
        </label>
      </div>

      {/* Selected Event Color Trigger Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-0 ring-0 transition cursor-pointer text-left focus:outline-none shadow-xs ${
          isOpen
            ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25"
            : "theme-bg-surface hover:theme-bg-elevated/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-5 h-5 rounded-full shrink-0 shadow-xs border-0"
            style={{ backgroundColor: selectedColor.hex }}
          />
          <span className="text-xs font-semibold theme-text-primary truncate">
            {selectedColor.label}
          </span>
          {selectedColor.category && (
            <span className="hidden @[440px]:inline-block text-[9px] px-2 py-0.5 rounded-full theme-bg-app border-0 theme-text-secondary truncate">
              {selectedColor.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg theme-bg-app border-0 theme-text-secondary">
            {isOpen ? t("close", "Close") : t("chooseColor", "Change")}
          </span>
          <ChevronIcon isOpen={isOpen} className="w-3.5 h-3.5 theme-text-secondary" />
        </div>
      </button>

      {/* Borderless Curated Enterprise Palette Dropdown */}
      {isOpen && (
        <div className="mt-2 p-3.5 rounded-3xl theme-bg-surface border-0 ring-0 shadow-lg animate-fade-in space-y-3.5 z-30">
          {/* Grouped by Color Family with Clean Small Section Headers */}
          <div className="space-y-3.5 max-h-72 overflow-y-auto scrollbar-none pr-0.5">
            {COLOR_GROUPS.map((cat) => {
              const colorsInCat = EVENT_COLORS.filter((c) => c.category === cat);
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary px-1">
                    {cat}
                  </div>
                  <div className="grid grid-cols-2 @[560px]:grid-cols-3 gap-1.5">
                    {colorsInCat.map((col) => {
                      const isSelected = selectedColor.id === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            onChange(col.id);
                            setIsOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-2xl border-0 ring-0 text-left transition cursor-pointer select-none min-w-0 ${
                            isSelected
                              ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 theme-accent font-bold"
                              : "theme-bg-app hover:theme-bg-elevated/60 theme-text-primary"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0 shadow-xs border-0"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span className="text-[11px] font-medium truncate leading-tight flex-1 min-w-0">
                            {col.label}
                          </span>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                              <CheckIcon className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function resolveEventFormColor(
  evt: any,
  targetCategory?: string,
  kinds: any[] = [],
  types: any[] = []
): string {
  if (evt?.color) {
    return resolveCanonicalEventColor(evt.color);
  }
  const matchedType = (types || []).find(
    (t) => t.id === evt?.eventTypeId || t.name === evt?.title || t.code === evt?.code
  );
  const rawType = matchedType?.type || evt?.type || evt?.event_type || evt?.kind || evt?.category || targetCategory;
  if (rawType) {
    const matchedKind = (kinds || []).find(
      (k) => k.value === rawType || k.id === rawType || String(k.value).toUpperCase() === String(rawType).toUpperCase()
    );
    if (matchedKind?.color) {
      return resolveCanonicalEventColor(matchedKind.color);
    }
  }
  if (rawType === "WORKING_HOURS" || targetCategory === "WORKING_HOURS") return "blueberry";
  if (rawType === "HOLIDAY") return "radicchio";
  if (rawType === "EXAM") return "flamingo";
  if (rawType === "MEETING") return "peacock";
  if (rawType === "ACTIVITY") return "amethyst";
  if (rawType === "GENERAL") return "cocoa";
  return "eucalyptus";
}

export interface TimeScheduleFormData {
  title: string;
  category: string;
  type?: string;
  eventTypeId?: string;
  audience: string[];
  impacts: string[];
  priorityRank: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  repeats: boolean;
  repeatDays: number[];
  frequency: string;
  until: string;
  untilDate: string;
  isFullDay: boolean;
  description: string;
  color: string;
  [key: string]: any;
}

export interface EventTitleOption {
  id?: string;
  value: string;
  label: string;
  typeLabel?: string;
  category: string;
  type?: string;
  color?: string;
  repeats?: boolean;
  description?: string;
}

export default function TimeScheduleDrawerForm({
  event = null,
  initialDate = '',
  defaultCategory = "WORKING_HOURS",
  formId = "time-schedule-drawer-form",
  onSave = null,
  onSaveSuccess = null,
  onCancel = null,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast() as any;
  const { t } = useCalendarTranslation();
  const navigate = useNavigate();
  const { closeDrawer } = useRightSidebar();
  const [validationErrors, setValidationErrors] = useState<{ title?: string; startDate?: string }>({});
  const [eventTypes, setEventTypes] = useState(() => calendarEventTypesStore.getEventTypes(activeTenantId));
  const [eventKinds, setEventKinds] = useState(() => calendarEventKindsStore.getKinds(activeTenantId));
  const [workingSchedules, setWorkingSchedules] = useState(() => calendarWorkingSchedulesStore.getSchedules(activeTenantId));
  const [impactScopes, setImpactScopes] = useState(() => calendarImpactScopesStore.getScopes(activeTenantId));
  const [availableRoles, setAvailableRoles] = useState(() => {
    try {
      const key = activeTenantId ? `spr_local_roles_${activeTenantId}_v1` : "spr_local_roles_v1";
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((r) => {
            const code = String(r.code || "").toUpperCase();
            const name = String(r.name || "").toLowerCase();
            return !code.includes("SUPER") && !name.includes("super") && !r.is_superadmin;
          });
        }
      }
    } catch {
      // ignore
    }
    return [
      { code: "TEACHER", name: "Teachers & Faculty" },
      { code: "STUDENT", name: "Students" },
      { code: "GUARDIAN", name: "Guardians & Parents" },
      { code: "STAFF", name: "General Staff" },
      { code: "ADMIN", name: "Administration" },
    ];
  });

  // Fetch dynamic types, kinds, working schedules, impact scopes, and user roles from backend API / active institution
  useEffect(() => {
    let isMounted = true;
    const loadTypes = () => {
      const types = calendarEventTypesStore.getEventTypes(activeTenantId);
      const kinds = calendarEventKindsStore.getKinds(activeTenantId);
      const scopes = calendarImpactScopesStore.getScopes(activeTenantId);
      const schedules = calendarWorkingSchedulesStore.getSchedules(activeTenantId);
      if (isMounted) {
        setEventTypes(types || []);
        setEventKinds(kinds || []);
        setImpactScopes(scopes || []);
        setWorkingSchedules(schedules || []);
      }
    };
    loadTypes();

    const fetchRoles = async () => {
      try {
        const tenantQuery = activeTenantId ? `?tenant_id=${encodeURIComponent(activeTenantId)}` : "";
        let res = await fetchWithAuth(`/api/v1/roles/${tenantQuery}`);
        if (!res.ok) res = await fetchWithAuth(`/api/roles/${tenantQuery}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          if (isMounted && list.length > 0) {
            // Strict Tenant Scoping & Exclusion of Super Admin (Tenant Isolation)
            const filtered = list.filter((r: any) => {
              const code = String(r.code || "").toUpperCase();
              const name = String(r.name || "").toLowerCase();
              if (code.includes("SUPER") || name.includes("super") || r.is_superadmin) {
                return false;
              }
              if (r.tenant_id && activeTenantId && String(r.tenant_id) !== String(activeTenantId)) {
                return false;
              }
              return true;
            });

            if (filtered.length > 0) {
              setAvailableRoles(filtered);
              const key = activeTenantId ? `spr_local_roles_${activeTenantId}_v1` : "spr_local_roles_v1";
              localStorage.setItem(key, JSON.stringify(filtered));
              return;
            }
          }
        }
      } catch {
        // Fallback to local store or defaults
      }
    };
    fetchRoles();

    window.addEventListener("spr_calendar_event_types_updated", loadTypes);
    window.addEventListener("spr_calendar_event_kinds_updated", loadTypes);
    window.addEventListener("spr_calendar_working_schedules_updated", loadTypes);
    window.addEventListener("spr_calendar_impact_scopes_updated", loadTypes);
    return () => {
      isMounted = false;
      window.removeEventListener("spr_calendar_event_types_updated", loadTypes);
      window.removeEventListener("spr_calendar_event_kinds_updated", loadTypes);
      window.removeEventListener("spr_calendar_working_schedules_updated", loadTypes);
      window.removeEventListener("spr_calendar_impact_scopes_updated", loadTypes);
    };
  }, [activeTenantId]);

  const activeScopes = useMemo(() => {
    return (impactScopes || []).filter((s) => s.is_active !== false);
  }, [impactScopes]);

  // Dynamic Audience Options based strictly on the active academy's roles (Zero Super Admin)
  const audienceOptions = useMemo(() => {
    const opts = [
      { value: "ALL", label: "All Roles" },
    ];
    availableRoles.forEach((r) => {
      const code = r.code || r.name;
      const rawName = r.name || r.code;
      const upperCode = String(code || "").toUpperCase();
      const lowerName = String(rawName || "").toLowerCase();

      // Zero-Trust Security: Ensure Super Admin is never exposed
      if (upperCode.includes("SUPER") || lowerName.includes("super") || r.is_superadmin) {
        return;
      }

      if (code && !opts.some((o) => o.value === code)) {
        // Clean role name without any bracket data (e.g. "Student (STUDENT)" -> "Student")
        const cleanName = String(rawName).replace(/\s*\([^)]*\)/g, "").trim() || code;
        opts.push({
          value: code,
          label: cleanName,
        });
      }
    });
    return opts;
  }, [availableRoles]);

  // Dynamic Impact Options based on Developer Tools System Impact Scopes
  const impactOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; badge: string; description?: string }> = [
      { value: "ALL", label: "All Integrations (Entire System)", badge: "ALL", description: "" },
    ];
    const active = (impactScopes || []).filter((s: any) => s.is_active !== false);
    active.forEach((s: any) => {
      const code = s.id || s.code;
      const label = s.name || s.label || s.code;
      const badge = s.badge || s.code || s.name;
      if (code && !opts.some((o) => o.value === code)) {
        opts.push({
          value: code,
          label: label,
          badge: badge,
          description: s.description || "",
        });
      }
    });
    return opts;
  }, [impactScopes]);

  const normalizeImpacts = (rawList, scopes = []) => {
    if (!Array.isArray(rawList)) return ["ALL"];
    if (rawList.length === 0) return ["ALL"];
    if (rawList.includes("ALL")) return ["ALL"];
    return rawList.map((val) => {
      const str = String(val).toLowerCase();
      const matched = (scopes || []).find((s) => s.id === val || s.code === val || (s.code && s.code.toLowerCase() === str) || (s.id && s.id.toLowerCase() === str));
      return matched ? (matched.id || matched.code) : val;
    });
  };

  const calendarEvents = useMemo(() => {
    return masterCalendarStore.getEvents(activeTenantId) || [];
  }, [activeTenantId]);

  const [formData, setFormData] = useState<TimeScheduleFormData>(() => {
    if (event) {
      let initialAudience = ["ALL"];
      if (Array.isArray(event.audience)) {
        initialAudience = event.audience;
      } else if (typeof event.audience === "string" && event.audience.trim()) {
        initialAudience = event.audience.split(",").map((s) => s.trim()).filter(Boolean);
      }

      let rawImpacts = ["ALL"];
      if (event.impacts) {
        if (Array.isArray(event.impacts)) {
          rawImpacts = event.impacts;
        } else if (typeof event.impacts === "string" && event.impacts.trim()) {
          rawImpacts = event.impacts.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      const initialImpacts = normalizeImpacts(rawImpacts, impactScopes);
      const initialColor = resolveEventFormColor(event, event.category || defaultCategory, eventKinds, eventTypes);

      return {
        title: event.title || "",
        category: event.category || defaultCategory,
        type: event.type || (event.category === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC"),
        audience: initialAudience.length > 0 ? initialAudience : ["ALL"],
        impacts: initialImpacts.length > 0 ? initialImpacts : ["ALL"],
        priorityRank: event.priorityRank !== undefined && event.priorityRank !== null
          ? Number(event.priorityRank)
          : (event.rank !== undefined ? Number(event.rank) : 1),
        startDate: event.startDate || new Date().toISOString().split("T")[0],
        endDate: event.endDate || "",
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "17:00",
        timezone: event.timezone || (calendarSettings.getTimezone ? calendarSettings.getTimezone() : "UTC"),
        repeats: Boolean(event.repeats),
        repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
        frequency: event.frequency || "WEEKLY",
        until: event.until || (event.endDate ? "DATE" : "ONGOING"),
        untilDate: event.untilDate || event.endDate || "",
        isFullDay: Boolean(event.isFullDay || (!event.startTime && !event.endTime)),
        description: event.description || "",
        color: initialColor,
      };
    }
    const initialEventsList = masterCalendarStore.getEvents(activeTenantId) || [];
    const initialTitle = defaultCategory === "WORKING_HOURS" 
      ? (workingSchedules?.[0]?.name || "Morning Working Session") 
      : (eventTypes?.[0]?.name || "Mid-Term Examination");
    const initialColor = resolveEventFormColor({ title: initialTitle }, defaultCategory, eventKinds, eventTypes);

    return {
      title: initialTitle,
      category: defaultCategory,
      type: defaultCategory === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC",
      audience: ["ALL"],
      impacts: ["ALL"],
      priorityRank: initialEventsList.length + 1,
      startDate: initialDate || new Date().toISOString().split("T")[0],
      endDate: "",
      startTime: "09:00",
      endTime: "12:30",
      timezone: calendarSettings.getTimezone ? calendarSettings.getTimezone() : "UTC",
      repeats: false,
      repeatDays: [0, 1, 2, 3, 4],
      frequency: "WEEKLY",
      until: "ONGOING",
      untilDate: "",
      isFullDay: false,
      description: "",
      color: initialColor,
    };
  });

  const priorityRankOptions = useMemo(() => {
    return getDynamicPriorityRankOptions(calendarEvents, event?.id, formData.priorityRank);
  }, [calendarEvents, event?.id, formData.priorityRank]);

  const prevEventIdRef = useRef(event?.id);
  const prevInitialDateRef = useRef(initialDate);

  // Re-sync form state when event or target initial date changes
  useEffect(() => {
    if (event) {
      if (prevEventIdRef.current !== event.id || prevInitialDateRef.current !== initialDate) {
        prevEventIdRef.current = event.id;
        prevInitialDateRef.current = initialDate;

        let initialAudience = ["ALL"];
        if (Array.isArray(event.audience)) {
          initialAudience = event.audience;
        } else if (typeof event.audience === "string" && event.audience.trim()) {
          initialAudience = event.audience.split(",").map((s) => s.trim()).filter(Boolean);
        }

        let rawImpacts = ["ALL"];
        if (event.impacts) {
          if (Array.isArray(event.impacts)) {
            rawImpacts = event.impacts;
          } else if (typeof event.impacts === "string" && event.impacts.trim()) {
            rawImpacts = event.impacts.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }

        const initialImpacts = normalizeImpacts(rawImpacts, impactScopes);
        const initialColor = resolveEventFormColor(event, event.category || defaultCategory, eventKinds, eventTypes);

        setFormData({
          title: event.title || "",
          category: event.category || defaultCategory,
          audience: initialAudience.length > 0 ? initialAudience : ["ALL"],
          impacts: initialImpacts.length > 0 ? initialImpacts : ["ALL"],
          priorityRank: event.priorityRank !== undefined && event.priorityRank !== null
            ? Number(event.priorityRank)
            : (event.rank !== undefined ? Number(event.rank) : 1),
          startDate: event.startDate || initialDate || new Date().toISOString().split("T")[0],
          endDate: event.endDate || "",
          startTime: event.startTime || "09:00",
          endTime: event.endTime || "17:00",
          timezone: event.timezone || (calendarSettings.getTimezone ? calendarSettings.getTimezone() : "UTC"),
          repeats: Boolean(event.repeats),
          repeatDays: event.repeatDays || [0, 1, 2, 3, 4],
          frequency: event.frequency || "WEEKLY",
          until: event.until || (event.endDate ? "DATE" : "ONGOING"),
          untilDate: event.untilDate || event.endDate || "",
          isFullDay: Boolean(event.isFullDay || (!event.startTime && !event.endTime)),
          description: event.description || "",
          color: initialColor,
        });
      }
    } else {
      // Add mode: sync initialDate if it changes
      if (initialDate && prevInitialDateRef.current !== initialDate) {
        prevInitialDateRef.current = initialDate;
        setFormData((prev) => ({
          ...prev,
          startDate: initialDate,
        }));
      }
    }
  }, [event, initialDate, defaultCategory, impactScopes, eventKinds, eventTypes]);

  const eventTitleOptions = useMemo<EventTitleOption[]>(() => {
    const isWorkingHoursCategory = formData.category === "WORKING_HOURS";

    if (isWorkingHoursCategory) {
      const activeSchedules = (workingSchedules || []).filter((ws: any) => ws.is_active !== false);
      const baseList = activeSchedules.length > 0 ? activeSchedules : [
        { id: "ws-morning", name: "Morning Working Session", description: "Standard morning operational shifts and faculty hours" },
        { id: "ws-afternoon", name: "Afternoon Working Session", description: "Staff & faculty afternoon working hours" },
        { id: "ws-evening", name: "Evening Support Session", description: "Evening tutorial, revision, and support hours" },
      ];

      const opts: EventTitleOption[] = baseList.map((ws: any) => ({
        id: ws.id,
        value: ws.name,
        label: ws.name,
        typeLabel: "Working Hours",
        category: "WORKING_HOURS",
        type: "WORKING_HOURS",
        color: resolveCanonicalEventColor(ws.color, "blueberry"),
        repeats: false,
        description: ws.description || "",
      }));

      if (formData.title && !opts.some((o) => o.value === formData.title)) {
        opts.unshift({
          id: formData.title,
          value: formData.title,
          label: formData.title,
          typeLabel: "Working Hours",
          category: "WORKING_HOURS",
          type: "WORKING_HOURS",
          color: resolveCanonicalEventColor(formData.color, "blueberry"),
          repeats: false,
          description: "",
        });
      }
      return opts;
    }

    // Dynamic Academic Event Categories from Developer Tools
    const kindsMap: Record<string, string> = {
      ACADEMIC: "Academic",
      HOLIDAY: "Holiday",
      EXAM: "Exam",
      MEETING: "Meeting",
      ACTIVITY: "Sports & Cultural",
      GENERAL: "General",
    };
    const kindsColorMap: Record<string, string> = {
      ACADEMIC: "eucalyptus",
      HOLIDAY: "radicchio",
      EXAM: "flamingo",
      MEETING: "peacock",
      ACTIVITY: "amethyst",
      GENERAL: "cocoa",
    };

    (eventKinds || []).forEach((k: any) => {
      const key = k.value || k.id;
      if (key) {
        kindsMap[key] = k.label || k.name || key;
        if (k.color) kindsColorMap[key] = resolveCanonicalEventColor(k.color);
      }
    });

    const activeEvents = (eventTypes || []).filter((et: any) => et.is_active !== false);
    const baseList = activeEvents.length > 0 ? activeEvents : [
      { id: "et-midterm", name: "Mid-Term Examination", type: "EXAM", description: "Formal mid-term evaluation & exam schedule" },
      { id: "et-final", name: "Final Term Examination", type: "EXAM", description: "Annual and final institutional examinations" },
      { id: "et-weekly", name: "Weekly Holiday", type: "HOLIDAY", description: "Standard weekend institutional recess" },
      { id: "et-eid", name: "Eid Vacation", type: "HOLIDAY", description: "Special holiday closure for holy Eid celebration" },
      { id: "et-sports", name: "Annual Sports & Cultural Day", type: "ACTIVITY", description: "Annual athletic competitions and campus gathering" },
      { id: "et-ptm", name: "Parent-Teacher Conference", type: "MEETING", description: "Quarterly progress review meetings with guardians" },
      { id: "et-special", name: "Special Academic Event", type: "ACADEMIC", description: "Institutional conferences, orientation, and symposiums" },
    ];

    const opts: EventTitleOption[] = baseList.map((et: any) => {
      const rawType = et.type || et.category || "ACADEMIC";
      const typeLabel = kindsMap[rawType] || (rawType ? rawType.replace(/_/g, " ") : "Academic Event");
      const dynamicColor = resolveCanonicalEventColor(kindsColorMap[rawType], "eucalyptus");

      return {
        id: et.id,
        value: et.name,
        label: et.name,
        typeLabel,
        category: "ACADEMIC_EVENT",
        type: rawType,
        color: dynamicColor,
        repeats: false,
        description: et.description || "",
      };
    });

    if (formData.title && !opts.some((o) => o.value === formData.title)) {
      const currentKind = (eventKinds || []).find(
        (k: any) => k.value === formData.type || k.id === formData.type || k.value === formData.category || k.id === formData.category
      );
      opts.unshift({
        id: formData.title,
        value: formData.title,
        label: formData.title,
        typeLabel: currentKind?.label || (formData.category === "WORKING_HOURS" ? "Working Hours" : "Academic Event"),
        category: formData.category,
        type: formData.type || (formData.category === "WORKING_HOURS" ? "WORKING_HOURS" : "ACADEMIC"),
        color: resolveCanonicalEventColor(formData.color || currentKind?.color, "eucalyptus"),
        repeats: false,
        description: "",
      });
    }
    return opts;
  }, [workingSchedules, eventTypes, eventKinds, formData.title, formData.category, formData.type, formData.color]);

  const isRecurringOrMultiDay = Boolean(
    event && (event.repeats || (event.endDate && event.endDate !== event.startDate))
  );
  const effectiveTargetDate = initialDate || (event ? event.startDate : formData.startDate) || new Date().toISOString().split("T")[0];
  const [editScope, setEditScope] = useState("ALL_EVENTS"); // "ALL_EVENTS" | "THIS_EVENT" | "THIS_AND_FOLLOWING"

  const editScopeOptions = useMemo(() => {
    return [
      {
        value: "THIS_EVENT",
        label: `This day only (${effectiveTargetDate})`,
        description: "Applies only to this specific occurrence. Other days remain untouched.",
      },
      {
        value: "THIS_AND_FOLLOWING",
        label: `This and all following days (from ${effectiveTargetDate})`,
        description: "Preserves earlier historical records and applies modifications to future dates.",
      },
      {
        value: "ALL_EVENTS",
        label: "Entire recurring schedule series",
        description: "Applies changes to all past, present, and future recurring dates in this schedule.",
      },
    ];
  }, [effectiveTargetDate]);

  const toggleRepeatDay = (dayIndex) => {
    setFormData((prev) => {
      const days = prev.repeatDays || [];
      if (days.includes(dayIndex)) {
        return { ...prev, repeatDays: days.filter((d) => d !== dayIndex) };
      } else {
        return { ...prev, repeatDays: [...days, dayIndex].sort() };
      }
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const nextErrors: { title?: string; startDate?: string } = {};
    if (!formData.title.trim()) {
      nextErrors.title = t("titleRequiredError", "Please enter or select a schedule or event title.");
    }
    if (!formData.startDate) {
      nextErrors.startDate = t("startDateRequiredError", "Please specify a start date.");
    }

    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      showToast(nextErrors.title || nextErrors.startDate, "warning");
      return;
    }

    setValidationErrors({});

    const audienceString = Array.isArray(formData.audience)
      ? (formData.audience.length === 0 ? "ALL" : formData.audience.join(", "))
      : (formData.audience || "ALL");

    const resolvedColor = resolveCanonicalEventColor(
      formData.color || resolveEventFormColor(formData, formData.category, eventKinds, eventTypes)
    );

    const payload = {
      ...formData,
      color: resolvedColor,
      priorityRank: Number(formData.priorityRank) || 1,
      audience: audienceString,
      impacts: Array.isArray(formData.impacts) ? formData.impacts : (formData.impacts ? [formData.impacts] : ["ALL"]),
      id: event ? event.id : undefined,
      targetDate: effectiveTargetDate,
      editScope: isRecurringOrMultiDay ? editScope : "ALL_EVENTS",
      endDate: formData.until === "DATE" ? (formData.untilDate || formData.endDate) : "",
      startTime: formData.isFullDay ? "" : formData.startTime,
      endTime: formData.isFullDay ? "" : formData.endTime,
    };

    if (onSave) {
      onSave(payload);
    } else if (onSaveSuccess) {
      onSaveSuccess(payload);
    }
  };

  const isWorkingHours = formData.category === "WORKING_HOURS";
  const scheduleOrEventLabel = isWorkingHours
    ? t("workingSchedule", "Working Schedule / Shift")
    : t("academicEvent", "Academic Event");

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form id={formId} onSubmit={handleSubmit} className="space-y-6 pt-2 pb-6 @container">
        {/* ─── 1. Schedule Information Section ─── */}
        <DrawerSection
          title={isWorkingHours ? t("workingScheduleInformation", "Working Schedule Information") : t("eventInformation", "Event Information")}
          icon={UsersIcon}
          variant="streamlined"
        >
          {/* Schedule/Event Field: TemplateTextarea for Working Hours, CustomSelect for Academic Events */}
          <div>
            {isWorkingHours ? (
              <TemplateTextarea
                label={t("workingSchedule", "Working Schedule / Shift")}
                value={formData.title}
                onChange={(val: string) => {
                  setValidationErrors((prev) => ({ ...prev, title: undefined }));
                  setFormData((prev) => ({ ...prev, title: val }));
                }}
                placeholder={t("enterWorkingSchedule", "Enter working schedule / shift title or select template...")}
                rows={2}
                category="WORKING_HOURS"
                namespace="working_schedules"
                initialTemplates={[
                  "Morning Working Session",
                  "Afternoon Working Session",
                  "Evening Support Session",
                  "Night Study & Dormitory Supervision",
                  "Full-Day Administrative Shift",
                  "Weekend Operations & Caretaking",
                ]}
                required={true}
                error={validationErrors.title}
              />
            ) : (
              <CustomSelect
                label={scheduleOrEventLabel}
                value={formData.title}
                onChange={(val) => {
                  const matched = eventTitleOptions.find((o) => o.value === val);
                  setValidationErrors((prev) => ({ ...prev, title: undefined }));
                  if (matched) {
                    setFormData((prev) => ({
                      ...prev,
                      title: matched.value,
                      type: matched.type,
                      category: matched.category,
                      color: matched.color ? resolveCanonicalEventColor(matched.color, prev.color) : prev.color,
                      repeats: matched.repeats !== undefined ? matched.repeats : prev.repeats,
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, title: val }));
                  }
                }}
                options={eventTitleOptions}
                placeholder={t("selectAcademicEvent", "Select Academic Event...")}
                searchable={false}
                showDescription={false}
                showBadge={true}
                onActionClick={() => {
                  if (closeDrawer) closeDrawer();
                  navigate("/institution-settings/event-types");
                }}
                actionLabel={t("manageTypes", "Manage Types")}
                actionTitle={t("manageEventTypes", "Manage Schedule & Event Types in Institution Settings")}
                error={validationErrors.title}
              />
            )}
          </div>

          {/* Target Audience & System Impact Multi-Select */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label={t("targetAudience", "Target Audience (Roles)")}
                multiple={true}
                value={formData.audience}
                onChange={(val) => setFormData({ ...formData, audience: val })}
                options={audienceOptions}
                placeholder={t("targetAudience", "Select Target Roles...")}
                showBadge={false}
                showDescription={false}
              />
            </div>

            <div>
              <CustomSelect
                label={t("impacts", "System Impacts")}
                multiple={true}
                value={formData.impacts}
                onChange={(val) => setFormData({ ...formData, impacts: val })}
                options={impactOptions}
                placeholder={t("impacts", "Select Impacted Modules...")}
                showBadge={false}
                showDescription={false}
              />
            </div>
          </div>

          {/* Priority & Precedence Rank */}
          <div>
            <CustomSelect
              label={t("priority", "Priority")}
              value={formData.priorityRank || 1}
              onChange={(val) => setFormData({ ...formData, priorityRank: Number(val) })}
              options={priorityRankOptions}
              placeholder={t("priority", "Select Priority Rank...")}
              showBadge={false}
              showDescription={false}
              direction="auto"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <CustomInput
              type="textarea"
              label={t("descriptionNotes", "Description")}
              optional
              rows={2}
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder={t("descriptionPlaceholder", "Add schedule details, agenda, instructions or remarks...")}
            />
          </div>
        </DrawerSection>

        {/* ─── 2. Timing & Recurrence Section (Unified Reusable Engine) ─── */}
        <CalendarDateTimeSection
          startDate={formData.startDate}
          endDate={formData.untilDate || formData.endDate}
          until={formData.until}
          isFullDay={formData.isFullDay}
          startTime={formData.startTime}
          endTime={formData.endTime}
          repeats={formData.repeats}
          repeatDays={formData.repeatDays}
          frequency={formData.frequency}
          showUntilPicker={true}
          showAllDayToggle={true}
          showTimePickers={true}
          showRecurrence={true}
          onChangeStartDate={(newDate) => {
            setValidationErrors((prev) => ({ ...prev, startDate: undefined }));
            setFormData((prev) => ({ ...prev, startDate: newDate }));
          }}
          onChangeEndDate={(newEndDate) => {
            setFormData((prev) => ({ ...prev, untilDate: newEndDate, endDate: newEndDate }));
          }}
          onChangeUntil={(newUntil) => {
            setFormData((prev) => ({ ...prev, until: newUntil }));
          }}
          onChangeIsFullDay={(newIsFullDay) => {
            setFormData((prev) => ({ ...prev, isFullDay: newIsFullDay }));
          }}
          onChangeStartTime={(newStartTime) => {
            setFormData((prev) => ({ ...prev, startTime: newStartTime }));
          }}
          onChangeEndTime={(newEndTime) => {
            setFormData((prev) => ({ ...prev, endTime: newEndTime }));
          }}
          onChangeRepeats={(newRepeats) => {
            setFormData((prev) => ({ ...prev, repeats: newRepeats }));
          }}
          onChangeRepeatDays={(newDays) => {
            setFormData((prev) => ({ ...prev, repeatDays: newDays }));
          }}
          onChangeFrequency={(newFreq) => {
            setFormData((prev) => ({ ...prev, frequency: newFreq }));
          }}
          validationErrors={validationErrors}
        />

        {/* ─── 3. Visual Styling Section ─── */}
        <DrawerSection
          title={t("visualAppearance", "Visual Appearance")}
          icon={ShapesIcon}
          variant="streamlined"
        >
          <EventColorPickerDropdown
            value={formData.color}
            onChange={(val) => setFormData({ ...formData, color: resolveCanonicalEventColor(val) })}
          />

          {/* Apply Changes To Dropdown */}
          {isRecurringOrMultiDay && (
            <div className="pt-2 animate-fade-in">
              <CustomSelect
                label={t("applyChangesTo", "Apply Changes To")}
                value={editScope}
                onChange={(val) => setEditScope(val)}
                options={editScopeOptions}
                placeholder={t("applyChangesTo", "Select update scope...")}
                showDescription={true}
                direction="auto"
              />
            </div>
          )}
        </DrawerSection>

        {/* Reusable Drawer Footer */}
        <DrawerFooter
          onCancel={onCancel}
          cancelLabel={t("cancel", "Cancel")}
          saveLabel={t("save", "Save Schedule")}
          saveIcon={SaveIcon}
          onSubmit={handleSubmit}
        />
      </form>
    </DrawerContainer>
  );
}
