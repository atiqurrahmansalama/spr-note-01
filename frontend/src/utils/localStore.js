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

/** JSON-safe write. Silently ignores quota errors and triggers reactive cloud sync. */
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));

    // Reactive background cloud synchronization for taxonomy stores
    if (
      key.startsWith("spr_") &&
      !key.includes("_synced") &&
      !key.includes("_queue") &&
      !key.includes("_status") &&
      !key.includes("_draft")
    ) {
      const withoutPrefix = key.slice(4); // remove 'spr_'
      const lastUnderscoreIndex = withoutPrefix.lastIndexOf("_");
      if (lastUnderscoreIndex > 0) {
        const taxonomyKey = withoutPrefix.slice(0, lastUnderscoreIndex);
        const tenantId = withoutPrefix.slice(lastUnderscoreIndex + 1);

        const monitoredKeys = [
          "staff_ranks",
          "staff_categories",
          "calendar_event_kinds",
          "calendar_event_types",
          "document_types",
          "working_schedules",
          "impact_scopes",
          "admission_doc_requirements",
          "staff_recruitment_requirements",
        ];

        if (monitoredKeys.includes(taxonomyKey)) {
          import("./syncEngine")
            .then(({ queueTaxonomyPush }) => {
              queueTaxonomyPush(tenantId, taxonomyKey, value);
            })
            .catch(() => {});
        }
      }
    }
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
  // Calculate total positions dynamically: existing count + 1 (for new entries)
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
    // Ensure all events have a valid priorityRank
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
    window.dispatchEvent(new CustomEvent("spr_calendar_events_updated", { detail: events }));
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
        // If the event being edited is ALREADY a single override (isOverride: true), just update it directly!
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

        // Add targetDate to parent's exception list
        const exceptions = Array.isArray(existing.exceptions) ? [...existing.exceptions] : [];
        if (!exceptions.includes(targetDate)) {
          exceptions.push(targetDate);
        }

        // Single override event for this specific date
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
    window.dispatchEvent(new CustomEvent("spr_calendar_working_schedules_updated", { detail: schedules }));
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
    const existing = list.find((s) => s.id === id);
    const oldName = existing?.name;
    const newName = updatedData.name || oldName;

    const updated = list.map((s) => (s.id === id ? { ...s, ...updatedData, updatedAt: new Date().toISOString() } : s));
    calendarWorkingSchedulesStore.saveSchedules(tenantId, updated);

    // Synchronize existing master calendar events if schedule name or description changed
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
    const existing = list.find((t) => t.id === id);
    const oldName = existing?.name;
    const newName = updatedData.name || oldName;
    const oldType = existing?.type;
    const newType = updatedData.type || oldType;

    const updated = list.map((t) => (t.id === id ? { ...t, ...updatedData, updatedAt: new Date().toISOString() } : t));
    calendarEventTypesStore.saveEventTypes(tenantId, updated);

    // Synchronize master calendar events if event name, type, or description changed
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

// ─── Attendance Event & Holiday Restrictions Store ───────────────────────────
export const DEFAULT_ATTENDANCE_EVENT_RESTRICTIONS = {
  // Keyed by event type code, ID, or kind slug
  "WEEKLY_HOLIDAY": { disabled: true, auto_excuse: true },
  "EID_VACATION": { disabled: true, auto_excuse: true },
  "MID_TERM_EXAMINATION": { disabled: true, auto_excuse: false },
  "FINAL_TERM_EXAMINATION": { disabled: true, auto_excuse: false },
  "ANNUAL_SPORTS_DAY": { disabled: false, auto_excuse: false },
  "PARENT_TEACHER_CONFERENCE": { disabled: false, auto_excuse: false },
  "SPECIAL_ACADEMIC_EVENT": { disabled: false, auto_excuse: false },
  // Category defaults fallback
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
    window.dispatchEvent(new CustomEvent("spr_attendance_event_restrictions_updated", { detail: restrictions }));
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

    // 1. Direct matching by code / id / eventTypeId
    if (evt.code && restrictions[evt.code] !== undefined) {
      return Boolean(restrictions[evt.code]?.disabled);
    }
    if (evt.eventTypeId && restrictions[evt.eventTypeId] !== undefined) {
      return Boolean(restrictions[evt.eventTypeId]?.disabled);
    }
    if (evt.id && restrictions[evt.id] !== undefined) {
      return Boolean(restrictions[evt.id]?.disabled);
    }

    // 2. Matching by title converted to slug
    const titleSlug = (evt.title || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (titleSlug && restrictions[titleSlug] !== undefined) {
      return Boolean(restrictions[titleSlug]?.disabled);
    }

    // 3. Matching by event type or category
    const eventType = (evt.type || evt.rawType || "").toUpperCase();
    if (eventType && restrictions[eventType] !== undefined) {
      return Boolean(restrictions[eventType]?.disabled);
    }

    const eventCategory = (evt.category || "").toUpperCase();
    if (eventCategory && restrictions[eventCategory] !== undefined) {
      return Boolean(restrictions[eventCategory]?.disabled);
    }

    // Default fallback: Holiday is disabled by default
    if (eventCategory === "HOLIDAY" || eventType === "HOLIDAY") {
      return true;
    }
    return false;
  },
};

// ─── Staff Categories Store ──────────────────────────────────────────────────
export const STAFF_CATEGORY_OPTIONS = [
  { value: "MANAGEMENT", label: "Executive / Management", badge: "MGMT", description: "Institutional leadership, Principal, Vice Principal & Executive Board" },
  { value: "TEACHING", label: "Teaching Faculty", badge: "TEACHING", description: "Islamic Scholars, Subject Teachers, Instructors & Qaris" },
  { value: "ADMIN", label: "Administrative Staff", badge: "ADMIN", description: "Office Secretaries, IT Executives & Admission Officers" },
  { value: "FINANCE", label: "Finance & Accounts", badge: "FINANCE", description: "Accountants, Bursars, Cashiers & Audit Officers" },
  { value: "SUPPORT", label: "Operations & Support", badge: "SUPPORT", description: "Hostel Wardens, Kitchen, Security, Maintenance & Logistics Staff" },
];

export const staffCategoriesStore = {
  getCategories: (tenantId) => {
    const key = `spr_staff_categories_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, STAFF_CATEGORY_OPTIONS);
      return STAFF_CATEGORY_OPTIONS;
    }
    return raw;
  },
  saveCategories: (tenantId, categories) => {
    const key = `spr_staff_categories_${tenantId || 'default'}`;
    writeJSON(key, categories);
    window.dispatchEvent(new CustomEvent("spr_staff_categories_updated", { detail: categories }));
    return categories;
  },
  addCategory: (tenantId, categoryData) => {
    const list = staffCategoriesStore.getCategories(tenantId);
    const label = typeof categoryData === 'string' ? categoryData : categoryData.label || categoryData.name;
    const value = (typeof categoryData === 'object' && categoryData.value)
      ? categoryData.value
      : label.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const newCat = {
      value,
      label,
      badge: (typeof categoryData === 'object' && categoryData.badge) ? categoryData.badge : value.slice(0, 5),
      description: (typeof categoryData === 'object' && categoryData.description) ? categoryData.description : `${label} Staff`,
    };
    const updated = [...list, newCat];
    staffCategoriesStore.saveCategories(tenantId, updated);
    return newCat;
  },
  updateCategory: (tenantId, value, newLabel) => {
    const list = staffCategoriesStore.getCategories(tenantId);
    const updated = list.map((c) =>
      c.value === value
        ? {
            ...c,
            label: newLabel,
          }
        : c
    );
    staffCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },
  deleteCategory: (tenantId, valueToDelete, replacementValue) => {
    const list = staffCategoriesStore.getCategories(tenantId);
    const updated = list.filter((c) => c.value !== valueToDelete);
    staffCategoriesStore.saveCategories(tenantId, updated);

    // Also migrate all staff ranks from deleted category to replacement category
    const ranks = staffRanksStore.getRanks(tenantId);
    const updatedRanks = ranks.map((r) =>
      r.type === valueToDelete ? { ...r, type: replacementValue } : r
    );
    staffRanksStore.saveRanks(tenantId, updatedRanks);

    return updated;
  },
};

// ─── Staff Ranks & Designations Store ──────────────────────────────────────────
export const DEFAULT_STAFF_RANKS = [
  {
    id: "rank_1",
    name: "Principal / Muhtamim",
    name_bn: "মুহতামিম / প্রিন্সিপাল",
    code: "PRINCIPAL",
    order: 1,
    type: "MANAGEMENT",
    description: "Chief Executive & Institutional Head (প্রধান নির্বাহী ও প্রতিষ্ঠান প্রধান)",
    is_active: true,
  },
  {
    id: "rank_2",
    name: "Vice Principal / Naib-e-Muhtamim",
    name_bn: "নায়েবে মুহতামিম / উপাধ্যক্ষ",
    code: "VICE_PRINCIPAL",
    order: 2,
    type: "MANAGEMENT",
    description: "Deputy Head & Administration Lead (সহ-প্রধান ও প্রশাসনিক সমন্বয়কারী)",
    is_active: true,
  },
  {
    id: "rank_3",
    name: "Shaikhul Hadith",
    name_bn: "শায়খুল হাদিস",
    code: "SHAIKHUL_HADITH",
    order: 3,
    type: "TEACHING",
    description: "Head of Hadith Studies & Senior Islamic Faculty (হাদিস বিভাগীয় প্রধান ও শীর্ষ শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_4",
    name: "Academic Director / Nazem-e-Ta'limat",
    name_bn: "নাজেমে তা'লীমাত / শিক্ষা সচিব",
    code: "ACADEMIC_DIRECTOR",
    order: 4,
    type: "TEACHING",
    description: "Academic Controller, Curriculum & Examination In-Charge (শিক্ষা পরিচালনা ও পরীক্ষা নিয়ন্ত্রক)",
    is_active: true,
  },
  {
    id: "rank_5",
    name: "Senior Lecturer / Muhaddis",
    name_bn: "মুহাদ্দিস / জ্যেষ্ঠ শিক্ষক",
    code: "SENIOR_TEACHER",
    order: 5,
    type: "TEACHING",
    description: "Senior Faculty Member (দাওরায়ে হাদিস / উচ্চতর স্তরের শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_6",
    name: "Assistant Teacher / Ustadh",
    name_bn: "সহকারী শিক্ষক / উস্তাদ",
    code: "ASSISTANT_TEACHER",
    order: 6,
    type: "TEACHING",
    description: "Kitab, Arabic & General Education Faculty (কিতাব ও সাধারণ পাঠদানকারী শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_7",
    name: "Hifz Instructor",
    name_bn: "হিফজ শিক্ষক / ক্বারী",
    code: "HIFZ_TEACHER",
    order: 7,
    type: "TEACHING",
    description: "Quran Memorization & Tajweed Teacher (হিফজুল কুরআন ও তাজবীদ শিক্ষক)",
    is_active: true,
  },
  {
    id: "rank_8",
    name: "Head of Accounts / Accountant",
    name_bn: "হিসাবরক্ষক / একাউন্ট্যান্ট",
    code: "HEAD_ACCOUNTS",
    order: 8,
    type: "FINANCE",
    description: "Financial Accounting, Payroll & Audit Executive (হিসাবরক্ষণ ও অর্থ পরিচালনা)",
    is_active: true,
  },
  {
    id: "rank_9",
    name: "Office Secretary / Admin Officer",
    name_bn: "দপ্তর সম্পাদক / অফিস কর্মকর্তা",
    code: "ADMIN_OFFICER",
    order: 9,
    type: "ADMIN",
    description: "Institutional Office Management & Official Communications (দাপ্তরিক ও প্রাতিষ্ঠানিক কাজ)",
    is_active: true,
  },
  {
    id: "rank_10",
    name: "Hostel Superintendent / Warden",
    name_bn: "হোস্টেল সুপার / তত্ত্বাবধায়ক",
    code: "WARDEN",
    order: 10,
    type: "SUPPORT",
    description: "Student Accommodation, Dining & Discipline Supervisor (আবাসিক হোস্টেল তত্ত্বাবধায়ক)",
    is_active: true,
  },
  {
    id: "rank_11",
    name: "General Support Staff / Khadem",
    name_bn: "সহায়ক কর্মী / খাদেম",
    code: "SUPPORT_STAFF",
    order: 11,
    type: "SUPPORT",
    description: "Institutional Logistics, Security & Support Personnel (সহায়ক কর্মী ও সাপোর্ট টিম)",
    is_active: true,
  },
];

export const staffRanksStore = {
  getRanks: (tenantId) => {
    const key = `spr_staff_ranks_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_STAFF_RANKS);
      return DEFAULT_STAFF_RANKS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveRanks: (tenantId, ranks) => {
    const key = `spr_staff_ranks_${tenantId || 'default'}`;
    const sorted = [...ranks].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    window.dispatchEvent(new CustomEvent("spr_staff_ranks_updated", { detail: sorted }));
    return sorted;
  },
  addRank: (tenantId, rankData) => {
    const list = staffRanksStore.getRanks(tenantId);
    const code = (rankData.code || rankData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newRank = {
      ...rankData,
      id: rankData.id || `rank_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `RANK_${Date.now()}`,
      name: rankData.name || code,
      name_bn: rankData.name_bn || "",
      order: rankData.order !== undefined ? Number(rankData.order) : list.length + 1,
      type: rankData.type || "TEACHING",
      description: rankData.description || "",
      is_active: rankData.is_active !== undefined ? rankData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newRank];
    staffRanksStore.saveRanks(tenantId, updated);
    return newRank;
  },
  updateRank: (tenantId, id, updatedData) => {
    const list = staffRanksStore.getRanks(tenantId);
    const updated = list.map((r) =>
      r.id === id
        ? {
            ...r,
            ...updatedData,
            order: updatedData.order !== undefined ? Number(updatedData.order) : r.order,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    staffRanksStore.saveRanks(tenantId, updated);
    return updated;
  },
  deleteRank: (tenantId, id) => {
    const list = staffRanksStore.getRanks(tenantId);
    const updated = list.filter((r) => r.id !== id);
    staffRanksStore.saveRanks(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return staffRanksStore.saveRanks(tenantId, DEFAULT_STAFF_RANKS);
  },
};

// ─── Document Types & Titles Store ──────────────────────────────────────────

export const INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS = [
  { value: "PDF", label: "PDF Document (.pdf)", ext: ".pdf", mime: "application/pdf", tag: "PDF" },
  { value: "JPG", label: "JPEG / JPG Image (.jpg, .jpeg)", ext: ".jpg,.jpeg", mime: "image/jpeg", tag: "JPG" },
  { value: "PNG", label: "PNG Image (.png)", ext: ".png", mime: "image/png", tag: "PNG" },
  { value: "WEBP", label: "WebP Image (.webp)", ext: ".webp", mime: "image/webp", tag: "WEBP" },
  { value: "DOC", label: "Word Document (.doc, .docx)", ext: ".doc,.docx", mime: "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document", tag: "DOC" },
  { value: "EXCEL", label: "Excel Spreadsheet (.xls, .xlsx)", ext: ".xls,.xlsx", mime: "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tag: "EXCEL" },
  { value: "TXT", label: "Text File (.txt)", ext: ".txt", mime: "text/plain", tag: "TXT" },
];

export function resolveAllowedFormatsConfig(allowedFormats) {
  if (!allowedFormats || (Array.isArray(allowedFormats) && allowedFormats.length === 0)) {
    return {
      accept: ".pdf,.jpg,.jpeg,.png,.webp",
      subLabel: "PDF, JPG, PNG, WebP (Max 5MB)",
      tags: ["PDF", "JPG", "PNG", "WEBP"],
    };
  }

  // Handle legacy string values
  if (typeof allowedFormats === "string") {
    if (allowedFormats === "PDF_ONLY") {
      return { accept: ".pdf", subLabel: "PDF Only (Max 5MB)", tags: ["PDF"] };
    }
    if (allowedFormats === "IMAGE_ONLY") {
      return { accept: ".jpg,.jpeg,.png,.webp,image/*", subLabel: "JPG, PNG, WebP (Max 5MB)", tags: ["JPG", "PNG", "WEBP"] };
    }
    if (allowedFormats === "ALL_DOCS") {
      return { accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp", subLabel: "PDF, DOC, DOCX, Images (Max 5MB)", tags: ["PDF", "DOC", "JPG", "PNG"] };
    }
    return { accept: ".pdf,.jpg,.jpeg,.png,.webp,image/*", subLabel: "PDF, JPG, PNG (Max 5MB)", tags: ["PDF", "JPG", "PNG"] };
  }

  const selectedOptions = INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS.filter((opt) =>
    allowedFormats.includes(opt.value)
  );

  if (selectedOptions.length === 0) {
    return {
      accept: ".pdf,.jpg,.jpeg,.png,.webp",
      subLabel: "PDF, JPG, PNG (Max 5MB)",
      tags: ["PDF", "JPG", "PNG"],
    };
  }

  const exts = selectedOptions.map((o) => o.ext).join(",");
  const tags = selectedOptions.map((o) => o.tag);
  return {
    accept: exts,
    subLabel: `${tags.join(", ")} (Max 5MB)`,
    tags,
  };
}

export const DEFAULT_DOCUMENT_TYPES = [
  {
    id: "doc_type_1",
    name: "Birth Registration Certificate (BRN)",
    name_bn: "অনলাইন জন্ম নিবন্ধন সনদ",
    code: "BIRTH_CERTIFICATE",
    type: "STUDENT",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 1,
    description: "Official 17-digit digital birth registration certificate copy",
    is_active: true,
  },
  {
    id: "doc_type_2",
    name: "National ID Card (NID)",
    name_bn: "জাতীয় পরিচয়পত্র (এনআইডি)",
    code: "NID_CARD",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 2,
    description: "National Identification Smart Card / Old NID document",
    is_active: true,
  },
  {
    id: "doc_type_3",
    name: "Guardian National ID (NID)",
    name_bn: "অভিভাবকের জাতীয় পরিচয়পত্র",
    code: "GUARDIAN_NID",
    type: "STUDENT",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 3,
    description: "Father, Mother, or Legal Guardian NID Card copy",
    is_active: true,
  },
  {
    id: "doc_type_4",
    name: "Dawra-e-Hadith Sanad / Certificate",
    name_bn: "দাওরায়ে হাদিস (তাকমিল) সনদ",
    code: "DAWRA_HADITH_SANAD",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 4,
    description: "Al-Haiatul Ulya / Qawmi Board Masters equivalent Sanad",
    is_active: true,
  },
  {
    id: "doc_type_5",
    name: "Kamil Certificate",
    name_bn: "কামিল সনদ",
    code: "KAMIL_CERTIFICATE",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 5,
    description: "Islamic Arabic University / Madrasah Board Kamil Certificate",
    is_active: true,
  },
  {
    id: "doc_type_6",
    name: "Hifzul Quran Sanad",
    name_bn: "হিফজুল কুরআন সমাপন সনদ",
    code: "HIFZ_SANAD",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 6,
    description: "30 Para complete Hifz completion certificate",
    is_active: true,
  },
  {
    id: "doc_type_7",
    name: "Fazil / Bachelor Degree Certificate",
    name_bn: "ফাজিল / স্নাতক ডিগ্রি সনদ",
    code: "FAZIL_DEGREE",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 7,
    description: "Fazil / B.A. / B.Sc / Equivalent Degree Certificate",
    is_active: true,
  },
  {
    id: "doc_type_8",
    name: "Previous Academy Transfer Certificate (TC)",
    name_bn: "ছাড়পত্র / ট্রান্সফার সার্টিফিকেট (টিসি)",
    code: "TRANSFER_CERTIFICATE",
    type: "STUDENT",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 8,
    description: "Official Transfer / Release Certificate from Previous Madrasah / School",
    is_active: true,
  },
  {
    id: "doc_type_9",
    name: "Previous Exam Marksheet / Academic Transcript",
    name_bn: "নম্বরপত্র / একাডেমিক মার্কশিট",
    code: "ACADEMIC_MARKSHEET",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 9,
    description: "Official Marksheet or Grade Sheet from Previous Examination",
    is_active: true,
  },
  {
    id: "doc_type_10",
    name: "Curriculum Vitae (CV) / Resume",
    name_bn: "সিভি ও জীবনবৃত্তান্ত",
    code: "CV_RESUME",
    type: "STAFF",
    allowed_formats: ["PDF", "DOC", "JPG", "PNG"],
    order: 10,
    description: "Candidate Updated CV / Bio-data Document",
    is_active: true,
  },
  {
    id: "doc_type_11",
    name: "Teaching / Professional Experience Certificate",
    name_bn: "শিক্ষকতা ও কর্ম অভিজ্ঞতার সনদ",
    code: "EXPERIENCE_CERTIFICATE",
    type: "STAFF",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 11,
    description: "Prior Teaching or Administrative Experience Letter",
    is_active: true,
  },
  {
    id: "doc_type_12",
    name: "Medical / Health Clearance Certificate",
    name_bn: "মেডিকেল ও স্বাস্থ্য সনদ",
    code: "MEDICAL_CERTIFICATE",
    type: "UNIVERSAL",
    allowed_formats: ["PDF", "JPG", "PNG", "WEBP"],
    order: 12,
    description: "Health Fitness and Blood Group Medical Certificate",
    is_active: true,
  },
];

export const documentTypesStore = {
  getTypes: (tenantId, targetCategory = null) => {
    const key = `spr_document_types_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    let list = raw;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_DOCUMENT_TYPES);
      list = DEFAULT_DOCUMENT_TYPES;
    }
    const sorted = [...list].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    if (targetCategory) {
      return sorted.filter((d) => d.type === "UNIVERSAL" || d.type === targetCategory);
    }
    return sorted;
  },
  getDocumentTypes: (tenantId, targetCategory = null) => {
    return documentTypesStore.getTypes(tenantId, targetCategory);
  },
  saveTypes: (tenantId, types) => {
    const key = `spr_document_types_${tenantId || 'default'}`;
    const sorted = [...types].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    window.dispatchEvent(new CustomEvent("spr_document_types_updated", { detail: sorted }));
    return sorted;
  },
  addType: (tenantId, docData) => {
    const list = documentTypesStore.getTypes(tenantId);
    const code = (docData.code || docData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const newDoc = {
      ...docData,
      id: docData.id || `doc_type_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `DOC_${Date.now()}`,
      name: docData.name || code,
      name_bn: docData.name_bn || "",
      allowed_formats: Array.isArray(docData.allowed_formats)
        ? docData.allowed_formats
        : (docData.allowed_format ? [docData.allowed_format] : ["PDF", "JPG", "PNG", "WEBP"]),
      order: docData.order !== undefined ? Number(docData.order) : list.length + 1,
      type: docData.type || "UNIVERSAL",
      description: docData.description || "",
      is_active: docData.is_active !== undefined ? docData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newDoc];
    documentTypesStore.saveTypes(tenantId, updated);
    return newDoc;
  },
  updateType: (tenantId, id, updatedData) => {
    const list = documentTypesStore.getTypes(tenantId);
    const updated = list.map((d) =>
      d.id === id
        ? {
            ...d,
            ...updatedData,
            allowed_formats: Array.isArray(updatedData.allowed_formats)
              ? updatedData.allowed_formats
              : (updatedData.allowed_format ? [updatedData.allowed_format] : (d.allowed_formats || ["PDF", "JPG", "PNG", "WEBP"])),
            order: updatedData.order !== undefined ? Number(updatedData.order) : d.order,
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    documentTypesStore.saveTypes(tenantId, updated);
    return updated;
  },
  deleteType: (tenantId, id) => {
    const list = documentTypesStore.getTypes(tenantId);
    const updated = list.filter((d) => d.id !== id);
    documentTypesStore.saveTypes(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return documentTypesStore.saveTypes(tenantId, DEFAULT_DOCUMENT_TYPES);
  },
};

// ─── Class Admission Document Requirements Store ─────────────────────────────

export const DEFAULT_ADMISSION_REQUIREMENTS = [
  {
    id: "req_primary_hifz",
    name: "Junior & Primary Classes (Play - Class 5, Hifz)",
    name_bn: "প্রাথমিক ও হিফজ বিভাগ (প্লে - ৫ম শ্রেণি, হিফজ)",
    code: "PRIMARY_HIFZ_REQ",
    target_class_pattern: "ALL_PRIMARY_HIFZ",
    required_docs: [
      "Birth Registration Certificate (BRN)",
      "Guardian National ID (NID)",
    ],
    order: 1,
    description: "Standard identity documents required for junior, elementary, and Hifz candidates",
    is_active: true,
  },
  {
    id: "req_secondary_higher",
    name: "Secondary & Higher Classes (Class 6 - 10, Alim, Dawra)",
    name_bn: "মাধ্যমিক ও উচ্চতর বিভাগ (৬ষ্ঠ - ১০ম, আলিম, দাওরায়ে হাদিস)",
    code: "SECONDARY_HIGHER_REQ",
    target_class_pattern: "SECONDARY_HIGHER",
    required_docs: [
      "Birth Registration Certificate (BRN)",
      "Guardian National ID (NID)",
      "Previous Academy Transfer Certificate (TC)",
      "Previous Exam Marksheet / Academic Transcript",
    ],
    order: 2,
    description: "Requires previous academy release certificate (TC) and previous exam marksheets in addition to standard identity credentials",
    is_active: true,
  },
];

export const classAdmissionRequirementsStore = {
  getRequirements: (tenantId) => {
    const key = `spr_admission_doc_reqs_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_ADMISSION_REQUIREMENTS);
      return DEFAULT_ADMISSION_REQUIREMENTS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveRequirements: (tenantId, reqs) => {
    const key = `spr_admission_doc_reqs_${tenantId || 'default'}`;
    const sorted = [...reqs].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    window.dispatchEvent(new CustomEvent("spr_admission_doc_reqs_updated", { detail: sorted }));
    return sorted;
  },
  addRequirement: (tenantId, reqData) => {
    const list = classAdmissionRequirementsStore.getRequirements(tenantId);
    const code = (reqData.code || reqData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const docs = Array.isArray(reqData.required_docs)
      ? reqData.required_docs
      : (typeof reqData.required_docs === 'string'
          ? reqData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
    const newReq = {
      ...reqData,
      id: reqData.id || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `REQ_${Date.now()}`,
      name: reqData.name || code,
      name_bn: reqData.name_bn || "",
      required_docs: docs.length > 0 ? docs : ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"],
      order: reqData.order !== undefined ? Number(reqData.order) : list.length + 1,
      description: reqData.description || "",
      is_active: reqData.is_active !== undefined ? reqData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newReq];
    classAdmissionRequirementsStore.saveRequirements(tenantId, updated);
    return newReq;
  },
  updateRequirement: (tenantId, id, updatedData) => {
    const list = classAdmissionRequirementsStore.getRequirements(tenantId);
    const updated = list.map((r) =>
      r.id === id
        ? {
            ...r,
            ...updatedData,
            required_docs: Array.isArray(updatedData.required_docs)
              ? updatedData.required_docs
              : (typeof updatedData.required_docs === 'string'
                  ? updatedData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
                  : r.required_docs),
            order: updatedData.order !== undefined ? Number(updatedData.order) : r.order,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    classAdmissionRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  deleteRequirement: (tenantId, id) => {
    const list = classAdmissionRequirementsStore.getRequirements(tenantId);
    const updated = list.filter((r) => r.id !== id);
    classAdmissionRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return classAdmissionRequirementsStore.saveRequirements(tenantId, DEFAULT_ADMISSION_REQUIREMENTS);
  },
  getRequiredDocsForClass: (tenantId, classId, className = "") => {
    const reqs = classAdmissionRequirementsStore.getRequirements(tenantId);
    const activeReqs = reqs.filter((r) => r.is_active !== false);
    if (activeReqs.length === 0) {
      return ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"];
    }

    const cNameLower = (className || "").toLowerCase();
    const isHigher = /6|7|8|9|10|alim|fazil|kamil|dawra|hsc|ssc|ten|nine|eight|seven|six|উচ্চ|মাস্টার্স|স্নাতক|ফাজিল|দাওরা/.test(cNameLower);

    if (isHigher) {
      const secondaryRule = activeReqs.find(
        (r) =>
          r.code?.includes("SECONDARY") ||
          r.name?.toLowerCase().includes("secondary") ||
          r.target_class_pattern === "SECONDARY_HIGHER"
      );
      if (secondaryRule && Array.isArray(secondaryRule.required_docs) && secondaryRule.required_docs.length > 0) {
        return secondaryRule.required_docs;
      }
    }

    const primaryRule = activeReqs.find(
      (r) =>
        r.code?.includes("PRIMARY") ||
        r.name?.toLowerCase().includes("primary") ||
        r.target_class_pattern === "ALL_PRIMARY_HIFZ"
    );
    if (primaryRule && Array.isArray(primaryRule.required_docs) && primaryRule.required_docs.length > 0) {
      return primaryRule.required_docs;
    }

    return activeReqs[0]?.required_docs || ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"];
  },
};

// ─── Staff Recruitment Document Requirements Store ───────────────────────────

export const DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS = [
  {
    id: "req_teaching_faculty",
    name: "Teaching Faculty Recruitment (Teachers, Qaris, Ustadhs)",
    name_bn: "শিক্ষক ও পাঠদানকারী অনবোর্ডিং (উস্তাদ, ক্বারী, মুহাদ্দিস)",
    code: "TEACHING_FACULTY_REQ",
    target_staff_type: "TEACHING",
    required_docs: [
      "National ID Card (NID)",
      "Dawra-e-Hadith Sanad / Certificate",
      "Teaching / Professional Experience Certificate",
      "Curriculum Vitae (CV) / Resume",
    ],
    order: 1,
    description: "Mandatory verification documents for all teaching faculty, senior lecturers, and Quran instructors.",
    is_active: true,
  },
  {
    id: "req_executive_management",
    name: "Executive & Management Appointments",
    name_bn: "নির্বাহী ও প্রাতিষ্ঠানিক প্রধান নিয়োগ (মুহতামিম/প্রিন্সিপাল, উপাধ্যক্ষ)",
    code: "EXECUTIVE_MGMT_REQ",
    target_staff_type: "MANAGEMENT",
    required_docs: [
      "National ID Card (NID)",
      "Dawra-e-Hadith Sanad / Certificate",
      "Teaching / Professional Experience Certificate",
      "Curriculum Vitae (CV) / Resume",
    ],
    order: 2,
    description: "Key institutional credentials for leadership, Principal, Vice Principal, and Administration heads.",
    is_active: true,
  },
  {
    id: "req_admin_finance",
    name: "Administrative & Finance Officers",
    name_bn: "প্রশাসনিক ও হিসাবরক্ষণ কর্মকর্তা",
    code: "ADMIN_FINANCE_REQ",
    target_staff_type: "FINANCE",
    required_docs: [
      "National ID Card (NID)",
      "Fazil / Bachelor Degree Certificate",
      "Teaching / Professional Experience Certificate",
      "Curriculum Vitae (CV) / Resume",
    ],
    order: 3,
    description: "Financial, audit, accounting, and institutional office management credentials.",
    is_active: true,
  },
  {
    id: "req_support_operations",
    name: "Operations, Hostel & Support Personnel",
    name_bn: "সহায়ক ও হোস্টেল তত্ত্বাবধায়ক কর্মী (খাদেম, হোস্টেল সুপার)",
    code: "SUPPORT_STAFF_REQ",
    target_staff_type: "SUPPORT",
    required_docs: [
      "National ID Card (NID)",
      "Medical / Health Clearance Certificate",
    ],
    order: 4,
    description: "Basic identity and security verification credentials for hostel wardens, kitchen, and maintenance team.",
    is_active: true,
  },
];

export const staffRecruitmentRequirementsStore = {
  getRequirements: (tenantId) => {
    const key = `spr_staff_recruitment_reqs_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS);
      return DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },
  saveRequirements: (tenantId, reqs) => {
    const key = `spr_staff_recruitment_reqs_${tenantId || 'default'}`;
    const sorted = [...reqs].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    window.dispatchEvent(new CustomEvent("spr_staff_recruitment_reqs_updated", { detail: sorted }));
    return sorted;
  },
  addRequirement: (tenantId, reqData) => {
    const list = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const code = (reqData.code || reqData.name || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
    const docs = Array.isArray(reqData.required_docs)
      ? reqData.required_docs
      : (typeof reqData.required_docs === 'string'
          ? reqData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
    const newReq = {
      ...reqData,
      id: reqData.id || `req_staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `REQ_STAFF_${Date.now()}`,
      name: reqData.name || code,
      name_bn: reqData.name_bn || "",
      target_staff_type: reqData.target_staff_type || "ALL_STAFF",
      required_docs: docs.length > 0 ? docs : ["National ID Card (NID)", "Curriculum Vitae (CV) / Resume"],
      order: reqData.order !== undefined ? Number(reqData.order) : list.length + 1,
      description: reqData.description || "",
      is_active: reqData.is_active !== undefined ? reqData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newReq];
    staffRecruitmentRequirementsStore.saveRequirements(tenantId, updated);
    return newReq;
  },
  updateRequirement: (tenantId, id, updatedData) => {
    const list = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const updated = list.map((r) =>
      r.id === id
        ? {
            ...r,
            ...updatedData,
            required_docs: Array.isArray(updatedData.required_docs)
              ? updatedData.required_docs
              : (typeof updatedData.required_docs === 'string'
                  ? updatedData.required_docs.split(',').map((s) => s.trim()).filter(Boolean)
                  : r.required_docs),
            order: updatedData.order !== undefined ? Number(updatedData.order) : r.order,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    staffRecruitmentRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  deleteRequirement: (tenantId, id) => {
    const list = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const updated = list.filter((r) => r.id !== id);
    staffRecruitmentRequirementsStore.saveRequirements(tenantId, updated);
    return updated;
  },
  resetToDefaults: (tenantId) => {
    return staffRecruitmentRequirementsStore.saveRequirements(tenantId, DEFAULT_STAFF_RECRUITMENT_REQUIREMENTS);
  },
  getRequiredDocsForStaff: (tenantId, staffType = "TEACHING") => {
    const reqs = staffRecruitmentRequirementsStore.getRequirements(tenantId);
    const activeReqs = reqs.filter((r) => r.is_active !== false);
    if (activeReqs.length === 0) {
      return ["National ID Card (NID)", "Dawra-e-Hadith Sanad / Certificate", "Curriculum Vitae (CV) / Resume"];
    }

    // First try to match exact staff category
    const exactMatch = activeReqs.find((r) => r.target_staff_type === staffType);
    if (exactMatch && Array.isArray(exactMatch.required_docs) && exactMatch.required_docs.length > 0) {
      return exactMatch.required_docs;
    }

    // Next try to match generic ALL_STAFF rule
    const genericMatch = activeReqs.find((r) => r.target_staff_type === "ALL_STAFF" || !r.target_staff_type);
    if (genericMatch && Array.isArray(genericMatch.required_docs) && genericMatch.required_docs.length > 0) {
      return genericMatch.required_docs;
    }

    return activeReqs[0]?.required_docs || ["National ID Card (NID)", "Curriculum Vitae (CV) / Resume"];
  },
};








