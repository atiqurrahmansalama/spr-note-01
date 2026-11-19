import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../../context/ToastContext";
import { useTenant } from "../../../../context/TenantContext";
import {
  DepartmentIcon,
  ClassIcon,
  EditIcon,
  TrashIcon,
  TeacherIcon,
  TrendingUpIcon,
  BookOpenIcon,
  TableIcon,
  Squares2X2Icon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import CustomButton from "../../../../components/ui/CustomButton";
import DataTable from "../../../../components/ui/DataTable";
import DataCardGrid from "../../../../components/ui/DataCardGrid";
import { ConfirmModal } from "../../../../components/ui";
import { useRightSidebar, useDrawerRegistration } from "../../../../context/RightSidebarContext";
import { getDepartments, updateDepartment, deleteDepartment } from "../../../../api/academy";
import { useRowReorder } from "../../../../hooks";
import DepartmentForm from "./DepartmentForm";
import { AcademicDepartment, DepartmentManagementViewProps } from "./types";

export default function DepartmentManagementView({
  hideHeader = false,
}: DepartmentManagementViewProps) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [departments, setDepartments] = useState<AcademicDepartment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingDept, setDeletingDept] = useState<AcademicDepartment | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    try {
      return (localStorage.getItem("spr_dept_view_mode") as "table" | "grid") || "table";
    } catch {
      return "table";
    }
  });

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_dept_view_mode", mode);
    } catch {}
  };

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { all: true };
      if (activeTenantId && activeTenantId !== "ALL") {
        params.institution = activeTenantId;
      }
      const data = await getDepartments(params);
      setDepartments(Array.isArray(data) ? data : data.results || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load departments.", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadDepartments();

    const handleDepartmentsUpdated = () => {
      loadDepartments();
    };
    const handleTenantChanged = () => {
      loadDepartments();
    };

    window.addEventListener("spr_departments_updated", handleDepartmentsUpdated);
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => {
      window.removeEventListener("spr_departments_updated", handleDepartmentsUpdated);
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
    };
  }, [loadDepartments]);

  // Drawer Registration
  useDrawerRegistration(
    "department",
    (params: URLSearchParams) => {
      const mode = params.get("mode") || "add";
      const deptId = params.get("id");
      const foundDept = deptId ? departments.find((d) => String(d.id) === String(deptId)) : null;

      return {
        title: mode === "add" ? "Create Academic Department" : `Edit: ${foundDept?.name || "Department"}`,
        category: "Academic Structure",
        size: "md",
        content: (
          <DepartmentForm
            key={deptId ? `edit-dept-${deptId}` : "add-dept"}
            department={foundDept}
            editingDepartment={foundDept}
            onSaved={() => {
              loadDepartments();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [departments, loadDepartments, closeDrawer]
  );

  const handleOpenEdit = (dept: AcademicDepartment) => {
    openDrawer("department", { mode: "edit", id: dept.id });
  };

  const handleDelete = (dept: AcademicDepartment) => {
    setDeletingDept(dept);
  };

  const confirmDelete = async () => {
    if (!deletingDept) return;
    setIsDeleting(true);
    try {
      await deleteDepartment(deletingDept.id);
      showToast(`Department "${deletingDept.name}" deleted successfully.`, "success");
      setDeletingDept(null);
      window.dispatchEvent(new CustomEvent("spr_departments_updated"));
      loadDepartments();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete department.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const { getReorderActionItems } = useRowReorder<AcademicDepartment>({
    items: departments,
    setItems: setDepartments,
    onUpdateOrder: async (dept, newRank) => {
      await updateDepartment(dept.id, { order_rank: newRank });
    },
    successMessage: "Department order updated successfully.",
    errorMessage: "Failed to update department order.",
  });

  const getActionMenuItems = (dept: AcademicDepartment, index: number) => [
    {
      label: "Edit Department",
      icon: EditIcon,
      onClick: () => handleOpenEdit(dept),
    },
    {
      label: "View Classes",
      icon: ClassIcon,
      onClick: () => navigate(`/academy/classes-groups?tab=classes&department=${dept.id}`),
    },
    { divider: true },
    ...getReorderActionItems(dept, departments.length),
    { divider: true },
    {
      label: "Delete Department",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDelete(dept),
    },
  ];

  const tableColumns = [
    {
      key: "index",
      header: "No",
      align: "center",
      headerClassName: "w-14 text-center font-mono text-xs",
      cellClassName: "w-14 text-center font-mono text-xs",
      render: (_: any, rowIdx: number) => (
        <span className="font-mono text-xs font-bold theme-text-secondary">
          {rowIdx + 1}
        </span>
      ),
    },
    {
      key: "name",
      header: "Department",
      headerClassName: "min-w-[220px] sm:min-w-[280px]",
      cellClassName: "min-w-[220px] sm:min-w-[280px]",
      render: (dept: AcademicDepartment) => (
        <div className="py-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm theme-text-primary">
              {dept.name}
            </span>
            {dept.code && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-block">
                {dept.code}
              </span>
            )}
            {dept.has_quran_tracker ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border theme-border inline-flex items-center gap-1">
                <TrendingUpIcon className="w-3 h-3" />
                <span>Progress Assessment</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-flex items-center gap-1">
                <BookOpenIcon className="w-3 h-3" />
                <span>Class Assessment</span>
              </span>
            )}
          </div>
          {dept.description && (
            <p className="text-xs theme-text-secondary line-clamp-1">
              {dept.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "dean_name",
      header: "Department Head",
      headerClassName: "min-w-[180px] sm:min-w-[220px]",
      cellClassName: "min-w-[180px] sm:min-w-[220px]",
      render: (dept: AcademicDepartment) => (
        <div className="flex items-center gap-1.5 theme-text-secondary py-1 text-xs">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${dept.dean_name || dept.department_head_name ? 'theme-text-primary' : 'theme-text-muted italic'}`}>
            {dept.dean_name || dept.department_head_name || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "classes",
      header: "Classes",
      align: "center",
      headerClassName: "w-28 text-center",
      cellClassName: "w-28 text-center",
      render: (dept: AcademicDepartment) => (
        <span className="text-xs font-bold font-mono theme-text-primary px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border inline-block">
          {dept.class_count || dept.classes_count || 0}
        </span>
      ),
    },
    {
      key: "students",
      header: "Students",
      align: "center",
      headerClassName: "w-28 text-center",
      cellClassName: "w-28 text-center",
      render: (dept: AcademicDepartment) => (
        <span className="text-xs font-bold font-mono theme-accent px-2.5 py-0.5 rounded-lg theme-bg-accent-soft/40 border theme-border inline-block">
          {dept.student_count || dept.students_count || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      cellClassName: "w-16 text-right",
      render: (dept: AcademicDepartment, rowIdx: number) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(dept, rowIdx)} align="right" />
        </div>
      ),
    },
  ];

  const renderDepartmentCard = (dept: AcademicDepartment, cardIdx: number) => (
    <div
      key={dept.id}
      onClick={() => handleOpenEdit(dept)}
      className="rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold theme-text-primary text-sm leading-tight group-hover:theme-accent transition-colors truncate">
                {dept.name}
              </h3>
              {dept.code && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border">
                  {dept.code}
                </span>
              )}
              {dept.has_quran_tracker ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border theme-border inline-flex items-center gap-1">
                  <TrendingUpIcon className="w-3 h-3" />
                  <span>Progress Assessment</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-flex items-center gap-1">
                  <BookOpenIcon className="w-3 h-3" />
                  <span>Class Assessment</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs theme-text-secondary mt-2">
              <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
              <span className={`font-semibold ${dept.dean_name || dept.department_head_name ? 'theme-text-primary' : 'theme-text-muted italic'}`}>
                {dept.dean_name || dept.department_head_name || "Unassigned"}
              </span>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(dept, cardIdx)} align="right" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
        <div>
          <span className="block text-sm font-bold theme-text-primary font-mono">{dept.class_count || dept.classes_count || 0}</span>
          <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Classes</span>
        </div>
        <div className="border-l theme-border">
          <span className="block text-sm font-bold theme-accent font-mono">{dept.student_count || dept.students_count || 0}</span>
          <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Students</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full space-y-3.5">
      {/* ─── Compact Header & Switcher Row ─── */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <DepartmentIcon className="w-4 h-4 theme-accent" />
            <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Academic Departments ({departments.length})
            </h5>
          </div>

          {/* Standard View Switcher Toggle Button */}
          <button
            type="button"
            onClick={() => handleViewModeChange(viewMode === "grid" ? "table" : "grid")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
            title={viewMode === "grid" ? "Switch to Table View" : "Switch to Cards View"}
          >
            {viewMode === "grid" ? (
              <>
                <TableIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Table View</span>
              </>
            ) : (
              <>
                <Squares2X2Icon className="w-3.5 h-3.5 theme-accent" />
                <span>Cards View</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main View Content (Table or Cards Grid) using project components */}
      {viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={departments}
          isLoading={loading}
          loadingMessage="Loading academic departments..."
          keyExtractor={(d: AcademicDepartment, idx: number) => d.id || `dept_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={DepartmentIcon}
          emptyTitle="No Departments Found"
          emptySubMessage="Get started by adding your first academic faculty or department."
          onRowClick={(dept: AcademicDepartment) => handleOpenEdit(dept)}
        />
      ) : (
        <DataCardGrid
          data={departments}
          renderCard={renderDepartmentCard}
          isLoading={loading}
          loadingMessage="Loading academic departments..."
          emptyIcon={DepartmentIcon}
          emptyTitle="No Departments Found"
          emptySubMessage="Get started by adding your first academic faculty or department."
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        />
      )}

      {/* Delete Confirmation Modal with High-Impact Warning & Live Linked Stats */}
      {(() => {
        const deletingClassesCount = deletingDept ? (deletingDept.classes_count ?? deletingDept.class_count ?? 0) : 0;
        const deletingSectionsCount = deletingDept ? (deletingDept.sections_count ?? 0) : 0;
        const deletingStudentsCount = deletingDept ? (deletingDept.students_count ?? deletingDept.student_count ?? 0) : 0;
        const hasActiveAcademicData = deletingClassesCount > 0 || deletingStudentsCount > 0 || deletingSectionsCount > 0;

        return (
          <ConfirmModal
            isOpen={Boolean(deletingDept)}
            onClose={() => setDeletingDept(null)}
            onConfirm={confirmDelete}
            title="Delete Academic Department"
            subtitle="Critical Destructive Action"
            icon={TrashIcon}
            confirmText="Confirm Permanent Delete"
            confirmVariant="danger-solid"
            confirmIcon={TrashIcon}
            confirmLoading={isDeleting}
            confirmLoadingText="Deleting Department..."
            size="md"
            callout={
              hasActiveAcademicData
                ? {
                    type: "danger",
                    title: "Active Academic Records Linked",
                    message: `This department currently governs ${deletingClassesCount} academic class(es), ${deletingSectionsCount} section(s), and ${deletingStudentsCount} student(s). Deleting it will irrevocably disrupt related curriculum, attendance, and exam reporting.`,
                  }
                : {
                    type: "warning",
                    title: "Irreversible Action",
                    message: `You are about to delete "${deletingDept?.name}". This action cannot be rolled back.`,
                  }
            }
            consequences={[
              <span key="c_classes">
                <strong className="font-bold theme-text-primary">{deletingClassesCount} Academic Class(es)</strong> and assigned course subjects will lose their departmental affiliation.
              </span>,
              <span key="c_sections">
                <strong className="font-bold theme-text-primary">{deletingSectionsCount} Class Section(s)</strong>, timetable routines, and period slots will become orphaned.
              </span>,
              <span key="c_students">
                <strong className="font-bold theme-text-primary">{deletingStudentsCount} Enrolled Student(s)</strong> will no longer be mapped to this department in transcripts and report cards.
              </span>,
              <span key="c_eval">
                Historical attendance logs, examination marksheets, and{" "}
                {deletingDept?.has_quran_tracker
                  ? "Quran Hifz milestone progress records"
                  : "classroom lesson evaluations"}{" "}
                tied to this department will be impacted.
              </span>,
            ]}
          >
            <div className="space-y-2 pt-0.5">
              <p className="text-xs font-semibold theme-text-primary">
                Are you sure you want to permanently delete{" "}
                <span className="font-bold underline decoration-[var(--color-danger)]/50">
                  "{deletingDept?.name}"
                </span>
                {deletingDept?.code ? ` [${deletingDept.code}]` : ""}?
              </p>

              <p className="text-[11px] theme-text-secondary leading-relaxed">
                Please ensure all active classes and enrolled students have been migrated or re-assigned before completing this deletion.
              </p>
            </div>
          </ConfirmModal>
        );
      })()}
    </div>
  );
}
