import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronIcon,
  ChecklistIcon,
  EditIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import DataTable from "@/components/ui/DataTable";
import ActionMenu from "@/components/ui/ActionMenu";
import Pagination from "@/components/ui/Pagination";
import ReportCardDetail from "./ReportCardDetail";
import { getReportMenuItems } from "./ReportContextMenu";
import { RecordReportsTableProps, ReportItem } from "../types";
import { useAcademicData } from "@/hooks/useAcademicData";

/**
 * Enterprise Record Reports Table
 * Powered directly by the project's centralized DataTable, Pagination, and ActionMenu components.
 */
export default function RecordReportsTable({
  reports,
  reportsList = [],
  selectedIds = new Set(),
  onToggleSelect,
  onBatchSelect,
  onDeselectAll,
  onContextMenu,
  onEdit,
  onDelete,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onResetFilters,
  onRefresh,
}: RecordReportsTableProps) {
  const activeReportsList = reports || reportsList || [];
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc" | null;
  }>({
    key: "date",
    direction: "desc",
  });

  // Dynamic Academic Hierarchy Data
  const { students = [], classes = [], sections = [], departments = [] } =
    (useAcademicData() as any) || {};

  // High performance lookup maps for roster matching
  const { studentById, studentByName, classById, classByName, sectionById, deptById } = useMemo(() => {
    const studentById = new Map<string, any>();
    const studentByName = new Map<string, any>();
    (students || []).forEach((s: any) => {
      if (s.id !== undefined && s.id !== null) studentById.set(String(s.id), s);
      if (s.uniq_id) studentById.set(String(s.uniq_id), s);
      if (s.unique_id) studentById.set(String(s.unique_id), s);
      if (s.name_en) studentByName.set(s.name_en.trim().toLowerCase(), s);
      if (s.name) studentByName.set(s.name.trim().toLowerCase(), s);
      if (s.bangla_name) studentByName.set(s.bangla_name.trim().toLowerCase(), s);
      if (s.label) studentByName.set(s.label.trim().toLowerCase(), s);
    });

    const classById = new Map<string, any>();
    const classByName = new Map<string, any>();
    (classes || []).forEach((c: any) => {
      if (c.id !== undefined && c.id !== null) classById.set(String(c.id), c);
      if (c.name) classByName.set(c.name.trim().toLowerCase(), c);
    });

    const sectionById = new Map<string, any>();
    (sections || []).forEach((sec: any) => {
      if (sec.id !== undefined && sec.id !== null) sectionById.set(String(sec.id), sec);
    });

    const deptById = new Map<string, any>();
    (departments || []).forEach((d: any) => {
      if (d.id !== undefined && d.id !== null) deptById.set(String(d.id), d);
      if (d.code) deptById.set(d.code.trim().toUpperCase(), d);
    });

    return { studentById, studentByName, classById, classByName, sectionById, deptById };
  }, [students, classes, sections, departments]);

  // Comprehensive Student & Academic Metadata Resolver
  const resolveStudentMeta = useCallback(
    (rep: ReportItem) => {
      const rawStudentId =
        typeof rep.student === "object"
          ? rep.student?.id || rep.student?.uniq_id
          : rep.student || rep.student_id || rep.studentId;
      const rawStudentName = (
        rep.student_name ||
        rep.studentName ||
        rep.student_details?.name_en ||
        rep.student_details?.name ||
        (typeof rep.student === "object" ? rep.student?.name || rep.student?.name_en : null) ||
        (typeof rep.student === "string" && isNaN(Number(rep.student)) ? rep.student : null) ||
        ""
      ).trim();

      const matchedStudent =
        (rawStudentId ? studentById.get(String(rawStudentId)) : null) ||
        (rawStudentName ? studentByName.get(rawStudentName.toLowerCase()) : null);

      const studentDetails =
        rep.student_details || matchedStudent || (typeof rep.student === "object" ? rep.student : null);

      const name =
        rawStudentName ||
        studentDetails?.name_en ||
        studentDetails?.name ||
        matchedStudent?.name_en ||
        matchedStudent?.name ||
        "Unnamed Student";

      const rawRoll =
        rep.rollNumber ??
        rep.roll_number ??
        rep.roll ??
        studentDetails?.roll_number ??
        studentDetails?.roll ??
        matchedStudent?.roll_number ??
        matchedStudent?.roll ??
        "";
      const roll = String(rawRoll).trim();

      const rawStudentIdVal =
        rep.uniqId ||
        rep.unique_id ||
        rep.student_uniq_id ||
        studentDetails?.uniq_id ||
        studentDetails?.unique_id ||
        studentDetails?.student_id_card_number ||
        matchedStudent?.uniq_id ||
        matchedStudent?.unique_id ||
        matchedStudent?.student_id_card_number ||
        (rep.studentId && !String(rep.studentId).startsWith("stu_") ? String(rep.studentId) : "") ||
        "";
      const studentId = String(rawStudentIdVal).trim();

      // Class Resolution
      let classId = String(
        rep.classId ||
        rep.class_id ||
        rep.student_class_id ||
        studentDetails?.student_class?.id ||
        studentDetails?.student_class ||
        studentDetails?.class_id ||
        matchedStudent?.student_class?.id ||
        matchedStudent?.student_class ||
        matchedStudent?.class_id ||
        ""
      );
      let className =
        rep.className ||
        rep.student_class_name ||
        rep.class_name ||
        studentDetails?.student_class_name ||
        studentDetails?.class_name ||
        matchedStudent?.student_class_name ||
        matchedStudent?.class_name ||
        "";

      const foundClass =
        (classId ? classById.get(classId) : null) ||
        (className ? classByName.get(className.trim().toLowerCase()) : null);
      if (foundClass) {
        if (!className && foundClass.name) className = foundClass.name;
        if (!classId && foundClass.id) classId = String(foundClass.id);
      }

      // Section Resolution
      let sectionId = String(
        rep.sectionId ||
        rep.section_id ||
        rep.student_section_id ||
        studentDetails?.section?.id ||
        studentDetails?.section ||
        studentDetails?.student_section ||
        matchedStudent?.section?.id ||
        matchedStudent?.section ||
        matchedStudent?.student_section ||
        ""
      );
      let sectionName =
        rep.sectionName ||
        rep.student_section_name ||
        rep.section_name ||
        studentDetails?.student_section_name ||
        studentDetails?.section_name ||
        matchedStudent?.student_section_name ||
        matchedStudent?.section_name ||
        "";

      const foundSection = sectionId ? sectionById.get(sectionId) : null;
      if (foundSection && !sectionName) {
        sectionName = foundSection.section_name || foundSection.name || "";
      }

      // Department Resolution
      let deptId = String(
        rep.departmentId ||
        rep.department_id ||
        studentDetails?.department?.id ||
        studentDetails?.department ||
        studentDetails?.department_id ||
        matchedStudent?.department?.id ||
        matchedStudent?.department ||
        foundClass?.department?.id ||
        foundClass?.department_id ||
        (typeof foundClass?.department === "string" || typeof foundClass?.department === "number"
          ? foundClass.department
          : "") ||
        ""
      );
      let deptCode =
        rep.departmentCode ||
        rep.department_code ||
        rep.dept_code ||
        studentDetails?.department?.code ||
        studentDetails?.department_code ||
        studentDetails?.dept_code ||
        matchedStudent?.department?.code ||
        matchedStudent?.department_code ||
        foundClass?.department?.code ||
        foundClass?.department_code ||
        "";

      const foundDept =
        (deptId ? deptById.get(deptId) : null) ||
        (deptCode ? deptById.get(deptCode.trim().toUpperCase()) : null);
      if (foundDept) {
        if (!deptCode && foundDept.code) deptCode = foundDept.code;
      }

      if (!deptCode && (rep.departmentName || foundDept?.name || foundClass?.department?.name)) {
        const dName = rep.departmentName || foundDept?.name || foundClass?.department?.name || "";
        const words = dName.trim().split(/\s+/);
        deptCode =
          words.length === 1
            ? words[0].slice(0, 4).toUpperCase()
            : words.map((w: string) => w.charAt(0)).join("").toUpperCase();
      }

      return {
        name,
        roll,
        studentId,
        className: className || rep.student_group || "General Class",
        sectionName,
        deptCode,
        group: rep.student_group || "Standard",
      };
    },
    [studentById, studentByName, classById, classByName, sectionById, deptById]
  );

  // Reset to first page when the total count of reports changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeReportsList.length]);

  // Table Columns Definition
  const columns = useMemo(() => [
    {
      key: "student_name",
      header: "Student & ID",
      sortable: true,
      align: "left",
      minWidth: "190px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (rep: ReportItem) => resolveStudentMeta(rep).name,
      render: (rep: ReportItem) => {
        const meta = resolveStudentMeta(rep);
        const hasRoll = Boolean(meta.roll && meta.roll !== "0");
        const hasId = Boolean(meta.studentId);

        return (
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold theme-text-primary block truncate max-w-[180px]">
                {meta.name}
              </span>
              {(rep.sync_status === "PENDING" || rep.sync_status === "GRACE_PERIOD") && (
                <span
                  className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                  title={rep.sync_status === "GRACE_PERIOD" ? "Local Cache" : "Pending Sync"}
                />
              )}
            </div>
            <div className="text-[11px] theme-text-secondary font-mono truncate flex items-center gap-1">
              {hasRoll && <span>Roll: #{meta.roll}</span>}
              {hasRoll && hasId && <span>·</span>}
              {hasId && (
                <span className="opacity-90">ID: {meta.studentId}</span>
              )}
              {!hasRoll && !hasId && (
                <span className="opacity-60">{meta.group}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "className",
      header: "Dept · Class · Sec",
      sortable: true,
      align: "left",
      minWidth: "170px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (rep: ReportItem) => resolveStudentMeta(rep).className,
      render: (rep: ReportItem) => {
        const meta = resolveStudentMeta(rep);
        const hasDept = Boolean(meta.deptCode && meta.deptCode.trim() !== "");
        const hasSec = Boolean(meta.sectionName && meta.sectionName.trim() !== "");

        return (
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold theme-text-primary block truncate max-w-[160px]">
              {meta.className}
            </span>
            <div className="text-[11px] theme-text-secondary font-medium truncate flex items-center gap-1.5">
              {hasDept && (
                <span className="font-semibold font-mono theme-text-primary">
                  {meta.deptCode}
                </span>
              )}
              {hasDept && hasSec && <span>·</span>}
              {hasSec && <span>Sec {meta.sectionName}</span>}
              {!hasDept && !hasSec && (
                <span>{meta.group}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "date",
      header: "Date & Time",
      sortable: true,
      align: "left",
      minWidth: "130px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (rep: ReportItem) => rep.isoDateOnly || rep.report_date || rep.date || "",
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
      key: "session_name",
      header: "Session & Pages",
      sortable: true,
      align: "center",
      minWidth: "140px",
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
      key: "errors",
      header: "Mistakes & Stucks",
      sortable: true,
      align: "left",
      minWidth: "130px",
      headerClassName: "!pl-0",
      cellClassName: "!pl-0",
      sortValue: (rep: ReportItem) =>
        (Number(rep.mistakesCount) || 0) + (Number(rep.stucksCount) || 0),
      render: (rep: ReportItem) => {
        const mistakes = Number(rep.mistakesCount) || 0;
        const stucks = Number(rep.stucksCount) || 0;
        const isClean = mistakes === 0 && stucks === 0;

        if (isClean) {
          return (
            <span className="text-xs font-mono font-medium theme-text-secondary opacity-60">
              0
            </span>
          );
        }

        return (
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="theme-text-secondary font-medium">Mistakes:</span>
              <span className={`font-bold font-mono ${mistakes > 0 ? "text-rose-400" : "theme-text-secondary"}`}>
                {mistakes}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="theme-text-secondary font-medium">Stucks:</span>
              <span className={`font-bold font-mono ${stucks > 0 ? "text-amber-400" : "theme-text-secondary"}`}>
                {stucks}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      width: "80px",
      render: (rep: ReportItem) => {
        const repKey = rep.id || rep.report_unique_id || "";
        const isExpanded = expandedId === repKey;

        const actionItems = getReportMenuItems({
          report: rep,
          targetList:
            selectedIds.size > 0 && selectedIds.has(rep.id || rep.report_unique_id)
              ? activeReportsList.filter((r) =>
                  selectedIds.has(r.id || r.report_unique_id)
                )
              : undefined,
          onCopyText,
          onExportCSV,
          onExportJSON,
          onPrintPDF,
          onEdit,
          onDelete,
        });

        return (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : repKey)}
              className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={isExpanded ? "Collapse Details" : "Expand Details"}
            >
              <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
            </button>
            <ActionMenu
              size="xs"
              variant="ghost"
              buttonClassName="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
              title={rep.student_name || "Student Report"}
              subtitle={`${rep.formattedDate || "Date"} · ${rep.session_name || "Session"}`}
              items={actionItems}
              ariaLabel="Report Options"
            />
          </div>
        );
      },
    },
  ], [
    expandedId,
    onEdit,
    onDelete,
    onCopyText,
    onExportCSV,
    onExportJSON,
    onPrintPDF,
    selectedIds,
    activeReportsList,
  ]);

  // Active sorting column lookup
  const activeSortColumn = useMemo(() => {
    if (!sortConfig.key) return null;
    return (
      columns.find(
        (c: any) =>
          (c.sortKey || c.accessor || c.key || c.id) === sortConfig.key
      ) || null
    );
  }, [columns, sortConfig.key]);

  // Sort entire reports dataset before slicing for pagination
  const sortedReports = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction || !activeSortColumn) {
      return activeReportsList;
    }
    const { direction } = sortConfig;
    const isAsc = direction === "asc";
    const shallow = [...activeReportsList];

    return shallow.sort((a, b) => {
      let valA: any;
      let valB: any;

      const sortCol = activeSortColumn as any;
      if (typeof sortCol.sortValue === "function") {
        valA = sortCol.sortValue(a);
        valB = sortCol.sortValue(b);
      } else {
        const key = sortCol.sortKey || sortCol.key;
        valA = a[key as keyof ReportItem];
        valB = b[key as keyof ReportItem];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === "") return 1;
      if (valB === null || valB === undefined || valB === "") return -1;

      const numA = Number(valA);
      const numB = Number(valB);
      if (
        !isNaN(numA) &&
        !isNaN(numB) &&
        typeof valA !== "boolean" &&
        typeof valB !== "boolean"
      ) {
        return isAsc ? numA - numB : numB - numA;
      }

      return isAsc
        ? String(valA).localeCompare(String(valB), undefined, {
            numeric: true,
            sensitivity: "base",
          })
        : String(valB).localeCompare(String(valA), undefined, {
            numeric: true,
            sensitivity: "base",
          });
    });
  }, [activeReportsList, sortConfig, activeSortColumn]);

  const totalItems = sortedReports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedReports = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedReports.slice(startIndex, startIndex + pageSize);
  }, [sortedReports, safeCurrentPage, pageSize]);

  if (activeReportsList.length === 0) {
    return (
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3.5 shadow-sm select-none">
        <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center theme-text-secondary opacity-80">
          <ChecklistIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold theme-text-primary">No Progress Reports Found</h4>
          <p className="text-xs theme-text-secondary max-w-sm">
            No daily progress reports match the current filters or date criteria.
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
                Reset Filters
              </button>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm"
              >
                Refresh Data
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full select-none animate-fade-in space-y-3">
      <DataTable
        columns={columns}
        data={paginatedReports}
        sortable={true}
        sortConfig={sortConfig}
        onSortChange={(cfg: any) => {
          setSortConfig({ key: cfg?.key || null, direction: cfg?.direction || null });
        }}
        selectable={true}
        selectedIds={Array.from(selectedIds)}
        onSelectRow={(id: any) => onToggleSelect?.(id)}
        onSelectAll={(ids: any[], checked: boolean) => {
          if (checked) {
            onBatchSelect?.(new Set([...selectedIds, ...ids]));
          } else {
            const nextSet = new Set(selectedIds);
            ids.forEach((id) => nextSet.delete(id));
            onBatchSelect?.(nextSet);
          }
        }}
        keyExtractor={(rep) => rep.id || rep.report_unique_id || ""}
        idField="report_unique_id"
        expandOnRowClick={true}
        expandedRowIds={expandedId ? new Set([expandedId]) : new Set()}
        onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
        onRowContextMenu={(e, rep) => onContextMenu?.(e, rep)}
        renderExpandedCells={(rep) => (
          <ReportCardDetail
            report={rep}
            variant="table-cells"
          />
        )}
        renderExpandedFooter={(rep) => (
          <ReportCardDetail
            report={rep}
            variant="footer"
            onEdit={onEdit}
            onDelete={onDelete}
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
          itemLabel="reports"
        />
      )}
    </div>
  );
}
