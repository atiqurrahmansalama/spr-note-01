/**
 * SPR Note — Settings Store
 * ==========================
 * Appearance, Copy Report, and Sidebar preferences.
 */

import { KEYS, readString, writeString } from "./coreStore";

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
