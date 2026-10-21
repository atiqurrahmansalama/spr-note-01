import React, { useState, useMemo, useEffect, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { StudentGroupedTableProps } from "../types";
import { useStudentMetaResolver } from "../utils/studentMetaResolver";
import { sortDataset } from "../utils/tableSortUtils";
import { TableBatchToolbar } from "./TableBatchToolbar";
import { StudentSessionTimeline } from "./StudentSessionTimeline";
import { EmptyReportsState } from "./EmptyReportsState";
import {
  useStudentGroupedData,
  useStudentGroupedColumns,
  EnrichedStudentRow,
} from "../hooks";
import { useTranslation } from "@/i18n";
import "../locales";

export type { EnrichedStudentRow };

/**
 * Enterprise Hierarchical Student-Grouped Reports Table
 * Orchestrates student-level rollup analytics with granular nested timeline inspection.
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

  // Consolidate & enrich student grouped rows via custom hook
  const enrichedStudentRows = useStudentGroupedData(
    studentGroupedData,
    reportsList,
    resolveStudentMeta
  );

  // Reset pagination when data count changes
  useEffect(() => {
    setCurrentPage(1);
  }, [enrichedStudentRows.length]);

  // Accordion toggle: single student expansion
  const toggleStudentExpand = useCallback((studentKey: string) => {
    setExpandedStudents((prev) => (prev.has(studentKey) ? new Set() : new Set([studentKey])));
  }, []);

  // Expand All / Collapse All
  const handleToggleExpandAll = useCallback(() => {
    if (expandedStudents.size === enrichedStudentRows.length && enrichedStudentRows.length > 0) {
      setExpandedStudents(new Set());
    } else {
      const allKeys = enrichedStudentRows.map((s) => s.student_key);
      setExpandedStudents(new Set(allKeys));
    }
  }, [expandedStudents.size, enrichedStudentRows]);

  // Toggle selection for all reports of a specific student
  const handleStudentSelectToggle = useCallback(
    (stu: EnrichedStudentRow, explicitChecked?: boolean) => {
      if (!onBatchSelect) return;
      const stuReportIds = stu.reports.map((r) => r.id ?? r.report_unique_id ?? "").filter(Boolean);
      if (stuReportIds.length === 0) return;

      const hasId = (id: any) =>
        selectedIds.has(id) || selectedIds.has(String(id)) || (!isNaN(Number(id)) && selectedIds.has(Number(id)));

      const allSelected = stuReportIds.every(hasId);
      const shouldUnselect = explicitChecked !== undefined ? !explicitChecked : allSelected;

      const nextSet = new Set(selectedIds);
      if (shouldUnselect) {
        stuReportIds.forEach((id) => {
          nextSet.delete(id);
          nextSet.delete(String(id));
          if (!isNaN(Number(id))) nextSet.delete(Number(id));
        });
      } else {
        stuReportIds.forEach((id) => nextSet.add(id));
      }
      onBatchSelect(nextSet);
    },
    [onBatchSelect, selectedIds]
  );

  // Table Columns Definition via custom hook
  const columns = useStudentGroupedColumns({
    t,
    expandedStudents,
    selectedIds,
    toggleStudentExpand,
    handleStudentSelectToggle,
  });

  // Sort student dataset using universal sorter
  const sortedStudents = useMemo(
    () => sortDataset(enrichedStudentRows, sortConfig, columns),
    [enrichedStudentRows, sortConfig, columns]
  );

  const totalItems = sortedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedStudents.slice(startIndex, startIndex + pageSize);
  }, [sortedStudents, safeCurrentPage, pageSize]);

  // Derived selected student keys (selected if all child reports are selected)
  const selectedStudentKeys = useMemo(() => {
    const set = new Set<string>();
    const hasId = (id: any) =>
      selectedIds.has(id) || selectedIds.has(String(id)) || (!isNaN(Number(id)) && selectedIds.has(Number(id)));

    enrichedStudentRows.forEach((stu) => {
      const stuReportIds = stu.reports.map((r) => r.id ?? r.report_unique_id ?? "").filter(Boolean);
      if (stuReportIds.length > 0 && stuReportIds.every(hasId)) {
        set.add(stu.student_key);
      }
    });
    return set;
  }, [enrichedStudentRows, selectedIds]);

  if (enrichedStudentRows.length === 0) {
    return (
      <EmptyReportsState
        t={t}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <div className="w-full select-none animate-fade-in space-y-3">
      {/* Top Quick Actions Bar */}
      <TableBatchToolbar
        totalItems={totalItems}
        selectedCount={selectedIds.size}
        isAllExpanded={expandedStudents.size === enrichedStudentRows.length && enrichedStudentRows.length > 0}
        onToggleExpandAll={handleToggleExpandAll}
        expandAllLabel={t("expandAll", "Expand All")}
        collapseAllLabel={t("collapseAll", "Collapse All")}
        showingLabel={`Showing ${paginatedStudents.length} of ${totalItems} students`}
      />

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
        onSelectRow={(key: any, _item: any, checked?: boolean) => {
          const matchedStu = paginatedStudents.find((s) => s.student_key === key);
          if (matchedStu) handleStudentSelectToggle(matchedStu, checked);
        }}
        onSelectAll={(keys: any[], checked: boolean) => {
          if (!onBatchSelect) return;
          const nextSet = new Set(selectedIds);
          if (checked) {
            paginatedStudents.forEach((s) => {
              s.reports.forEach((r) => {
                const id = r.id ?? r.report_unique_id;
                if (id !== undefined && id !== null && id !== "") nextSet.add(id);
              });
            });
          } else {
            paginatedStudents.forEach((s) => {
              s.reports.forEach((r) => {
                const id = r.id ?? r.report_unique_id;
                if (id !== undefined && id !== null && id !== "") {
                  nextSet.delete(id);
                  nextSet.delete(String(id));
                  if (!isNaN(Number(id))) nextSet.delete(Number(id));
                }
              });
            });
          }
          onBatchSelect(nextSet);
        }}
        keyExtractor={(stu) => stu.student_key}
        idField="student_key"
        expandOnRowClick={true}
        expandedRowIds={expandedStudents}
        onToggleExpand={(key) => toggleStudentExpand(String(key))}
        selectionHeaderClassName="!w-12 !min-w-[48px] !max-w-[48px] !p-0 text-center"
        selectionCellClassName="!w-12 !min-w-[48px] !max-w-[48px] !p-0 text-center"
        headerPaddingClass="py-2.5 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider"
        cellPaddingClass="py-2.5 px-3 sm:px-4 text-xs"
        tableClassName="w-full table-fixed"
        rowClassName={(stu: EnrichedStudentRow) =>
          expandedStudents.has(stu.student_key) ? "[&>td]:!border-b-0" : ""
        }
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
            studentName={stu.student_name}
            reports={stu.reports}
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
