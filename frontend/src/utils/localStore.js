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

  // Sync engine
  REPORTS:        "spr_reports_local_v1",
  PENDING_QUEUE:  "spr_reports_pending_queue",
  LAST_SYNCED_AT: "spr_last_synced_at",
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
// Shape: [{ label: "Ahmed", sub: "Group A" }, ...]

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

  /** নাম দিয়ে ডিলিট করে. */
  remove: (label) => {
    const updated = students.getAll().filter(
      (s) => s.label?.toLowerCase() !== label?.toLowerCase()
    );
    writeJSON(KEYS.STUDENTS, updated);
    return updated;
  },
};

// ─── Sessions ───────────────────────────────────────────────────────────────
// Shape: [{ id: "uuid", name: "Morning Session" }, ...]

export const sessions = {
  getAll: () => readJSON(KEYS.SESSIONS, []),

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

  getAutoCopy:       () => readString(KEYS.COPY_AUTO, "false") === "true",
  saveAutoCopy:      (v) => writeString(KEYS.COPY_AUTO, v.toString()),
};

// ─── Network Utility ────────────────────────────────────────────────────────

/** true হলে ব্রাউজার অনলাইন বলছে */
export const isOnline = () => navigator.onLine;
