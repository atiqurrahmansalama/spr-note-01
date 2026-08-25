import React, { useState, useMemo } from "react";
import {
  CopyIcon,
  GroupsIcon,
  TeacherIcon,
  CalendarIcon,
  CheckIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "../../components/ui/Icons";
import AutocompleteDropdown from "../../components/ui/AutocompleteDropdown";
import { DATE_FORMAT_LIST } from "../../constants/calendarConstants";
import { copyReportSettings as copyStore, calendarSettings } from "../../utils/localStore";
import { generateReportText } from "../../utils/reportGenerator";
import { useToast } from "../../context/ToastContext";

/**
 * Enterprise Report Settings View
 * Configures default report copy formats, evaluator teacher attribution tags, student group suffix, and date standards.
 */
export default function ReportSettingsView() {
  const { showToast } = useToast();
  const [includeGroup, setIncludeGroup] = useState(() => copyStore.getIncludeGroup());
  const [includeTeacher, setIncludeTeacher] = useState(() => copyStore.getIncludeTeacher());
  const [teacherName, setTeacherName] = useState(() => copyStore.getTeacherName());
  const [dateFormat, setDateFormat] = useState(() => copyStore.getDateFormat());
  const [copied, setCopied] = useState(false);

  // Read app-level date format
  const appDateFormat = calendarSettings.getDateFormat ? calendarSettings.getDateFormat() : "DD/MM/YYYY";
  const appDateFormatEntry = DATE_FORMAT_LIST.find((f) => f.id === appDateFormat);
  const appDateLabel = appDateFormatEntry
    ? `${appDateFormatEntry.name} (${appDateFormatEntry.sample})`
    : appDateFormat;

  const dateFormatOptions = [
    { label: `App's Default — ${appDateLabel}`, value: "APP_DEFAULT" },
    ...DATE_FORMAT_LIST.map((fmt) => ({
      label: `${fmt.name} (${fmt.sample})`,
      value: fmt.id,
    })),
  ];

  const resolvedDateFormat = dateFormat === "APP_DEFAULT" ? appDateFormat : dateFormat;
  const resolvedEntry = DATE_FORMAT_LIST.find((f) => f.id === resolvedDateFormat);

  const handleDateFormatChange = (val) => {
    const selectedVal = typeof val === "object" ? val.value : val;
    if (selectedVal) {
      if (selectedVal === "APP_DEFAULT") {
        setDateFormat("APP_DEFAULT");
        copyStore.saveDateFormat("APP_DEFAULT");
        window.dispatchEvent(new CustomEvent("spr_copy_settings_updated", { detail: { dateFormat: "APP_DEFAULT" } }));
        return;
      }
      const matched = DATE_FORMAT_LIST.find((f) => f.id === selectedVal || `${f.name} (${f.sample})` === selectedVal);
      const targetId = matched ? matched.id : selectedVal;
      setDateFormat(targetId);
      copyStore.saveDateFormat(targetId);
      window.dispatchEvent(new CustomEvent("spr_copy_settings_updated", { detail: { dateFormat: targetId } }));
    }
  };

  const handleTeacherNameChange = (e) => {
    const val = e.target.value;
    setTeacherName(val);
    copyStore.saveTeacherName(val);
    window.dispatchEvent(new CustomEvent("spr_copy_settings_updated", { detail: { teacherName: val } }));
  };

  const toggleGroup = () => {
    const val = !includeGroup;
    setIncludeGroup(val);
    copyStore.saveIncludeGroup(val);
    window.dispatchEvent(new CustomEvent("spr_copy_settings_updated", { detail: { includeGroup: val } }));
  };

  const toggleTeacher = () => {
    const val = !includeTeacher;
    setIncludeTeacher(val);
    copyStore.saveIncludeTeacher(val);
    window.dispatchEvent(new CustomEvent("spr_copy_settings_updated", { detail: { includeTeacher: val } }));
  };

  // Generate real modal text dynamically based on actual settings
  const sampleReportText = useMemo(() => {
    return generateReportText({
      studentName: "Muhammad Abdullah",
      groupName: "Ml Saqib's Group",
      selectedSession: "Sabaq",
      selectedDate: new Date().toISOString(),
      juzPageData: [
        { juz: "1", ranges: [{ start: "15", end: "20" }] },
        { juz: "2", ranges: [{ start: "25", end: "28" }] },
      ],
      mistakeData: [
        { juz: "1", page: "15", ayahs: [{ value: "3" }] },
        { juz: "1", page: "18", ayahs: [{ value: "7" }] },
      ],
      stuckData: [
        { juz: "2", page: "25", ayahs: [{ value: "12" }] },
      ],
      comment: "MashaAllah! Excellent recitation and memorization progress. Consistent revision is recommended.",
      includeGroup,
      includeTeacher,
    });
  }, [includeGroup, includeTeacher, teacherName, dateFormat, appDateFormat]);

  const handleCopyPreview = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(sampleReportText);
      setCopied(true);
      showToast("Report text copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in text-left">
      {/* ─── Header Card (Exact match to CompactTaxonomyManager header) ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0">
            <CopyIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Report Settings
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                Configuration
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure default report card copy formats, teacher attribution tags, student group mentions, and date format standards.
            </p>
          </div>
        </div>

        {/* Right-aligned Header Status Indicator */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span>Auto Saved</span>
          </span>
        </div>
      </div>

      {/* ─── 1. Main Setting Items (Full Width Stack) ─── */}
      <div className="space-y-3">
        {/* 1. Student Group Tag Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
              <GroupsIcon className="w-4 h-4 theme-accent" />
              <span>Include Student Group</span>
            </div>
            <p className="text-[11px] theme-text-secondary">
              Automatically include the student's assigned group and attribution suffix in report copy
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeGroup}
            onClick={toggleGroup}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              includeGroup ? "theme-bg-accent" : "theme-bg-elevated border theme-border"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                includeGroup ? "right-1" : "left-1"
              }`}
            />
          </button>
        </div>

        {/* 2. Teacher Attribution Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
                <TeacherIcon className="w-4 h-4 theme-accent" />
                <span>Mention Teacher Tag</span>
              </div>
              <p className="text-[11px] theme-text-secondary">
                Include evaluator teacher mention handle in the footer signature of copied reports
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeTeacher}
              onClick={toggleTeacher}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                includeTeacher ? "theme-bg-accent" : "theme-bg-elevated border theme-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full theme-bg-surface shadow-xs transition-transform absolute top-1 ${
                  includeTeacher ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>

          {includeTeacher && (
            <div className="pt-3 border-t theme-border animate-fade-in space-y-1.5">
              <label className="text-[11px] font-semibold theme-text-secondary block">
                Default Teacher Tag / Signature
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono theme-accent">
                  @
                </span>
                <input
                  type="text"
                  value={teacherName.replace(/^@+/, "")}
                  onChange={handleTeacherNameChange}
                  placeholder="e.g. Hafez Qari Ahmad"
                  className="w-full theme-bg-sub border theme-border theme-text-primary pl-7 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)] transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Report Date Standard Setting */}
        <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 theme-accent" />
              <span>Report Date Format</span>
            </div>
            <p className="text-[11px] theme-text-secondary">
              Standard date representation used in clipboard copies, text exports, and modals
            </p>
          </div>
          <div className="w-full sm:w-64 shrink-0">
            <AutocompleteDropdown
              readOnly={true}
              disableSaveButton={true}
              showAllOptionsOnFocus={true}
              onNextFocus={() => {}}
              options={dateFormatOptions}
              value={
                dateFormat === "APP_DEFAULT"
                  ? `App's Default — ${appDateLabel}`
                  : resolvedEntry
                  ? `${resolvedEntry.name} (${resolvedEntry.sample})`
                  : dateFormat
              }
              onChange={handleDateFormatChange}
              placeholder="Select date format..."
            />
          </div>
        </div>
      </div>

      {/* ─── 2. Live Modal Text Output Preview (Full height without internal scroll) ─── */}
      <div className="p-4 sm:p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3 flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b theme-border">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-sm font-bold theme-text-primary">Modal Preview</h4>
          </div>
          <button
            type="button"
            onClick={handleCopyPreview}
            className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border hover:theme-bg-elevated text-[11px] font-semibold theme-text-primary flex items-center gap-1.5 transition cursor-pointer"
            title="Copy sample text"
          >
            {copied ? (
              <>
                <CheckCircleIcon className="w-3.5 h-3.5 theme-accent" />
                <span className="theme-accent">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5 theme-text-secondary" />
                <span>Copy Text</span>
              </>
            )}
          </button>
        </div>

        {/* Exact Modal Monospace Text Preview (Fully expanded height) */}
        <pre className="w-full p-4 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner">
          {sampleReportText}
        </pre>

        <div className="pt-2 border-t theme-border text-[11px] theme-text-secondary flex items-start gap-1.5">
          <CheckIcon className="w-3.5 h-3.5 theme-accent shrink-0 mt-0.5" />
          <span>Real-time preview of text output generated and copied by the Report Modal.</span>
        </div>
      </div>
    </div>
  );
}
