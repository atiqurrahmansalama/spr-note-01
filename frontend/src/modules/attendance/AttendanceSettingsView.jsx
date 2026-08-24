import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import SettingsSplitLayout from "../../components/common/SettingsSplitLayout";
import {
  CalendarIcon,
  SearchIcon,
  SettingsIcon,
  ChevronIcon,
} from "../../components/ui/Icons";
import { useToast } from "../../context/ToastContext";
import { useTenant } from "../../context/TenantContext";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  attendanceEventRestrictionsStore,
} from "../../utils/localStore";
import { EVENT_COLOR_MAP } from "../../components/calendar";
import DataTable from "../../components/ui/DataTable";

const SECTIONS = [
  {
    id: "event-restrictions",
    title: "Class Attendance Off Events",
    description: "Configure which calendar event types and specific events disable class attendance and mark recess",
    icon: CalendarIcon,
  },
];

export default function AttendanceSettingsView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSection = searchParams.get("tab") || "event-restrictions";

  const handleSectionChange = (sectionId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", sectionId);
        return next;
      },
      { replace: true }
    );
  };

  // ─── Event Kinds & Event Types State from Developer Tools ──────────────────
  const [eventKinds, setEventKinds] = useState(() => calendarEventKindsStore.getKinds(activeTenantId));
  const [eventTypes, setEventTypes] = useState(() => calendarEventTypesStore.getEventTypes(activeTenantId));
  const [restrictions, setRestrictions] = useState(() => attendanceEventRestrictionsStore.getRestrictions(activeTenantId));
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion Expand/Collapse State
  const [expandedKinds, setExpandedKinds] = useState(() => ({
    HOLIDAY: true,
    EXAM: true,
  }));

  useEffect(() => {
    const handleKindsUpdated = () => {
      setEventKinds(calendarEventKindsStore.getKinds(activeTenantId));
    };
    const handleEventsUpdated = () => {
      setEventTypes(calendarEventTypesStore.getEventTypes(activeTenantId));
    };
    const handleRestrictionsUpdated = () => {
      setRestrictions(attendanceEventRestrictionsStore.getRestrictions(activeTenantId));
    };

    window.addEventListener("spr_calendar_event_kinds_updated", handleKindsUpdated);
    window.addEventListener("spr_calendar_event_types_updated", handleEventsUpdated);
    window.addEventListener("spr_attendance_event_restrictions_updated", handleRestrictionsUpdated);

    return () => {
      window.removeEventListener("spr_calendar_event_kinds_updated", handleKindsUpdated);
      window.removeEventListener("spr_calendar_event_types_updated", handleEventsUpdated);
      window.removeEventListener("spr_attendance_event_restrictions_updated", handleRestrictionsUpdated);
    };
  }, [activeTenantId]);

  const toggleExpandKind = (kindKey) => {
    setExpandedKinds((prev) => ({
      ...prev,
      [kindKey]: !prev[kindKey],
    }));
  };

  // ─── Toggle Switch for Entire Event Type (Kind) ────────────────────────────
  const handleToggleKindDisabled = (kindItem, e) => {
    if (e) e.stopPropagation();
    const kindKey = kindItem.value || kindItem.id;
    const currentStatus = Boolean(restrictions[kindKey]?.disabled ?? (kindKey === "HOLIDAY"));
    const newStatus = !currentStatus;

    let updated = {
      ...restrictions,
      [kindKey]: {
        ...(restrictions[kindKey] || {}),
        disabled: newStatus,
        auto_excuse: true,
        kindLabel: kindItem.label || kindItem.name || kindKey,
      },
    };

    // Synchronize all child events under this type
    const childEvents = eventTypes.filter(
      (et) => (et.type || et.category || "ACADEMIC") === kindKey
    );
    childEvents.forEach((ce) => {
      const ceKey = ce.code || ce.id;
      updated[ceKey] = {
        ...(updated[ceKey] || {}),
        disabled: newStatus,
        auto_excuse: true,
        eventName: ce.name,
        eventType: kindKey,
      };
    });

    attendanceEventRestrictionsStore.saveRestrictions(activeTenantId, updated);
    showToast(
      `"${kindItem.label || kindItem.name || kindKey}" attendance set to ${newStatus ? "OFF (Disabled)" : "Active"}`,
      newStatus ? "warning" : "success"
    );
  };

  // ─── Toggle Switch for Individual Child Event ──────────────────────────────
  const handleToggleChildEventDisabled = (eventItem, kindItem, e) => {
    if (e) e.stopPropagation();
    const key = eventItem.code || eventItem.id;
    const kindKey = kindItem.value || kindItem.id;
    const currentStatus = Boolean(
      restrictions[key]?.disabled ?? restrictions[kindKey]?.disabled ?? (kindKey === "HOLIDAY")
    );
    const newStatus = !currentStatus;

    attendanceEventRestrictionsStore.setEventDisabled(activeTenantId, key, newStatus, {
      auto_excuse: true,
      eventName: eventItem.name,
      eventType: kindKey,
    });

    showToast(
      `"${eventItem.name}" attendance set to ${newStatus ? "OFF (Disabled)" : "Active"}`,
      newStatus ? "warning" : "success"
    );
  };

  // ─── Bulk Quick Actions ───────────────────────────────────────────────────
  const handleDisableAllHolidays = () => {
    let updated = { ...restrictions };
    updated["HOLIDAY"] = { disabled: true, auto_excuse: true, kindLabel: "Holiday" };

    eventTypes.forEach((et) => {
      const isHoliday = et.type === "HOLIDAY" || et.category === "HOLIDAY";
      const key = et.code || et.id;
      if (isHoliday) {
        updated[key] = {
          ...(updated[key] || {}),
          disabled: true,
          auto_excuse: true,
          eventName: et.name,
          eventType: "HOLIDAY",
        };
      }
    });
    attendanceEventRestrictionsStore.saveRestrictions(activeTenantId, updated);
    showToast("All holiday types set to Attendance OFF", "success");
  };

  const handleEnableAll = () => {
    let updated = { ...restrictions };
    (eventKinds || []).forEach((k) => {
      const kindKey = k.value || k.id;
      updated[kindKey] = { disabled: false, auto_excuse: false, kindLabel: k.label };
    });
    eventTypes.forEach((et) => {
      const key = et.code || et.id;
      updated[key] = { disabled: false, auto_excuse: false, eventName: et.name };
    });
    attendanceEventRestrictionsStore.saveRestrictions(activeTenantId, updated);
    showToast("Class attendance enabled across all event types", "success");
  };

  // Filter Event Kinds based on search query
  const filteredEventKinds = useMemo(() => {
    if (!searchQuery.trim()) return eventKinds;
    const q = searchQuery.toLowerCase();
    return eventKinds.filter((k) => {
      const kindMatches = (k.label || k.name || k.value).toLowerCase().includes(q);
      const childMatches = eventTypes.some(
        (et) =>
          ((et.type || et.category || "ACADEMIC") === (k.value || k.id)) &&
          et.name.toLowerCase().includes(q)
      );
      return kindMatches || childMatches;
    });
  }, [eventKinds, eventTypes, searchQuery]);

  const disabledTypeCount = useMemo(() => {
    return eventKinds.filter((k) => {
      const kindKey = k.value || k.id;
      return Boolean(restrictions[kindKey]?.disabled ?? (kindKey === "HOLIDAY"));
    }).length;
  }, [eventKinds, restrictions]);

  return (
    <SettingsSplitLayout
      title="Attendance Settings"
      subtitle="Configure class attendance rules, event recess restrictions, and calendar synchronization."
      headerIcon={SettingsIcon}
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      <div className="w-full">
        {/* ─── Section: Class Attendance Off Events ─────────────────────────── */}
        {activeSection === "event-restrictions" && (
          <div className="space-y-4 animate-fade-in text-left">
            {/* Top Overview & Action Card */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                      Class Attendance Off Events
                    </h3>
                    <p className="text-xs theme-text-secondary mt-0.5">
                      Toggle attendance status for each Event Type. Click any type to view its child events list.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Types List (Hierarchical Cards with Clean Event List) */}
            <div className="space-y-3">
              {filteredEventKinds.length === 0 ? (
                <div className="p-8 text-center text-xs theme-text-secondary border theme-border rounded-2xl theme-bg-surface">
                  No event types found matching your query.
                </div>
              ) : (
                filteredEventKinds.map((kind) => {
                  const kindKey = kind.value || kind.id;
                  const colorObj = EVENT_COLOR_MAP[kind.color] || EVENT_COLOR_MAP.emerald;
                  const isKindOff = Boolean(restrictions[kindKey]?.disabled ?? (kindKey === "HOLIDAY"));
                  const isExpanded = Boolean(expandedKinds[kindKey]);

                  // Child events under this kind
                  const childEvents = eventTypes.filter(
                    (et) => (et.type || et.category || "ACADEMIC") === kindKey
                  );

                  return (
                    <div
                      key={kindKey}
                      className="rounded-2xl border theme-border theme-bg-surface shadow-xs transition overflow-hidden"
                    >
                      {/* Event Type Header Bar */}
                      <div
                        onClick={() => toggleExpandKind(kindKey)}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:theme-bg-sub/40 transition select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Chevron Icon */}
                          <div className="shrink-0 flex items-center justify-center theme-text-secondary">
                            <ChevronIcon isOpen={isExpanded} className="w-4 h-4" />
                          </div>

                          {/* Color Dot, Type Label & Count */}
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorObj.dot}`} />
                          <h4 className="text-xs sm:text-sm font-bold theme-text-primary leading-none m-0 p-0">
                            {kind.label || kind.name || kindKey}
                          </h4>
                          <span className="text-[11px] font-mono theme-text-secondary leading-none">
                            ({childEvents.length} event{childEvents.length !== 1 ? "s" : ""})
                          </span>
                        </div>

                        {/* Right Status Badge & Switch */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-md border text-[10px] sm:text-xs leading-none ${
                              isKindOff
                                ? "bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger-main)]/20"
                                : "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: isKindOff ? "var(--danger-main)" : "var(--accent-main)" }}
                            />
                            <span>{isKindOff ? "Class Attendance OFF" : "Class Attendance Active"}</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleToggleKindDisabled(kind, e)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                              isKindOff ? "bg-[var(--danger-main)] border-transparent" : "theme-bg-sub theme-border"
                            }`}
                            role="switch"
                            aria-checked={isKindOff}
                            title={`Turn attendance ${isKindOff ? "Active" : "OFF"} for all ${kind.label} events`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                isKindOff ? "translate-x-5" : "translate-x-0.5 bg-slate-300 dark:bg-slate-500"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section: Reusable DataTable for Child Events with hideHeader */}
                      {isExpanded && (
                        <div className="border-t theme-border animate-fade-in">
                          <DataTable
                            hideHeader={true}
                            data={childEvents}
                            keyExtractor={(et) => et.id}
                            wrapperClassName="border-0 rounded-none shadow-none theme-bg-sub/20"
                            emptyTitle="No Events"
                            emptySubMessage="No specific events registered under this type. Events created in Developer Tools or Calendar will follow this rule."
                            columns={[
                              {
                                key: "name",
                                header: "Event",
                                render: (et) => (
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${colorObj.dot}`} />
                                    <span className="text-xs font-semibold theme-text-primary truncate">
                                      {et.name}
                                    </span>
                                  </div>
                                ),
                              },
                              {
                                key: "actions",
                                header: "Actions",
                                align: "right",
                                render: (et) => {
                                  const key = et.code || et.id;
                                  const isChildOff = Boolean(
                                    restrictions[key]?.disabled ?? isKindOff
                                  );

                                  return (
                                    <div className="flex items-center gap-2.5 justify-end shrink-0">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                          isChildOff
                                            ? "bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger-main)]/20"
                                            : "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                                        }`}
                                      >
                                        {isChildOff ? "OFF" : "Active"}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleChildEventDisabled(et, kind, e)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                                          isChildOff
                                            ? "bg-[var(--danger-main)] border-transparent"
                                            : "theme-bg-sub theme-border"
                                        }`}
                                        role="switch"
                                        aria-checked={isChildOff}
                                        title={`Click to turn attendance ${isChildOff ? "Active" : "OFF"} for ${et.name}`}
                                      >
                                        <span
                                          aria-hidden="true"
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            isChildOff ? "translate-x-4" : "translate-x-0.5 bg-slate-300 dark:bg-slate-500"
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  );
                                },
                              },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </SettingsSplitLayout>
  );
}
