import React from "react";
import {
  RefreshIcon,
  CopyIcon,
  CloseIcon,
  EditIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { useToast } from "@/context/ToastContext";
import { SyncErrorsAlertBannerProps, SyncErrorItem } from "../types";

/**
 * Enterprise Sync Errors Alert Banner
 * Displays database sync errors with instant copy-to-clipboard, retry trigger,
 * and quick-navigation to edit or discard failing draft reports.
 */
export function SyncErrorsAlertBanner({
  syncErrors,
  reportsList,
  isSyncing,
  loading,
  onRetrySync,
  onDismiss,
  onEditReport,
  onDeleteReport,
}: SyncErrorsAlertBannerProps) {
  const { showToast } = useToast();

  if (!syncErrors || syncErrors.length === 0) {
    return null;
  }

  const handleCopyErrorItem = (err: SyncErrorItem) => {
    const text = `${err.student_name || "Record"}: ${err.reason || "Validation or database error"}${
      err.status ? ` (HTTP ${err.status})` : ""
    }`;
    navigator.clipboard.writeText(text);
    showToast(`Copied error for "${err.student_name || "Record"}" to clipboard`, "info");
  };

  const handleCopyAllErrors = () => {
    if (!syncErrors || syncErrors.length === 0) return;
    const text = syncErrors
      .map(
        (err) =>
          `${err.student_name || "Record"}: ${err.reason || "Validation or database error"}${
            err.status ? ` (HTTP ${err.status})` : ""
          }`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    showToast(`Copied all ${syncErrors.length} error message(s) to clipboard`, "info");
  };

  return (
    <div className="w-full rounded-2xl p-4 theme-bg-sub border theme-border text-xs shadow-2xs animate-fade-in space-y-3">
      {/* Banner Header & Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full theme-bg-accent animate-pulse shrink-0" />
          <span className="font-bold theme-text-primary text-sm">
            Database Sync Incomplete ({syncErrors.length} failed)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllErrors}
            className="px-3 py-1.5 rounded-xl theme-bg-elevated hover:theme-bg-surface border theme-border theme-text-primary font-bold text-xs shadow-2xs cursor-pointer transition-all flex items-center gap-1.5"
            title="Copy all error messages"
            aria-label="Copy all error messages"
          >
            <CopyIcon className="w-3.5 h-3.5 theme-text-secondary" />
            <span>Copy All</span>
          </button>

          <button
            type="button"
            onClick={onRetrySync}
            disabled={loading || isSyncing}
            className="px-3 py-1.5 rounded-xl theme-bg-accent theme-accent-text font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90"
            title="Retry database sync"
            aria-label="Retry database sync"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Retry Sync</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated cursor-pointer transition"
            title="Dismiss alert"
            aria-label="Dismiss alert"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Details Scrollable List */}
      <div className="space-y-2 pt-1 border-t theme-border max-h-48 overflow-y-auto pr-1">
        {syncErrors.map((err, idx) => {
          const targetReport = reportsList.find(
            (r) =>
              (err.id && (r.id === err.id || r.report_unique_id === err.id)) ||
              (err.report_unique_id &&
                (r.report_unique_id === err.report_unique_id || r.id === err.report_unique_id))
          );

          return (
            <div
              key={idx}
              onClick={() => handleCopyErrorItem(err)}
              title="Click to copy error message"
              className="group flex items-center justify-between gap-3 text-xs py-2 px-3 rounded-xl theme-bg-elevated hover:theme-bg-surface border theme-border shadow-2xs transition-all cursor-pointer select-none"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="font-bold theme-text-primary shrink-0">
                  {err.student_name || "Record"}:
                </span>
                <span className="theme-text-secondary group-hover:theme-text-primary break-words flex-1 leading-relaxed transition-colors">
                  {err.reason || "Validation or database error"}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {err.status && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold theme-bg-sub theme-text-secondary border theme-border">
                    HTTP {err.status}
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyErrorItem(err);
                  }}
                  className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary transition"
                  title="Copy error message"
                  aria-label="Copy error message"
                >
                  <CopyIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                </button>

                {targetReport && (
                  <div className="flex items-center gap-1 pl-1 border-l theme-border">
                    {onEditReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditReport(targetReport);
                        }}
                        className="px-2 py-0.5 rounded-lg theme-bg-sub hover:theme-bg-accent hover:theme-accent-text theme-text-primary transition-all flex items-center gap-1 text-[11px] font-semibold"
                        title="Edit report to enter missing Juz and save"
                        aria-label="Edit report"
                      >
                        <EditIcon className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}

                    {onDeleteReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteReport(targetReport);
                        }}
                        className="p-1 rounded-lg theme-text-secondary hover:text-rose-400 hover:theme-bg-sub transition cursor-pointer"
                        title="Delete draft report"
                        aria-label="Delete draft report"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SyncErrorsAlertBanner;
