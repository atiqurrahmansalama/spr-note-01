import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFeatureControl } from "../../../context/FeatureControlContext";
import {
  StudentIcon,
  ClassIcon,
  GroupIcon,
  PlusIcon,
  TrashIcon,
  SectionControlIcon,
  BookOpenIcon,
  CheckCircleIcon,
  TransferIcon,
} from "../../../components/ui/Icons";
import DataTable from "../../../components/ui/DataTable";
import DataCardGrid from "../../../components/ui/DataCardGrid";
import ActionMenu from "../../../components/ui/ActionMenu";
import CustomSelect from "../../../components/ui/CustomSelect";
import DataViewToolbar from "../../../components/ui/DataViewToolbar";
import { ClassSelect, GroupSelect } from "../../../components/selectors";
import MetricsGrid from "../../../components/ui/MetricsGrid";
import PageHeader from "../../../components/ui/PageHeader";
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

  // Modals state
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>("change_status");
  const [bulkStatusInput, setBulkStatusInput] = useState<string>("Active");
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [isBulkTransferModalOpen, setIsBulkTransferModalOpen] = useState<boolean>(false);
  const [transferringStudent, setTransferringStudent] = useState<StudentRecord | null>(null);

  // Data hook
  const {
    students,
    classes,
    groups,
    loading,
    metrics,
    refreshData,
    handleDeleteSingle,
    handleBulkAction,
  } = useStudentDirectoryData();

  // Filters hook
  const {
    searchQuery,
    setSearchQuery,
    groupFilter,
    classFilter,
    statusFilter,
    setStatusFilter,
    handleGroupFilterChange,
    handleClassFilterChange,
    resetAllFilters,
    filteredStudents,
    hasActiveFilters,
    activeFilterCount,
  } = useStudentFilters(students, classes, groups);

  // Columns & Action Menus hook
  const { tableColumns, getActionMenuItems } = useStudentTableColumns({
    onNavigateProfile: (id) => navigate(`/students/${id}/profile`),
    onEditStudent: (student) => navigate(`/admission?edit=${student.id}`),
    onTransferStudent: (student) => setTransferringStudent(student),
    onDeleteStudent: handleDeleteSingle,
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

  // Ensure target highlighted student is visible by resetting filters if needed
  useEffect(() => {
    if (!activeHighlightId || loading || students.length === 0) return;
    const targetStudent = students.find((s) => String(s.id) === String(activeHighlightId));
    if (targetStudent) {
      const isVisible = filteredStudents.some((s) => String(s.id) === String(activeHighlightId));
      if (!isVisible && hasActiveFilters) {
        resetAllFilters();
      }
    }
  }, [activeHighlightId, loading, students, filteredStudents, hasActiveFilters, resetAllFilters]);

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
  }, [activeHighlightId, loading, filteredStudents]);

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
      setSelectedIds(val ? filteredStudents.map((s) => s.id) : []);
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

  return (
    <PageContainer>
      {/* 1. Header */}
      <PageHeader
        icon={StudentIcon}
        title="Student Roster"
        subtitle="Directory of enrolled students, academic classes, guardian contacts, and status"
      />

      {/* 2. Metrics Cards */}
      <MetricsGrid
        items={[
          {
            label: "Total Students",
            value: metrics.total_students || students.length,
            icon: StudentIcon,
            color: "sky",
          },
          {
            label: "Active Students",
            value: metrics.active_students,
            icon: CheckCircleIcon,
            color: "emerald",
          },
          {
            label: "New Admissions",
            value: metrics.new_admissions_this_month,
            icon: PlusIcon,
            color: "purple",
          },
          ...(isSectionEnabled("quran_hifz_tracker")
            ? [
                {
                  label: "Avg Juz Completed",
                  value: `${metrics.avg_juz_completed} Juz`,
                  icon: BookOpenIcon,
                  color: "accent",
                },
              ]
            : []),
        ]}
      />

      {/* 3. Search & View Mode Switcher Toolbar */}
      <DataViewToolbar
        searchLabel="Search Directory"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search student, roll, guardian..."
        stackedSwitcher={true}
        filterGridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
        searchSpanClassName="col-span-1"
        viewMode={displayMode}
        onToggleViewMode={handleToggleDisplayMode}
        loading={loading}
        filteredCount={filteredStudents.length}
        totalCount={students.length}
        itemLabel="students"
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetAllFilters}
        selectedCount={selectedIds.length}
        selectedLabel="Student"
        onClearSelection={() => setSelectedIds([])}
        selectionActions={
          <ActionMenu
            label="Bulk Actions"
            icon={SectionControlIcon}
            size="sm"
            variant="ghost"
            buttonClassName="bg-transparent border-transparent shadow-none px-2 py-1 text-xs font-bold theme-accent hover:opacity-80 transition-all cursor-pointer flex items-center gap-1.5"
            align="right"
            items={[
              {
                label: `Academic Transfer (${selectedIds.length})`,
                icon: TransferIcon,
                onClick: () => setIsBulkTransferModalOpen(true),
              },
              {
                label: "Change Enrollment Status",
                icon: CheckCircleIcon,
                onClick: () => {
                  setBulkActionType("change_status");
                  setShowBulkModal(true);
                },
              },
              {
                divider: true,
              },
              {
                label: "Delete Selected",
                icon: TrashIcon,
                danger: true,
                onClick: () => {
                  setBulkActionType("bulk_delete");
                  setShowBulkModal(true);
                },
              },
            ]}
          />
        }
        customFilters={
          <>
            <div>
              <ClassSelect
                label="Class"
                size="md"
                value={classFilter === "ALL" ? "" : classFilter}
                onChange={(val: string) => handleClassFilterChange(val || "ALL")}
                classes={classes}
                allowAll={true}
                allLabel="All Classes"
                placeholder="All Classes"
                icon={ClassIcon}
              />
            </div>

            <div>
              <GroupSelect
                label="Group"
                size="md"
                value={groupFilter === "ALL" ? "" : groupFilter}
                onChange={(val: string) => handleGroupFilterChange(val || "ALL")}
                classId={classFilter === "ALL" ? "" : classFilter}
                groups={groups}
                allowAll={true}
                allLabel="All Groups"
                placeholder="All Groups"
                icon={GroupIcon}
              />
            </div>

            <div>
              <CustomSelect
                label="Enrollment Status"
                size="md"
                value={statusFilter}
                onChange={(val: string) => setStatusFilter(val)}
                options={[
                  { value: "ALL", label: "All Status" },
                  { value: "ACTIVE", label: "Active Only" },
                  { value: "INACTIVE", label: "Inactive Only" },
                  { value: "ALUMNI", label: "Alumni / TC" },
                ]}
                placeholder="All Status"
              />
            </div>
          </>
        }
      />

      {/* 4. Data View (Table or Grid) */}
      {displayMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filteredStudents}
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
            searchQuery || classFilter !== "ALL" || groupFilter !== "ALL" || statusFilter !== "ALL"
              ? "No student records match your active filter criteria."
              : "No students registered in this academy roster."
          }
          onRowClick={(s: StudentRecord) => navigate(`/students/${s.id}/profile`)}
        />
      ) : (
        <DataCardGrid
          data={filteredStudents}
          renderCard={(s: StudentRecord) => (
            <StudentCard
              key={s.id}
              student={s}
              isHighlighted={Boolean(activeHighlightId && String(s.id) === String(activeHighlightId))}
              onNavigateProfile={(id) => navigate(`/students/${id}/profile`)}
              actionMenuItems={getActionMenuItems(s)}
            />
          )}
          isLoading={loading}
          loadingMessage="Loading student roster directory..."
          emptyIcon={StudentIcon}
          emptyTitle="No Students Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL" || groupFilter !== "ALL" || statusFilter !== "ALL"
              ? "No student records match your active filter criteria."
              : "No students registered in this academy roster."
          }
          gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        />
      )}

      {/* 5. Bulk Operations Modal */}
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

      {/* 6. Student Transfer Modal (Single & Bulk) */}
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
