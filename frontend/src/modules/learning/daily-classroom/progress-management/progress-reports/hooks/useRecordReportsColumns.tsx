import React, { useMemo } from "react";
import { Column } from "@/components/ui/DataTable";
import { ChevronIcon, ChecklistIcon } from "@/components/ui/Icons";
import ActionMenu from "@/components/ui/ActionMenu";
import { ReportItem } from "../types";
import { ResolvedStudentMeta } from "../utils/studentMetaResolver";
import {
  StudentInfoCell,
  AcademicClassDeptCell,
  ReportDateTimeCell,
  ReportSessionPagesCell,
  MistakesStucksBadge,
} from "../components/sharedReportCells";
import { getReportMenuItems } from "../components/ReportContextMenu";
import { isReportUnsynced } from "@/utils/syncEngine";

export interface UseRecordReportsColumnsOptions {
  t: (key: string, defaultText: string, params?: Record<string, any>) => string;
  resolveStudentMeta: (rep: ReportItem) => ResolvedStudentMeta;
  expandedIds: Set<number | string>;
  selectedIds: Set<number | string>;
  onToggleSelect?: (id: number | string, checked?: boolean) => void;
  handleToggleExpand: (id: number | string) => void;
  onCopyText?: (rep: ReportItem) => void;
  onExportCSV?: (rep: ReportItem) => void;
  onExportJSON?: (rep: ReportItem) => void;
  onPrintPDF?: (rep: ReportItem) => void;
  onEdit?: (rep: ReportItem) => void;
  onDelete?: (rep: ReportItem) => void;
  onSync?: (rep: ReportItem) => void;
}

/**
 * Enterprise column definitions hook for Record Reports flat data grid
 * Directly aligns with the 5+1 column architecture matching RecordReportExpandedCells.
 */
export function useRecordReportsColumns({
  t,
  resolveStudentMeta,
  expandedIds,
  selectedIds,
  onToggleSelect,
  handleToggleExpand,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onEdit,
  onDelete,
  onSync,
}: UseRecordReportsColumnsOptions): Column<ReportItem>[] {
  return useMemo<Column<ReportItem>[]>(() => [
    {
      key: "student_name",
      header: t("studentAndId", "Student & ID"),
      sortable: true,
      align: "left",
      width: "22%",
      minWidth: "170px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (rep: ReportItem) => resolveStudentMeta(rep).name,
      render: (rep: ReportItem) => {
        const meta = resolveStudentMeta(rep);
        const hasPendingSync = isReportUnsynced(rep);
        return (
          <StudentInfoCell
            name={meta.name}
            meta={meta}
            hasPendingSync={hasPendingSync}
            t={t}
          />
        );
      },
    },
    {
      key: "className",
      header: t("deptClassSec", "Dept · Class · Sec"),
      sortable: true,
      align: "left",
      width: "22%",
      minWidth: "170px",
      sortValue: (rep: ReportItem) => resolveStudentMeta(rep).className,
      render: (rep: ReportItem) => {
        const meta = resolveStudentMeta(rep);
        return (
          <AcademicClassDeptCell
            className={meta.className}
            deptCode={meta.deptCode}
            sectionName={meta.sectionName}
            group={meta.group}
          />
        );
      },
    },
    {
      key: "date",
      header: t("dateTime", "Date & Time"),
      sortable: true,
      align: "left",
      width: "18%",
      minWidth: "130px",
      sortValue: (rep: ReportItem) => rep.isoDateOnly || rep.report_date || rep.date || "",
      render: (rep: ReportItem) => (
        <ReportDateTimeCell
          date={rep.formattedReportDate || rep.formattedDate || "—"}
          time={rep.formattedGenerateTime || rep.formattedTime || rep.time || "—"}
        />
      ),
    },
    {
      key: "session_name",
      header: t("sessionAndPages", "Session & Pages"),
      sortable: true,
      align: "left",
      width: "18%",
      minWidth: "140px",
      sortValue: (rep: ReportItem) => rep.session_name || "",
      render: (rep: ReportItem) => (
        <ReportSessionPagesCell
          sessionName={rep.session_name}
          totalPages={rep.totalPages || 0}
          report={rep}
        />
      ),
    },
    {
      key: "errors",
      header: t("mistakesAndStucks", "Mistakes & Stucks"),
      sortable: true,
      align: "left",
      width: "14%",
      minWidth: "130px",
      sortValue: (rep: ReportItem) =>
        (Number(rep.mistakesCount) || 0) + (Number(rep.stucksCount) || 0),
      render: (rep: ReportItem) => (
        <MistakesStucksBadge
          totalMistakes={Number(rep.mistakesCount) || 0}
          totalStucks={Number(rep.stucksCount) || 0}
          t={t}
        />
      ),
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      align: "center",
      width: "70px",
      minWidth: "70px",
      maxWidth: "70px",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (rep: ReportItem) => {
        const repKey = rep.id ?? rep.report_unique_id ?? "";
        const isExpanded = expandedIds.has(repKey);
        const isCurrentSelected = rep.id ? selectedIds.has(rep.id) : false;

        const actionItems = getReportMenuItems({
          report: rep,
          onSync,
          onCopyText,
          onExportCSV,
          onExportJSON,
          onPrintPDF,
          onEdit,
          onDelete,
          extraItems: [
            {
              label: isCurrentSelected ? t("deselectRecord", "Deselect") : t("selectRecord", "Select"),
              icon: ChecklistIcon,
              onClick: () => rep.id && onToggleSelect?.(rep.id),
            },
            {
              label: isExpanded ? t("collapseDetails", "Collapse Details") : t("expandDetails", "Expand Details"),
              icon: ChevronIcon,
              onClick: () => handleToggleExpand(repKey),
            },
          ],
        });

        return (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleToggleExpand(repKey)}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={isExpanded ? t("collapseDetails", "Collapse Details") : t("expandDetails", "Expand Details")}
            >
              <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
            </button>
            <ActionMenu
              size="xs"
              variant="ghost"
              buttonClassName="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={rep.student_name || "Student"}
              subtitle={`${rep.formattedDate || "Date"} · ${rep.session_name || "Session"}`}
              items={actionItems}
              ariaLabel="Report Options"
            />
          </div>
        );
      },
    },
  ], [
    t,
    resolveStudentMeta,
    expandedIds,
    selectedIds,
    onToggleSelect,
    handleToggleExpand,
    onCopyText,
    onExportCSV,
    onExportJSON,
    onPrintPDF,
    onEdit,
    onDelete,
    onSync,
  ]);
}
