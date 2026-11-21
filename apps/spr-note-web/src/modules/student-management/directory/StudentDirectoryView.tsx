import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFeatureControl } from "../../../context/FeatureControlContext";
import {
  StudentIcon,
  ClassIcon,
  SectionIcon,
  DepartmentIcon,
  PlusIcon,
  TrashIcon,
  BookOpenIcon,
  CheckCircleIcon,
  TransferIcon,
  SearchIcon,
  TableIcon,
  Squares2X2Icon,
  RefreshIcon,
} from "../../../components/ui/Icons";
import DataTable from "../../../components/ui/DataTable";
import DataCardGrid from "../../../components/ui/DataCardGrid";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomInput from "../../../components/ui/CustomInput";
import FilterBox from "../../../components/ui/FilterBox";
import Pagination from "../../../components/ui/Pagination";
import SelectionActionBar from "../../../components/ui/SelectionActionBar";
import { ConfirmModal } from "../../../components/ui/Modal";
import { DepartmentSelect, ClassSelect, SectionSelect } from "../../../components/selectors";
import MetricsGrid from "../../../components/ui/MetricsGrid";
import { PageContainer } from "../../../components/layout";
import StudentTransferModal from "./StudentTransferModal";
import { StudentCard, StudentBulkModal } from "./components";
import { useStudentDirectoryData, useStudentFilters, useStudentTableColumns } from "./hooks";
import { StudentDirectoryViewProps, StudentRecord, BulkActionType } from "./types";

export default function StudentDirectoryView({}: StudentDirectoryViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(highlightParam);
  const { isSectionEnabled } = useFeatureControl();

  // Selection & UI state
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [displayMode, setDisplayMode] = useState<"table" | "grid">(() => {
    try {
      return (localStorage.getItem("spr_students_display_mode") as "table" | "grid") || "table";
    } catch {
      return "table";
    }
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("spr_students_page_size");
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });

  // Modals state
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>("change_status");
  const [bulkStatusInput, setBulkStatusInput] = useState<string>("Active");
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [isBulkTransferModalOpen, setIsBulkTransferModalOpen] = useState<boolean>(false);
  const [transferringStudent, setTransferringStudent] = useState<StudentRecord | null>(null);

  // Single deletion modal state
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 1. Data hook
  const {
    students,
    departments,
    classes,
    groups,
    sections,
    academicYears,
    loading,
    metrics,
    refreshData,
    handleDeleteSingle,
    handleBulkAction,
  } = useStudentDirectoryData();

  // 2. Filters hook (SEARCH, DEPARTMENT, CLASS, SECTION, STATUS, ACADEMIC YEAR)
  const {
    searchQuery,
    setSearchQuery,
    departmentFilter,
    classFilter,
    sectionFilter,
    statusFilter,
    academicYearFilter,
    handleDepartmentFilterChange,
    handleClassFilterChange,
    handleSectionFilterChange,
    handleStatusFilterChange,
    handleAcademicYearFilterChange,
    resetAllFilters,
    filteredStudents,
    availableClasses,
    availableSections,
    hasActiveFilters,
    activeFilterCount,
  } = useStudentFilters(students, departments, classes, sections, academicYears);

  // Reset pagination to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, classFilter, sectionFilter, statusFilter, academicYearFilter]);

  // Dynamic Academic Year options
  const academicYearOptions = useMemo(() => {
    const list = Array.isArray(academicYears) ? academicYears : [];
    if (list.length > 0) {
      return list.map((y) => ({
        value: String(y.id || y.name || y.year),
        label: y.name || (y.year ? `Academic Year ${y.year}` : String(y.id)),
      }));
    }
    // Fallback: extract unique academic years from loaded student records
    const setYears = new Set<string>();
    students.forEach((s) => {
      if (s.academic_year) setYears.add(s.academic_year);
      else if (s.session_year) setYears.add(s.session_year);
      else if (s.admission_date) setYears.add(String(s.admission_date).split("-")[0]);
    });
    return Array.from(setYears)
      .sort()
      .reverse()
      .map((y) => ({
        value: y,
        label: `Academic Year ${y}`,
      }));
  }, [academicYears, students]);

  // Pagination calculations
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safeCurrentPage, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    try {
      localStorage.setItem("spr_students_page_size", String(newSize));
    } catch {}
  };

  // Fast maps for StudentCard grid view
  const classesMap = useMemo(() => {
    const map = new Map<string, any>();
    classes.forEach((c) => {
      if (c && c.id) map.set(String(c.id), c);
      if (c && c.name) map.set(String(c.name).toLowerCase(), c);
    });
    return map;
  }, [classes]);

  const sectionsByClassMap = useMemo(() => {
    const map = new Map<string, any[]>();
    sections.forEach((sec) => {
      const cId = String(
        sec.student_class_id ||
        (typeof sec.student_class === "object" ? sec.student_class?.id : sec.student_class) ||
        ""
      );
      if (cId) {
        const list = map.get(cId) || [];
        list.push(sec);
        map.set(cId, list);
      }
    });
    return map;
  }, [sections]);

  const groupsByClassMap = useMemo(() => {
    const map = new Map<string, any[]>();
    groups.forEach((grp) => {
      const cId = String(
        grp.student_class_id ||
        (typeof grp.student_class === "object" ? grp.student_class?.id : grp.student_class) ||
        ""
      );
      if (cId) {
        const list = map.get(cId) || [];
        list.push(grp);
        map.set(cId, list);
      }
    });
    return map;
  }, [groups]);

  // Columns & Action Menus hook
  const { tableColumns, getActionMenuItems } = useStudentTableColumns({
    classes,
    groups,
    sections,
    onNavigateProfile: (id) => navigate(`/students/${id}/profile`),
    onEditStudent: (student) => navigate(`/admission?edit=${student.id}`),
    onTransferStudent: (student) => setTransferringStudent(student),
    onDeleteStudent: (id, name) => {
      const found = students.find((s) => String(s.id) === String(id));
      setStudentToDelete(found || ({ id, name_en: name } as any));
    },
  });

  // Synchronize active highlight from URL param and automatically clear after 2.4 seconds
  useEffect(() => {
    if (!highlightParam) {
      setActiveHighlightId(null);
      return;
    }
    setActiveHighlightId(highlightParam);

    const timer = setTimeout(() => {
      setActiveHighlightId(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("highlight");
          return next;
        },
        { replace: true }
      );
    }, 2400);

    return () => clearTimeout(timer);
  }, [highlightParam, setSearchParams]);

  // Ensure target highlighted student is visible by resetting filters if needed and jumping to its page
  useEffect(() => {
    if (!activeHighlightId || loading || students.length === 0) return;
    const targetStudent = students.find((s) => String(s.id) === String(activeHighlightId));
    if (targetStudent) {
      const isVisible = filteredStudents.some((s) => String(s.id) === String(activeHighlightId));
      if (!isVisible && hasActiveFilters) {
        resetAllFilters();
      }
      const targetIdx = filteredStudents.findIndex((s) => String(s.id) === String(activeHighlightId));
      if (targetIdx !== -1) {
        const targetPage = Math.floor(targetIdx / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [activeHighlightId, loading, students, filteredStudents, hasActiveFilters, resetAllFilters, pageSize, currentPage]);

  // Smoothly scroll and center the highlighted row/card into view
  useEffect(() => {
    if (!activeHighlightId || loading) return;
    const timer = setTimeout(() => {
      const targetElement = document.querySelector(
        `[data-row-id="${activeHighlightId}"], #row-${activeHighlightId}, [data-card-id="${activeHighlightId}"], #student-card-${activeHighlightId}`
      );
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [activeHighlightId, loading, paginatedStudents]);

  const handleToggleDisplayMode = (mode: "table" | "grid") => {
    setDisplayMode(mode);
    try {
      localStorage.setItem("spr_students_display_mode", mode);
    } catch {}
  };

  const handleSelectAll = (val: any) => {
    if (Array.isArray(val)) {
      setSelectedIds(val);
    } else if (typeof val === "boolean") {
      setSelectedIds(val ? paginatedStudents.map((s) => s.id) : []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string | number) => {
    setSelectedIds((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(id) ? list.filter((sid) => sid !== id) : [...list, id];
    });
  };

  const onExecuteBulkAction = async () => {
    const success = await handleBulkAction(bulkActionType, selectedIds, bulkStatusInput);
    if (success) {
      setShowBulkModal(false);
      setSelectedIds([]);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await handleDeleteSingle(studentToDelete.id, studentToDelete.name_en || studentToDelete.name);
    } finally {
      setIsDeleting(false);
      setStudentToDelete(null);
    }
  };

  return (
    <PageContainer>
      {/* 1. Metrics Cards (Enterprise Standard with sub-labels & container responsiveness) */}
      <MetricsGrid
        cols={isSectionEnabled("quran_hifz_tracker") ? 4 : 3}
        items={[
          {
            label: "Total Students",
            value: metrics.total_students || students.length,
            icon: StudentIcon,
            subLabel: `${filteredStudents.length} matching view`,
            color: "default",
          },
          {
            label: "Active Students",
            value: metrics.active_students,
            icon: CheckCircleIcon,
            subLabel: "Enrolled & regular",
            color: "emerald",
          },
          {
            label: "New Admissions",
            value: metrics.new_admissions_this_month,
            icon: PlusIcon,
            subLabel: "Admitted this month",
            color: "purple",
          },
          ...(isSectionEnabled("quran_hifz_tracker")
            ? [
                {
                  label: "Avg Juz Completed",
                  value: `${metrics.avg_juz_completed} Juz`,
                  icon: BookOpenIcon,
                  subLabel: "Quran memorization",
                  color: "accent",
                },
              ]
            : []),
        ]}
      />

      {/* 2. Enterprise FilterBox: 3 Controls on Primary Row (Search, Department, Class); Remainder Hidden in Secondary Row */}
      <FilterBox
        storageKey="spr_students_filterbox_expanded"
        collapsible={true}
        defaultExpanded={false}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetAllFilters}
        activeFilterCount={activeFilterCount}
        moreLabel="More Filters"
        hideMoreLabel="Hide Filters"
        scopeItems={[
          ...(sectionFilter !== "ALL"
            ? [
                {
                  label: "Section",
                  value:
                    availableSections.find((s) => String(s.id) === String(sectionFilter))?.name ||
                    sectionFilter,
                },
              ]
            : []),
          ...(statusFilter !== "ALL" ? [{ label: "Status", value: statusFilter }] : []),
          ...(academicYearFilter !== "ALL"
            ? [
                {
                  label: "Year",
                  value:
                    academicYearOptions.find((y) => y.value === academicYearFilter)?.label ||
                    academicYearFilter,
                },
              ]
            : []),
        ]}
        primaryRow={
          <div className="grid grid-cols-1 @[540px]:grid-cols-3 gap-3 items-end">
            {/* Control 1: Search */}
            <div className="min-w-0">
              <CustomInput
                label="Search"
                size="md"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search student, roll, ID..."
                icon={SearchIcon}
                clearable={Boolean(searchQuery)}
                onClear={() => setSearchQuery("")}
              />
            </div>

            {/* Control 2: Department */}
            <div className="min-w-0">
              <DepartmentSelect
                label="Department"
                size="md"
                value={departmentFilter === "ALL" ? "" : departmentFilter}
                onChange={(val: string) => handleDepartmentFilterChange(val || "ALL")}
                departments={departments}
                allowAll={true}
                allLabel="All Departments"
                placeholder="All Departments"
              />
            </div>

            {/* Control 3: Class (Cascaded by Department) */}
            <div className="min-w-0">
              <ClassSelect
                label="Class"
                size="md"
                value={classFilter === "ALL" ? "" : classFilter}
                onChange={(val: string) => handleClassFilterChange(val || "ALL")}
                classes={availableClasses}
                allowAll={true}
                allLabel="All Classes"
                placeholder="All Classes"
                icon={ClassIcon}
              />
            </div>
          </div>
        }
        secondaryRow={
          <div className="grid grid-cols-1 @[540px]:grid-cols-3 gap-3 items-end">
            {/* Hidden 1: Section (Cascaded by Class) */}
            <div className="min-w-0">
              <SectionSelect
                label="Section"
                size="md"
                value={sectionFilter === "ALL" ? "" : sectionFilter}
                onChange={(val: string) => handleSectionFilterChange(val || "ALL")}
                sections={availableSections}
                classId={classFilter === "ALL" ? null : classFilter}
                allowAll={true}
                allLabel="All Sections"
                placeholder="All Sections"
                icon={SectionIcon}
              />
            </div>

            {/* Hidden 2: Status */}
            <div className="min-w-0">
              <CustomSelect
                label="Status"
                size="md"
                value={statusFilter}
                onChange={(val: string) => handleStatusFilterChange(val || "ALL")}
                options={[
                  { value: "ALL", label: "All Status" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                  { value: "ALUMNI", label: "Alumni / TC" },
                ]}
                placeholder="All Status"
              />
            </div>

            {/* Hidden 3: Academic Year */}
            <div className="min-w-0">
              <CustomSelect
                label="Academic Year"
                size="md"
                value={academicYearFilter}
                onChange={(val: string) => handleAcademicYearFilterChange(val || "ALL")}
                options={[
                  { value: "ALL", label: "All Academic Years" },
                  ...academicYearOptions,
                ]}
                placeholder="All Academic Years"
              />
            </div>
          </div>
        }
      >
        {({ moreButton }) => (
          <div className="flex flex-col @[640px]:flex-row @[640px]:items-center justify-between gap-3 pt-3 border-t theme-border">
            {/* Left: Matching record count + More/Hide toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold theme-text-secondary">
                Showing <strong className="theme-text-primary font-bold font-mono">{filteredStudents.length}</strong> of{" "}
                <strong className="theme-text-primary font-bold font-mono">{students.length}</strong> students
              </span>
              {moreButton}
            </div>

            {/* Right: Table/Card View Switcher & Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Display Mode Switcher */}
              <div className="inline-flex items-center p-1 rounded-xl theme-bg-app border-0">
                <button
                  type="button"
                  onClick={() => handleToggleDisplayMode("table")}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-0 ${
                    displayMode === "table"
                      ? "theme-bg-surface theme-text-primary shadow-xs"
                      : "theme-text-secondary hover:theme-text-primary"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDisplayMode("grid")}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-0 ${
                    displayMode === "grid"
                      ? "theme-bg-surface theme-text-primary shadow-xs"
                      : "theme-text-secondary hover:theme-text-primary"
                  }`}
                  title="Card Grid"
                >
                  <Squares2X2Icon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Refresh */}
              <button
                type="button"
                onClick={refreshData}
                disabled={loading}
                className="p-2 rounded-xl theme-bg-app hover:theme-bg-elevated/40 theme-text-secondary hover:theme-text-primary transition-all cursor-pointer border-0 shadow-xs"
                title="Refresh Roster"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        )}
      </FilterBox>

      {/* 4. Google Drive-Style Selection Action Bar for Selected Students */}
      {selectedIds.length > 0 && (
        <SelectionActionBar
          fullWidth={true}
          bordered={true}
          selectedCount={selectedIds.length}
          totalCount={paginatedStudents.length}
          onToggleSelectAll={() => {
            if (selectedIds.length >= paginatedStudents.length) {
              setSelectedIds([]);
            } else {
              setSelectedIds(paginatedStudents.map((s) => s.id));
            }
          }}
          onClearSelection={() => setSelectedIds([])}
          actions={[
            {
              id: "transfer",
              label: `Academic Transfer (${selectedIds.length})`,
              shortLabel: "Transfer",
              icon: TransferIcon,
              variant: "sub",
              onClick: () => setIsBulkTransferModalOpen(true),
            },
            {
              id: "status",
              label: `Change Status (${selectedIds.length})`,
              shortLabel: "Status",
              icon: CheckCircleIcon,
              variant: "sub",
              onClick: () => {
                setBulkActionType("change_status");
                setShowBulkModal(true);
              },
            },
            {
              id: "delete",
              label: `Delete (${selectedIds.length})`,
              shortLabel: "Delete",
              icon: TrashIcon,
              variant: "danger",
              onClick: () => {
                setBulkActionType("bulk_delete");
                setShowBulkModal(true);
              },
            },
          ]}
        />
      )}

      {/* 5. Data View (Table or Grid) with Enterprise Pagination */}
      <div className="space-y-4">
        {displayMode === "table" ? (
          <DataTable
            columns={tableColumns}
            data={paginatedStudents}
            selectable={true}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            idField="id"
            highlightId={activeHighlightId}
            isLoading={loading}
            loadingMessage="Loading student roster directory..."
            emptyIcon={StudentIcon}
            emptyTitle="No Students Found"
            emptySubMessage={
              hasActiveFilters
                ? "No student records match your active filter criteria."
                : "No students registered in this academy roster."
            }
            onRowClick={(s: StudentRecord) => navigate(`/students/${s.id}/profile`)}
          />
        ) : (
          <DataCardGrid
            data={paginatedStudents}
            renderCard={(s: StudentRecord) => (
              <StudentCard
                key={s.id}
                student={s}
                isHighlighted={Boolean(activeHighlightId && String(s.id) === String(activeHighlightId))}
                onNavigateProfile={(id) => navigate(`/students/${id}/profile`)}
                actionMenuItems={getActionMenuItems(s)}
                classesMap={classesMap}
                sectionsByClassMap={sectionsByClassMap}
                groupsByClassMap={groupsByClassMap}
                hasInstitutionGroups={groups.length > 0}
                groups={groups}
              />
            )}
            isLoading={loading}
            loadingMessage="Loading student roster directory..."
            emptyIcon={StudentIcon}
            emptyTitle="No Students Found"
            emptySubMessage={
              hasActiveFilters
                ? "No student records match your active filter criteria."
                : "No students registered in this academy roster."
            }
            gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          />
        )}

        {/* 6. Enterprise Reusable Pagination Controls */}
        {!loading && filteredStudents.length > 0 && (
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={filteredStudents.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100, 200]}
            itemLabel="students"
          />
        )}
      </div>

      {/* 7. Bulk Operations Modal */}
      <StudentBulkModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedCount={selectedIds.length}
        actionType={bulkActionType}
        onActionTypeChange={setBulkActionType}
        statusInput={bulkStatusInput}
        onStatusInputChange={setBulkStatusInput}
        onSubmit={onExecuteBulkAction}
      />

      {/* 8. Single Student Deletion ConfirmModal (Zero browser window.confirm) */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        title="Delete Student Record"
        subtitle={`Are you sure you want to delete student "${studentToDelete?.name_en || studentToDelete?.name || ""}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Student"}
        cancelText="Cancel"
        confirmVariant="danger"
        confirmLoading={isDeleting}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
      />

      {/* 9. Student Transfer Modal (Single & Bulk) */}
      {(isBulkTransferModalOpen || Boolean(transferringStudent)) && (
        <StudentTransferModal
          isOpen={isBulkTransferModalOpen || Boolean(transferringStudent)}
          student={transferringStudent}
          studentIds={transferringStudent ? [transferringStudent.id] : selectedIds}
          selectedStudents={
            transferringStudent
              ? [transferringStudent]
              : students.filter((s: any) => selectedIds.includes(s.id))
          }
          onClose={() => {
            setIsBulkTransferModalOpen(false);
            setTransferringStudent(null);
          }}
          onSuccess={() => {
            setIsBulkTransferModalOpen(false);
            setTransferringStudent(null);
            setSelectedIds([]);
            refreshData();
          }}
        />
      )}
    </PageContainer>
  );
}
