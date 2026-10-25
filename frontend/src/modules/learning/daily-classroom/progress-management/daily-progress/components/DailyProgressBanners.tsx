import React from "react";
import { EditIcon, ClockIcon, CloseIcon } from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";
import type { DailyProgressDraft } from "../types";

// ══════════════════════════════════════════════════════════════════════════════
// 1. EDIT MODE BANNER
// ══════════════════════════════════════════════════════════════════════════════

export interface EditModeBannerProps {
  editingReport: any;
  onCancel: () => void;
}

export function EditModeBanner({ editingReport, onCancel }: EditModeBannerProps) {
  if (!editingReport) return null;

  const studentName =
    editingReport.student_name ||
    editingReport.studentName ||
    editingReport.student_details?.name ||
    editingReport.student_details?.name_en ||
    (typeof editingReport.student === "object"
      ? editingReport.student?.name || editingReport.student?.name_en
      : null) ||
    (typeof editingReport.student === "string" && isNaN(Number(editingReport.student))
      ? editingReport.student
      : "Student");

  const dateStr =
    editingReport.formattedDate ||
    editingReport.formattedReportDate ||
    editingReport.report_date ||
    editingReport.isoDateOnly ||
    editingReport.date ||
    editingReport.selectedDate ||
    "";

  const sessionStr = editingReport.session_name || editingReport.session || "";
  const modeStr = (editingReport.mode || editingReport.progress_mode || "QURAN").toUpperCase();

  return (
    <div className="w-full theme-bg-sub border theme-border rounded-xl p-2.5 sm:p-3 shadow-sm flex items-center justify-between gap-2.5 animate-fade-in select-none">
      <div className="flex items-center gap-2.5 min-w-0 text-left">
        <div className="p-1.5 rounded-lg theme-bg-accent-soft shrink-0 flex items-center justify-center">
          <EditIcon className="w-4 h-4 theme-accent" />
        </div>
        <div className="text-xs theme-text-primary truncate font-medium">
          <span>Editing report for </span>
          <span className="font-bold theme-accent">{studentName}</span>
          {sessionStr && (
            <span className="theme-text-secondary"> · {sessionStr}</span>
          )}
          {dateStr && (
            <span className="theme-text-secondary"> · {dateStr}</span>
          )}
          <span className="ml-1.5 inline-block text-[10px] px-1.5 py-0.5 rounded-md font-semibold theme-bg-elevated border theme-border uppercase tracking-wider">
            {modeStr === "BOOK" ? "Book" : "Quran"}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1 border theme-border"
      >
        <CloseIcon className="w-3.5 h-3.5" />
        <span>Cancel</span>
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. DRAFT RECOVERY BANNER
// ══════════════════════════════════════════════════════════════════════════════

export interface DraftRecoveryBannerProps {
  draftInfo: DailyProgressDraft[] | null;
  onRecover: (draft: DailyProgressDraft) => void;
  onDiscard: (draft: DailyProgressDraft) => void;
  onDismiss?: (draft: DailyProgressDraft) => void;
}

export function DraftRecoveryBanner({
  draftInfo,
  onRecover,
  onDiscard,
  onDismiss,
}: DraftRecoveryBannerProps) {
  if (!draftInfo || !Array.isArray(draftInfo) || draftInfo.length === 0) {
    return null;
  }

  const handleOpenInNewTab = (draft: DailyProgressDraft) => {
    let targetId = draft.id;
    // If the draft uses the generic 'active_report_draft' key, duplicate with unique timestamp ID
    // so the new tab can consume it safely without colliding with the current tab
    if (targetId === "active_report_draft") {
      targetId = `draft_${Date.now()}`;
      try {
        const all = JSON.parse(localStorage.getItem("spr_draft_reports_list") || "[]");
        const existing = all.find((d: any) => d.id === "active_report_draft");
        if (existing) {
          all.push({ ...existing, id: targetId });
          localStorage.setItem("spr_draft_reports_list", JSON.stringify(all));
        }
      } catch {}
    }

    const mode = (draft.progressMode || "QURAN").toLowerCase();
    const targetUrl = `/studies/daily-progress/${mode}?recover_draft_id=${encodeURIComponent(targetId)}`;
    window.open(targetUrl, "_blank");

    if (onDismiss) {
      onDismiss(draft);
    } else {
      onDiscard(draft);
    }
  };

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in select-none text-left">
      <div className="flex items-center gap-2 border-b theme-border pb-2">
        <ClockIcon className="w-4 h-4 theme-accent" />
        <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
          Unsaved Drafts Found ({draftInfo.length})
        </h4>
      </div>
      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
        {draftInfo.map((draft) => {
          const infoText = draft.studentName
            ? `Student: ${draft.studentName}`
            : draft.bookTitle
            ? `Book: ${draft.bookTitle}`
            : draft.lessonTitle
            ? `Lesson: ${draft.lessonTitle}`
            : draft.comment
            ? `Comment: "${draft.comment.substring(0, 24)}..."`
            : "Unsaved Report Draft";

          const sessionText = draft.selectedSession ? ` · ${draft.selectedSession}` : "";
          const modeBadge = draft.progressMode === "BOOK" ? "Book" : "Quran";
          const timeStr = draft.savedAtTime
            ? `Auto-saved at ${draft.savedAtTime}${draft.savedAtDate ? ` (${draft.savedAtDate})` : ""}`
            : "Auto-saved draft";

          return (
            <div
              key={draft.id}
              className="p-2.5 rounded-xl theme-bg-sub border theme-border hover:border-primary/40 transition-colors space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2.5"
            >
              <div className="flex items-start justify-between gap-2 min-w-0 sm:flex-1">
                <div className="min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 font-bold theme-text-primary truncate">
                    <span className="truncate">{infoText}</span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded font-semibold theme-bg-elevated border theme-border text-xs uppercase tracking-wider">
                      {modeBadge}
                    </span>
                  </div>
                  <div className="text-[10px] theme-text-secondary mt-0.5">
                    {timeStr}
                    {sessionText && <span className="font-medium">{sessionText}</span>}
                  </div>
                </div>
                <div className="sm:hidden shrink-0">
                  <IconButton
                    icon={CloseIcon}
                    size="xs"
                    variant="ghost"
                    onClick={() => onDiscard(draft)}
                    title="Discard Draft"
                    ariaLabel="Discard Draft"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 theme-border/30 shrink-0">
                <button
                  type="button"
                  onClick={() => onRecover(draft)}
                  className="theme-bg-accent hover:opacity-90 theme-accent-text text-[11px] sm:text-[10px] px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition cursor-pointer active:scale-95 shadow"
                  title="Load this draft into the current form"
                >
                  Recover
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(draft)}
                  className="theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary text-[11px] sm:text-[10px] px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-semibold transition border theme-border cursor-pointer active:scale-95"
                  title="Open this draft in a new tab"
                >
                  Open in New Tab
                </button>
                <div className="hidden sm:block">
                  <IconButton
                    icon={CloseIcon}
                    size="xs"
                    variant="ghost"
                    onClick={() => onDiscard(draft)}
                    title="Discard Draft"
                    ariaLabel="Discard Draft"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

