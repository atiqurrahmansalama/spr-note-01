import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import SettingsSplitLayout from "../../components/common/SettingsSplitLayout";
import {
  CalendarIcon,
  SearchIcon,
  SettingsIcon,
  ChevronIcon,
  ClockIcon,
  SaveIcon,
  RefreshIcon,
  EditIcon,
  UndoIcon,
} from "../../components/ui/Icons";
import { useToast } from "../../context/ToastContext";
import { useTenant } from "../../context/TenantContext";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  attendanceEventRestrictionsStore,
  attendanceTimingPolicyStore,
  DEFAULT_ATTENDANCE_TIMING_POLICY,
} from "../../utils/localStore";
import { EVENT_COLOR_MAP } from "../../components/calendar";
import DataTable from "../../components/ui/DataTable";
import CustomInput from "../../components/ui/CustomInput";
import CustomCheckbox from "../../components/ui/CustomCheckbox";
import CustomTimePicker from "../../components/ui/CustomTimePicker";

const SECTIONS = [
  {
    id: "timing-rules",
    title: "Attendance Timing Policies",
    description: "Configure start/late thresholds, edit lockout windows, auto-absent triggers, and admin overrides",
    icon: ClockIcon,
  },
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

  const activeSection = searchParams.get("tab") || "timing-rules";

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

  // ─── Attendance Timing Policy State & Edit Control ─────────────────────────
  const [isEditingTiming, setIsEditingTiming] = useState(false);
  const [savedTimingPolicy, setSavedTimingPolicy] = useState(() => attendanceTimingPolicyStore.getPolicy(activeTenantId));
  const [timingPolicy, setTimingPolicy] = useState(() => attendanceTimingPolicyStore.getPolicy(activeTenantId));
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  const hasTimingChanges = useMemo(() => {
    return JSON.stringify(timingPolicy) !== JSON.stringify(savedTimingPolicy);
  }, [timingPolicy, savedTimingPolicy]);

  useEffect(() => {
    attendanceTimingPolicyStore.fetchRemotePolicy(activeTenantId).then((res) => {
      if (res) {
        setTimingPolicy(res);
        setSavedTimingPolicy(res);
      }
    });

    const handlePolicyUpdated = (e) => {
      const next = e.detail || attendanceTimingPolicyStore.getPolicy(activeTenantId);
      setTimingPolicy(next);
      setSavedTimingPolicy(next);
    };

    window.addEventListener("spr_attendance_timing_policy_updated", handlePolicyUpdated);
    return () => {
      window.removeEventListener("spr_attendance_timing_policy_updated", handlePolicyUpdated);
    };
  }, [activeTenantId]);

  const handleSaveTimingPolicy = async () => {
    setIsSavingPolicy(true);
    try {
      await attendanceTimingPolicyStore.saveRemotePolicy(activeTenantId, timingPolicy);
      setSavedTimingPolicy(timingPolicy);
      setIsEditingTiming(false);
      showToast("Attendance timing & lock policies saved successfully!", "success");
    } catch (err) {
      showToast("Failed to save attendance timing policies", "error");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleCancelTimingEdit = () => {
    setTimingPolicy(savedTimingPolicy);
    setIsEditingTiming(false);
  };

  const handleResetTimingDefaults = () => {
    if (window.confirm("Reset all attendance timing rules to standard institutional defaults?")) {
      setTimingPolicy(DEFAULT_ATTENDANCE_TIMING_POLICY);
      showToast("Policies reset to default values. Click 'Save Changes' to apply.", "info");
    }
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
      subtitle="Configure attendance timing windows, late thresholds, edit lockouts, and calendar holiday sync."
      headerIcon={SettingsIcon}
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      <div className="w-full">
        {/* ─── Section: Attendance Timing & Lock Policies ───────────────────── */}
        {activeSection === "timing-rules" && (
          <div className="space-y-5 animate-fade-in text-left">
            {/* Top Overview & Action Header */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                      Attendance Timing Policies
                    </h3>
                    {isEditingTiming ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 uppercase tracking-wider animate-pulse">
                        Editing Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border uppercase tracking-wider">
                        View Mode
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono theme-bg-sub theme-text-secondary border theme-border">
                      Effective: {timingPolicy.effective_from || '2026-01-01'}
                    </span>
                    {Array.isArray(timingPolicy.history_log) && timingPolicy.history_log.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-warning-badge">
                        {timingPolicy.history_log.length} Archived {timingPolicy.history_log.length === 1 ? 'Version' : 'Versions'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    Configure active time windows, late arrival limits, auto-absent triggers, and temporal policy versioning.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {!isEditingTiming ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingTiming(true)}
                    className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Edit Policy</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleResetTimingDefaults}
                      className="px-3.5 py-2 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-bg-sub cursor-pointer transition-all flex items-center gap-1.5"
                      title="Reset to default institutional presets"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTimingEdit}
                      className="px-3.5 py-2 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub cursor-pointer transition-all flex items-center gap-1.5"
                      title="Cancel changes"
                    >
                      <UndoIcon className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTimingPolicy}
                      disabled={isSavingPolicy || !hasTimingChanges}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                        hasTimingChanges
                          ? "theme-bg-accent theme-accent-text hover:opacity-90 animate-pulse"
                          : "theme-bg-sub theme-text-secondary opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <SaveIcon className="w-4 h-4" />
                      <span>{isSavingPolicy ? "Saving..." : hasTimingChanges ? "Save Changes" : "Saved"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Policy Group 1: Student Class Attendance Timing */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold theme-text-primary">Class Attendance Timing Rules</h4>
                </div>
                <span className="text-[11px] font-mono theme-text-secondary">Based on Class Period Slot Schedules</span>
              </div>

              <p className="text-xs theme-text-secondary leading-relaxed">
                Class attendance start time is determined by each period's schedule. During the first <strong>{timingPolicy.class_late_start_minutes || 10} minutes</strong>, attendance can be marked as Present or Absent. After this late threshold (up to <strong>{timingPolicy.class_late_end_minutes || 25} mins</strong>), only Late or Absent can be marked.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <CustomInput
                  type="number"
                  min="1"
                  max="60"
                  label="Late Time Start After"
                  unit="Mins"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.class_late_start_minutes}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, class_late_start_minutes: Number(val) }))}
                  placeholder="10"
                />

                <CustomInput
                  type="number"
                  min="1"
                  max="120"
                  label="Late Time End After"
                  unit="Mins"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.class_late_end_minutes}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, class_late_end_minutes: Number(val) }))}
                  placeholder="25"
                />

                <CustomInput
                  type="number"
                  min="0"
                  max="120"
                  label="Buffer Time"
                  unit="Mins"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.class_end_buffer_minutes}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, class_end_buffer_minutes: Number(val) }))}
                  placeholder="15"
                />

                <CustomInput
                  type="number"
                  min="1"
                  max="24"
                  label="Edit Time"
                  unit="Hours"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.class_teacher_edit_window_hours}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, class_teacher_edit_window_hours: Number(val) }))}
                  placeholder="4"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl theme-bg-sub/60 border theme-border">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold theme-text-primary">Auto-Resolve Unrecorded Cells to Absent</span>
                  <p className="text-[11px] theme-text-secondary">Automatically marks students as Absent when the teacher edit window expires without attendance.</p>
                </div>
                <CustomCheckbox
                  checked={Boolean(timingPolicy.class_auto_absent_on_expiry)}
                  onChange={(checked) => setTimingPolicy((prev) => ({ ...prev, class_auto_absent_on_expiry: checked }))}
                  readOnly={!isEditingTiming}
                />
              </div>
            </div>

            {/* Policy Group 2: Residential Dormitory Attendance Timing */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold theme-text-primary">Residential Checkpoints</h4>
                </div>
                <span className="text-[11px] font-mono theme-text-secondary">Based on Scheduled Checkpoint Times</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CustomInput
                  type="number"
                  min="1"
                  max="60"
                  label="Late Time Start After"
                  unit="Mins"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.residential_late_start_minutes}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, residential_late_start_minutes: Number(val) }))}
                  placeholder="15"
                />

                <CustomInput
                  type="number"
                  min="1"
                  max="120"
                  label="Late Time End After"
                  unit="Mins"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.residential_late_end_minutes}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, residential_late_end_minutes: Number(val) }))}
                  placeholder="35"
                />

                <CustomInput
                  type="number"
                  min="10"
                  max="180"
                  label="Buffer Time"
                  unit="Mins"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.residential_end_buffer_minutes}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, residential_end_buffer_minutes: Number(val) }))}
                  placeholder="45"
                />

                <CustomInput
                  type="number"
                  min="1"
                  max="24"
                  label="Edit Time"
                  unit="Hours"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.residential_teacher_edit_window_hours}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, residential_teacher_edit_window_hours: Number(val) }))}
                  placeholder="4"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl theme-bg-sub/60 border theme-border">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold theme-text-primary">Auto-Resolve Unrecorded Checkpoint to Absent</span>
                  <p className="text-[11px] theme-text-secondary">Unchecked residential students are automatically marked as Absent once the checkpoint window closes.</p>
                </div>
                <CustomCheckbox
                  checked={Boolean(timingPolicy.residential_auto_absent_on_expiry)}
                  onChange={(checked) => setTimingPolicy((prev) => ({ ...prev, residential_auto_absent_on_expiry: checked }))}
                  readOnly={!isEditingTiming}
                />
              </div>
            </div>

            {/* Policy Group 3: Staff Daily Attendance Shift Timing */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold theme-text-primary">Staff Daily Attendance Shift Timing</h4>
                </div>
                <span className="text-[11px] font-mono theme-text-secondary">Institutional Daily Employee Roll Call</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CustomTimePicker
                  label="Check In Start Time"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.staff_start_time || "07:30"}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, staff_start_time: val }))}
                />

                <CustomTimePicker
                  label="Late Time Start"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.staff_late_start_time || "08:15"}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, staff_late_start_time: val }))}
                />

                <CustomTimePicker
                  label="Late Time End"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.staff_late_end_time || "09:00"}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, staff_late_end_time: val }))}
                />

                <CustomTimePicker
                  label="Check In End Time"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.staff_end_time || "10:00"}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, staff_end_time: val }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <CustomInput
                  type="number"
                  min="1"
                  max="12"
                  label="Buffer Time"
                  unit="Hours"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.staff_teacher_edit_window_hours}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, staff_teacher_edit_window_hours: Number(val) }))}
                  placeholder="2"
                  helperText="Hours allowed after shift closes for staff to edit."
                />

                <div className="flex items-center justify-between p-3 rounded-xl theme-bg-sub/60 border theme-border mt-auto">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold theme-text-primary">Auto-Mark Unrecorded Staff as Absent</span>
                    <p className="text-[11px] theme-text-secondary">After check-in closes, unrecorded staff become Absent.</p>
                  </div>
                  <CustomCheckbox
                    checked={Boolean(timingPolicy.staff_auto_absent_on_expiry)}
                    onChange={(checked) => setTimingPolicy((prev) => ({ ...prev, staff_auto_absent_on_expiry: checked }))}
                    readOnly={!isEditingTiming}
                  />
                </div>
              </div>
            </div>

            {/* Policy Group 4: Administrative Universal Override Privilege */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold theme-text-primary">Universal Administrative Override Privilege</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                  Admins & SuperAdmins Only
                </span>
              </div>

              <p className="text-xs theme-text-secondary leading-relaxed">
                Administrators possess full override privileges across all attendance modules (Class, Residential, Staff Daily, and Teacher Class Attendance). Admins can mark or edit <strong>Present</strong>, <strong>Late</strong>, <strong>Absent</strong>, and grant official <strong>Leave (On Leave)</strong>, as well as modify recorded arrival times and calculate delay minutes.
              </p>

              <div className="max-w-md pt-1">
                <CustomInput
                  type="number"
                  min="0"
                  max="365"
                  label="Admin Historical Edit Window"
                  unit="Days"
                  readOnly={!isEditingTiming}
                  value={timingPolicy.admin_edit_window_days}
                  onChange={(val) => setTimingPolicy((prev) => ({ ...prev, admin_edit_window_days: Number(val) }))}
                  placeholder="30"
                  helperText="Enter 30 for 30-day edit grace, or 0 for unlimited historical modification."
                />
              </div>
            </div>
          </div>
        )}
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
                            className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-md text-[10px] sm:text-xs leading-none ${
                              isKindOff
                                ? "theme-danger-badge"
                                : "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${isKindOff ? "theme-bg-danger" : "theme-bg-accent"}`}
                            />
                            <span>{isKindOff ? "Class Attendance OFF" : "Class Attendance Active"}</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleToggleKindDisabled(kind, e)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                              isKindOff ? "theme-bg-danger border-transparent" : "theme-bg-elevated theme-border"
                            }`}
                            role="switch"
                            aria-checked={isKindOff}
                            title={`Turn attendance ${isKindOff ? "Active" : "OFF"} for all ${kind.label} events`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full theme-bg-surface shadow-md ring-0 transition duration-200 ease-in-out border theme-border ${
                                isKindOff ? "translate-x-5" : "translate-x-0.5"
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
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                          isChildOff
                                            ? "theme-danger-badge"
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
                                            ? "theme-bg-danger border-transparent"
                                            : "theme-bg-elevated theme-border"
                                        }`}
                                        role="switch"
                                        aria-checked={isChildOff}
                                        title={`Click to turn attendance ${isChildOff ? "Active" : "OFF"} for ${et.name}`}
                                      >
                                        <span
                                          aria-hidden="true"
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full theme-bg-surface shadow-md ring-0 transition duration-200 ease-in-out border theme-border ${
                                            isChildOff ? "translate-x-4" : "translate-x-0.5"
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
