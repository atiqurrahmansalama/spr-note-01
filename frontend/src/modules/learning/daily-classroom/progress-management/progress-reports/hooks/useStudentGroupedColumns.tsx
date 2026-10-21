import React, { useMemo } from "react";
import { Column } from "@/components/ui/DataTable";
import { ChevronIcon, ChecklistIcon } from "@/components/ui/Icons";
import ActionMenu from "@/components/ui/ActionMenu";
import { EnrichedStudentRow } from "./useStudentGroupedData";
import {
  StudentInfoCell,
  AcademicClassDeptCell,
  MistakesStucksBadge,
} from "../components/sharedReportCells";

export interface UseStudentGroupedColumnsOptions {
  t: (key: string, defaultText: string, params?: Record<string, any>) => string;
  expandedStudents: Set<string>;
  selectedIds: Set<number | string>;
  toggleStudentExpand: (studentKey: string) => void;
  handleStudentSelectToggle: (stu: EnrichedStudentRow, explicitChecked?: boolean) => void;
}

/**
 * Enterprise column definitions hook for Student Grouped Reports view
 */
export function useStudentGroupedColumns({
  t,
  expandedStudents,
  selectedIds,
  toggleStudentExpand,
  handleStudentSelectToggle,
}: UseStudentGroupedColumnsOptions): Column<EnrichedStudentRow>[] {
  return useMemo<Column<EnrichedStudentRow>[]>(() => [
    {
      key: "student_name",
      header: t("studentAndId", "Student & ID"),
      sortable: true,
      align: "left",
      width: "16%",
      minWidth: "150px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (stu: EnrichedStudentRow) => stu.student_name,
      render: (stu: EnrichedStudentRow) => (
        <StudentInfoCell
          name={stu.student_name}
          meta={stu.meta}
          hasPendingSync={stu.hasPendingSync}
          t={t}
        />
      ),
    },
    {
      key: "dept_class",
      header: t("deptClass", "Dept · Class"),
      sortable: true,
      align: "left",
      width: "18%",
      minWidth: "165px",
      sortValue: (stu: EnrichedStudentRow) => `${stu.meta.className} ${stu.meta.deptCode}`,
      render: (stu: EnrichedStudentRow) => (
        <AcademicClassDeptCell
          className={stu.meta.className}
          deptCode={stu.meta.deptCode}
          group={stu.meta.group}
        />
      ),
    },
    {
      key: "section",
      header: t("sec", "Sec"),
      sortable: true,
      align: "left",
      width: "18%",
      minWidth: "165px",
      sortValue: (stu: EnrichedStudentRow) => stu.meta.sectionName,
      render: (stu: EnrichedStudentRow) => {
        const hasSec = Boolean(stu.meta.sectionName && stu.meta.sectionName.trim() !== "");
        if (!hasSec) {
          return <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>;
        }
        return (
          <span className="text-xs font-semibold theme-text-primary block leading-snug break-words">
            {stu.meta.sectionName}
          </span>
        );
      },
    },
    {
      key: "total_reports",
      header: t("totalReports", "Total Reports"),
      sortable: true,
      align: "left",
      width: "18%",
      minWidth: "165px",
      sortValue: (stu: EnrichedStudentRow) => stu.totalReports,
      render: (stu: EnrichedStudentRow) => (
        <span className="text-xs font-bold font-mono theme-accent block">
          {t("reportsCount", "{{count}} Reports", { count: stu.totalReports })}
        </span>
      ),
    },
    {
      key: "total_pages",
      header: t("totalPages", "Total Pages"),
      sortable: true,
      align: "left",
      width: "16%",
      minWidth: "150px",
      sortValue: (stu: EnrichedStudentRow) => stu.totalPages,
      render: (stu: EnrichedStudentRow) => (
        <span className="text-xs font-bold font-mono theme-text-primary block">
          {t("pagesCount", "{{count}} Pages", { count: stu.totalPages })}
        </span>
      ),
    },
    {
      key: "errors",
      header: t("mistakesAndStucks", "Mistakes & Stucks"),
      sortable: true,
      align: "left",
      width: "14%",
      minWidth: "125px",
      sortValue: (stu: EnrichedStudentRow) => stu.totalMistakes + stu.totalStucks,
      render: (stu: EnrichedStudentRow) => (
        <MistakesStucksBadge
          totalMistakes={stu.totalMistakes}
          totalStucks={stu.totalStucks}
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
      render: (stu: EnrichedStudentRow) => {
        const isExpanded = expandedStudents.has(stu.student_key);
        const stuReportIds = stu.reports.map((r) => r.id ?? r.report_unique_id ?? "").filter(Boolean);
        const allSelected =
          stuReportIds.length > 0 &&
          stuReportIds.every(
            (id) => selectedIds.has(id) || selectedIds.has(String(id)) || (!isNaN(Number(id)) && selectedIds.has(Number(id)))
          );

        const menuItems = [
          {
            label: allSelected
              ? t("deselectAll", "Deselect All Student Reports")
              : t("selectAllStudent", "Select all reports for this student"),
            icon: ChecklistIcon,
            onClick: () => handleStudentSelectToggle(stu),
          },
          {
            label: isExpanded ? t("collapseAll", "Collapse Details") : t("expandAll", "Expand Details"),
            icon: ChevronIcon,
            onClick: () => toggleStudentExpand(stu.student_key),
          },
        ];

        return (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => toggleStudentExpand(stu.student_key)}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={isExpanded ? t("collapseAll", "Collapse Details") : t("expandAll", "Expand Details")}
            >
              <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
            </button>
            <ActionMenu
              size="xs"
              variant="ghost"
              buttonClassName="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={stu.student_name}
              subtitle={`${stu.totalReports} Reports · ${stu.totalPages} Pages`}
              items={menuItems}
              ariaLabel="Student Options"
            />
          </div>
        );
      },
    },
  ], [
    t,
    expandedStudents,
    selectedIds,
    toggleStudentExpand,
    handleStudentSelectToggle,
  ]);
}
