/**
 * SPR Note — Central LocalStorage Store
 * =======================================
 * Centralized localStorage key management.
 * Offline-first: Data is retrieved from local cache if API is unavailable.
 * Online sync: Local cache is updated on successful API responses.
 */

// ─── Key Constants ─────────────────────────────────────────────────────────
export const KEYS = {
  // Auth & Multi-Account
  ACCESS_TOKEN:   "accessToken",
  REFRESH_TOKEN:  "refreshToken",
  USER:           "user",
  SAVED_ACCOUNTS: "spr_saved_accounts",


  // Student & Session data
  STUDENTS:       "spr_students",
  SESSIONS:       "spr_sessions",

  // Comment templates
  SAVED_COMMENTS: "spr_saved_comments",

  // Calendar / Date-Time settings
  TIMEZONE:       "spr_timezone",
  DATE_FORMAT:    "spr_date_format",
  FIRST_DAY:      "spr_first_day_of_week",
  ENABLE_HIJRI:   "spr_enable_hijri",

  // Appearance
  THEME:          "spr_app_theme",
  MODE:           "spr_app_mode",
  FONT_ID:        "spr_app_font_id",
  FONT_SIZE:      "spr_app_font_size",

  // Copy Report settings
  COPY_GROUP:     "spr_copy_include_group",
  COPY_TEACHER:   "spr_copy_include_teacher",
  COPY_AUTO:      "spr_copy_auto_copy",
  COPY_DATE_FORMAT:"spr_copy_date_format",

  // Sync engine & drafts
  REPORTS:        "spr_reports_local_v1",
  PENDING_QUEUE:  "spr_reports_pending_queue",
  LAST_SYNCED_AT: "spr_last_synced_at",
  DRAFT_REPORT:   "spr_report_draft",
  SAVE_STATUS:    "spr_save_status",
};

// ─── Generic helpers ────────────────────────────────────────────────────────

/** JSON-safe read. Returns `defaultValue` on parse error or missing key. */
function readJSON(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/** JSON-safe write. Silently ignores quota errors. */
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[localStore] Failed to write key "${key}":`, err);
  }
}

function readString(key, defaultValue = "") {
  return localStorage.getItem(key) ?? defaultValue;
}

function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[localStore] Failed to write key "${key}":`, err);
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  getUser:         ()    => readJSON(KEYS.USER, null),
  getUserProfile:  ()    => readJSON(KEYS.USER, null),
  saveUser:        (u)   => writeJSON(KEYS.USER, u),
  saveUserProfile: (u)   => writeJSON(KEYS.USER, u),
  getAccessToken:  ()    => readString(KEYS.ACCESS_TOKEN),
  getToken:        ()    => readString(KEYS.ACCESS_TOKEN),
  saveAccessToken: (t)   => writeString(KEYS.ACCESS_TOKEN, t),
  getRefreshToken: ()    => readString(KEYS.REFRESH_TOKEN),
  saveRefreshToken:(t)   => writeString(KEYS.REFRESH_TOKEN, t),
  saveTokens: (access, refresh) => {
    if (access) writeString(KEYS.ACCESS_TOKEN, access);
    if (refresh) writeString(KEYS.REFRESH_TOKEN, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER);
  },
  clear: () => {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER);
  },
  isLoggedIn: () => {
    return !!readString(KEYS.ACCESS_TOKEN) && !!readJSON(KEYS.USER, null);
  },
};

export const multiAccount = {
  getAccounts: () => readJSON(KEYS.SAVED_ACCOUNTS, []),

  saveAccount: (accountData) => {
    const list = multiAccount.getAccounts();
    const id = accountData.user?.phone_number || accountData.user?.username || accountData.user?.id;
    if (!id) return list;

    const filtered = list.filter((a) => {
      const existingId = a.user?.phone_number || a.user?.username || a.user?.id;
      return existingId !== id;
    });

    const updated = [accountData, ...filtered];
    writeJSON(KEYS.SAVED_ACCOUNTS, updated);
    return updated;
  },

  removeAccount: (identifier) => {
    const list = multiAccount.getAccounts();
    const updated = list.filter((a) => {
      const id = a.user?.phone_number || a.user?.username || a.user?.id;
      return id !== identifier;
    });
    writeJSON(KEYS.SAVED_ACCOUNTS, updated);
    return updated;
  },

  switchAccount: (identifier) => {
    const list = multiAccount.getAccounts();
    const target = list.find((a) => {
      const id = a.user?.phone_number || a.user?.username || a.user?.id;
      return id === identifier;
    });

    if (target && target.access && target.user) {
      // Save current account to multi-account list first
      const currentUser = auth.getUser();
      const currentToken = auth.getAccessToken();
      const currentRefresh = auth.getRefreshToken();
      if (currentUser && currentToken) {
        multiAccount.saveAccount({
          user: currentUser,
          access: currentToken,
          refresh: currentRefresh,
        });
      }

      // Set target active credentials
      auth.saveAccessToken(target.access);
      if (target.refresh) auth.saveRefreshToken(target.refresh);
      auth.saveUser(target.user);

      window.dispatchEvent(new CustomEvent("spr_auth_updated"));
      return true;
    }
    return false;
  },
};


// ─── Students ───────────────────────────────────────────────────────────────
// Shape: [{ label: "Ahmed", sub: "Group A", _local?: true }, ...]

export const students = {
  getAll: () => readJSON(KEYS.STUDENTS, []),

  saveAll: (list) => writeJSON(KEYS.STUDENTS, list),

  /** Add new student (with unique ID support). */
  add: (student) => {
    const list = students.getAll();
    const newId = student.id || `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newStudentItem = {
      id: newId,
      label: student.label || student.name || "",
      sub: student.sub || student.group || student.group_name || "General Group",
      _local: true,
      ...student,
    };

    // Check exact duplicate ID or exact same name AND group AND ID
    const isExactDuplicate = list.some(
      (s) => s.id && s.id === newId
    );

    if (!isExactDuplicate) {
      const updated = [...list, newStudentItem];
      writeJSON(KEYS.STUDENTS, updated);
      return updated;
    }
    return list;
  },

  /** Update student by label (replace mode). */
  replace: (oldLabel, newStudent) => {
    const list = students.getAll();
    const updated = list.map((s) =>
      s.label?.toLowerCase() === oldLabel?.toLowerCase() ? { ...s, ...newStudent } : s
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Update group name across all associated students. */
  updateGroupName: (oldGroupName, newGroupName) => {
    const list = students.getAll();
    const updated = list.map((s) => {
      if ((s.sub || "General Group").toLowerCase() === oldGroupName.toLowerCase()) {
        return { ...s, sub: newGroupName, _local: true };
      }
      return s;
    });
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Remove all students in a specified group. */
  removeGroup: (groupName) => {
    const list = students.getAll();
    const updated = list.filter(
      (s) => (s.sub || "General Group").toLowerCase() !== groupName.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** Delete student by name or ID. */
  remove: (identifier) => {
    const updated = students.getAll().filter(
      (s) =>
        (s.id && String(s.id) !== String(identifier)) &&
        s.label?.toLowerCase() !== String(identifier)?.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },
};

/**
 * mergeStudents — Merges API data with LocalStorage data.
 */
export function mergeStudents(apiStudents, localStudents) {
  const apiList = (Array.isArray(apiStudents) ? apiStudents : []).map((s) => ({
    id: s.id ?? null,
    label: s.label || s.name || s.student_name || String(s),
    sub: s.sub || s.group_name || s.group || "General Group",
  }));

  const apiIds = new Set(apiList.map((s) => String(s.id)).filter((id) => id && id !== "null" && id !== "undefined"));
  const apiKeys = new Set(apiList.map((s) => `${(s.label || "").trim().toLowerCase()}_${(s.sub || "").trim().toLowerCase()}`));

  // Preserve ONLY local additions that are NOT in API (neither by ID nor by name+group key)
  const localOnly = (Array.isArray(localStudents) ? localStudents : [])
    .filter((s) => {
      if (!s || (!s.label && !s.name)) return false;
      const sId = s.id ? String(s.id) : null;
      const sKey = `${(s.label || s.name || "").trim().toLowerCase()}_${(s.sub || s.group || s.group_name || "General Group").trim().toLowerCase()}`;
      
      // If student ID is in API, it is NOT local-only
      if (sId && apiIds.has(sId)) return false;
      // If student name+group key is in API, it is NOT local-only
      if (apiKeys.has(sKey)) return false;
      
      // Keep only if it's marked _local
      return Boolean(s._local);
    })
    .map((s) => ({ ...s, _local: true }));

  // Final deduplicated list
  const seenKeys = new Set();
  const merged = [];

  for (const s of [...apiList, ...localOnly]) {
    const key = s.id
      ? `id_${s.id}`
      : `key_${(s.label || "").trim().toLowerCase()}_${(s.sub || "").trim().toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push(s);
    }
  }

  writeJSON(KEYS.STUDENTS, merged);
  return merged;
}


export const sessions = {
  getAll: () => {
    return readJSON(KEYS.SESSIONS, []);
  },

  saveAll: (list) => writeJSON(KEYS.SESSIONS, list),

  /** Add new session. */
  add: (sessionName) => {
    const list = sessions.getAll();
    const exists = list.some(
      (s) => s.name?.toLowerCase() === sessionName?.toLowerCase()
    );
    if (!exists) {
      const newSession = {
        id: crypto.randomUUID(),
        name: sessionName,
        _local: true, // sync pending flag
      };
      const updated = [...list, newSession];
      writeJSON(KEYS.SESSIONS, updated);
      return { updated, newSession };
    }
    return { updated: list, newSession: null };
  },

  /** Delete session by ID or name. */
  remove: (idOrName) => {
    const updated = sessions.getAll().filter(
      (s) => s.id !== idOrName && s.name !== idOrName
    );
    writeJSON(KEYS.SESSIONS, updated);
    return updated;
  },
};

/**
 * mergeSessions — Merges API sessions with LocalStorage sessions without duplicates.
 *
 * Rules:
 *  1. API data is authoritative (server ID present, no _local flag)
 *  2. Local-only sessions (not in API, _local: true) are appended
 *  3. No duplicate names
 *  4. Merged result is persisted to LocalStorage cache
 */
export function mergeSessions(apiSessions, localSessions) {
  // Set of API item names (case-insensitive)
  const apiNames = new Set(apiSessions.map((s) => s.name?.toLowerCase()));

  // LocalStorage items that are not in API (offline-only)
  const localOnly = localSessions
    .filter((s) => !apiNames.has(s.name?.toLowerCase()))
    .map((s) => ({ ...s, _local: true }));

  // API items (clean, remove _local flag) + local-only items
  const merged = [
    ...apiSessions.map((s) => {
      const copy = { ...s };
      delete copy._local;
      return copy;
    }),
    ...localOnly,
  ];

  // Save to cache
  writeJSON(KEYS.SESSIONS, merged);
  return merged;
}

// ─── Saved Comments (Templates) ─────────────────────────────────────────────
// Shape: [{ id, text, _local }, ...] or ["text 1", "text 2", ...]

export const savedComments = {
  getAll: () => readJSON(KEYS.SAVED_COMMENTS, []),

  saveAll: (list) => writeJSON(KEYS.SAVED_COMMENTS, list),

  add: (text) => {
    const trimmed = typeof text === "string" ? text.trim() : (text?.text || "").trim();
    if (!trimmed) return savedComments.getAll();
    const list = savedComments.getAll();
    const exists = list.some((item) => {
      const itemText = typeof item === "object" && item !== null ? item.text : item;
      return (itemText || "").toLowerCase() === trimmed.toLowerCase();
    });
    if (!exists) {
      const newItem = { id: crypto.randomUUID(), text: trimmed, _local: true };
      const updated = [...list, newItem];
      writeJSON(KEYS.SAVED_COMMENTS, updated);
      return { updated, newItem };
    }
    return { updated: list, newItem: null };
  },

  remove: (idOrTextOrIndex) => {
    const list = savedComments.getAll();
    const updated = list.filter((item, idx) => {
      if (typeof idOrTextOrIndex === "number" && idx === idOrTextOrIndex) {
        return false;
      }
      if (typeof item === "string") {
        return item.toLowerCase() !== String(idOrTextOrIndex).toLowerCase();
      }
      if (typeof item === "object" && item !== null) {
        return (
          item.id !== idOrTextOrIndex &&
          (item.text || "").toLowerCase() !== String(idOrTextOrIndex).toLowerCase()
        );
      }
      return true;
    });
    writeJSON(KEYS.SAVED_COMMENTS, updated);
    return updated;
  },
};

/**
 * mergeComments — Merges API data with LocalStorage data.
 * Server data is authoritative when online.
 * Only local-only comments (_local: true) that have not been synced yet are preserved.
 */
export function mergeComments(apiComments, localComments) {
  const apiNormalized = (Array.isArray(apiComments) ? apiComments : [])
    .map((c) => {
      if (typeof c === "object" && c !== null) {
        return { id: c.id, text: c.text || c.comment || "" };
      }
      return { id: crypto.randomUUID(), text: String(c) };
    })
    .filter((c) => Boolean(c.text && c.text.trim()));

  const apiTextsLower = new Set(apiNormalized.map((c) => c.text.toLowerCase()));

  // LocalStorage items pending sync (have _local: true and not present in API)
  const localOnly = (Array.isArray(localComments) ? localComments : []).filter((c) => {
    if (typeof c === "object" && c !== null) {
      return c._local && !apiTextsLower.has((c.text || "").toLowerCase());
    }
    return false;
  });

  const merged = [...apiNormalized, ...localOnly];
  writeJSON(KEYS.SAVED_COMMENTS, merged);
  return merged;
}

// ─── Calendar / Date-Time Settings ──────────────────────────────────────────

export const calendarSettings = {
  getTimezone:    () => readString(KEYS.TIMEZONE, "Asia/Dhaka"),
  saveTimezone:   (v) => writeString(KEYS.TIMEZONE, v),

  getDateFormat:  () => readString(KEYS.DATE_FORMAT, "DD/MM/YYYY"),
  saveDateFormat: (v) => writeString(KEYS.DATE_FORMAT, v),

  getFirstDay:    () => readString(KEYS.FIRST_DAY, "Saturday"),
  saveFirstDay:   (v) => writeString(KEYS.FIRST_DAY, v),

  getHijriEnabled:  () => readString(KEYS.ENABLE_HIJRI, "false") === "true",
  saveHijriEnabled: (v) => writeString(KEYS.ENABLE_HIJRI, v.toString()),
};

export const dateTimeSettings = calendarSettings;

// ─── Appearance Settings ─────────────────────────────────────────────────────

export const appearanceSettings = {
  getTheme:     () => readString(KEYS.THEME, "slate"),
  saveTheme:    (v) => writeString(KEYS.THEME, v),

  getMode:      () => readString(KEYS.MODE, "dark"),
  saveMode:     (v) => writeString(KEYS.MODE, v),

  getFontId:    () => readString(KEYS.FONT_ID, "Outfit"),
  saveFontId:   (v) => writeString(KEYS.FONT_ID, v),

  getFontSize:  () => readString(KEYS.FONT_SIZE, "normal"),
  saveFontSize: (v) => writeString(KEYS.FONT_SIZE, v),
};

// ─── Copy Report Settings ────────────────────────────────────────────────────

export const copyReportSettings = {
  getIncludeGroup:   () => readString(KEYS.COPY_GROUP, "true") !== "false",
  saveIncludeGroup:  (v) => writeString(KEYS.COPY_GROUP, v.toString()),

  getIncludeTeacher: () => readString(KEYS.COPY_TEACHER, "true") !== "false",
  saveIncludeTeacher:(v) => writeString(KEYS.COPY_TEACHER, v.toString()),

  getTeacherName:    () => readString("spr_copy_teacher_name", "Mustafa"),
  saveTeacherName:   (v) => writeString("spr_copy_teacher_name", v),

  getAutoCopy:       () => readString(KEYS.COPY_AUTO, "false") === "true",
  saveAutoCopy:      (v) => writeString(KEYS.COPY_AUTO, v.toString()),

  getDateFormat:     () => readString(KEYS.COPY_DATE_FORMAT, "DD/MM/YYYY"),
  saveDateFormat:    (v) => writeString(KEYS.COPY_DATE_FORMAT, v),
};

// ─── Sidebar Display Mode Settings ─────────────────────────────────────────

export const sidebarSettings = {
  getMode: () => readString("spr_sidebar_mode", "inline"),
  saveMode: (v) => writeString("spr_sidebar_mode", v),
};

// ─── Network Utility ────────────────────────────────────────────────────────

/** Returns true if browser is online */
export const isOnline = () => navigator.onLine;

// ─── Draft Report & Live Save Status ─────────────────────────────────────────

export const draftReport = {
  getAll: () => readJSON("spr_draft_reports_list", []),
  getById: (id) => {
    const list = readJSON("spr_draft_reports_list", []);
    return list.find(d => d.id === id) || null;
  },
  save: (id, formData) => {
    if (!id) return null;
    const list = readJSON("spr_draft_reports_list", []);
    const payload = {
      id,
      ...formData,
      timestamp: new Date().toISOString(),
      savedAtTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      savedAtDate: new Date().toLocaleDateString(),
    };
    const idx = list.findIndex(d => d.id === id);
    if (idx > -1) {
      list[idx] = payload;
    } else {
      list.push(payload);
    }
    if (list.length > 10) {
      list.shift();
    }
    writeJSON("spr_draft_reports_list", list);
    return payload;
  },
  remove: (id) => {
    const list = readJSON("spr_draft_reports_list", []);
    const updated = list.filter(d => d.id !== id);
    writeJSON("spr_draft_reports_list", updated);
  },
  clear: () => {
    localStorage.removeItem("spr_draft_reports_list");
  },
  get: () => {
    const list = readJSON("spr_draft_reports_list", []);
    return list[list.length - 1] || null;
  }
};

export const saveStatusStore = {
  get: () => readJSON(KEYS.SAVE_STATUS, { type: "local", label: "Saved", timestamp: Date.now() }),
  set: (type, label = "") => {
    const defaultLabel = type === "database" ? "Database Synced" : "Saved (Local)";
    const payload = {
      type, // "local" | "database" | "saving"
      label: label || defaultLabel,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    };
    writeJSON(KEYS.SAVE_STATUS, payload);
    window.dispatchEvent(new CustomEvent("spr_save_status_change", { detail: payload }));
    return payload;
  },
};

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

const DEFAULT_CALENDAR_EVENTS = [
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
    description: "Comprehensive mid-term evaluation across all academic levels",
  },
];

export const masterCalendarStore = {
  getEvents: (tenantId) => {
    const key = `spr_master_calendar_${tenantId || 'default'}`;
    return readJSON(key, DEFAULT_CALENDAR_EVENTS);
  },
  saveEvents: (tenantId, events) => {
    const key = `spr_master_calendar_${tenantId || 'default'}`;
    writeJSON(key, events);
    window.dispatchEvent(new CustomEvent("spr_calendar_events_updated", { detail: events }));
    return events;
  },
  addEvent: (tenantId, eventData) => {
    const list = masterCalendarStore.getEvents(tenantId);
    const newEvent = {
      ...eventData,
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

    // Case 1: Only for this single day occurrence
    if (editScope === "THIS_EVENT" && eventId) {
      const existing = list.find((e) => e.id === eventId);
      if (existing) {
        // If the event being edited is ALREADY a single override (isOverride: true), just update it directly!
        if (existing.isOverride) {
          const updated = list.map((e) => (e.id === eventId ? { ...e, ...updatedData, impacts: cleanImpacts, updatedAt: new Date().toISOString() } : e));
          masterCalendarStore.saveEvents(tenantId, updated);
          return updated.find((e) => e.id === eventId);
        }

        // Add targetDate to parent's exception list
        const exceptions = Array.isArray(existing.exceptions) ? [...existing.exceptions] : [];
        if (!exceptions.includes(targetDate)) {
          exceptions.push(targetDate);
        }

        // Single override event for this specific date
        const singleOverride = {
          ...existing,
          ...updatedData,
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
        // Calculate day before targetDate
        const targetD = new Date(targetDate);
        const prevD = new Date(targetD);
        prevD.setDate(prevD.getDate() - 1);
        const prevDateStr = prevD.toISOString().split("T")[0];

        // End old series at prevDateStr
        const cappedOld = {
          ...existing,
          until: "DATE",
          untilDate: prevDateStr,
          updatedAt: new Date().toISOString(),
        };

        // Create new series from targetDate onwards
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

    // Case 1: Delete only this single day occurrence
    if (deleteScope === "THIS_EVENT") {
      // If it's a single override event or non-recurring, delete it directly
      if (existing.isOverride || !existing.repeats) {
        const updated = list.filter((e) => e.id !== eventId);
        masterCalendarStore.saveEvents(tenantId, updated);
        return updated;
      }
      // Add targetDate to parent's exceptions
      const exceptions = Array.isArray(existing.exceptions) ? [...existing.exceptions] : [];
      if (!exceptions.includes(targetDate)) {
        exceptions.push(targetDate);
      }
      const updated = list.map((e) => (e.id === eventId ? { ...e, exceptions, updatedAt: new Date().toISOString() } : e));
      masterCalendarStore.saveEvents(tenantId, updated);
      return updated;
    }

    // Case 2: Delete this and following days (preserves past history)
    if (deleteScope === "THIS_AND_FOLLOWING") {
      const targetD = new Date(targetDate);
      const prevD = new Date(targetD);
      prevD.setDate(prevD.getDate() - 1);
      const prevDateStr = prevD.toISOString().split("T")[0];

      // If targetDate is <= startDate, delete whole event
      if (existing.startDate && targetDate <= existing.startDate) {
        const updated = list.filter((e) => e.id !== eventId);
        masterCalendarStore.saveEvents(tenantId, updated);
        return updated;
      }

      // Otherwise cap old series at prevDateStr
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

    // Case 3: All occurrences (Default)
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

export const DEFAULT_CALENDAR_EVENT_TYPES = [
  { id: "et-1", name: "Morning Working Session", code: "MORNING_WORKING_SESSION", type: "WORKING_HOURS", description: "Standard morning operational shifts and faculty hours", order: 1, is_active: true },
  { id: "et-2", name: "Evening Support Session", code: "EVENING_SUPPORT_SESSION", type: "WORKING_HOURS", description: "Evening tutorial, revision, and support hours", order: 2, is_active: true },
  { id: "et-3", name: "Weekly Holiday", code: "WEEKLY_HOLIDAY", type: "HOLIDAY", description: "Standard weekend institutional recess", order: 3, is_active: true },
  { id: "et-4", name: "Eid Vacation", code: "EID_VACATION", type: "HOLIDAY", description: "Special holiday closure for holy Eid celebration", order: 4, is_active: true },
  { id: "et-5", name: "Mid-Term Examination", code: "MID_TERM_EXAMINATION", type: "EXAM", description: "Formal mid-term evaluation & exam schedule", order: 5, is_active: true },
  { id: "et-6", name: "Final Term Examination", code: "FINAL_TERM_EXAMINATION", type: "EXAM", description: "Annual and final institutional examinations", order: 6, is_active: true },
  { id: "et-7", name: "Annual Sports & Cultural Day", code: "ANNUAL_SPORTS_DAY", type: "ACTIVITY", description: "Annual athletic competitions and campus gathering", order: 7, is_active: true },
  { id: "et-8", name: "Parent-Teacher Conference", code: "PARENT_TEACHER_CONFERENCE", type: "MEETING", description: "Quarterly progress review meetings with guardians", order: 8, is_active: true },
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
    window.dispatchEvent(new CustomEvent("spr_calendar_event_kinds_updated", { detail: kinds }));
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

    // If value changed, migrate existing event types & events!
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

    // Migrate all existing event types and events to replacement type!
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
    window.dispatchEvent(new CustomEvent("spr_calendar_event_types_updated", { detail: types }));
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
    const updated = list.map((t) => (t.id === id ? { ...t, ...updatedData, updatedAt: new Date().toISOString() } : t));
    calendarEventTypesStore.saveEventTypes(tenantId, updated);
    return updated;
  },
  deleteEventType: (tenantId, id) => {
    const list = calendarEventTypesStore.getEventTypes(tenantId);
    const updated = list.filter((t) => t.id !== id);
    calendarEventTypesStore.saveEventTypes(tenantId, updated);
    return updated;
  },
  migrateEventType: (tenantId, fromType, toType) => {
    const list = calendarEventTypesStore.getEventTypes(tenantId);
    const updated = list.map((t) => (t.type === fromType ? { ...t, type: toType } : t));
    calendarEventTypesStore.saveEventTypes(tenantId, updated);
    return updated;
  },
};

export const DEFAULT_SYSTEM_IMPACT_SCOPES = [
  {
    id: "attendance",
    name: "Class & Staff Attendance",
    code: "ATTENDANCE",
    badge: "Attendance",
    description: "Sync as scheduled activity or holiday in student and staff attendance registers",
    is_active: true,
    order: 1,
  },
  {
    id: "notifications",
    name: "Push & In-App Notifications",
    code: "NOTIFICATIONS",
    badge: "Notifications",
    description: "Send instant alert and reminders to target audience members",
    is_active: true,
    order: 2,
  },
  {
    id: "routine",
    name: "Daily Timetable & Periods",
    code: "ROUTINE",
    badge: "Routine",
    description: "Adjust period slots, bells, and classroom routine during this time",
    is_active: true,
    order: 3,
  },
  {
    id: "reports",
    name: "Exam & Report Evaluation",
    code: "REPORTS",
    badge: "Reports",
    description: "Include event timetable in exam schedules and report builders",
    is_active: true,
    order: 4,
  },
  {
    id: "gate_access",
    name: "Gate & Biometric Movement",
    code: "GATE_ACCESS",
    badge: "Gate & RFID",
    description: "Synchronize campus entry/exit timings and biometric RFID gates",
    is_active: true,
    order: 5,
  },
];

export const calendarImpactScopesStore = {
  getScopes: (tenantId) => {
    const key = `spr_calendar_impact_scopes_${tenantId || 'default'}`;
    return readJSON(key, DEFAULT_SYSTEM_IMPACT_SCOPES);
  },
  saveScopes: (tenantId, scopes) => {
    const key = `spr_calendar_impact_scopes_${tenantId || 'default'}`;
    writeJSON(key, scopes);
    window.dispatchEvent(new CustomEvent("spr_calendar_impact_scopes_updated", { detail: scopes }));
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
    const updated = list.map((s) => (s.id === id ? { ...s, ...updatedData, updatedAt: new Date().toISOString() } : s));
    calendarImpactScopesStore.saveScopes(tenantId, updated);
    return updated;
  },
  deleteScope: (tenantId, id) => {
    const list = calendarImpactScopesStore.getScopes(tenantId);
    const updated = list.filter((s) => s.id !== id);
    calendarImpactScopesStore.saveScopes(tenantId, updated);
    return updated;
  },
};





