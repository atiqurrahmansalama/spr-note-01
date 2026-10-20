import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronIcon,
  ChecklistIcon,
} from "@/components/ui/Icons";
import DataTable, { Column } from "@/components/ui/DataTable";
import ActionMenu from "@/components/ui/ActionMenu";
import Pagination from "@/components/ui/Pagination";
import CustomCheckbox from "@/components/ui/CustomCheckbox";
import { getReportMenuItems } from "./ReportContextMenu";
import {
  StudentGroupedTableProps,
  StudentGroupedItem,
  ReportItem,
} from "../types";
import {
  useStudentMetaResolver,
  getPortions,
  getMistakes,
  getStucks,
  ResolvedStudentMeta,
} from "../utils/studentMetaResolver";
import { useTranslation } from "@/i18n";
import "../locales";

interface EnrichedStudentRow {
  student_key: string;
  student_name: string;
  student_group: string;
  reports: ReportItem[];
  meta: ResolvedStudentMeta;
  totalReports: number;
  totalPages: number;
  totalMistakes: number;
  totalStucks: number;
  hasPendingSync: boolean;
}

/**
 * Child Sessions Table for an Expanded Student
 * Displays granular date, session, juz/page portions, mistakes, stucks, remarks, and actions.
 */
function StudentSessionTimeline({
  studentRow,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onContextMenu,
}: {
  studentRow: EnrichedStudentRow;
  selectedIds: Set<number | string>;
  onToggleSelect?: (id: number | string) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
  onCopyText?: (payload: any) => void;
  onExportCSV?: (payload: any) => void;
  onExportJSON?: (payload: any) => void;
  onPrintPDF?: (payload: any) => void;
  onContextMenu?: (e: React.MouseEvent, report: ReportItem) => void;
}) {
  const { t } = useTranslation("progressReports");

  const childColumns = useMemo<Column<ReportItem>[]>(() => [
    {
      key: "date_time",
      header: t("dateTime", "Date & Time"),
      align: "left",
      minWidth: "130px",
      render: (rep: ReportItem) => (
        <div className="space-y-0.5 font-mono">
          <span className="text-xs font-semibold theme-text-primary block truncate">
            {rep.formattedReportDate || rep.formattedDate || "—"}
          </span>
          <span className="text-[11px] theme-text-secondary block truncate opacity-85">
            {rep.formattedGenerateTime || rep.formattedTime || rep.time || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "session_pages",
      header: t("sessionAndPages", "Session & Pages"),
      align: "center",
      minWidth: "130px",
      render: (rep: ReportItem) => (
        <div className="space-y-0.5 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold theme-accent truncate max-w-[130px] block">
            {rep.session_name || "General Session"}
          </span>
          <span className="text-[11px] font-mono font-bold theme-text-primary truncate block">
            {rep.totalPages || 0} Pages
          </span>
        </div>
      ),
    },
    {
      key: "juz_page",
      header: t("juzAndPage", "Juz & Page"),
      align: "left",
      minWidth: "150px",
      render: (rep: ReportItem) => {
        const portions = getPortions(rep);
        if (portions.length === 0) {
          return <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>;
        }
        return (
          <div className="space-y-0.5 text-xs font-mono max-h-24 overflow-y-auto pr-1">
            {portions.map((jp, idx) => {
              const rangesStr = Array.isArray(jp.ranges)
                ? jp.ranges
                    .map((r) => `Page ${r.start || r.page_start || 0}–${r.end || r.page_end || 0}`)
                    .join(", ")
                : "";
              return (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <span className="font-bold theme-accent">Juz {jp.juz}:</span>
                  <span className="theme-text-primary font-medium">{rangesStr || "—"}</span>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "mistake_details",
      header: t("mistakeDetails", "Mistake Details"),
      headerClassName: "text-rose-400",
      align: "left",
      minWidth: "140px",
      render: (rep: ReportItem) => {
        const mistakes = getMistakes(rep).filter(
          (m) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())
        );
        if (mistakes.length === 0) {
          return <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>;
        }
        return (
          <div className="space-y-1 text-xs font-mono max-h-24 overflow-y-auto pr-1">
            {mistakes.map((m, idx) => {
              const parts: string[] = [];
              if (m.juz) parts.push(`Juz ${m.juz}`);
              if (m.page) parts.push(`Page ${m.page}`);
              if (m.ayah) parts.push(`Ayah ${m.ayah}`);
              return (
                <div key={idx} className="flex items-center gap-1.5 theme-text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span className="truncate">{parts.join(" ")}</span>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "stuck_details",
      header: t("stuckDetails", "Stuck Details"),
      headerClassName: "text-amber-400",
      align: "left",
      minWidth: "140px",
      render: (rep: ReportItem) => {
        const stucks = getStucks(rep).filter(
          (s) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())
        );
        if (stucks.length === 0) {
          return <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>;
        }
        return (
          <div className="space-y-1 text-xs font-mono max-h-24 overflow-y-auto pr-1">
            {stucks.map((s, idx) => {
              const parts: string[] = [];
              if (s.juz) parts.push(`Juz ${s.juz}`);
              if (s.page) parts.push(`Page ${s.page}`);
              if (s.ayah) parts.push(`Ayah ${s.ayah}`);
              return (
                <div key={idx} className="flex items-center gap-1.5 theme-text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">{parts.join(" ")}</span>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "comments",
      header: t("commentsRemarks", "Comments / Remarks"),
      align: "left",
      minWidth: "170px",
      render: (rep: ReportItem) => {
        if (!rep.comment || !rep.comment.trim()) {
          return <span className="text-xs theme-text-secondary opacity-60">—</span>;
        }
        return (
          <p className="text-xs theme-text-primary leading-relaxed break-words whitespace-pre-wrap max-w-[240px] italic">
            "{rep.comment.trim()}"
          </p>
        );
      },
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      align: "center",
      width: "90px",
      render: (rep: ReportItem) => {
        const actionItems = getReportMenuItems({
          report: rep,
          onCopyText,
          onExportCSV,
          onExportJSON,
          onPrintPDF,
          onEdit,
          onDelete,
        });

        return (
          <div
            className="flex items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionMenu
              size="xs"
              variant="ghost"
              buttonClassName="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={studentRow.student_name}
              subtitle={`${rep.formattedDate || "Date"} · ${rep.session_name || "Session"}`}
              items={actionItems}
              ariaLabel="Report Actions"
            />
          </div>
        );
      },
    },
  ], [
    t,
    studentRow.student_name,
    onEdit,
    onDelete,
    onCopyText,
    onExportCSV,
    onExportJSON,
    onPrintPDF,
  ]);

  return (
    <div className="w-full pl-4 sm:pl-8 pr-2 sm:pr-4 py-1 animate-fade-in select-none">
      <DataTable
        columns={childColumns}
        data={studentRow.reports}
        selectable={true}
        selectedIds={Array.from(selectedIds)}
        onSelectRow={(id: any) => onToggleSelect?.(id)}
        keyExtractor={(rep) => rep.id || rep.report_unique_id || ""}
        idField="report_unique_id"
        nested={true}
        isNested={true}
        transparent={true}
        compact={true}
        onRowContextMenu={(e, rep) => onContextMenu?.(e, rep)}
        theadClassName="theme-bg-sub/30 border-b theme-border"
        headerPaddingClass="py-2 px-3 text-[10px]"
        cellPaddingClass="py-2.5 px-3 text-xs"
        wrapperClassName="border-0 shadow-none bg-transparent"
        tableClassName="w-full bg-transparent"
      />
    </div>
  );
}

/**
 * Enterprise Hierarchical Student-Grouped Reports Table
 * Powered directly by the project's centralized DataTable, Pagination, and ActionMenu components.
 */
export default function StudentGroupedTable({
  studentGroupedData,
  reportsList = [],
  selectedIds = new Set(),
  onToggleSelect,
  onBatchSelect,
  onDeselectAll,
  onContextMenu,
  onStudentContextMenu,
  onEdit,
  onDelete,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onResetFilters,
  onRefresh,
}: StudentGroupedTableProps) {
  const { t } = useTranslation("progressReports");
  const { resolveStudentMeta } = useStudentMetaResolver();

  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc" | null;
  }>({
    key: "student_name",
    direction: "asc",
  });

  // Consolidate & enrich student grouped rows
  const enrichedStudentRows: EnrichedStudentRow[] = useMemo(() => {
    let sourceGroups: StudentGroupedItem[] = [];

    if (studentGroupedData && Array.isArray(studentGroupedData) && studentGroupedData.length > 0) {
      sourceGroups = studentGroupedData;
    } else {
      const map = new Map<string, StudentGroupedItem>();
      (reportsList || []).forEach((rep) => {
        const name = rep.student_name || "Unnamed Student";
        if (!map.has(name)) {
          map.set(name, {
            student_name: name,
            student_group: rep.student_group || "General Group",
            reports: [],
          });
        }
        map.get(name)!.reports.push(rep);
      });
      sourceGroups = Array.from(map.values());
    }

    return sourceGroups.map((stu) => {
      const primaryRep = stu.reports[0] || ({} as ReportItem);
      const meta = resolveStudentMeta(primaryRep);

      const totalReports = stu.reports.length;
      const totalPages = stu.reports.reduce(
        (sum, r) => sum + (r.totalPages || r.total_page || r.total_pages || r.pages || 0),
        0
      );
      const totalMistakes = stu.reports.reduce(
        (sum, r) => sum + (r.mistakesCount || r.total_mistake || 0),
        0
      );
      const totalStucks = stu.reports.reduce(
        (sum, r) => sum + (r.stucksCount || r.total_stuck || 0),
        0
      );
      const hasPendingSync = stu.reports.some(
        (r) => r.sync_status === "PENDING" || r.sync_status === "GRACE_PERIOD"
      );

      const studentKey = String(
        meta.studentId || meta.roll ? `${stu.student_name}__${meta.studentId || meta.roll}` : stu.student_name
      );

      return {
        student_key: studentKey,
        student_name: stu.student_name,
        student_group: stu.student_group || meta.group,
        reports: stu.reports,
        meta,
        totalReports,
        totalPages,
        totalMistakes,
        totalStucks,
        hasPendingSync,
      };
    });
  }, [studentGroupedData, reportsList, resolveStudentMeta]);

  // Reset pagination when data count changes
  useEffect(() => {
    setCurrentPage(1);
  }, [enrichedStudentRows.length]);

  // Toggle single student row expansion
  const toggleStudentExpand = useCallback((studentKey: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentKey)) {
        next.delete(studentKey);
      } else {
        next.add(studentKey);
      }
      return next;
    });
  }, []);

  // Expand All / Collapse All handlers
  const handleExpandAll = useCallback(() => {
    const allKeys = enrichedStudentRows.map((s) => s.student_key);
    setExpandedStudents(new Set(allKeys));
  }, [enrichedStudentRows]);

  const handleCollapseAll = useCallback(() => {
    setExpandedStudents(new Set());
  }, []);

  // Toggle selection for all reports of a specific student
  const handleStudentSelectToggle = useCallback(
    (stu: EnrichedStudentRow) => {
      if (!onBatchSelect) return;
      const stuReportIds = stu.reports.map((r) => r.id || r.report_unique_id || "");
      const allSelected = stuReportIds.every((id) => selectedIds.has(id));

      const nextSet = new Set(selectedIds);
      if (allSelected) {
        stuReportIds.forEach((id) => nextSet.delete(id));
      } else {
        stuReportIds.forEach((id) => nextSet.add(id));
      }
      onBatchSelect(nextSet);
    },
    [onBatchSelect, selectedIds]
  );

  // Table Columns Definition matching specifications
  const columns = useMemo<Column<EnrichedStudentRow>[]>(() => [
    {
      key: "student_name",
      header: t("studentAndId", "Student & ID"),
      sortable: true,
      align: "left",
      minWidth: "190px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (stu: EnrichedStudentRow) => stu.student_name,
      render: (stu: EnrichedStudentRow) => {
        const hasRoll = Boolean(stu.meta.roll && stu.meta.roll !== "0");
        const hasId = Boolean(stu.meta.studentId);

        return (
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold theme-text-primary block truncate max-w-[180px]">
                {stu.student_name}
              </span>
              {stu.hasPendingSync && (
                <span
                  className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                  title="Pending Cloud Sync"
                />
              )}
            </div>
            <div className="text-[11px] theme-text-secondary font-mono truncate flex items-center gap-1">
              {hasRoll && <span>{t("roll", "Roll")}: #{stu.meta.roll}</span>}
              {hasRoll && hasId && <span>·</span>}
              {hasId && <span className="opacity-90">{t("id", "ID")}: {stu.meta.studentId}</span>}
              {!hasRoll && !hasId && <span className="opacity-60">{stu.meta.group}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: "dept_class",
      header: t("deptClass", "Dept · Class"),
      sortable: true,
      align: "left",
      minWidth: "160px",
      sortValue: (stu: EnrichedStudentRow) => `${stu.meta.className} ${stu.meta.deptCode}`,
      render: (stu: EnrichedStudentRow) => {
        const hasDept = Boolean(stu.meta.deptCode && stu.meta.deptCode.trim() !== "");
        return (
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold theme-text-primary block truncate max-w-[150px]">
              {stu.meta.className}
            </span>
            {hasDept ? (
              <span className="text-[11px] font-semibold font-mono theme-accent block truncate">
                {stu.meta.deptCode}
              </span>
            ) : (
              <span className="text-[11px] theme-text-secondary block truncate opacity-70">
                {stu.meta.group}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "section",
      header: t("sec", "Sec"),
      sortable: true,
      align: "left",
      minWidth: "90px",
      sortValue: (stu: EnrichedStudentRow) => stu.meta.sectionName,
      render: (stu: EnrichedStudentRow) => {
        const hasSec = Boolean(stu.meta.sectionName && stu.meta.sectionName.trim() !== "");
        if (!hasSec) {
          return <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>;
        }
        return (
          <span className="text-xs font-semibold theme-text-primary block truncate">
            {stu.meta.sectionName}
          </span>
        );
      },
    },
    {
      key: "total_reports",
      header: t("totalReports", "Total Reports"),
      sortable: true,
      align: "center",
      minWidth: "120px",
      sortValue: (stu: EnrichedStudentRow) => stu.totalReports,
      render: (stu: EnrichedStudentRow) => (
        <span className="text-xs font-bold font-mono theme-accent">
          {t("reportsCount", "{{count}} Reports", { count: stu.totalReports })}
        </span>
      ),
    },
    {
      key: "total_pages",
      header: t("totalPages", "Total Pages"),
      sortable: true,
      align: "center",
      minWidth: "110px",
      sortValue: (stu: EnrichedStudentRow) => stu.totalPages,
      render: (stu: EnrichedStudentRow) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {t("pagesCount", "{{count}} Pages", { count: stu.totalPages })}
        </span>
      ),
    },
    {
      key: "errors",
      header: t("mistakesAndStucks", "Mistakes & Stucks"),
      sortable: true,
      align: "left",
      minWidth: "140px",
      sortValue: (stu: EnrichedStudentRow) => stu.totalMistakes + stu.totalStucks,
      render: (stu: EnrichedStudentRow) => {
        const isClean = stu.totalMistakes === 0 && stu.totalStucks === 0;
        if (isClean) {
          return <span className="text-xs font-mono theme-text-secondary opacity-60">0</span>;
        }
        return (
          <div className="space-y-0.5 text-left font-mono">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="theme-text-secondary">{t("mistakes", "Mistakes")}:</span>
              <span className={`font-bold ${stu.totalMistakes > 0 ? "text-rose-400" : "theme-text-secondary"}`}>
                {stu.totalMistakes}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="theme-text-secondary">{t("stucks", "Stucks")}:</span>
              <span className={`font-bold ${stu.totalStucks > 0 ? "text-amber-400" : "theme-text-secondary"}`}>
                {stu.totalStucks}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      align: "center",
      width: "80px",
      render: (stu: EnrichedStudentRow) => {
        const isExpanded = expandedStudents.has(stu.student_key);
        const stuReportIds = stu.reports.map((r) => r.id || r.report_unique_id || "");
        const allSelected = stuReportIds.every((id) => selectedIds.has(id));

        const menuItems = [
          {
            label: allSelected
              ? t("deselectAll", "Deselect All Student Reports")
              : t("selectAllStudent", "Select all reports for this student"),
            icon: ChecklistIcon,
            onClick: () => handleStudentSelectToggle(stu),
          },
          {
            label: isExpanded
              ? t("collapseAll", "Collapse Details")
              : t("expandAll", "Expand Details"),
            icon: ChevronIcon,
            onClick: () => toggleStudentExpand(stu.student_key),
          },
        ];

        return (
          <div
            className="flex items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
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

  // Active sorting column lookup
  const activeSortColumn = useMemo(() => {
    if (!sortConfig.key) return null;
    return (
      columns.find(
        (c: any) => (c.sortKey || c.accessor || c.key || c.id) === sortConfig.key
      ) || null
    );
  }, [columns, sortConfig.key]);

  // Sort student dataset before pagination
  const sortedStudents = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction || !activeSortColumn) {
      return enrichedStudentRows;
    }
    const { direction } = sortConfig;
    const isAsc = direction === "asc";
    const shallow = [...enrichedStudentRows];

    return shallow.sort((a, b) => {
      let valA: any;
      let valB: any;

      const sortCol = activeSortColumn as any;
      if (typeof sortCol.sortValue === "function") {
        valA = sortCol.sortValue(a);
        valB = sortCol.sortValue(b);
      } else {
        const key = sortCol.sortKey || sortCol.key;
        valA = (a as any)[key];
        valB = (b as any)[key];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === "") return 1;
      if (valB === null || valB === undefined || valB === "") return -1;

      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== "boolean" && typeof valB !== "boolean") {
        return isAsc ? numA - numB : numB - numA;
      }

      return isAsc
        ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" })
        : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: "base" });
    });
  }, [enrichedStudentRows, sortConfig, activeSortColumn]);

  const totalItems = sortedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedStudents.slice(startIndex, startIndex + pageSize);
  }, [sortedStudents, safeCurrentPage, pageSize]);

  // Derived selected student keys (a student row is selected if all its reports are selected)
  const selectedStudentKeys = useMemo(() => {
    const set = new Set<string>();
    enrichedStudentRows.forEach((stu) => {
      const stuReportIds = stu.reports.map((r) => r.id || r.report_unique_id || "");
      if (stuReportIds.length > 0 && stuReportIds.every((id) => selectedIds.has(id))) {
        set.add(stu.student_key);
      }
    });
    return set;
  }, [enrichedStudentRows, selectedIds]);

  if (enrichedStudentRows.length === 0) {
    return (
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3.5 shadow-sm select-none">
        <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center theme-text-secondary opacity-80">
          <ChecklistIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold theme-text-primary">
            {t("noReportsFound", "No Progress Reports Found")}
          </h4>
          <p className="text-xs theme-text-secondary max-w-sm">
            {t("noReportsDesc", "No daily progress reports match the current filters or date criteria.")}
          </p>
        </div>
        {(onResetFilters || onRefresh) && (
          <div className="flex items-center gap-2 pt-1">
            {onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              >
                {t("resetFilters", "Reset Filters")}
              </button>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-xs"
              >
                {t("refreshData", "Refresh Data")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full select-none animate-fade-in space-y-3">
      {/* Top Quick Actions Bar */}
      <div className="flex items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandedStudents.size === enrichedStudentRows.length ? handleCollapseAll : handleExpandAll}
            className="px-3 py-1.5 rounded-xl theme-bg-sub border theme-border font-semibold theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer flex items-center gap-1.5"
          >
            <ChevronIcon
              isOpen={expandedStudents.size === enrichedStudentRows.length}
              className="w-3.5 h-3.5"
            />
            <span>
              {expandedStudents.size === enrichedStudentRows.length
                ? t("collapseAll", "Collapse All")
                : t("expandAll", "Expand All")}
            </span>
          </button>

          {selectedIds.size > 0 && (
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg theme-bg-accent-soft theme-accent border border-current/20">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      </div>

      {/* Main Hierarchical Parent Table */}
      <DataTable
        columns={columns}
        data={paginatedStudents}
        sortable={true}
        sortConfig={sortConfig}
        onSortChange={(cfg: any) => {
          setSortConfig({ key: cfg?.key || null, direction: cfg?.direction || null });
        }}
        selectable={true}
        selectedIds={Array.from(selectedStudentKeys)}
        onSelectRow={(key: any) => {
          const matchedStu = paginatedStudents.find((s) => s.student_key === key);
          if (matchedStu) handleStudentSelectToggle(matchedStu);
        }}
        onSelectAll={(keys: any[], checked: boolean) => {
          if (!onBatchSelect) return;
          if (checked) {
            const allTargetIds = new Set(selectedIds);
            paginatedStudents.forEach((s) => {
              s.reports.forEach((r) => {
                const id = r.id || r.report_unique_id;
                if (id) allTargetIds.add(id);
              });
            });
            onBatchSelect(allTargetIds);
          } else {
            const nextSet = new Set(selectedIds);
            paginatedStudents.forEach((s) => {
              s.reports.forEach((r) => {
                const id = r.id || r.report_unique_id;
                if (id) nextSet.delete(id);
              });
            });
            onBatchSelect(nextSet);
          }
        }}
        keyExtractor={(stu) => stu.student_key}
        idField="student_key"
        expandOnRowClick={true}
        expandedRowIds={expandedStudents}
        onToggleExpand={(key) => toggleStudentExpand(String(key))}
        onRowContextMenu={(e, stu) => {
          if (onStudentContextMenu) {
            onStudentContextMenu(e, {
              student_name: stu.student_name,
              student_group: stu.student_group,
              reports: stu.reports,
            });
          }
        }}
        renderExpandedRow={(stu) => (
          <StudentSessionTimeline
            studentRow={stu}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onCopyText={onCopyText}
            onExportCSV={onExportCSV}
            onExportJSON={onExportJSON}
            onPrintPDF={onPrintPDF}
            onContextMenu={onContextMenu}
          />
        )}
        transparent={false}
      />

      {totalItems > 0 && (
        <Pagination
          currentPage={safeCurrentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          itemLabel="students"
        />
      )}
    </div>
  );
}
