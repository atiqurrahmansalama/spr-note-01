import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import {
  ClassIcon,
  GroupIcon,
  SectionIcon,
  TeacherIcon,
  EditIcon,
  TrashIcon,
  TableIcon,
  Squares2X2Icon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import DataTable from "../../../../components/ui/DataTable";
import DataCardGrid from "../../../../components/ui/DataCardGrid";
import { useRightSidebar, useDrawerRegistration } from "../../../../context/RightSidebarContext";
import ClassForm from "./ClassForm";
import ClassMigrationModal from "./ClassMigrationModal";
import DeleteImpactModal from "../../../../components/common/DeleteImpactModal";

export default function ClassManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams] = useSearchParams();

  const queryDept = searchParams.get("department") || "ALL";

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("spr_classes_view_mode") || "table";
    } catch {
      return "table";
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_classes_view_mode", mode);
    } catch {}
  };

  // Modals
  const [deletingClass, setDeletingClass] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/v1/classes/?page_size=500&all=true");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setClasses(list.filter((c) => !c.is_deleted));
      }
    } catch {
      showToast("Failed to load classes.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClasses();

    const handleTenantChanged = () => {
      loadClasses();
    };

    const handleClassUpdated = () => {
      loadClasses();
    };

    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_class_updated", handleClassUpdated);
    return () => {
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_class_updated", handleClassUpdated);
    };
  }, [loadClasses]);

  // Filtered dataset (supporting URL department filter if navigated from department view)
  const displayedClasses = queryDept !== "ALL"
    ? classes.filter((cls) => String(cls.department) === String(queryDept))
    : classes;

  // Drawer Registration for Add/Edit Class
  useDrawerRegistration(
    "class",
    (params) => {
      const mode = params.get("mode") || "add";
      const classId = params.get("id");
      const foundClass = classId ? classes.find((c) => String(c.id) === String(classId)) : null;

      return {
        title: mode === "edit" ? "Edit Class" : "Create New Class",
        subtitle:
          mode === "edit"
            ? `Update settings for ${foundClass?.name || "Class"}`
            : "Define a new academic grade or classroom unit",
        width: "lg",
        content: (
          <ClassForm
            key={classId ? `edit-class-${classId}` : "add-class"}
            editingClass={foundClass}
            onSaved={() => {
              loadClasses();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [classes, loadClasses, closeDrawer]
  );

  const handleOpenEdit = (cls) => {
    openDrawer("class", { mode: "edit", id: cls.id });
  };

  const handleDeletePrompt = (cls) => {
    setDeletingClass(cls);
    setIsDeleteModalOpen(true);
  };

  const performDirectDelete = async () => {
    if (!deletingClass) return;
    try {
      setIsDeleting(true);
      const res = await fetchWithAuth(`/api/v1/classes/${deletingClass.id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Class "${deletingClass.name}" deleted successfully.`, "success");
        setIsDeleteModalOpen(false);
        setDeletingClass(null);
        loadClasses();
        window.dispatchEvent(new CustomEvent("spr_class_updated"));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete class.", "error");
      }
    } catch {
      showToast("Network error while deleting class.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getActionMenuItems = (cls) => [
    {
      label: "Edit Class",
      icon: EditIcon,
      onClick: () => handleOpenEdit(cls),
    },
    {
      label: "View Sections",
      icon: SectionIcon,
      hidden: cls.has_sections === false,
      onClick: () => navigate(`/academy/classes-groups?tab=sections&class=${cls.id}`),
    },
    {
      label: "View Groups",
      icon: GroupIcon,
      onClick: () => navigate(`/academy/classes-groups?tab=groups&student_class=${cls.id}`),
    },
    { divider: true },
    {
      label: "Delete Class",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeletePrompt(cls),
    },
  ];

  // Table Columns
  const tableColumns = [
    {
      key: "index",
      header: "No",
      align: "center",
      headerClassName: "w-14 text-center font-mono text-xs",
      cellClassName: "w-14 text-center font-mono text-xs",
      render: (_, rowIdx) => (
        <span className="font-mono text-xs font-bold theme-text-secondary">
          {rowIdx + 1}
        </span>
      ),
    },
    {
      key: "name",
      header: "Class Name & Code",
      headerClassName: "min-w-[200px] sm:min-w-[240px]",
      cellClassName: "min-w-[200px] sm:min-w-[240px]",
      render: (cls) => (
        <div className="space-y-0.5 py-1">
          <span className="font-bold text-sm theme-text-primary block">{cls.name}</span>
          {cls.code && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-block">
              {cls.code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      headerClassName: "min-w-[140px] sm:min-w-[180px]",
      cellClassName: "min-w-[140px] sm:min-w-[180px]",
      render: (cls) => (
        <span className="text-xs font-semibold theme-text-primary">
          {cls.department_name || cls.department_type || "General"}
        </span>
      ),
    },
    {
      key: "class_teacher_name",
      header: "Class Teacher",
      headerClassName: "min-w-[160px] sm:min-w-[200px]",
      cellClassName: "min-w-[160px] sm:min-w-[200px]",
      render: (cls) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${cls.class_teacher_name ? "theme-text-primary" : "theme-text-muted italic"}`}>
            {cls.class_teacher_name || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "student_count",
      header: "Students",
      align: "center",
      headerClassName: "w-24 text-center",
      cellClassName: "w-24 text-center",
      render: (cls) => (
        <span className="text-xs font-bold font-mono theme-accent px-2.5 py-0.5 rounded-lg theme-bg-accent-soft/40 border theme-border inline-block">
          {cls.student_count || 0}
        </span>
      ),
    },
    {
      key: "section_count",
      header: "Sections",
      align: "center",
      headerClassName: "w-24 text-center",
      cellClassName: "w-24 text-center",
      render: (cls) => (
        <span className="text-xs font-bold font-mono theme-text-primary px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border inline-block">
          {cls.section_count || 0}
        </span>
      ),
    },
    {
      key: "group_count",
      header: "Groups",
      align: "center",
      headerClassName: "w-24 text-center",
      cellClassName: "w-24 text-center",
      render: (cls) => (
        <span className="text-xs font-bold font-mono theme-text-primary px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border inline-block">
          {cls.group_count || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      cellClassName: "w-16 text-right",
      render: (cls) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(cls)} align="right" />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderClassCard = (cls) => (
    <div
      key={cls.id}
      onClick={() => handleOpenEdit(cls)}
      className="rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold theme-text-primary text-sm leading-tight truncate group-hover:theme-accent transition-colors">
                {cls.name}
              </h3>
              {cls.code && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border">
                  {cls.code}
                </span>
              )}
            </div>
            <p className="text-xs font-medium theme-text-secondary mt-1">
              {cls.department_name || cls.department_type || "General"}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(cls)} align="right" />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>Teacher:</span>
          <span className="font-semibold theme-text-primary">{cls.class_teacher_name || "Unassigned"}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <div>
            <span className="block text-sm font-bold theme-accent font-mono">{cls.student_count || 0}</span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Students</span>
          </div>
          <div className="border-l theme-border">
            <span className="block text-sm font-bold theme-text-primary font-mono">{cls.section_count || 0}</span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Sections</span>
          </div>
          <div className="border-l theme-border">
            <span className="block text-sm font-bold theme-text-primary font-mono">{cls.group_count || 0}</span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Groups</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full space-y-3.5">
      {/* ─── Compact Header & Switcher Row (Zero Background Box) ─── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <ClassIcon className="w-4 h-4 theme-accent" />
          <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Academic Classes ({displayedClasses.length})
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

      {/* Main View Content (Table or Cards Grid) */}
      {viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={displayedClasses}
          loading={loading}
          loadingMessage="Loading academic classes..."
          keyExtractor={(c, idx) => c.id || `class_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={ClassIcon}
          emptyTitle="No Classes Found"
          emptySubMessage="Get started by creating your first academic class or grade."
          onRowClick={(cls) => handleOpenEdit(cls)}
        />
      ) : (
        <DataCardGrid
          data={displayedClasses}
          renderCard={renderClassCard}
          isLoading={loading}
          loadingMessage="Loading academic classes..."
          emptyIcon={ClassIcon}
          emptyTitle="No Classes Found"
          emptySubMessage="Get started by creating your first academic class or grade."
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        />
      )}

      {/* Delete Impact Modal */}
      {deletingClass && (
        <DeleteImpactModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingClass(null);
          }}
          title="Delete Class"
          itemName={deletingClass.name}
          itemType="class"
          impactData={{
            direct_students: deletingClass.student_count || 0,
            sections: deletingClass.section_count || 0,
            groups: deletingClass.group_count || 0,
          }}
          onDirectDelete={performDirectDelete}
          onMigrateOpen={() => {
            setIsDeleteModalOpen(false);
            setIsMigrationModalOpen(true);
          }}
          isDeleting={isDeleting}
        />
      )}

      {/* Migration Modal */}
      {deletingClass && (
        <ClassMigrationModal
          isOpen={isMigrationModalOpen}
          onClose={() => {
            setIsMigrationModalOpen(false);
            setDeletingClass(null);
          }}
          deletingClass={deletingClass}
          availableClasses={classes}
          onSuccess={() => {
            loadClasses();
            window.dispatchEvent(new CustomEvent("spr_class_updated"));
          }}
        />
      )}
    </div>
  );
}
