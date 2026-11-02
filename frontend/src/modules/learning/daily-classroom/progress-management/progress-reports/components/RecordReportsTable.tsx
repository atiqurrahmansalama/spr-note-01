import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { RecordReportsTableProps, ReportItem } from "../types";
import { useStudentMetaResolver } from "../utils/studentMetaResolver";
import { sortDataset } from "../utils/tableSortUtils";
import { TableBatchToolbar } from "./TableBatchToolbar";
import {
  RecordReportExpandedCells,
  RecordReportExpandedFooter,
} from "./RecordReportExpandedCells";
import { EmptyReportsState } from "./EmptyReportsState";
import { useRecordReportsColumns } from "../hooks";
import { useTranslation } from "@/i18n";
import "../locales";

/**
 * Enterprise Record Reports Data Grid
 * High-performance, single-pass table orchestration with expand-in-place inspection.
 */
export default function RecordReportsTable({
  reports,
  reportsList,
  selectedIds = new Set(),
  onToggleSelect,
  onBatchSelect,
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
  isAllExpanded: propIsAllExpanded,
  onToggleExpandAll: propOnToggleExpandAll,
  hideBatchToolbar = false,
}: RecordReportsTableProps) {
  const { t } = useTranslation("progressReports");
  const activeReportsList = reports || reportsList || [];
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc" | null;
  }>({
    key: "date",
    direction: "desc",
  });

  const { resolveStudentMeta } = useStudentMetaResolver();

  // Reset pagination on list size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeReportsList.length]);

  // Accordion toggle: at most 1 report row expanded at a time
  const handleToggleExpand = useCallback((id: number | string) => {
    const key = String(id);
    setExpandedIds((prev) => (prev.has(key) ? new Set() : new Set([key])));
  }, []);

  // Sync with external isAllExpanded only when prop value actually transitions
  const prevIsAllExpandedRef = useRef<boolean | undefined>(propIsAllExpanded);
  useEffect(() => {
    if (propIsAllExpanded !== undefined && prevIsAllExpandedRef.current !== propIsAllExpanded) {
      prevIsAllExpandedRef.current = propIsAllExpanded;
      if (propIsAllExpanded) {
        const allIds = activeReportsList.map((r) => String(r.id ?? r.report_unique_id ?? "")).filter(Boolean);
        setExpandedIds(new Set(allIds));
      } else {
        setExpandedIds(new Set());
      }
    }
  }, [propIsAllExpanded, activeReportsList]);

  // Expand / Collapse all
  const handleToggleExpandAll = useCallback(() => {
    if (propOnToggleExpandAll) {
      propOnToggleExpandAll();
    } else {
      if (expandedIds.size === activeReportsList.length && activeReportsList.length > 0) {
        setExpandedIds(new Set());
      } else {
        const allIds = activeReportsList.map((r) => String(r.id ?? r.report_unique_id ?? "")).filter(Boolean);
        setExpandedIds(new Set(allIds));
      }
    }
  }, [propOnToggleExpandAll, expandedIds.size, activeReportsList]);

  // Parent Table Columns Definition via custom hook
  const columns = useRecordReportsColumns({
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
  });

  // Sort and paginate
  const sortedReports = useMemo(
    () => sortDataset(activeReportsList, sortConfig, columns),
    [activeReportsList, sortConfig, columns]
  );

  const totalItems = sortedReports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedReports = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedReports.slice(startIndex, startIndex + pageSize);
  }, [sortedReports, safeCurrentPage, pageSize]);

  if (activeReportsList.length === 0) {
    return (
      <EmptyReportsState
        t={t}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3 text-left">
      {/* Universal Batch Toolbar (Hidden when Analytics is expanded) */}
      {!hideBatchToolbar && (
        <TableBatchToolbar
          totalItems={totalItems}
          selectedCount={selectedIds.size}
          isAllExpanded={expandedIds.size === activeReportsList.length && activeReportsList.length > 0}
          onToggleExpandAll={handleToggleExpandAll}
          expandAllLabel={t("expandAll", "Expand All")}
          collapseAllLabel={t("collapseAll", "Collapse All")}
          showingLabel={`Showing ${paginatedReports.length} of ${totalItems} records`}
        />
      )}

      {/* Main Single-Pass DataTable (Horizontal scroll with preserved standard columns) */}
      <DataTable
        wrapperClassName="w-full min-w-0 text-left"
        columns={columns}
        data={paginatedReports}
        sortable={true}
        sortConfig={sortConfig}
        onSortChange={(cfg: any) => {
          setSortConfig({ key: cfg?.key || null, direction: cfg?.direction || null });
        }}
        selectable={true}
        selectedIds={Array.from(selectedIds)}
        onSelectRow={(id: any, _item: any, checked?: boolean) => onToggleSelect?.(id, checked)}
        onSelectAll={(ids: any[], checked: boolean) => {
          if (!onBatchSelect) return;
          const nextSet = new Set(selectedIds);
          paginatedReports.forEach((r) => {
            const id = r.id ?? r.report_unique_id;
            const strKey = String(id ?? "");
            nextSet.delete(id);
            nextSet.delete(strKey);
            if (!isNaN(Number(id))) nextSet.delete(Number(id));
            if (checked && strKey) {
              nextSet.add(strKey);
            }
          });
          onBatchSelect(nextSet);
        }}
        keyExtractor={(rep) => String(rep.id ?? rep.report_unique_id ?? "")}
        idField="id"
        expandOnRowClick={true}
        expandedRowIds={expandedIds}
        onToggleExpand={(id) => handleToggleExpand(id)}
        onRowContextMenu={(e, rep) => onContextMenu?.(e, rep)}
        renderExpandedCells={(rep) => (
          <RecordReportExpandedCells
            report={rep}
            t={t}
            onEdit={onEdit}
            onDelete={onDelete}
            onCopyText={onCopyText}
            onExportCSV={onExportCSV}
            onExportJSON={onExportJSON}
            onPrintPDF={onPrintPDF}
          />
        )}
        renderExpandedFooter={(rep) => (
          <RecordReportExpandedFooter
            report={rep}
            t={t}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        expandedFooterColSpan={columns.length - 1}
        expandedFooterClassName="!pl-0 !pr-0 pt-2 pb-3 border-b theme-border"
        expandedFooterSpacerClassName="!w-[72px] !min-w-[72px] !max-w-[72px] p-0 border-b theme-border pointer-events-none select-none"
        expandedDividerClassName="hidden"
        selectionHeaderClassName="!w-12 !min-w-[48px] !max-w-[48px] !p-0 text-center"
        selectionCellClassName="!w-12 !min-w-[48px] !max-w-[48px] !p-0 text-center"
        headerPaddingClass="py-2.5 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider"
        cellPaddingClass="py-2.5 px-3 sm:px-4 text-xs"
        tableClassName="w-full min-w-[1160px] table-fixed text-left"
        rowClassName={(rep) => {
          const repKey = String(rep.id ?? rep.report_unique_id ?? "");
          return expandedIds.has(repKey) ? "[&>td]:!border-b-0" : "";
        }}
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
          itemLabel="reports"
        />
      )}
    </div>
  );
}
