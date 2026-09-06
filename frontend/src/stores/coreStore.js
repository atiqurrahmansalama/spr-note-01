/**
 * SPR Note — Core Storage Engine & Auth Store
 * ============================================
 * Centralized key constants, JSON read/write helpers,
 * cloud sync triggers, authentication, and multi-account managers.
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
  ACADEMIC_YEARS: "spr_academic_years",

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

// ─── Generic Storage Helpers ───────────────────────────────────────────────

/** JSON-safe read. Returns `defaultValue` on parse error or missing key. */
export function readJSON(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/** JSON-safe write. Silently ignores quota errors and triggers reactive cloud sync. */
export function writeJSON(key, value) {
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
          "period_categories",
          "academic_subjects",
        ];

        if (monitoredKeys.includes(taxonomyKey)) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("spr_taxonomy_changed", {
                detail: { tenantId, taxonomyKey, value },
              })
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[localStore] Failed to write key "${key}":`, err);
  }
}

export function readString(key, defaultValue = "") {
  return localStorage.getItem(key) ?? defaultValue;
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[localStore] Failed to write key "${key}":`, err);
  }
}

// ─── Network & Status Utilities ────────────────────────────────────────────

/** Returns true if browser is online */
export const isOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

export const saveStatusStore = {
  get: () => readJSON(KEYS.SAVE_STATUS, { type: "local", label: "Saved", timestamp: Date.now() }),
  set: (statusObj) => {
    const payload = {
      type: statusObj.type || "local",
      label: statusObj.label || "Saved",
      timestamp: Date.now(),
      detail: statusObj.detail || null,
    };
    writeJSON(KEYS.SAVE_STATUS, payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spr_save_status_updated", { detail: payload }));
    }
    return payload;
  },
};

export const draftReport = {
  getAll: () => readJSON("spr_draft_reports_list", []),
  getById: (id) => {
    const list = readJSON("spr_draft_reports_list", []);
    return list.find((d) => d.id === id) || null;
  },
  save: (id, formData) => {
    if (!id) return null;
    const list = readJSON("spr_draft_reports_list", []);
    const payload = {
      id,
      ...formData,
      timestamp: new Date().toISOString(),
      savedAtTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      savedAtDate: new Date().toLocaleDateString(),
    };
    const idx = list.findIndex((d) => d.id === id);
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
    const updated = list.filter((d) => d.id !== id);
    writeJSON("spr_draft_reports_list", updated);
  },
  clear: () => {
    localStorage.removeItem("spr_draft_reports_list");
  },
  get: () => {
    const list = readJSON("spr_draft_reports_list", []);
    return list[list.length - 1] || null;
  },
};

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

      auth.saveAccessToken(target.access);
      if (target.refresh) auth.saveRefreshToken(target.refresh);
      auth.saveUser(target.user);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("spr_auth_updated"));
      }
      return true;
    }
    return false;
  },
};
