/**
 * SPR Note — Central LocalStorage Store
 * =======================================
 * সব localStorage key এক জায়গায় managed।
 * Offline-first: API ব্যর্থ হলে এখান থেকে ডেটা নেওয়া হবে।
 * Online sync: API সফল হলে এখানে cache আপডেট হবে।
 */

// ─── Key Constants ─────────────────────────────────────────────────────────
export const KEYS = {
  // Auth
  ACCESS_TOKEN:   "accessToken",
  REFRESH_TOKEN:  "refreshToken",
  USER:           "user",

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
  saveUser:        (u)   => writeJSON(KEYS.USER, u),
  getAccessToken:  ()    => readString(KEYS.ACCESS_TOKEN),
  saveAccessToken: (t)   => writeString(KEYS.ACCESS_TOKEN, t),
  getRefreshToken: ()    => readString(KEYS.REFRESH_TOKEN),
  saveRefreshToken:(t)   => writeString(KEYS.REFRESH_TOKEN, t),
  clear: () => {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER);
  },
  isLoggedIn: () => {
    return !!readString(KEYS.ACCESS_TOKEN) && !!readJSON(KEYS.USER, null);
  },
};

// ─── Students ───────────────────────────────────────────────────────────────
// Shape: [{ label: "Ahmed", sub: "Group A", _local?: true }, ...]

export const students = {
  getAll: () => readJSON(KEYS.STUDENTS, []),

  saveAll: (list) => writeJSON(KEYS.STUDENTS, list),

  /** নতুন স্টুডেন্ট যোগ করে (duplicate check করে). */
  add: (student) => {
    const list = students.getAll();
    const exists = list.some(
      (s) => s.label?.toLowerCase() === student.label?.toLowerCase()
    );
    if (!exists) {
      const updated = [...list, student];
      writeJSON(KEYS.STUDENTS, updated);
      return updated;
    }
    return list;
  },

  /** নাম দিয়ে একটি স্টুডেন্ট আপডেট করে (replace mode). */
  replace: (oldLabel, newStudent) => {
    const list = students.getAll();
    const updated = list.map((s) =>
      s.label?.toLowerCase() === oldLabel?.toLowerCase() ? newStudent : s
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** গ্রুপ নাম পরিবর্তন করে সকল স্টুডেন্টের গ্রুপ আপডেট করে */
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

  /** একটি নির্দিষ্ট গ্রুপের সকল স্টুডেন্ট ডিলিট করে */
  removeGroup: (groupName) => {
    const list = students.getAll();
    const updated = list.filter(
      (s) => (s.sub || "General Group").toLowerCase() !== groupName.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },

  /** নাম দিয়ে ডিলিট করে. */
  remove: (label) => {
    const updated = students.getAll().filter(
      (s) => s.label?.toLowerCase() !== label?.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },
};

/**
 * mergeStudents — API ডেটা ও LocalStorage ডেটা মার্জ করে, duplicate ছাড়া।
 *
 * নিয়ম:
 *  1. API ডেটা authoritative (server থেকে এসেছে, _local flag নেই)
 *  2. Local-only ডেটা (API-তে নেই, _local: true) শেষে যোগ হয়
 *  3. একই নাম দুইবার আসে না
 *  4. Merged result LocalStorage-এ cache হিসেবে সেভ হয়
 */
export function mergeStudents(apiStudents, localStudents) {
  // API items-এর নামের set তৈরি (case-insensitive)
  const apiLabels = new Set(apiStudents.map((s) => s.label?.toLowerCase()));

  // LocalStorage-এ যেগুলো আছে কিন্তু API-তে নেই (offline-only)
  const localOnly = localStudents
    .filter((s) => !apiLabels.has(s.label?.toLowerCase()))
    .map((s) => ({ ...s, _local: true }));

  // API items (clean, no _local flag) + local-only items
  const merged = [
    ...apiStudents.map(({ _local, ...rest }) => rest), // _local flag মুছে দাও
    ...localOnly,
  ];

  // Cache-এ সেভ করো
  writeJSON(KEYS.STUDENTS, merged);
  return merged;
}

const DEFAULT_SESSIONS = [
  { id: "sess-1", name: "সবক (Sabaq)" },
  { id: "sess-2", name: "সবকী (Sabqi)" },
  { id: "sess-3", name: "আমুখতা (Amukhta)" },
  { id: "sess-4", name: "নাজেরা (Nazera)" },
  { id: "sess-5", name: "হিফজ (Hifz)" },
];

export const sessions = {
  getAll: () => {
    const list = readJSON(KEYS.SESSIONS, []);
    if (list.length === 0) {
      writeJSON(KEYS.SESSIONS, DEFAULT_SESSIONS);
      return DEFAULT_SESSIONS;
    }
    return list;
  },

  saveAll: (list) => writeJSON(KEYS.SESSIONS, list),

  /** নতুন সেশন যোগ করে. */
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

  /** ID বা name দিয়ে ডিলিট করে. */
  remove: (idOrName) => {
    const updated = sessions.getAll().filter(
      (s) => s.id !== idOrName && s.name !== idOrName
    );
    writeJSON(KEYS.SESSIONS, updated);
    return updated;
  },
};

/**
 * mergeSessions — API ডেটা ও LocalStorage ডেটা মার্জ করে, duplicate ছাড়া।
 *
 * নিয়ম:
 *  1. API ডেটা authoritative (server ID আছে, _local নেই)
 *  2. Local-only সেশন (API-তে নেই, _local: true) শেষে যোগ হয়
 *  3. একই name দুইবার আসে না
 *  4. Merged result LocalStorage-এ cache হিসেবে সেভ হয়
 */
export function mergeSessions(apiSessions, localSessions) {
  // API items-এর নামের set তৈরি (case-insensitive)
  const apiNames = new Set(apiSessions.map((s) => s.name?.toLowerCase()));

  // LocalStorage-এ যেগুলো আছে কিন্তু API-তে নেই (offline-only)
  const localOnly = localSessions
    .filter((s) => !apiNames.has(s.name?.toLowerCase()))
    .map((s) => ({ ...s, _local: true }));

  // API items (clean, _local flag মুছে দাও) + local-only items
  const merged = [
    ...apiSessions.map(({ _local, ...rest }) => rest),
    ...localOnly,
  ];

  // Cache-এ সেভ করো
  writeJSON(KEYS.SESSIONS, merged);
  return merged;
}

// ─── Saved Comments (Templates) ─────────────────────────────────────────────
// Shape: ["comment text 1", "comment text 2", ...]

export const savedComments = {
  getAll: () => readJSON(KEYS.SAVED_COMMENTS, []),

  saveAll: (list) => writeJSON(KEYS.SAVED_COMMENTS, list),

  add: (text) => {
    const trimmed = text?.trim();
    if (!trimmed) return savedComments.getAll();
    const list = savedComments.getAll();
    if (list.includes(trimmed)) return list;
    const updated = [...list, trimmed];
    writeJSON(KEYS.SAVED_COMMENTS, updated);
    return updated;
  },

  remove: (index) => {
    const updated = savedComments.getAll().filter((_, i) => i !== index);
    writeJSON(KEYS.SAVED_COMMENTS, updated);
    return updated;
  },
};

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

/** true হলে ব্রাউজার অনলাইন বলছে */
export const isOnline = () => navigator.onLine;

// ─── Draft Report & Live Save Status ─────────────────────────────────────────

export const draftReport = {
  get: () => readJSON(KEYS.DRAFT_REPORT, null),
  save: (formData) => {
    const payload = {
      ...formData,
      timestamp: new Date().toISOString(),
      savedAtTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      savedAtDate: new Date().toLocaleDateString(),
    };
    writeJSON(KEYS.DRAFT_REPORT, payload);
    return payload;
  },
  clear: () => localStorage.removeItem(KEYS.DRAFT_REPORT),
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

