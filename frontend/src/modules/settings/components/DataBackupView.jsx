import { useState, useRef, useCallback } from "react";
import { CloudIcon, SaveIcon, RefreshIcon } from "../../../components/ui/Icons";
import { useToast } from "../../../context/ToastContext";
import {
  KEYS,
  students as studentStore,
  sessions as sessionStore,
  savedComments as commentStore,
  appearanceSettings as appStore,
  calendarSettings,
  copyReportSettings,
  isOnline,
} from "../../../utils/localStore";

import { fetchWithAuth } from "../../../utils/authService";

// ─── UploadIcon (inline, no dependency) ──────────────────────────────────────
function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Collects all LocalStorage state into a single exportable object */
function collectAllData() {
  return {
    // Core data
    students: studentStore.getAll(),
    sessions: sessionStore.getAll(),
    savedComments: commentStore.getAll(),
    reports: JSON.parse(localStorage.getItem(KEYS.REPORTS) || "[]"),
    pendingQueue: JSON.parse(localStorage.getItem(KEYS.PENDING_QUEUE) || "[]"),

    // Appearance
    fontId: appStore.getFontId(),
    fontSize: appStore.getFontSize(),
    theme: appStore.getTheme(),
    mode: appStore.getMode(),

    // Calendar / Date-Time
    timezone: calendarSettings.getTimezone(),
    dateFormat: calendarSettings.getDateFormat(),
    firstDay: calendarSettings.getFirstDay(),
    hijriEnabled: calendarSettings.getHijriEnabled(),

    // Copy Report Settings
    copyIncludeGroup: copyReportSettings.getIncludeGroup(),
    copyIncludeTeacher: copyReportSettings.getIncludeTeacher(),
    copyTeacherName: copyReportSettings.getTeacherName(),
    copyAutoCopy: copyReportSettings.getAutoCopy(),

    // Meta
    exportDate: new Date().toISOString(),
    exportVersion: "v2",
  };
}

/** Restores imported JSON data to LocalStorage */
function restoreAllData(data) {
  if (Array.isArray(data.students))       studentStore.saveAll(data.students);
  if (Array.isArray(data.sessions))       sessionStore.saveAll(data.sessions);
  if (Array.isArray(data.savedComments))  commentStore.saveAll(data.savedComments);
  if (Array.isArray(data.reports))        localStorage.setItem(KEYS.REPORTS, JSON.stringify(data.reports));
  if (Array.isArray(data.pendingQueue))   localStorage.setItem(KEYS.PENDING_QUEUE, JSON.stringify(data.pendingQueue));

  if (data.fontId)    appStore.saveFontId(data.fontId);
  if (data.fontSize)  appStore.saveFontSize(data.fontSize);
  if (data.theme)     appStore.saveTheme(data.theme);
  if (data.mode)      appStore.saveMode(data.mode);

  if (data.timezone)    calendarSettings.saveTimezone(data.timezone);
  if (data.dateFormat)  calendarSettings.saveDateFormat(data.dateFormat);
  if (data.firstDay)    calendarSettings.saveFirstDay(data.firstDay);
  if (data.hijriEnabled !== undefined) calendarSettings.saveHijriEnabled(data.hijriEnabled);

  if (data.copyIncludeGroup !== undefined)   copyReportSettings.saveIncludeGroup(data.copyIncludeGroup);
  if (data.copyIncludeTeacher !== undefined) copyReportSettings.saveIncludeTeacher(data.copyIncludeTeacher);
  if (data.copyTeacherName)                  copyReportSettings.saveTeacherName(data.copyTeacherName);
  if (data.copyAutoCopy !== undefined)       copyReportSettings.saveAutoCopy(data.copyAutoCopy);
}

/** Syncs imported data to backend database */
async function syncImportedDataToBackend(data) {
  if (!isOnline()) return;

  // 1. Sync Students
  if (Array.isArray(data.students)) {
    for (const student of data.students) {
      try {
        await fetchWithAuth("/students/", {
          method: "POST",
          body: JSON.stringify({
            name: student.label || student.name,
            group: student.sub || student.group || student.group_name || "General Group",
            roll: student.roll || 1,
          }),
        });
      } catch (err) {
        console.warn("[BackupImport] Student sync warning:", err.message);
      }
    }
  }

  // 2. Sync Sessions
  if (Array.isArray(data.sessions)) {
    for (const session of data.sessions) {
      const sessName = typeof session === "object" ? session.name : session;
      if (sessName) {
        try {
          await fetchWithAuth("/sessions/", {
            method: "POST",
            body: JSON.stringify({ name: sessName }),
          });
        } catch (err) {
          console.warn("[BackupImport] Session sync warning:", err.message);
        }
      }
    }
  }

  // 3. Sync Saved Comments / Templates
  if (Array.isArray(data.savedComments)) {
    for (const msgText of data.savedComments) {
      if (msgText && typeof msgText === "string") {
        try {
          await fetchWithAuth("/messages/", {
            method: "POST",
            body: JSON.stringify({ text: msgText }),
          });
        } catch (err) {
          console.warn("[BackupImport] Template sync warning:", err.message);
        }
      }
    }
  }

  // 4. Sync Reports
  if (Array.isArray(data.reports)) {
    for (const r of data.reports) {
      try {
        await fetchWithAuth("/reports/", {
          method: "POST",
          body: JSON.stringify(r),
        });
      } catch (err) {
        console.warn("[BackupImport] Report sync warning:", err.message);
      }
    }
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DataBackupView() {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // parsed JSON to confirm
  const [importFileName, setImportFileName] = useState("");

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportData = () => {
    try {
      const data = collectAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SPR_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported successfully!", "success");
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    }
  };

  // ── Clear Cache ───────────────────────────────────────────────────────────
  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear the local report cache?")) {
      localStorage.removeItem(KEYS.REPORTS);
      localStorage.removeItem(KEYS.PENDING_QUEUE);
      showToast("Local cache cleared successfully", "info");
    }
  };

  // ── Parse & Preview import file ───────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      showToast("Only JSON files are supported", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setImportPreview(parsed);
        setImportFileName(file.name);
      } catch {
        showToast("The file is not valid JSON", "error");
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  // ── File picker ───────────────────────────────────────────────────────────
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  // ── Confirm Import ────────────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    try {
      showToast("Restoring backup data...", "info");
      restoreAllData(importPreview);

      if (isOnline()) {
        showToast("Syncing imported backup with database...", "info");
        await syncImportedDataToBackend(importPreview);
      }

      setImportPreview(null);
      setImportFileName("");
      showToast("Data imported & synced successfully! Reloading page…", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast("Import failed: " + err.message, "error");
    }
  };

  // ── Cancel Import ─────────────────────────────────────────────────────────
  const handleCancelImport = () => {
    setImportPreview(null);
    setImportFileName("");
  };

  // ── Summary counts for preview ────────────────────────────────────────────
  const previewStats = importPreview
    ? [
        { label: "Students", value: importPreview.students?.length ?? "—" },
        { label: "Sessions", value: importPreview.sessions?.length ?? "—" },
        { label: "Comments", value: importPreview.savedComments?.length ?? "—" },
        { label: "Reports", value: importPreview.reports?.length ?? "—" },
        { label: "Theme", value: importPreview.theme ?? "—" },
        { label: "Export Date", value: importPreview.exportDate ? new Date(importPreview.exportDate).toLocaleDateString() : "—" },
      ]
    : [];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">

      {/* ── Header Card ─────────────────────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <CloudIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">Data &amp; Backup</h2>
            <p className="text-xs theme-text-secondary">
              Export or import all local data. Use the backup file to transfer data to another device.
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export */}
          <button
            type="button"
            onClick={handleExportData}
            className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border"
          >
            <div className="flex items-center gap-2.5 theme-accent font-bold text-xs">
              <SaveIcon className="w-4 h-4" />
              <span>Export Backup (JSON)</span>
            </div>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Download all data (students, sessions, reports, settings) as a JSON file.
              Use this file to import data on another device.
            </p>
          </button>

          {/* Clear Cache */}
          <button
            type="button"
            onClick={handleClearCache}
            className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border"
          >
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-xs">
              <RefreshIcon className="w-4 h-4" />
              <span>Clear Report Cache</span>
            </div>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Clears only the local report cache and pending sync queue.
              Student and session data will remain intact.
            </p>
          </button>
        </div>
      </div>

      {/* ── Import Section ───────────────────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
            <UploadIcon className="w-4 h-4 theme-accent" />
            Import Backup
          </h3>
          <p className="text-xs theme-text-secondary">
            Drop a previously exported <span className="font-mono theme-accent">SPR_Backup_*.json</span> file here, or click to browse.
          </p>
        </div>

        {/* Drag & Drop Zone */}
        {!importPreview && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full rounded-xl border-2 border-dashed transition-all cursor-pointer
              flex flex-col items-center justify-center gap-3 py-10 px-6 text-center
              ${isDragOver
                ? "border-[var(--accent-main)] theme-bg-accent-soft"
                : "theme-border hover:border-[var(--accent-main)]/50 theme-bg-sub"
              }
            `}
          >
            <div className={`p-3 rounded-xl transition-colors ${isDragOver ? "theme-bg-accent-soft theme-accent" : "theme-bg-elevated theme-text-secondary"}`}>
              <UploadIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold theme-text-primary">
                {isDragOver ? "Release to load file…" : "Drop JSON backup file here"}
              </p>
              <p className="text-xs theme-text-secondary mt-1">
                or <span className="theme-accent font-semibold underline">click to browse files</span>
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileInputChange}
              className="sr-only"
            />
          </div>
        )}

        {/* Import Preview & Confirm */}
        {importPreview && (
          <div className="space-y-4 animate-fade-in">
            {/* File name badge */}
            <div className="flex items-center gap-2 theme-bg-sub rounded-lg px-3 py-2 border theme-border">
              <SaveIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
              <span className="text-xs font-mono theme-text-primary truncate">{importFileName}</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {previewStats.map(({ label, value }) => (
                <div key={label} className="theme-bg-sub rounded-xl px-3 py-3 border theme-border text-center">
                  <p className="text-lg font-bold theme-text-primary leading-none">{value}</p>
                  <p className="text-[10px] theme-text-secondary mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <p className="text-xs leading-relaxed">
                Importing will <strong>overwrite</strong> all current data and reload the page.
                Make sure you have a backup before proceeding.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text transition hover:opacity-90 active:scale-95 cursor-pointer"
              >
                ✅ Confirm Import
              </button>
              <button
                type="button"
                onClick={handleCancelImport}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold theme-bg-sub theme-text-secondary hover:theme-bg-elevated border theme-border transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Info Note ────────────────────────────────────────────────────── */}
      <div className="w-full text-[11px] theme-text-secondary text-center pb-2 leading-relaxed">
        The backup file includes students, sessions, saved comments, reports, and all settings.
        <br />
        Import it on another device to restore the same data.
      </div>
    </div>
  );
}
