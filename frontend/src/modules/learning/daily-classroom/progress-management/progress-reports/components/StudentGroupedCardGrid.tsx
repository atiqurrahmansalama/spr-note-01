import React, { useState, useMemo, useEffect, useCallback } from "react";
import DataCardGrid from "@/components/ui/DataCardGrid";
import Pagination from "@/components/ui/Pagination";
import ActionMenu from "@/components/ui/ActionMenu";
import CustomCheckbox from "@/components/ui/CustomCheckbox";
import {
  CloudIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  UsersIcon,
  ChevronIcon,
  CopyIcon,
} from "@/components/ui/Icons";
import { StudentGroupedTableProps, ReportItem } from "../types";
import {
  useStudentMetaResolver,
  getPortions,
  getMistakes,
  getStucks,
  isBookReport,
  getBookTitle,
  getLessonTitle,
} from "../utils/studentMetaResolver";
import { isReportUnsynced } from "@/utils/syncEngine";
import { getReportMenuItems } from "./ReportContextMenu";
import { TableBatchToolbar } from "./TableBatchToolbar";
import { EmptyReportsState } from "./EmptyReportsState";
import { ReportCommentsCell } from "./sharedReportCells";
import { useStudentGroupedData, EnrichedStudentRow } from "../hooks";
import { useTranslation } from "@/i18n";
import "../locales";

/**
 * Enterprise Student-Grouped Card Grid View
 * Displays student rollup cards with aggregate metrics and expandable session timelines.
 */
export default function StudentGroupedCardGrid({
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
  onSync,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onResetFilters,
  onRefresh,
  isAllExpanded: propIsAllExpanded,
  onToggleExpandAll: propOnToggleExpandAll,
  hideBatchToolbar = false,
}: StudentGroupedTableProps) {
  const { t } = useTranslation("progressReports");
  const { resolveStudentMeta } = useStudentMetaResolver();

  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Consolidate & enrich student grouped rows via custom hook
  const enrichedStudentRows = useStudentGroupedData(
    studentGroupedData,
    reportsList,
    resolveStudentMeta
  );

  // Reset pagination on student count changes
  useEffect(() => {
    setCurrentPage(1);
  }, [enrichedStudentRows.length]);

  const totalItems = enrichedStudentRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return enrichedStudentRows.slice(startIndex, startIndex + pageSize);
  }, [enrichedStudentRows, safeCurrentPage, pageSize]);

  // Toggle single student expand
  const handleToggleStudentExpand = useCallback((studentKey: string) => {
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

  // Sync with external isAllExpanded if provided
  useEffect(() => {
    if (propIsAllExpanded !== undefined) {
      if (propIsAllExpanded) {
        setExpandedStudents(new Set(enrichedStudentRows.map((s) => s.student_key)));
      } else {
        setExpandedStudents(new Set());
      }
    }
  }, [propIsAllExpanded, enrichedStudentRows]);

  // Expand / collapse all visible students
  const handleToggleExpandAll = useCallback(() => {
    if (propOnToggleExpandAll) {
      propOnToggleExpandAll();
    } else {
      if (expandedStudents.size === paginatedStudents.length && paginatedStudents.length > 0) {
        setExpandedStudents(new Set());
      } else {
        setExpandedStudents(new Set(paginatedStudents.map((s) => s.student_key)));
      }
    }
  }, [propOnToggleExpandAll, expandedStudents.size, paginatedStudents]);

  // Robust selection checker across numeric IDs, string IDs, and unique report keys
  const isReportSelected = useCallback(
    (report: ReportItem): boolean => {
      if (!selectedIds || selectedIds.size === 0) return false;
      const repKey = String(report.id ?? report.report_unique_id ?? "");
      return Boolean(
        (report.id !== undefined && report.id !== null && (
          selectedIds.has(report.id) ||
          selectedIds.has(String(report.id)) ||
          (!isNaN(Number(report.id)) && selectedIds.has(Number(report.id)))
        )) ||
        (report.report_unique_id && (
          selectedIds.has(report.report_unique_id) ||
          selectedIds.has(String(report.report_unique_id))
        )) ||
        selectedIds.has(repKey)
      );
    },
    [selectedIds]
  );

  // Select / Deselect all reports for a specific student
  const handleToggleSelectStudent = useCallback(
    (studentRow: EnrichedStudentRow) => {
      if (!onBatchSelect || !onDeselectAll) return;
      if (!studentRow.reports || studentRow.reports.length === 0) return;

      const allSelected = studentRow.reports.every(isReportSelected);
      const next = new Set(selectedIds);

      studentRow.reports.forEach((r) => {
        const id = r.id;
        const uId = r.report_unique_id;
        const repKey = String(id ?? uId ?? "");

        next.delete(repKey);
        if (id !== undefined && id !== null) {
          next.delete(id);
          next.delete(String(id));
          if (!isNaN(Number(id))) next.delete(Number(id));
        }
        if (uId) {
          next.delete(uId);
          next.delete(String(uId));
        }

        if (!allSelected && repKey) {
          next.add(repKey);
        }
      });
      onBatchSelect(next);
    },
    [selectedIds, onBatchSelect, onDeselectAll, isReportSelected]
  );

  if (enrichedStudentRows.length === 0) {
    return (
      <EmptyReportsState
        t={t}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />
    );
  }

  const isAllExpanded =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => expandedStudents.has(s.student_key));

  return (
    <div className="space-y-4 w-full">
      {/* Batch Toolbar: Expand / Collapse All Students and Selection Badge (Hidden when Analytics is expanded) */}
      {!hideBatchToolbar && (
        <TableBatchToolbar
          totalItems={totalItems}
          selectedCount={selectedIds.size}
          isAllExpanded={isAllExpanded}
          onToggleExpandAll={handleToggleExpandAll}
          expandAllLabel={t("expandAll", "Expand All Students")}
          collapseAllLabel={t("collapseAll", "Collapse All Students")}
          showingLabel={`Showing ${paginatedStudents.length} of ${totalItems} students`}
          showSelectedBadge={true}
          selectedBadgeLabel="selected"
        />
      )}

      {/* Grid of Student Grouped Cards */}
      <DataCardGrid
        data={paginatedStudents}
        keyExtractor={(stu) => stu.student_key}
        gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
        renderCard={(stu: EnrichedStudentRow) => {
          const isExpanded = expandedStudents.has(stu.student_key);
          const selectedStudentReportsCount = stu.reports.filter(isReportSelected).length;
          const isStudentAllSelected =
            stu.reports.length > 0 &&
            selectedStudentReportsCount === stu.reports.length;
          const isStudentPartiallySelected =
            selectedStudentReportsCount > 0 && !isStudentAllSelected;

          const latestReport = stu.reports[0];

          // Context & Action Menu Items for the whole student
          const studentMenuItems = [
            ...(onCopyText
              ? [
                  {
                    label: `Copy All Reports (${stu.totalReports})`,
                    icon: CopyIcon,
                    onClick: () => onCopyText(stu.reports),
                  },
                ]
              : []),
            ...(onDelete
              ? [
                  {
                    label: `Delete All Reports (${stu.totalReports})`,
                    icon: TrashIcon,
                    danger: true,
                    onClick: () => onDelete(stu.reports as any),
                  },
                ]
              : []),
          ];

          return (
            <div
              key={stu.student_key}
              className={`rounded-2xl theme-bg-surface transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                isStudentAllSelected
                  ? "border border-[var(--accent-main)] ring-1 ring-[var(--accent-main)]/30 theme-bg-sub/20 shadow-sm"
                  : isStudentPartiallySelected
                  ? "border border-[var(--accent-main)]/50 theme-bg-sub/10"
                  : "border theme-border hover:border-[var(--border-hover)] hover:theme-bg-sub/10"
              }`}
            >
              <div className="space-y-3.5">
                {/* 1. Header: Selection Checkbox + Name + Meta + Total Reports */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Reusable Enterprise Checkbox for Student */}
                    {onBatchSelect && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 flex items-center cursor-pointer"
                      >
                        <CustomCheckbox
                          size="sm"
                          checked={isStudentAllSelected}
                          indeterminate={isStudentPartiallySelected}
                          onChange={() => handleToggleSelectStudent(stu)}
                        />
                      </div>
                    )}

                    {/* Student Name & Meta */}
                    <div className="min-w-0 flex-1 text-left">
                      <h3
                        className="font-bold theme-text-primary text-sm truncate leading-tight"
                        title={stu.student_name}
                      >
                        {stu.student_name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono theme-text-secondary mt-0.5 truncate">
                        {stu.meta.studentId && <span>{stu.meta.studentId}</span>}
                        {stu.meta.roll && (
                          <>
                            {stu.meta.studentId && <span className="opacity-40">·</span>}
                            <span>Roll {stu.meta.roll}</span>
                          </>
                        )}
                        {stu.student_group && (
                          <>
                            {(stu.meta.studentId || stu.meta.roll) && <span className="opacity-40">·</span>}
                            <span className="truncate max-w-[110px]">{stu.student_group}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Header: Report Count Badge & Action Menu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono theme-bg-accent-soft theme-accent border border-current/20">
                      {stu.totalReports} {stu.totalReports === 1 ? "Report" : "Reports"}
                    </span>

                    {studentMenuItems.length > 0 && (
                      <ActionMenu items={studentMenuItems} />
                    )}
                  </div>
                </div>

                {/* 2. Rollup KPI Summary Bar (Sessions, Pages, Mistakes, Stucks with text-only error colors) */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {/* Total Pages */}
                  <div className="p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <span className="text-[10px] theme-text-secondary block font-medium">Pages</span>
                    <span className="text-sm font-bold font-mono theme-accent">
                      {stu.totalPages}
                    </span>
                  </div>

                  {/* Mistakes */}
                  <div className="p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <span className="text-[10px] theme-text-secondary block font-medium">Mistakes</span>
                    <span className={`text-sm font-bold font-mono ${stu.totalMistakes > 0 ? "text-rose-500" : "theme-text-secondary"}`}>
                      {stu.totalMistakes}
                    </span>
                  </div>

                  {/* Stucks */}
                  <div className="p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <span className="text-[10px] theme-text-secondary block font-medium">Stucks</span>
                    <span className={`text-sm font-bold font-mono ${stu.totalStucks > 0 ? "text-amber-500" : "theme-text-secondary"}`}>
                      {stu.totalStucks}
                    </span>
                  </div>
                </div>

                {/* 3. Collapsible / Expandable Sessions Section */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStudentExpand(stu.student_key)}
                    className="w-full flex items-center justify-between p-2 rounded-xl theme-bg-sub/30 hover:theme-bg-sub/60 border theme-border transition cursor-pointer text-xs font-semibold theme-text-primary"
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5 theme-text-secondary" />
                      <span>
                        {isExpanded
                          ? `Hide Sessions (${stu.totalReports})`
                          : `View All Sessions (${stu.totalReports})`}
                      </span>
                    </span>
                    {stu.hasPendingSync && (
                      <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                        <CloudIcon className="w-3 h-3 animate-pulse" />
                        <span>Pending Sync</span>
                      </span>
                    )}
                  </button>

                  {/* Collapsed Preview Snippet */}
                  {!isExpanded && latestReport && (
                    <div className="p-2.5 rounded-xl theme-bg-sub/20 border theme-border text-left text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] theme-text-secondary font-mono">
                        <span className="font-semibold theme-text-primary truncate">
                          Latest: {latestReport.session_name || "General Session"}
                        </span>
                        <span>
                          {latestReport.formattedReportDate ||
                            latestReport.date ||
                            latestReport.formattedDate ||
                            "Today"}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono theme-accent font-semibold truncate">
                        {isBookReport(latestReport)
                          ? `${getBookTitle(latestReport)} · ${latestReport.totalPages || 0} Pages`
                          : `${latestReport.totalPages || 0} Pages recited`}
                      </div>
                    </div>
                  )}

                  {/* Expanded Full Sessions Timeline */}
                  {isExpanded && (
                    <div className="space-y-2.5 pt-1">
                      {stu.reports.map((rep, idx) => {
                        const repKey = String(rep.id ?? rep.report_unique_id ?? idx);
                        const isRepSelected = isReportSelected(rep);
                        const isBook = isBookReport(rep);
                        const bookTitle = isBook ? getBookTitle(rep) : "";
                        const lessonTitle = isBook ? getLessonTitle(rep) : "";
                        const portions = getPortions(rep);
                        const repMistakes = getMistakes(rep).filter(
                          (m) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())
                        );
                        const repStucks = getStucks(rep).filter(
                          (s) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())
                        );
                        const unsynced = isReportUnsynced(rep);

                        const reportActions = getReportMenuItems({
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
                            key={repKey || idx}
                            className={`p-3 rounded-xl border text-left text-xs space-y-2 transition-all ${
                              isRepSelected
                                ? "border border-[var(--accent-main)] ring-1 ring-[var(--accent-main)]/30 theme-bg-sub/30"
                                : "theme-bg-sub/20 border theme-border hover:theme-bg-sub/40"
                            }`}
                          >
                            {/* Session Header: Checkbox + Session Name + Date + ActionMenu */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {onToggleSelect && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 flex items-center cursor-pointer"
                                  >
                                    <CustomCheckbox
                                      size="sm"
                                      checked={isRepSelected}
                                      onChange={(checked) => {
                                        onToggleSelect(rep.id ?? rep.report_unique_id ?? repKey, checked);
                                      }}
                                    />
                                  </div>
                                )}
                                <span className="font-bold theme-accent truncate text-xs">
                                  {rep.session_name || "General Session"}
                                </span>
                                <span className="text-[11px] font-mono theme-text-secondary opacity-80 whitespace-nowrap">
                                  {rep.formattedReportDate || rep.date || "Today"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {unsynced && (
                                  <CloudIcon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                )}
                                <ActionMenu items={reportActions} />
                              </div>
                            </div>

                            {/* Recitation Content */}
                            <div className="text-[11px] font-mono space-y-0.5">
                              {isBook ? (
                                <div>
                                  <span className="font-semibold theme-text-primary">{bookTitle}</span>
                                  {lessonTitle && (
                                    <span className="theme-text-secondary opacity-90"> · Lesson: {lessonTitle}</span>
                                  )}
                                  <span className="mx-1 opacity-50">·</span>
                                  <span className="theme-accent font-bold">{rep.totalPages || 0} Pages</span>
                                </div>
                              ) : portions.length > 0 ? (
                                portions.map((jp, pIdx) => {
                                  const rangesStr = Array.isArray(jp.ranges)
                                    ? jp.ranges
                                        .map((r) => `p. ${r.start || r.page_start || 0}–${r.end || r.page_end || 0}`)
                                        .join(", ")
                                    : "";
                                  const hasJuz = jp.juz !== undefined && jp.juz !== null && String(jp.juz).trim() !== "";
                                  return (
                                    <div key={pIdx} className="flex items-center gap-1">
                                      {hasJuz ? (
                                        <span className="font-bold theme-accent">Juz {jp.juz}:</span>
                                      ) : (
                                        <span className="font-bold theme-accent">Page:</span>
                                      )}
                                      <span className="theme-text-primary">{rangesStr || "—"}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="theme-text-secondary opacity-70">
                                  {rep.totalPages || 0} Pages
                                </span>
                              )}
                            </div>

                            {/* Errors Counter Pills (Neutral bg/border, text-only error colors) */}
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span
                                className={`px-2 py-0.5 rounded-md theme-bg-sub/30 border theme-border ${
                                  repMistakes.length > 0
                                    ? "text-rose-500 font-bold"
                                    : "theme-text-secondary"
                                }`}
                              >
                                {repMistakes.length} Mistakes
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md theme-bg-sub/30 border theme-border ${
                                  repStucks.length > 0
                                    ? "text-amber-500 font-bold"
                                    : "theme-text-secondary"
                                }`}
                              >
                                {repStucks.length} Stucks
                              </span>
                            </div>

                            {/* Comments with Reported By (adhering to Rule 3) */}
                            <ReportCommentsCell
                              comment={rep.comment}
                              teacherName={rep.teacher_name || rep.teacher}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Footer: Student ID & Expand Toggle */}
              <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] font-mono theme-text-secondary">
                <span>{stu.meta.studentId || `Student #${stu.student_name}`}</span>
                <button
                  type="button"
                  onClick={() => handleToggleStudentExpand(stu.student_key)}
                  className="theme-accent hover:underline font-semibold cursor-pointer text-[10px]"
                >
                  {isExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Enterprise Reusable Pagination Controls */}
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
          pageSizeOptions={[12, 24, 48, 96]}
          itemLabel="students"
        />
      )}
    </div>
  );
}
