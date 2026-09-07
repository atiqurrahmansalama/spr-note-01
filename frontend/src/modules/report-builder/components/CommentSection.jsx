import React from "react";
import { EditIcon } from "../../../components/ui/Icons";
import TemplateTextarea from "../../../components/ui/TemplateTextarea";

export default function CommentSection({
  comment = "",
  setComment,
  savedComments = [],
  setSavedComments,
  onAddToRecord,
  onMakeReport,
  showActions = true,
  isEditMode = false,
  isSaving = false,
}) {
  return (
    <div className="space-y-4">
      <div className="theme-bg-surface rounded-2xl p-5 shadow-lg relative z-0 space-y-3 border theme-border">
        <TemplateTextarea
          id="comment-textarea"
          label="Comments"
          value={comment}
          onChange={setComment}
          namespace="report_builder_comments"
          initialTemplates={savedComments}
          placeholder="Enter comment..."
          rows={5}
          onSaveShortcut={onMakeReport}
          onSubmitShortcut={onAddToRecord}
        />
      </div>

      {showActions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
          <button
            type="button"
            disabled={isSaving}
            onClick={onAddToRecord}
            className={`flex-1 font-bold py-3 sm:py-3.5 px-4 rounded-2xl shadow-lg transition-all text-sm text-center flex items-center justify-center gap-2 ${
              isSaving
                ? "opacity-75 cursor-not-allowed theme-bg-elevated theme-text-primary border theme-border shadow-sm"
                : isEditMode
                ? "theme-bg-accent hover:opacity-90 theme-accent-text border border-[var(--accent-main)]/40 shadow-md active:scale-[0.99] cursor-pointer"
                : "theme-bg-elevated hover:theme-bg-sub theme-text-primary border theme-border shadow-md font-semibold cursor-pointer active:scale-[0.99]"
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"></div>
                <span>{isEditMode ? "Updating Report..." : "Saving..."}</span>
              </>
            ) : isEditMode ? (
              <>
                <EditIcon className="w-4 h-4 theme-accent-text shrink-0" />
                <span>Confirm Edit</span>
              </>
            ) : (
              "Add to Record"
            )}
          </button>

          <button
            type="button"
            data-shortcut="make-report"
            onClick={onMakeReport}
            className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text font-bold py-3 sm:py-3.5 px-4 rounded-2xl shadow-lg transition text-sm text-center cursor-pointer"
          >
            Make Report
          </button>
        </div>
      )}
    </div>
  );
}

