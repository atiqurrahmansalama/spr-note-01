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
} from "@/components/ui/Icons";
import { RecordReportsTableProps, ReportItem } from "../types";
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
import { useTranslation } from "@/i18n";
import "../locales";

/**
 * Enterprise Record Reports Card Grid
 * Rich, responsive card-based progress reports view with selection, action menus, and KPI stats.
 */
export default function RecordReportsCardGrid({
  reports,
  reportsList,
  selectedIds = new Set(),
  onToggleSelect,
  onBatchSelect,
  onDeselectAll,
  onContextMenu,
  onEdit,
  onDelete,
  onSync,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onResetFilters,
  onRefresh,
}: RecordReportsTableProps) {
  const { t } = useTranslation("progressReports");
  const activeReportsList = reports || reportsList || [];
  const { resolveStudentMeta } = useStudentMetaResolver();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [expandedComments, setExpandedComments] = useState<Set<string | number>>(new Set());

  // Reset pagination on list size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeReportsList.length]);

  const sortedReports = useMemo(() => {
    return [...activeReportsList].sort((a, b) => {
      const dateA = new Date(a.date || a.report_date || a.created_at || 0).getTime();
      const dateB = new Date(b.date || b.report_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [activeReportsList]);

  const totalItems = sortedReports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedReports = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedReports.slice(startIndex, startIndex + pageSize);
  }, [sortedReports, safeCurrentPage, pageSize]);

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

  // Select all visible on current page
  // Select all visible on current page
  const handleToggleSelectAll = useCallback(() => {
    if (!onBatchSelect || !onDeselectAll) return;
    const allSelected = paginatedReports.length > 0 && paginatedReports.every(isReportSelected);

    const next = new Set(selectedIds);
    paginatedReports.forEach((r) => {
      const canonicalKey = String(r.id ?? r.report_unique_id ?? "");
      next.delete(canonicalKey);
      if (r.id !== undefined && r.id !== null) {
        next.delete(r.id);
        next.delete(String(r.id));
        if (!isNaN(Number(r.id))) next.delete(Number(r.id));
      }
      if (r.report_unique_id) {
        next.delete(r.report_unique_id);
        next.delete(String(r.report_unique_id));
      }

      if (!allSelected && canonicalKey) {
        next.add(canonicalKey);
      }
    });
    onBatchSelect(next);
  }, [paginatedReports, selectedIds, isReportSelected, onBatchSelect, onDeselectAll]);

  const toggleCommentExpand = (id: string | number) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (activeReportsList.length === 0) {
    return (
      <EmptyReportsState
        t={t}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />
    );
  }

  const isAllCurrentSelected =
    paginatedReports.length > 0 && paginatedReports.every(isReportSelected);

  return (
    <div className="space-y-4 w-full">
      {/* Batch and Selection Header Toolbar */}
      <TableBatchToolbar
        totalItems={totalItems}
        selectedCount={selectedIds.size}
        isAllExpanded={isAllCurrentSelected}
        onToggleExpandAll={handleToggleSelectAll}
        expandAllLabel={t("selectAll", "Select All Visible")}
        collapseAllLabel={t("deselectAll", "Deselect All Visible")}
        showingLabel={`Showing ${paginatedReports.length} of ${totalItems} reports`}
        showSelectedBadge={true}
        selectedBadgeLabel="selected"
      />

      {/* Grid of Report Cards */}
      <DataCardGrid
        data={paginatedReports}
        keyExtractor={(rep) => String(rep.id ?? rep.report_unique_id)}
        gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        renderCard={(report: ReportItem) => {
          const reportKey = String(report.id ?? report.report_unique_id ?? "");
          const isSelected = isReportSelected(report);
          const meta = resolveStudentMeta(report);
          const portions = getPortions(report);
          const mistakes = getMistakes(report).filter(
            (m) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())
          );
          const stucks = getStucks(report).filter(
            (s) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())
          );
          const unsynced = isReportUnsynced(report);
          const isBook = isBookReport(report);
          const bookTitle = isBook ? getBookTitle(report) : "";
          const lessonTitle = isBook ? getLessonTitle(report) : "";
          const isCommentExpanded = expandedComments.has(reportKey);
          const isEdited = Boolean(report.is_edited && (report.edited_at || report.edit_time));

          const actionMenuItems = getReportMenuItems({
            report,
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
              key={reportKey}
              onContextMenu={(e) => onContextMenu && onContextMenu(e, report)}
              className={`rounded-2xl theme-bg-surface transition-all p-4 sm:p-5 flex flex-col justify-between space-y-3.5 relative group shadow-xs hover:shadow-md ${
                isSelected
                  ? "border border-[var(--accent-main)] ring-1 ring-[var(--accent-main)]/30 theme-bg-sub/20 shadow-sm"
                  : "border theme-border hover:border-[var(--border-hover)] hover:theme-bg-sub/10"
              }`}
            >
              <div className="space-y-3">
                {/* 1. Top Bar: Checkbox + Student Name + Sync Status + 3-Dots ActionMenu */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Reusable Enterprise Checkbox */}
                    {onToggleSelect && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 flex items-center cursor-pointer"
                      >
                        <CustomCheckbox
                          size="sm"
                          checked={isSelected}
                          onChange={(checked) => {
                            onToggleSelect(report.id ?? report.report_unique_id ?? reportKey, checked);
                          }}
                        />
                      </div>
                    )}

                    {/* Student Name & Meta Details */}
                    <div className="min-w-0 flex-1 text-left">
                      <h3
                        className="font-bold theme-text-primary text-sm truncate leading-tight"
                        title={report.student_name}
                      >
                        {report.student_name || "Unnamed Student"}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono theme-text-secondary mt-0.5 truncate">
                        {meta.studentId && <span>{meta.studentId}</span>}
                        {meta.roll && (
                          <>
                            {meta.studentId && <span className="opacity-40">·</span>}
                            <span>Roll {meta.roll}</span>
                          </>
                        )}
                        {meta.group && (
                          <>
                            {(meta.studentId || meta.roll) && <span className="opacity-40">·</span>}
                            <span className="truncate max-w-[100px]">{meta.group}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Header: Sync Status & ActionMenu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unsynced ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1"
                        title="Pending sync to cloud database"
                      >
                        <CloudIcon className="w-3 h-3 animate-pulse" />
                        <span className="hidden sm:inline">Offline</span>
                      </span>
                    ) : (
                      <span
                        className="text-emerald-500 opacity-80"
                        title="Synced to cloud database"
                      >
                        <CloudIcon className="w-4 h-4" />
                      </span>
                    )}

                    <ActionMenu items={actionMenuItems} />
                  </div>
                </div>

                {/* 2. Metadata Bar: Date & Time, Session Name (Badge Quran/Book removed per requirement) */}
                <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5 theme-text-secondary font-mono text-[11px]">
                    <span>
                      {report.formattedReportDate ||
                        report.date ||
                        report.formattedDate ||
                        "Today"}
                    </span>
                    {(report.formattedTime || report.date_time) && (
                      <>
                        <span className="opacity-40">·</span>
                        <span>{report.formattedTime || report.date_time}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold theme-bg-sub/40 border theme-border theme-text-secondary truncate max-w-[140px]"
                      title={report.session_name || "General Session"}
                    >
                      {report.session_name || "General Session"}
                    </span>
                  </div>
                </div>

                {/* 3. Recitation Portions Box */}
                <div className="p-2.5 rounded-xl theme-bg-sub/20 border theme-border text-left space-y-1">
                  <div className="text-[10px] uppercase font-bold theme-text-secondary tracking-wider">
                    {isBook ? "Lesson & Portions" : "Portions Recited"}
                  </div>
                  {isBook ? (
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold theme-text-primary truncate">
                        {bookTitle || "Subject / Book"}
                      </div>
                      <div className="text-[11px] theme-text-secondary truncate">
                        Lesson: {lessonTitle || "—"}
                      </div>
                      <div className="text-[11px] font-mono font-bold theme-accent">
                        {portions.length > 0
                          ? portions
                              .flatMap((jp) =>
                                (jp.ranges || []).map((r) => {
                                  const s = r.start || r.page_start;
                                  const e = r.end || r.page_end;
                                  if (s && e && String(s) !== String(e)) return `Page ${s}–${e}`;
                                  if (s) return `Page ${s}`;
                                  return "";
                                }).filter(Boolean)
                              )
                              .join(", ") || `${report.totalPages || 0} Pages`
                          : `${report.totalPages || 0} Pages`}
                      </div>
                    </div>
                  ) : portions.length > 0 ? (
                    <div className="space-y-0.5 text-xs font-mono max-h-20 overflow-y-auto pr-1">
                      {portions.map((jp, idx) => {
                        const rangesStr = Array.isArray(jp.ranges)
                          ? jp.ranges
                              .map((r) => `Page ${r.start || r.page_start || 0}–${r.end || r.page_end || 0}`)
                              .join(", ")
                          : "";
                        const hasJuz = jp.juz !== undefined && jp.juz !== null && String(jp.juz).trim() !== "";
                        return (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                            {hasJuz ? (
                              <span className="font-bold theme-accent shrink-0">Juz {jp.juz}:</span>
                            ) : (
                              <span className="font-bold theme-accent shrink-0">Page:</span>
                            )}
                            <span className="theme-text-primary font-medium break-words">
                              {rangesStr || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs font-mono theme-text-secondary opacity-60">—</span>
                  )}
                </div>

                {/* 4. KPI Performance Metrics Row (Pages, Mistakes, Stucks with text-only error color) */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {/* Total Pages */}
                  <div className="p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <span className="text-[10px] theme-text-secondary block font-medium">Pages</span>
                    <span className="text-sm font-bold font-mono theme-accent">
                      {report.totalPages || report.total_page || report.pages || 0}
                    </span>
                  </div>

                  {/* Mistakes */}
                  <div className="p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <span className="text-[10px] theme-text-secondary block font-medium">Mistakes</span>
                    <span className={`text-sm font-bold font-mono ${mistakes.length > 0 ? "text-rose-500" : "theme-text-secondary"}`}>
                      {mistakes.length}
                    </span>
                  </div>

                  {/* Stucks */}
                  <div className="p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <span className="text-[10px] theme-text-secondary block font-medium">Stucks</span>
                    <span className={`text-sm font-bold font-mono ${stucks.length > 0 ? "text-amber-500" : "theme-text-secondary"}`}>
                      {stucks.length}
                    </span>
                  </div>
                </div>

                {/* 5. Comments Section (if present) */}
                {report.comment && report.comment.trim() && (
                  <div className="text-left text-xs p-2 rounded-xl theme-bg-sub/20 border theme-border">
                    <p
                      className={`theme-text-primary italic leading-relaxed break-words ${
                        isCommentExpanded ? "" : "line-clamp-2"
                      }`}
                      onClick={() => toggleCommentExpand(reportKey)}
                      title="Click to toggle full comment"
                    >
                      "{report.comment.trim()}"
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Card Footer: REPORT ID, REPORTED BY, Edited Badge & Quick Actions */}
              <div className="pt-2.5 border-t theme-border flex items-center justify-between gap-2 text-[11px] font-mono theme-text-secondary select-none flex-wrap">
                <div className="flex items-center gap-2 truncate max-w-full flex-wrap">
                  <span className="text-[10px] font-bold opacity-75">REPORT ID:</span>
                  <span className="theme-text-primary font-semibold">
                    {report.report_unique_id || `#${report.id}`}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] font-mono opacity-90 pl-1.5 border-l theme-border">
                    <span className="font-bold opacity-75">REPORTED BY:</span>
                    <span className="theme-text-primary font-semibold">
                      {report.teacher_name || report.teacher || "—"}
                    </span>
                  </span>

                  {isEdited && (
                    <span className="inline-flex items-center gap-1 theme-accent text-[10px] font-semibold">
                      <EditIcon className="w-3 h-3 theme-accent" />
                      <span>Edited</span>
                    </span>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(report);
                      }}
                      className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
                      title="Edit Report"
                      aria-label="Edit Report"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(report);
                      }}
                      className="p-1 rounded-lg hover:bg-rose-500/10 theme-text-secondary hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Report"
                      aria-label="Delete Report"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
          itemLabel="reports"
        />
      )}
    </div>
  );
}
