import React, { useMemo } from "react";
import DataTable, { Column } from "@/components/ui/DataTable";
import ActionMenu from "@/components/ui/ActionMenu";
import { ReportItem } from "../types";
import { getReportMenuItems } from "./ReportContextMenu";
import {
  ReportPortionsCell,
  ReportMistakesCell,
  ReportStucksCell,
  ReportCommentsCell,
} from "./sharedReportCells";
import { useTranslation } from "@/i18n";
import { isReportUnsynced } from "@/utils/syncEngine";
import { isBookReport } from "../utils/studentMetaResolver";
import "../locales";

export interface StudentSessionTimelineProps {
  studentName: string;
  reports: ReportItem[];
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
  onSync?: (report: ReportItem) => void;
  onCopyText?: (payload: any) => void;
  onExportCSV?: (payload: any) => void;
  onExportJSON?: (payload: any) => void;
  onPrintPDF?: (payload: any) => void;
  onContextMenu?: (e: React.MouseEvent, report: ReportItem) => void;
}

/**
 * Enterprise Child Sessions Timeline Table for an Expanded Student
 * Powered directly by project's centralized DataTable in nested mode (zero raw HTML table).
 */
export function StudentSessionTimeline({
  studentName,
  reports,
  onEdit,
  onDelete,
  onSync,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onContextMenu,
}: StudentSessionTimelineProps) {
  const { t } = useTranslation("progressReports");

  const isAllBook = useMemo(() => reports.length > 0 && reports.every(isBookReport), [reports]);
  const hasBook = useMemo(() => reports.some(isBookReport), [reports]);

  const portionHeaderTitle = isAllBook
    ? t("bookAndPage", "Book & Pages")
    : hasBook
    ? `${t("sessionAndPortions", "Session & Portions")} / ${t("bookAndPage", "Book & Pages")}`
    : t("sessionAndPortions", "Session & Portions");

  const childColumns = useMemo<Column<ReportItem>[]>(() => [
    {
      key: "spacer_left",
      header: "",
      width: "48px",
      minWidth: "48px",
      maxWidth: "48px",
      headerClassName: "!w-12 !min-w-[48px] !max-w-[48px] !p-0 !border-0 !border-t-0 !border-b-0 !bg-transparent pointer-events-none select-none",
      cellClassName: "!w-12 !min-w-[48px] !max-w-[48px] !p-0 !border-0 !border-b-0 !bg-transparent pointer-events-none select-none align-top",
      render: () => null,
    },
    {
      key: "date_time",
      header: t("dateTime", "Date & Time"),
      align: "left",
      width: "16%",
      minWidth: "150px",
      headerClassName: "!pl-0 theme-bg-sub/40 border-t border-b theme-border",
      cellClassName: "!pl-0 align-top",
      render: (rep: ReportItem) => {
        const isPending = isReportUnsynced(rep);
        return (
          <div className="space-y-0.5 font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold theme-text-primary block break-words">
                {rep.formattedReportDate || rep.formattedDate || "—"}
              </span>
              {isPending && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 shrink-0 shadow-2xs transition-all duration-200 animate-fade-in select-none"
                  title={t("pendingSync", "Pending Cloud Sync")}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>{t("pending", "Pending")}</span>
                </span>
              )}
            </div>
            <span className="text-[11px] theme-text-secondary block break-words opacity-85">
              {rep.formattedGenerateTime || rep.formattedTime || rep.time || "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "session_portions",
      header: portionHeaderTitle,
      align: "left",
      width: "18%",
      minWidth: "165px",
      headerClassName: "theme-bg-sub/40 border-t border-b theme-border",
      cellClassName: "align-top",
      render: (rep: ReportItem) => <ReportPortionsCell report={rep} />,
    },
    {
      key: "mistake_details",
      header: t("mistakeDetails", "Mistake Details"),
      headerClassName: "text-rose-400 theme-bg-sub/40 border-t border-b theme-border",
      align: "left",
      width: "16%",
      minWidth: "150px",
      cellClassName: "align-top",
      render: (rep: ReportItem) => <ReportMistakesCell report={rep} />,
    },
    {
      key: "stuck_details",
      header: t("stuckDetails", "Stuck Details"),
      headerClassName: "text-amber-400 theme-bg-sub/40 border-t border-b theme-border",
      align: "left",
      width: "20%",
      minWidth: "175px",
      cellClassName: "align-top",
      render: (rep: ReportItem) => <ReportStucksCell report={rep} />,
    },
    {
      key: "comments",
      header: t("commentsReporter", "Comments & Reporter"),
      headerClassName: "theme-bg-sub/40 border-t border-b theme-border",
      align: "left",
      width: "16%",
      minWidth: "150px",
      cellClassName: "align-top",
      render: (rep: ReportItem) => (
        <ReportCommentsCell
          comment={rep.comment}
          teacherName={rep.teacher_name || rep.teacher}
        />
      ),
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      headerClassName: "border-t border-b theme-border text-left theme-bg-sub/40",
      align: "left",
      width: "14%",
      minWidth: "125px",
      cellClassName: "align-top",
      sticky: false,
      render: (rep: ReportItem) => {
        const actionItems = getReportMenuItems({
          report: rep,
          onSync,
          onCopyText,
          onExportCSV,
          onExportJSON,
          onPrintPDF,
          onEdit,
          onDelete,
        });

        return (
          <div
            className="flex items-center justify-start gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionMenu
              size="xs"
              variant="ghost"
              buttonClassName="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={studentName}
              subtitle={`${rep.formattedDate || "Date"} · ${rep.session_name || "Session"}`}
              items={actionItems}
              ariaLabel="Report Actions"
            />
          </div>
        );
      },
    },
    {
      key: "spacer_right",
      header: "",
      width: "70px",
      minWidth: "70px",
      maxWidth: "70px",
      headerClassName: "!w-[70px] !min-w-[70px] !max-w-[70px] !p-0 !border-0 !border-t-0 !border-b-0 !bg-transparent pointer-events-none select-none",
      cellClassName: "!w-[70px] !min-w-[70px] !max-w-[70px] !p-0 !border-0 !border-b-0 !bg-transparent pointer-events-none select-none align-top",
      render: () => null,
    },
  ], [
    t,
    studentName,
    onEdit,
    onDelete,
    onCopyText,
    onExportCSV,
    onExportJSON,
    onPrintPDF,
  ]);

  return (
    <div className="w-full p-0 animate-fade-in select-none">
      <DataTable
        columns={childColumns}
        data={reports}
        sortable={false}
        selectable={false}
        keyExtractor={(rep) => rep.id || rep.report_unique_id || ""}
        idField="report_unique_id"
        nested={true}
        isNested={true}
        transparent={true}
        compact={true}
        onRowContextMenu={(e, rep) => onContextMenu?.(e, rep)}
        theadClassName="!bg-transparent !border-b-0"
        headerPaddingClass="py-1.5 px-3 sm:px-4 text-[10px] font-bold uppercase tracking-wider"
        cellPaddingClass="py-2 px-3 sm:px-4 text-xs align-top"
        rowClassName={(_item, idx) =>
          `align-top ${idx === reports.length - 1 ? "[&>td]:!border-b-0" : "border-b theme-border"}`
        }
        wrapperClassName="border-0 shadow-none bg-transparent rounded-none"
        tableClassName="w-full table-fixed bg-transparent !border-separate border-spacing-0 [&_td]:align-top"
      />
    </div>
  );
}
