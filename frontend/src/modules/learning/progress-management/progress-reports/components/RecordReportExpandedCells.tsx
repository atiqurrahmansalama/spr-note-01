import React from "react";
import { ExpandedCell } from "@/components/ui/DataTable";
import ActionMenu from "@/components/ui/ActionMenu";
import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { ReportItem } from "../types";
import { getReportMenuItems } from "./ReportContextMenu";
import {
  ReportPortionsCell,
  ReportMistakesCell,
  ReportStucksCell,
  ReportCommentsCell,
} from "./sharedReportCells";

export interface RecordReportExpandedCellsProps {
  report: ReportItem;
  t: (key: string, fallback: string) => string;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
  onCopyText?: (payload: any) => void;
  onExportCSV?: (payload: any) => void;
  onExportJSON?: (payload: any) => void;
  onPrintPDF?: (payload: any) => void;
}

/**
 * Enterprise Single Report Expanded Cells Set
 * Directly aligns with the parent DataTable columns without redundant table wrappers or duplicate width configs.
 */
export function RecordReportExpandedCells({
  report,
  t,
  onEdit,
  onDelete,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
}: RecordReportExpandedCellsProps) {
  const actionItems = getReportMenuItems({
    report,
    onCopyText,
    onExportCSV,
    onExportJSON,
    onPrintPDF,
    onEdit,
    onDelete,
  });

  return (
    <>
      {/* 1. Session & Portions (under Student & ID column) */}
      <ExpandedCell
        title={t("sessionAndPortions", "Session & Portions")}
        className="!pl-0 pr-3 sm:pr-4 pt-2.5 pb-2 border-t theme-border"
      >
        <ReportPortionsCell report={report} />
      </ExpandedCell>

      {/* 2. Mistake Details (under Dept · Class · Sec column) */}
      <ExpandedCell
        title={t("mistakeDetails", "Mistake Details")}
        titleClassName="text-rose-400"
        className="px-3 sm:px-4 pt-2.5 pb-2 border-t theme-border"
      >
        <ReportMistakesCell report={report} />
      </ExpandedCell>

      {/* 3. Stuck Details (under Date & Time column) */}
      <ExpandedCell
        title={t("stuckDetails", "Stuck Details")}
        titleClassName="text-amber-400"
        className="px-3 sm:px-4 pt-2.5 pb-2 border-t theme-border"
      >
        <ReportStucksCell report={report} />
      </ExpandedCell>

      {/* 4. Comments (under Session & Pages column) */}
      <ExpandedCell
        title={t("commentsRemarks", "Comments")}
        className="px-3 sm:px-4 pt-2.5 pb-2 border-t theme-border"
      >
        <ReportCommentsCell comment={report.comment} />
      </ExpandedCell>

      {/* 5. Actions (under Mistakes & Stucks column) */}
      <ExpandedCell
        title={t("actions", "Actions")}
        className="px-3 sm:px-4 pt-2.5 pb-2 border-t theme-border"
      >
        <div
          className="flex items-center justify-start gap-1 pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionMenu
            size="xs"
            variant="ghost"
            buttonClassName="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
            title={report.student_name || "Student"}
            subtitle={`${report.formattedDate || "Date"} · ${report.session_name || "Session"}`}
            items={actionItems}
            ariaLabel="Report Actions"
          />
        </div>
      </ExpandedCell>

      {/* 6. Empty Spacer under parent 70px Actions column */}
      <td className="!w-[70px] !min-w-[70px] !max-w-[70px] p-0 border-0 pointer-events-none select-none" />
    </>
  );
}

export interface RecordReportExpandedFooterProps {
  report: ReportItem;
  t: (key: string, fallback: string) => string;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
}

/**
 * Enterprise Single Report Expanded Footer
 * Displays report ID, edited badge, and quick action buttons aligned with parent table layout.
 */
export function RecordReportExpandedFooter({
  report,
  t,
  onEdit,
  onDelete,
}: RecordReportExpandedFooterProps) {
  const isEdited = Boolean(report.is_edited || report.edited_at);

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2.5 -mt-2 border-t theme-border text-[11px] font-mono theme-text-secondary select-none"
      style={{ marginRight: "70px" }}
    >
      <div className="flex items-center gap-2 truncate max-w-full flex-wrap">
        <span className="text-[10px] font-bold opacity-75">REPORT ID:</span>
        <span className="theme-text-primary font-semibold">
          {report.report_unique_id || `#${report.id}`}
        </span>

        {isEdited && (
          <span className="inline-flex items-center gap-1 theme-accent text-[10px] font-semibold">
            <EditIcon className="w-3 h-3 theme-accent" />
            <span>Edited</span>
            {report.edited_at && (
              <span className="theme-text-secondary font-mono font-normal opacity-80">
                ·{" "}
                {new Date(report.edited_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 font-sans">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(report)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border theme-border hover:theme-bg-elevated transition cursor-pointer text-xs font-semibold theme-text-primary"
            title="Edit Report"
          >
            <EditIcon className="w-3.5 h-3.5 theme-accent" />
            <span>{t("edit", "Edit")}</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(report)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition cursor-pointer text-xs font-semibold"
            title="Delete Report"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>{t("delete", "Delete")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
