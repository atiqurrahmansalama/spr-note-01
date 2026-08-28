/**
 * SPR Note — Central LocalStorage Store (Facade)
 * ================================================
 * Centralized localStorage key management and domain stores.
 * Offline-first: Data is retrieved from local cache if API is unavailable.
 * Online sync: Local cache is updated on successful API responses.
 *
 * Architecture Note:
 * Individual domain stores have been modularized under ./stores/:
 * - coreStore.js       (Storage helpers, KEYS, Auth, Multi-Account, Status)
 * - settingsStore.js   (Appearance, Copy Report, Sidebar)
 * - calendarStore.js   (Master Calendar, Working Schedules, Event Types, Impact Scopes, Period Categories, Policies)
 * - staffStore.js      (Staff Categories, Ranks, Recruitment Requirements)
 * - documentStore.js   (Document Types, Allowed Formats)
 * - academicStore.js   (Students, Sessions, Saved Comments, Academic Subjects, Academic Years, Curriculum)
 * - admissionStore.js  (Admission Policies, Previous Classes, Class Document Requirements)
 *
 * This file serves as the unified backward-compatible facade.
 */

export * from "./stores";
