import React from "react";
import { ClockIcon, CloseIcon } from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";
import type { DailyProgressDraft } from "../types";

interface DraftRecoveryBannerProps {
  draftInfo: DailyProgressDraft[] | null;
  onRecover: (draft: DailyProgressDraft) => void;
  onDiscard: (draft: DailyProgressDraft) => void;
}

export function DraftRecoveryBanner({
  draftInfo,
  onRecover,
  onDiscard,
}: DraftRecoveryBannerProps) {
  if (!draftInfo || !Array.isArray(draftInfo) || draftInfo.length === 0) {
    return null;
  }

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
            : draft.comment
            ? `Comment: "${draft.comment.substring(0, 20)}..."`
            : "Empty Draft";
          const timeStr = `${draft.savedAtTime || ""} (${draft.savedAtDate || ""})`;

          return (
            <div
              key={draft.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-xl theme-bg-sub border theme-border gap-2 hover:border-[var(--accent-main)]/30 transition-colors"
            >
              <div className="min-w-0 text-xs">
                <div className="font-bold theme-text-primary truncate">{infoText}</div>
                <div className="text-[10px] theme-text-secondary mt-0.5">Auto-saved at {timeStr}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onRecover(draft)}
                  className="theme-bg-accent hover:opacity-90 theme-accent-text text-[10px] px-2 py-0.5 rounded-lg font-semibold transition shadow cursor-pointer active:scale-95"
                  title="Load this draft in this window"
                >
                  Recover
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`/?recover_draft_id=${draft.id}`, "_blank");
                    onDiscard(draft);
                  }}
                  className="theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary text-[10px] px-2 py-0.5 rounded-lg font-semibold transition border theme-border cursor-pointer active:scale-95"
                  title="Open this draft in a new tab"
                >
                  Open in New Tab
                </button>
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
          );
        })}
      </div>
    </div>
  );
}
