/**
 * SPR Note — Calendar & Attendance Store
 * =======================================
 * Master calendar events, recurring overrides, working schedules,
 * event types, impact scopes, period categories, and attendance policies.
 */

import { KEYS, readJSON, writeJSON, readString, writeString } from "./coreStore";

// ─── Calendar / Date-Time Settings ──────────────────────────────────────────

export const calendarSettings = {
  getTimezone:    () => readString(KEYS.TIMEZONE, "Asia/Dhaka"),
  saveTimezone:   (v) => writeString(KEYS.TIMEZONE, v),

  getDateFormat:  () => readString(KEYS.DATE_FORMAT, "DD/MM/YYYY"),
  saveDateFormat: (v) => writeString(KEYS.DATE_FORMAT, v),

  getFirstDay:    () => readString(KEYS.FIRST_DAY, "Saturday"),
  saveFirstDay:   (v) => writeString(KEYS.FIRST_DAY, v),

  getHijriEnabled:  () => readString(KEYS.ENABLE_HIJRI, "true") === "true",
  saveHijriEnabled: (v) => writeString(KEYS.ENABLE_HIJRI, v.toString()),
};

export const dateTimeSettings = calendarSettings;

// ─── Attendance Module Filters Persistence ──────────────────────────────────

export const attendanceFilters = {
  getMonthlyFilters: (tenantId) => readJSON(`spr_att_monthly_filters_${tenantId || 'default'}`, null),
  saveMonthlyFilters: (tenantId, filters) => writeJSON(`spr_att_monthly_filters_${tenantId || 'default'}`, filters),

  getResidentialFilters: (tenantId) => readJSON(`spr_att_residential_filters_${tenantId || 'default'}`, null),
  saveResidentialFilters: (tenantId, filters) => writeJSON(`spr_att_residential_filters_${tenantId || 'default'}`, filters),

  getTeacherMatrixFilters: (tenantId) => readJSON(`spr_att_teacher_filters_${tenantId || 'default'}`, null),
  saveTeacherMatrixFilters: (tenantId, filters) => writeJSON(`spr_att_teacher_filters_${tenantId || 'default'}`, filters),

  getStaffFilters: (tenantId) => readJSON(`spr_att_staff_filters_${tenantId || 'default'}`, null),
  saveStaffFilters: (tenantId, filters) => writeJSON(`spr_att_staff_filters_${tenantId || 'default'}`, filters),

  getGateLogFilters: (tenantId) => readJSON(`spr_att_gatelog_filters_${tenantId || 'default'}`, null),
  saveGateLogFilters: (tenantId, filters) => writeJSON(`spr_att_gatelog_filters_${tenantId || 'default'}`, filters),

  getSettingsTab: (tenantId) => readString(`spr_att_settings_tab_${tenantId || 'default'}`, 'policy'),
  saveSettingsTab: (tenantId, tab) => writeString(`spr_att_settings_tab_${tenantId || 'default'}`, tab),
};

// ─── Master Institution Time & Calendar Store ────────────────────────────────

export const DEFAULT_CALENDAR_EVENTS = [
  {
    id: "wh-1",
    title: "Morning Working Session",
    category: "WORKING_HOURS",
    audience: "STAFF",
    startTime: "09:00",
    endTime: "12:30",
    timezone: "GMT+06:00",
    repeats: true,
    repeatDays: [0, 1, 2, 3, 4], // Sun, Mon, Tue, Wed, Thu
    frequency: "WEEKLY",
    until: "ONGOING",
    startDate: "2026-01-01",
    priorityRank: 1,
    impacts: [],
    description: "Standard institution morning operational & academic hours",
  },
  {
    id: "wh-2",
    title: "Afternoon Working Session",
    category: "WORKING_HOURS",
    audience: "STAFF",
    startTime: "13:30",
    endTime: "17:00",
    timezone: "GMT+06:00",
    repeats: true,
    repeatDays: [0, 1, 2, 3, 4],
    frequency: "WEEKLY",
    until: "ONGOING",
    startDate: "2026-01-01",
    priorityRank: 2,
    impacts: [],
    description: "Staff & faculty afternoon working hours",
  },
  {
    id: "wh-3",
    title: "Evening Review / Study Hour",
    category: "WORKING_HOURS",
    audience: "STAFF",
    startTime: "19:15",
    endTime: "20:00",
    timezone: "GMT+06:00",
    repeats: true,
    repeatDays: [1, 2, 3], // Mon, Tue, Wed
    frequency: "WEEKLY",
    until: "ONGOING",
    startDate: "2026-01-01",
    priorityRank: 3,
    impacts: [],
    description: "Evening tutorial and faculty support shift",
  },
  {
    id: "hol-1",
    title: "Eid-ul-Adha Vacation",
    category: "HOLIDAY",
    audience: "ALL",
    startDate: "2026-06-05",
    endDate: "2026-06-09",
    isFullDay: true,
    repeats: false,
    priorityRank: 1,
    impacts: ["ATTENDANCE"],
    description: "Institutional closure for Holy Eid-ul-Adha",
  },
  {
    id: "exam-1",
    title: "Mid-Term Evaluation Exam",
    category: "EXAM",
    audience: "STUDENTS",
    startDate: "2026-06-15",
    endDate: "2026-06-18",
    startTime: "09:30",
    endTime: "12:30",
    repeats: false,
    priorityRank: 2,
    impacts: ["ATTENDANCE"],
    description: "Comprehensive mid-term evaluation across all academic levels",
  },
];

/**
 * Dynamically generates priority rank options based on the total number of events
 * without hardcoding fixed limits.
 */
export const getDynamicPriorityRankOptions = (events = [], currentEventId = null, currentRank = null) => {
  const list = Array.isArray(events) ? events : [];
  const totalRanks = Math.max(list.length + (currentEventId ? 0 : 1), currentRank ? Number(currentRank) : 1, 1);

  const options = [];
  for (let i = 1; i <= totalRanks; i++) {
    const existingAtRank = list.find(
      (e) => Number(e.priorityRank || e.rank) === i && String(e.id) !== String(currentEventId)
    );
    const isTop = i === 1;
    const isBottom = i === totalRanks && totalRanks > 1;

    let label = `Rank ${i}`;
    if (isTop) label += " (Highest Priority / Top Precedence)";
    else if (isBottom) label += " (Lowest Priority)";

    let description = existingAtRank
      ? `Currently assigned to: ${existingAtRank.title}`
      : isTop
      ? "Highest precedence — overrides all coinciding events on the same day"
      : `Priority Level ${i}`;

    options.push({
      value: i,
      label,
      badge: `Rank ${i}`,
      description,
    });
  }
  return options;
};

export const masterCalendarStore = {
  getEvents: (tenantId) => {
    const key = `spr_master_calendar_${tenantId || 'default'}`;
    const data = readJSON(key, DEFAULT_CALENDAR_EVENTS);
    if (!Array.isArray(data)) return [];
    return data.map((evt, idx) => ({
      ...evt,
      priorityRank: evt.priorityRank !== undefined && evt.priorityRank !== null
        ? Number(evt.priorityRank)
        : (evt.rank !== undefined ? Number(evt.rank) : idx + 1),
    }));
  },
  saveEvents: (tenantId, events) => {
    const key = `spr_master_calendar_${tenantId || 'default'}`;
    writeJSON(key, events);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_calendar_events_updated", { detail: events }));
    }
    return events;
  },
  addEvent: (tenantId, eventData) => {
    const list = masterCalendarStore.getEvents(tenantId);
    const rankVal = eventData.priorityRank !== undefined && eventData.priorityRank !== null
      ? Number(eventData.priorityRank)
      : list.length + 1;

    const newEvent = {
      ...eventData,
      priorityRank: rankVal,
      id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newEvent];
    masterCalendarStore.saveEvents(tenantId, updated);
    return newEvent;
  },
  updateEvent: (tenantId, eventId, updatedData) => {
    const list = masterCalendarStore.getEvents(tenantId);
    const editScope = updatedData.editScope || "ALL_EVENTS";
    const targetDate = updatedData.targetDate || updatedData.startDate || new Date().toISOString().split("T")[0];
    const cleanImpacts = Array.isArray(updatedData.impacts)
      ? updatedData.impacts
      : (updatedData.impacts ? [updatedData.impacts] : ["ALL"]);

    const cleanPriorityRank = updatedData.priorityRank !== undefined && updatedData.priorityRank !== null
      ? Number(updatedData.priorityRank)
      : undefined;

    // Case 1: Only for this single day occurrence
    if (editScope === "THIS_EVENT" && eventId) {
      const existing = list.find((e) => e.id === eventId);
      if (existing) {
        if (existing.isOverride) {
          const updated = list.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  ...updatedData,
                  priorityRank: cleanPriorityRank !== undefined ? cleanPriorityRank : (e.priorityRank || 1),
                  impacts: cleanImpacts,
                  updatedAt: new Date().toISOString(),
                }
              : e
          );
          masterCalendarStore.saveEvents(tenantId, updated);
          return updated.find((e) => e.id === eventId);
        }

        const exceptions = Array.isArray(existing.exceptions) ? [...existing.exceptions] : [];
        if (!exceptions.includes(targetDate)) {
          exceptions.push(targetDate);
        }

        const singleOverride = {
          ...existing,
          ...updatedData,
          priorityRank: cleanPriorityRank !== undefined ? cleanPriorityRank : (existing.priorityRank || 1),
          impacts: cleanImpacts,
          id: `evt_ovr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          startDate: targetDate,
          endDate: targetDate,
          repeats: false,
          repeatDays: [],
          until: "DATE",
          untilDate: targetDate,
          parentEventId: eventId,
          isOverride: true,
          createdAt: new Date().toISOString(),
        };

        const updated = list.map((e) => (e.id === eventId ? { ...e, exceptions } : e));
        updated.push(singleOverride);
        masterCalendarStore.saveEvents(tenantId, updated);
        return singleOverride;
      }
    }

    // Case 2: From this date onwards (preserve past historical series)
    if (editScope === "THIS_AND_FOLLOWING" && eventId) {
      const existing = list.find((e) => e.id === eventId);
      if (existing) {
        const targetD = new Date(targetDate);
        const prevD = new Date(targetD);
        prevD.setDate(prevD.getDate() - 1);
        const prevDateStr = prevD.toISOString().split("T")[0];

        const cappedOld = {
          ...existing,
          until: "DATE",
          untilDate: prevDateStr,
          updatedAt: new Date().toISOString(),
        };

        const newFutureSeries = {
          ...existing,
          ...updatedData,
          impacts: cleanImpacts,
          id: `evt_fut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          startDate: targetDate,
          previousEventId: eventId,
          createdAt: new Date().toISOString(),
        };

        const updated = list.map((e) => (e.id === eventId ? cappedOld : e));
        updated.push(newFutureSeries);
        masterCalendarStore.saveEvents(tenantId, updated);
        return newFutureSeries;
      }
    }

    // Case 3: All occurrences (Default)
    const updated = list.map((e) => (e.id === eventId ? { ...e, ...updatedData, updatedAt: new Date().toISOString() } : e));
    masterCalendarStore.saveEvents(tenantId, updated);
    return updated;
  },
  deleteEvent: (tenantId, eventId, options = {}) => {
    const list = masterCalendarStore.getEvents(tenantId);
    const deleteScope = typeof options === "string" ? options : (options.deleteScope || options.scope || "ALL_EVENTS");
    const targetDate = typeof options === "object" && options.targetDate ? options.targetDate : new Date().toISOString().split("T")[0];

    const existing = list.find((e) => e.id === eventId);
    if (!existing) {
      const updated = list.filter((e) => e.id !== eventId);
      masterCalendarStore.saveEvents(tenantId, updated);
      return updated;
    }

    if (deleteScope === "THIS_EVENT") {
      if (existing.isOverride || !existing.repeats) {
        const updated = list.filter((e) => e.id !== eventId);
        masterCalendarStore.saveEvents(tenantId, updated);
        return updated;
      }
      const exceptions = Array.isArray(existing.exceptions) ? [...existing.exceptions] : [];
      if (!exceptions.includes(targetDate)) {
        exceptions.push(targetDate);
      }
      const updated = list.map((e) => (e.id === eventId ? { ...e, exceptions, updatedAt: new Date().toISOString() } : e));
      masterCalendarStore.saveEvents(tenantId, updated);
      return updated;
    }

    if (deleteScope === "THIS_AND_FOLLOWING") {
      const targetD = new Date(targetDate);
      const prevD = new Date(targetD);
      prevD.setDate(prevD.getDate() - 1);
      const prevDateStr = prevD.toISOString().split("T")[0];

      if (existing.startDate && targetDate <= existing.startDate) {
        const updated = list.filter((e) => e.id !== eventId);
        masterCalendarStore.saveEvents(tenantId, updated);
        return updated;
      }

      const cappedOld = {
        ...existing,
        until: "DATE",
        untilDate: prevDateStr,
        updatedAt: new Date().toISOString(),
      };
      const updated = list.map((e) => (e.id === eventId ? cappedOld : e));
      masterCalendarStore.saveEvents(tenantId, updated);
      return updated;
    }

    const updated = list.filter((e) => e.id !== eventId && e.parentEventId !== eventId);
    masterCalendarStore.saveEvents(tenantId, updated);
    return updated;
  },
  migrateEventCategory: (tenantId, fromCategory, toCategory) => {
    const list = masterCalendarStore.getEvents(tenantId);
    const updated = list.map((e) => (e.category === fromCategory ? { ...e, category: toCategory } : e));
    masterCalendarStore.saveEvents(tenantId, updated);
    return updated;
  },
  getHolidays: (tenantId) => {
    const list = masterCalendarStore.getEvents(tenantId);
    return list.filter((e) => e.category === 'HOLIDAY');
  },
  getWorkingHours: (tenantId) => {
    const list = masterCalendarStore.getEvents(tenantId);
    return list.filter((e) => e.category === 'WORKING_HOURS');
  },
};

// ─── Working Schedules Store ────────────────────────────────────────────────

export const DEFAULT_WORKING_SCHEDULES = [
  { id: "ws-1", name: "Morning Working Session", code: "MORNING_WORKING_SESSION", type: "WORKING_HOURS", description: "Standard morning operational shifts and faculty hours", order: 1, is_active: true },
  { id: "ws-2", name: "Afternoon Working Session", code: "AFTERNOON_WORKING_SESSION", type: "WORKING_HOURS", description: "Staff & faculty afternoon working hours", order: 2, is_active: true },
  { id: "ws-3", name: "Evening Support Session", code: "EVENING_SUPPORT_SESSION", type: "WORKING_HOURS", description: "Evening tutorial, revision, and support hours", order: 3, is_active: true },
];

export const calendarWorkingSchedulesStore = {
  getSchedules: (tenantId) => {
    const key = `spr_calendar_working_schedules_${tenantId || 'default'}`;
    return readJSON(key, DEFAULT_WORKING_SCHEDULES);
  },
  saveSchedules: (tenantId, schedules) => {
    const key = `spr_calendar_working_schedules_${tenantId || 'default'}`;
    writeJSON(key, schedules);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_calendar_working_schedules_updated", { detail: schedules }));
    }
    return schedules;
  },
  addSchedule: (tenantId, scheduleData) => {
    const list = calendarWorkingSchedulesStore.getSchedules(tenantId);
    const code = (scheduleData.code || scheduleData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 35);
    const newSchedule = {
      ...scheduleData,
      id: scheduleData.id || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: code || `SCHEDULE_${Date.now()}`,
      name: scheduleData.name || code,
      type: "WORKING_HOURS",
      description: scheduleData.description || "",
      order: scheduleData.order || list.length + 1,
      is_active: scheduleData.is_active !== undefined ? scheduleData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newSchedule];
    calendarWorkingSchedulesStore.saveSchedules(tenantId, updated);
    return newSchedule;
  },
  updateSchedule: (tenantId, id, updatedData) => {
    const list = calendarWorkingSchedulesStore.getSchedules(tenantId);
    const existing = list.find((s) => s.id === id || s.code === id);
    const oldName = existing?.name;
    const newName = updatedData.name || oldName;

    const updated = list.map((s) =>
      s.id === id || s.code === id
        ? {
            ...s,
            ...updatedData,
            id: s.id,
            code: s.code,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    calendarWorkingSchedulesStore.saveSchedules(tenantId, updated);

    if (oldName) {
      const calEvents = masterCalendarStore.getEvents(tenantId);
      let changed = false;
      const syncedEvents = calEvents.map((evt) => {
        if (evt.title === oldName || evt.workingScheduleId === id || String(evt.id) === String(id)) {
          changed = true;
          return {
            ...evt,
            title: newName,
            description: updatedData.description !== undefined ? updatedData.description : evt.description,
            updatedAt: new Date().toISOString(),
          };
        }
        return evt;
      });
      if (changed) {
        masterCalendarStore.saveEvents(tenantId, syncedEvents);
      }
    }
    return updated;
  },
  deleteSchedule: (tenantId, id) => {
    const list = calendarWorkingSchedulesStore.getSchedules(tenantId);
    const existing = list.find((s) => s.id === id);
    const oldName = existing?.name;
    const updated = list.filter((s) => s.id !== id);
    calendarWorkingSchedulesStore.saveSchedules(tenantId, updated);

    if (oldName) {
      const calEvents = masterCalendarStore.getEvents(tenantId);
      const syncedEvents = calEvents.filter((evt) => evt.title !== oldName && evt.workingScheduleId !== id);
      if (syncedEvents.length !== calEvents.length) {
        masterCalendarStore.saveEvents(tenantId, syncedEvents);
      }
    }
    return updated;
  },
};

// ─── Event Kinds & Event Types Store ────────────────────────────────────────

export const DEFAULT_CALENDAR_EVENT_TYPES = [
  { id: "et-1", name: "Mid-Term Examination", code: "MID_TERM_EXAMINATION", type: "EXAM", description: "Formal mid-term evaluation & exam schedule", order: 1, is_active: true },
  { id: "et-2", name: "Final Term Examination", code: "FINAL_TERM_EXAMINATION", type: "EXAM", description: "Annual and final institutional examinations", order: 2, is_active: true },
  { id: "et-3", name: "Weekly Holiday", code: "WEEKLY_HOLIDAY", type: "HOLIDAY", description: "Standard weekend institutional recess", order: 3, is_active: true },
  { id: "et-4", name: "Eid Vacation", code: "EID_VACATION", type: "HOLIDAY", description: "Special holiday closure for holy Eid celebration", order: 4, is_active: true },
  { id: "et-5", name: "Annual Sports & Cultural Day", code: "ANNUAL_SPORTS_DAY", type: "ACTIVITY", description: "Annual athletic competitions and campus gathering", order: 5, is_active: true },
  { id: "et-6", name: "Parent-Teacher Conference", code: "PARENT_TEACHER_CONFERENCE", type: "MEETING", description: "Quarterly progress review meetings with guardians", order: 6, is_active: true },
  { id: "et-7", name: "Special Academic Event", code: "SPECIAL_ACADEMIC_EVENT", type: "ACADEMIC", description: "Institutional conferences, orientation, and symposiums", order: 7, is_active: true },
];

export const DEFAULT_EVENT_KINDS = [
  { id: "HOLIDAY", value: "HOLIDAY", label: "Holiday", color: "rose" },
  { id: "EXAM", value: "EXAM", label: "Exam", color: "amber" },
  { id: "WORKING_HOURS", value: "WORKING_HOURS", label: "Working Hours", color: "indigo" },
  { id: "ACADEMIC", value: "ACADEMIC", label: "Academic / Class", color: "emerald" },
  { id: "MEETING", value: "MEETING", label: "Meeting", color: "blue" },
  { id: "ACTIVITY", value: "ACTIVITY", label: "Sports & Cultural", color: "purple" },
  { id: "GENERAL", value: "GENERAL", label: "General", color: "slate" },
];

export const calendarEventKindsStore = {
  getKinds: (tenantId) => {
    const key = `spr_calendar_event_kinds_${tenantId || 'default'}`;
    return readJSON(key, DEFAULT_EVENT_KINDS);
  },
  saveKinds: (tenantId, kinds) => {
    const key = `spr_calendar_event_kinds_${tenantId || 'default'}`;
    writeJSON(key, kinds);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_calendar_event_kinds_updated", { detail: kinds }));
    }
    return kinds;
  },
  addKind: (tenantId, kindData) => {
    const list = calendarEventKindsStore.getKinds(tenantId);
    const code = (kindData.value || kindData.label || "").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 30);
    const newKind = {
      id: code || `kind_${Date.now()}`,
      value: code || `KIND_${Date.now()}`,
      label: kindData.label || code,
      color: kindData.color || "emerald",
    };
    const updated = [...list, newKind];
    calendarEventKindsStore.saveKinds(tenantId, updated);
    return newKind;
  },
  updateKind: (tenantId, oldVal, updatedData) => {
    const list = calendarEventKindsStore.getKinds(tenantId);
    const newVal = updatedData.value ? updatedData.value.toUpperCase().replace(/[^A-Z0-9]/g, "_") : oldVal;
    const updated = list.map((k) => (k.value === oldVal ? { ...k, ...updatedData, value: newVal } : k));
    calendarEventKindsStore.saveKinds(tenantId, updated);

    if (newVal !== oldVal) {
      calendarEventTypesStore.migrateEventType(tenantId, oldVal, newVal);
      masterCalendarStore.migrateEventCategory(tenantId, oldVal, newVal);
    }
    return updated;
  },
  deleteKind: (tenantId, valToDelete, replacementVal) => {
    const list = calendarEventKindsStore.getKinds(tenantId);
    const updated = list.filter((k) => k.value !== valToDelete);
    calendarEventKindsStore.saveKinds(tenantId, updated);

    if (replacementVal) {
      calendarEventTypesStore.migrateEventType(tenantId, valToDelete, replacementVal);
      masterCalendarStore.migrateEventCategory(tenantId, valToDelete, replacementVal);
    }
    return updated;
  },
};

export const calendarEventTypesStore = {
  getEventTypes: (tenantId) => {
    const key = `spr_calendar_event_types_${tenantId || 'default'}`;
    return readJSON(key, DEFAULT_CALENDAR_EVENT_TYPES);
  },
  saveEventTypes: (tenantId, types) => {
    const key = `spr_calendar_event_types_${tenantId || 'default'}`;
    writeJSON(key, types);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_calendar_event_types_updated", { detail: types }));
    }
    return types;
  },
  addEventType: (tenantId, typeData) => {
    const list = calendarEventTypesStore.getEventTypes(tenantId);
    const newType = {
      ...typeData,
      id: typeData.id || `et_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      order: typeData.order || list.length + 1,
      is_active: typeData.is_active !== undefined ? typeData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newType];
    calendarEventTypesStore.saveEventTypes(tenantId, updated);
    return newType;
  },
  updateEventType: (tenantId, id, updatedData) => {
    const list = calendarEventTypesStore.getEventTypes(tenantId);
    const existing = list.find((t) => t.id === id || t.code === id);
    const oldName = existing?.name;
    const newName = updatedData.name || oldName;
    const oldType = existing?.type;
    const newType = updatedData.type || oldType;

    const updated = list.map((t) =>
      t.id === id || t.code === id
        ? {
            ...t,
            ...updatedData,
            id: t.id,
            code: t.code,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    calendarEventTypesStore.saveEventTypes(tenantId, updated);

    if (oldName) {
      const calEvents = masterCalendarStore.getEvents(tenantId);
      let changed = false;
      const syncedEvents = calEvents.map((evt) => {
        if (evt.title === oldName || evt.eventTypeId === id || String(evt.id) === String(id)) {
          changed = true;
          return {
            ...evt,
            title: newName,
            category: newType || evt.category,
            description: updatedData.description !== undefined ? updatedData.description : evt.description,
            updatedAt: new Date().toISOString(),
          };
        }
        return evt;
      });
      if (changed) {
        masterCalendarStore.saveEvents(tenantId, syncedEvents);
      }
    }
    return updated;
  },
  deleteEventType: (tenantId, id) => {
    const list = calendarEventTypesStore.getEventTypes(tenantId);
    const existing = list.find((t) => t.id === id);
    const oldName = existing?.name;
    const updated = list.filter((t) => t.id !== id);
    calendarEventTypesStore.saveEventTypes(tenantId, updated);

    if (oldName) {
      const calEvents = masterCalendarStore.getEvents(tenantId);
      const syncedEvents = calEvents.filter((evt) => evt.title !== oldName && evt.eventTypeId !== id);
      if (syncedEvents.length !== calEvents.length) {
        masterCalendarStore.saveEvents(tenantId, syncedEvents);
      }
    }
    return updated;
  },
  migrateEventType: (tenantId, fromType, toType) => {
    const list = calendarEventTypesStore.getEventTypes(tenantId);
    const updated = list.map((t) => (t.type === fromType ? { ...t, type: toType } : t));
    calendarEventTypesStore.saveEventTypes(tenantId, updated);
    return updated;
  },
};

// ─── System Impact Scopes Store ─────────────────────────────────────────────

export const DEFAULT_SYSTEM_IMPACT_SCOPES = [
  {
    id: "class_attendance",
    name: "Class Attendance",
    code: "CLASS_ATTENDANCE",
    badge: "Class Attendance",
    description: "Sync events, schedules, and holidays to student class periodic registers",
    is_active: true,
    order: 1,
  },
  {
    id: "residential_attendance",
    name: "Residential Attendance",
    code: "RESIDENTIAL_ATTENDANCE",
    badge: "Residential",
    description: "Sync events and roll-calls to boarding hostel & prayer checkpoints",
    is_active: true,
    order: 2,
  },
  {
    id: "teacher_attendance",
    name: "Teacher Class Attendance",
    code: "TEACHER_ATTENDANCE",
    badge: "Teacher Attendance",
    description: "Sync class schedule changes and leaves to teacher class conduction registers",
    is_active: true,
    order: 3,
  },
  {
    id: "staff_attendance",
    name: "Staff Daily Attendance",
    code: "STAFF_ATTENDANCE",
    badge: "Staff Attendance",
    description: "Sync institutional holidays and duty shifts to employee daily registers",
    is_active: true,
    order: 4,
  },
  {
    id: "notifications",
    name: "Push & In-App Notifications",
    code: "NOTIFICATIONS",
    badge: "Notifications",
    description: "Send instant alert and reminders to target audience members",
    is_active: true,
    order: 5,
  },
  {
    id: "routine",
    name: "Daily Timetable & Periods",
    code: "ROUTINE",
    badge: "Routine",
    description: "Adjust period slots, bells, and classroom routine during this time",
    is_active: true,
    order: 6,
  },
  {
    id: "reports",
    name: "Exam & Report Evaluation",
    code: "REPORTS",
    badge: "Reports",
    description: "Include event timetable in exam schedules and report builders",
    is_active: true,
    order: 7,
  },
  {
    id: "gate_access",
    name: "Gate & Biometric Movement",
    code: "GATE_ACCESS",
    badge: "Gate & RFID",
    description: "Synchronize campus entry/exit timings and biometric RFID gates",
    is_active: true,
    order: 8,
  },
];

export const calendarImpactScopesStore = {
  getScopes: (tenantId) => {
    const key = `spr_calendar_impact_scopes_${tenantId || 'default'}`;
    const stored = readJSON(key, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_SYSTEM_IMPACT_SCOPES;
    }
    let hasChanges = false;
    const merged = [...stored];
    DEFAULT_SYSTEM_IMPACT_SCOPES.forEach((def) => {
      const exists = merged.some((s) => s.id === def.id || s.code === def.code);
      if (!exists) {
        merged.push(def);
        hasChanges = true;
      }
    });
    if (hasChanges) {
      writeJSON(key, merged);
    }
    return merged;
  },
  saveScopes: (tenantId, scopes) => {
    const key = `spr_calendar_impact_scopes_${tenantId || 'default'}`;
    writeJSON(key, scopes);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_calendar_impact_scopes_updated", { detail: scopes }));
    }
    return scopes;
  },
  addScope: (tenantId, scopeData) => {
    const list = calendarImpactScopesStore.getScopes(tenantId);
    const code = (scopeData.code || scopeData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newScope = {
      ...scopeData,
      id: scopeData.id || code.toLowerCase() || `scope_${Date.now()}`,
      code: code || `SCOPE_${Date.now()}`,
      name: scopeData.name || code,
      badge: scopeData.badge || scopeData.name || code,
      description: scopeData.description || "",
      order: scopeData.order || list.length + 1,
      is_active: scopeData.is_active !== undefined ? scopeData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newScope];
    calendarImpactScopesStore.saveScopes(tenantId, updated);
    return newScope;
  },
  updateScope: (tenantId, id, updatedData) => {
    const list = calendarImpactScopesStore.getScopes(tenantId);
    const updated = list.map((s) =>
      s.id === id || s.code === id
        ? {
            ...s,
            ...updatedData,
            id: s.id,
            code: s.code,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    calendarImpactScopesStore.saveScopes(tenantId, updated);
    return updated;
  },
  deleteScope: (tenantId, id) => {
    const list = calendarImpactScopesStore.getScopes(tenantId);
    const updated = list.filter((s) => s.id !== id && s.code !== id);
    calendarImpactScopesStore.saveScopes(tenantId, updated);
    return updated;
  },
};

// ─── Attendance Restrictions & Policies Store ───────────────────────────────

export const DEFAULT_ATTENDANCE_EVENT_RESTRICTIONS = {
  "WEEKLY_HOLIDAY": { disabled: true, auto_excuse: true },
  "EID_VACATION": { disabled: true, auto_excuse: true },
  "MID_TERM_EXAMINATION": { disabled: true, auto_excuse: false },
  "FINAL_TERM_EXAMINATION": { disabled: true, auto_excuse: false },
  "ANNUAL_SPORTS_DAY": { disabled: false, auto_excuse: false },
  "PARENT_TEACHER_CONFERENCE": { disabled: false, auto_excuse: false },
  "SPECIAL_ACADEMIC_EVENT": { disabled: false, auto_excuse: false },
  "HOLIDAY": { disabled: true, auto_excuse: true },
};

export const attendanceEventRestrictionsStore = {
  getRestrictions: (tenantId) => {
    const key = `spr_attendance_event_restrictions_${tenantId || 'default'}`;
    return readJSON(key, DEFAULT_ATTENDANCE_EVENT_RESTRICTIONS);
  },
  saveRestrictions: (tenantId, restrictions) => {
    const key = `spr_attendance_event_restrictions_${tenantId || 'default'}`;
    writeJSON(key, restrictions);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_attendance_event_restrictions_updated", { detail: restrictions }));
    }
    return restrictions;
  },
  setEventDisabled: (tenantId, eventCodeOrId, isDisabled, extra = {}) => {
    const current = attendanceEventRestrictionsStore.getRestrictions(tenantId);
    const updated = {
      ...current,
      [eventCodeOrId]: {
        ...(current[eventCodeOrId] || {}),
        ...extra,
        disabled: Boolean(isDisabled),
      },
    };
    attendanceEventRestrictionsStore.saveRestrictions(tenantId, updated);
    return updated;
  },
  isAttendanceDisabledForEvent: (tenantId, evt) => {
    if (!evt) return false;
    const restrictions = attendanceEventRestrictionsStore.getRestrictions(tenantId);

    if (evt.code && restrictions[evt.code] !== undefined) {
      return Boolean(restrictions[evt.code]?.disabled);
    }
    if (evt.eventTypeId && restrictions[evt.eventTypeId] !== undefined) {
      return Boolean(restrictions[evt.eventTypeId]?.disabled);
    }
    if (evt.id && restrictions[evt.id] !== undefined) {
      return Boolean(restrictions[evt.id]?.disabled);
    }

    const titleSlug = (evt.title || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (titleSlug && restrictions[titleSlug] !== undefined) {
      return Boolean(restrictions[titleSlug]?.disabled);
    }

    const eventType = (evt.type || evt.rawType || "").toUpperCase();
    if (eventType && restrictions[eventType] !== undefined) {
      return Boolean(restrictions[eventType]?.disabled);
    }

    const eventCategory = (evt.category || "").toUpperCase();
    if (eventCategory && restrictions[eventCategory] !== undefined) {
      return Boolean(restrictions[eventCategory]?.disabled);
    }

    if (eventCategory === "HOLIDAY" || eventType === "HOLIDAY") {
      return true;
    }
    return false;
  },
};

export const DEFAULT_ATTENDANCE_TIMING_POLICY = {
  class_late_start_minutes: 10,
  class_late_end_minutes: 25,
  class_end_buffer_minutes: 15,
  class_teacher_edit_window_hours: 4,
  class_auto_absent_on_expiry: true,

  residential_late_start_minutes: 15,
  residential_late_end_minutes: 35,
  residential_end_buffer_minutes: 45,
  residential_teacher_edit_window_hours: 4,
  residential_auto_absent_on_expiry: true,

  staff_start_time: "07:30",
  staff_late_start_time: "08:15",
  staff_late_end_time: "09:00",
  staff_end_time: "10:00",
  staff_teacher_edit_window_hours: 2,
  staff_auto_absent_on_expiry: true,

  admin_edit_window_days: 30,

  effective_from: "2026-01-01",
  history_log: [],
};

export const attendanceTimingPolicyStore = {
  getPolicy: (tenantId) => {
    const key = `spr_attendance_timing_policy_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || typeof raw !== 'object') {
      writeJSON(key, DEFAULT_ATTENDANCE_TIMING_POLICY);
      return DEFAULT_ATTENDANCE_TIMING_POLICY;
    }
    return { ...DEFAULT_ATTENDANCE_TIMING_POLICY, ...raw };
  },
  savePolicy: (tenantId, policyData) => {
    const key = `spr_attendance_timing_policy_${tenantId || 'default'}`;
    const previous = attendanceTimingPolicyStore.getPolicy(tenantId);
    const todayStr = new Date().toISOString().split('T')[0];

    const coreKeys = [
      'class_late_start_minutes', 'class_late_end_minutes', 'class_end_buffer_minutes',
      'class_teacher_edit_window_hours', 'class_auto_absent_on_expiry',
      'residential_late_start_minutes', 'residential_late_end_minutes', 'residential_end_buffer_minutes',
      'residential_teacher_edit_window_hours', 'residential_auto_absent_on_expiry',
      'staff_start_time', 'staff_late_start_time', 'staff_late_end_time', 'staff_end_time',
      'staff_teacher_edit_window_hours', 'staff_auto_absent_on_expiry',
      'admin_edit_window_days',
    ];

    const hasChanged = coreKeys.some(
      (k) => previous[k] !== undefined && policyData[k] !== undefined && previous[k] !== policyData[k]
    );

    let historyLog = Array.isArray(previous.history_log) ? [...previous.history_log] : [];

    if (hasChanged && previous.effective_from && previous.effective_from < todayStr) {
      const prevDateObj = new Date();
      prevDateObj.setDate(prevDateObj.getDate() - 1);
      const yesterdayStr = prevDateObj.toISOString().split('T')[0];

      const snapshot = {};
      coreKeys.forEach((k) => {
        if (previous[k] !== undefined) snapshot[k] = previous[k];
      });

      historyLog.push({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        effective_from: previous.effective_from,
        effective_to: yesterdayStr,
        created_at: new Date().toISOString(),
        policy: snapshot,
      });
    }

    const merged = {
      ...DEFAULT_ATTENDANCE_TIMING_POLICY,
      ...previous,
      ...policyData,
      effective_from: hasChanged ? todayStr : (policyData.effective_from || previous.effective_from || todayStr),
      history_log: policyData.history_log && Array.isArray(policyData.history_log) && policyData.history_log.length > 0 ? policyData.history_log : historyLog,
    };
    writeJSON(key, merged);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_attendance_timing_policy_updated", { detail: merged }));
    }
    return merged;
  },
  fetchRemotePolicy: async (tenantId) => {
    try {
      const res = await fetch(`/api/v1/attendance/policy/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spr_auth_token') || ''}`,
          'X-Tenant-Id': tenantId || '',
        }
      });
      if (res.ok) {
        const data = await res.json();
        return attendanceTimingPolicyStore.savePolicy(tenantId, data);
      }
    } catch (err) {
      console.warn("Could not fetch remote attendance policy, using local store:", err);
    }
    return attendanceTimingPolicyStore.getPolicy(tenantId);
  },
  saveRemotePolicy: async (tenantId, policyData) => {
    attendanceTimingPolicyStore.savePolicy(tenantId, policyData);
    try {
      const res = await fetch(`/api/v1/attendance/policy/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('spr_auth_token') || ''}`,
          'X-Tenant-Id': tenantId || '',
        },
        body: JSON.stringify(policyData),
      });
      if (res.ok) {
        const data = await res.json();
        return attendanceTimingPolicyStore.savePolicy(tenantId, data);
      }
    } catch (err) {
      console.warn("Could not save remote attendance policy:", err);
    }
    return attendanceTimingPolicyStore.getPolicy(tenantId);
  },
};

// ─── Institutional Weekly Holidays & Weekend Settings ────────────────────────

export const WEEKDAY_OPTIONS = [
  { code: "SATURDAY", label: "Saturday", short: "Sat" },
  { code: "SUNDAY", label: "Sunday", short: "Sun" },
  { code: "MONDAY", label: "Monday", short: "Mon" },
  { code: "TUESDAY", label: "Tuesday", short: "Tue" },
  { code: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { code: "THURSDAY", label: "Thursday", short: "Thu" },
  { code: "FRIDAY", label: "Friday", short: "Fri" },
];

export const WEEKEND_PRESETS = [
  { id: "fri", label: "Friday Only (Madrasa Standard)", days: ["FRIDAY"] },
  { id: "thu_fri", label: "Thursday & Friday (2 Days Weekend)", days: ["THURSDAY", "FRIDAY"] },
  { id: "fri_sat", label: "Friday & Saturday (National Weekend)", days: ["FRIDAY", "SATURDAY"] },
  { id: "sun", label: "Sunday Only (General Standard)", days: ["SUNDAY"] },
  { id: "sat_sun", label: "Saturday & Sunday (International Weekend)", days: ["SATURDAY", "SUNDAY"] },
];

export const DEFAULT_WEEKLY_HOLIDAYS_CONFIG = {
  weekendDays: ["FRIDAY"],
  title: "Weekly Institutional Holiday",
  description: "Official weekly institutional recess and holiday",
  affectsTimetable: true,
  affectsAttendance: true,
};

export const weeklyHolidaysStore = {
  getHolidays: (tenantId) => {
    const key = `spr_weekly_holidays_${tenantId || 'default'}`;
    const stored = readJSON(key, null);
    if (!stored || typeof stored !== 'object') {
      return DEFAULT_WEEKLY_HOLIDAYS_CONFIG;
    }
    return {
      ...DEFAULT_WEEKLY_HOLIDAYS_CONFIG,
      ...stored,
      weekendDays: Array.isArray(stored.weekendDays) && stored.weekendDays.length > 0
        ? stored.weekendDays
        : DEFAULT_WEEKLY_HOLIDAYS_CONFIG.weekendDays,
    };
  },
  saveHolidays: (tenantId, config) => {
    const key = `spr_weekly_holidays_${tenantId || 'default'}`;
    const payload = {
      ...DEFAULT_WEEKLY_HOLIDAYS_CONFIG,
      ...config,
      updatedAt: new Date().toISOString(),
    };
    writeJSON(key, payload);

    // Synchronize auto-excuse recurring weekly event in Master Event Calendar
    syncWeeklyHolidayEvents(tenantId, payload);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("spr_weekly_holidays_updated", { detail: payload }));
    }
    return payload;
  },
  isWeekendDay: (tenantId, dayCodeOrName) => {
    if (!dayCodeOrName) return false;
    const config = weeklyHolidaysStore.getHolidays(tenantId);
    const code = String(dayCodeOrName).toUpperCase().trim();
    return (config.weekendDays || []).some(
      (d) => d.toUpperCase() === code || code.startsWith(d.toUpperCase().slice(0, 3)) || d.toUpperCase().startsWith(code.slice(0, 3))
    );
  },
  getWorkingDays: (tenantId) => {
    const config = weeklyHolidaysStore.getHolidays(tenantId);
    const weekendDays = (config.weekendDays || []).map((d) => String(d).toUpperCase().trim());
    return WEEKDAY_OPTIONS.filter((w) => {
      const fullCode = w.code.toUpperCase();
      const shortCode = w.short.toUpperCase();
      return !weekendDays.some((wd) => wd === fullCode || wd.startsWith(shortCode) || fullCode.startsWith(wd.slice(0, 3)));
    });
  },
  getWorkingDayCodes: (tenantId, useShort = true) => {
    const working = weeklyHolidaysStore.getWorkingDays(tenantId);
    return working.map((w) => (useShort ? w.short.toUpperCase() : w.code));
  },
  getOrderedWeekdays: (tenantId) => {
    const firstDayStr = (calendarSettings.getFirstDay() || "Saturday").toUpperCase().trim();
    const startIndex = WEEKDAY_OPTIONS.findIndex(
      (w) =>
        w.label.toUpperCase() === firstDayStr ||
        w.code === firstDayStr ||
        w.short.toUpperCase() === firstDayStr.slice(0, 3)
    );
    if (startIndex <= 0) return [...WEEKDAY_OPTIONS];
    return [...WEEKDAY_OPTIONS.slice(startIndex), ...WEEKDAY_OPTIONS.slice(0, startIndex)];
  },
  normalizeDayCode: (dayCodeOrName) => {
    if (!dayCodeOrName) return "";
    const str = String(dayCodeOrName).toUpperCase().trim();
    const found = WEEKDAY_OPTIONS.find(
      (w) =>
        w.code === str ||
        w.short.toUpperCase() === str ||
        w.label.toUpperCase() === str ||
        str.startsWith(w.short.toUpperCase())
    );
    return found ? found.short.toUpperCase() : str.slice(0, 3);
  },
  formatScheduleDaysSummary: (scheduleDays = [], scheduleType = 'FULL_WEEK', tenantId = null) => {
    if (scheduleType !== 'SPLIT_DAYS') {
      const workingDays = weeklyHolidaysStore.getWorkingDays(tenantId);
      return `Full Week (${workingDays.length} Days)`;
    }
    if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) {
      return 'Split Days';
    }
    const shortNames = scheduleDays.map((d) => {
      const normalized = weeklyHolidaysStore.normalizeDayCode(d);
      const found = WEEKDAY_OPTIONS.find((w) => w.short.toUpperCase() === normalized);
      return found ? found.short : normalized;
    });
    return `Split: ${shortNames.join(', ')}`;
  },
};

/**
 * Synchronizes weekly holiday recurring events directly into the Master Event Calendar.
 */
export const syncWeeklyHolidayEvents = (tenantId, holidayConfig) => {
  const allEvents = masterCalendarStore.getEvents(tenantId);
  const targetTenant = tenantId || "default";
  const syncEventId = `weekly_holidays_sync_${targetTenant}`;

  // Filter out previous auto-synced holiday event
  const remaining = allEvents.filter(
    (e) => !e.isWeeklyHolidayEvent && e.id !== syncEventId
  );

  if (
    holidayConfig &&
    holidayConfig.affectsAttendance &&
    Array.isArray(holidayConfig.weekendDays) &&
    holidayConfig.weekendDays.length > 0
  ) {
    const dayMap = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const dayNumbers = holidayConfig.weekendDays
      .map((code) => {
        const c = String(code).toUpperCase().trim();
        return dayMap[c] !== undefined ? dayMap[c] : null;
      })
      .filter((n) => n !== null);

    const dayLabels = holidayConfig.weekendDays
      .map((code) => WEEKDAY_OPTIONS.find((w) => w.code === code)?.label || code)
      .join(", ");

    const holidayKind = calendarEventKindsStore.getKinds(tenantId).find(
      (k) => k.value === "HOLIDAY" || k.id === "HOLIDAY"
    );
    const holidayColor = holidayKind?.color || "rose";

    const syncedEvent = {
      id: syncEventId,
      title: `Weekly Holiday (${dayLabels})`,
      category: "HOLIDAY",
      color: holidayColor,
      audience: "ALL",
      startDate: `${new Date().getFullYear()}-01-01`,
      isFullDay: true,
      repeats: true,
      frequency: "WEEKLY",
      repeatDays: dayNumbers,
      until: "ONGOING",
      priorityRank: 2,
      impacts: ["ALL"],
      description: `Official recurring weekly holiday on ${dayLabels} with automatic attendance excuse.`,
      isWeeklyHolidayEvent: true,
      auto_excuse: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [syncedEvent, ...remaining];
    masterCalendarStore.saveEvents(tenantId, updated);
    return syncedEvent;
  } else {
    masterCalendarStore.saveEvents(tenantId, remaining);
    return null;
  }
};


