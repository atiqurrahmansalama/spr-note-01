import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import {
  ClassIcon,
  GroupIcon,
  SectionIcon,
  StudentIcon,
  PlusIcon,
  BuildingOfficeIcon,
  EditIcon,
  TrashIcon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { TeacherSelect } from "../../../../components/selectors";
import UniversalManagementView from "../../../../components/common/UniversalManagementView";
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
  const [searchParams, setSearchParams] = useSearchParams();

  const queryDept = searchParams.get("department") || "ALL";

  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    total_classes: 0,
    total_enrolled_students: 0,
    avg_students_per_class: 0.0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(queryDept);
  const [teacherFilter, setTeacherFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection & UI
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("table");

  // Modals
  const [deletingClass, setDeletingClass] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState("order_rank");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    if (queryDept !== departmentFilter) {
      setDepartmentFilter(queryDept);
    }
  }, [queryDept]);

  const loadClasses = async () => {
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
  };

  const loadDepartments = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setDepartments(list.filter((d) => !d.is_deleted && d.is_active));
      }
    } catch {}
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/classes/metrics/");
      if (res.ok) {
        const d = await res.json();
        setMetrics({
          total_classes: d.total_classes || 0,
          total_enrolled_students: d.total_enrolled_students || 0,
          avg_students_per_class: d.avg_students_per_class || 0.0,
        });
      }
    } catch {}
  };

  useEffect(() => {
    loadClasses();
    loadDepartments();
    loadMetrics();

    const handleTenantChanged = () => {
      loadClasses();
      loadDepartments();
      loadMetrics();
    };

    const handleClassUpdated = () => {
      loadClasses();
      loadMetrics();
    };

    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_class_updated", handleClassUpdated);
    return () => {
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_class_updated", handleClassUpdated);
    };
  }, []);

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
            editingClass={foundClass}
            onSaved={() => {
              loadClasses();
              loadMetrics();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [classes, loadClasses, loadMetrics, closeDrawer]
  );

  const handleOpenCreate = () => {
    openDrawer("class", { mode: "add" });
  };

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
        loadMetrics();
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

  const handleFilterChange = (setter, key) => (val) => {
    setter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "ALL" || !val) {
      newParams.delete(key);
    } else {
      newParams.set(key, val);
    }
    setSearchParams(newParams);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    departmentFilter !== "ALL" ||
    teacherFilter !== "ALL" ||
    statusFilter !== "ALL"
  );

  const activeFilterCount = [
    departmentFilter !== "ALL",
    teacherFilter !== "ALL",
    statusFilter !== "ALL",
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("ALL");
    setTeacherFilter("ALL");
    setStatusFilter("ALL");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("department");
    newParams.delete("teacher");
    newParams.delete("status");
    setSearchParams(newParams);
  };

  // Filtered dataset
  const filteredClasses = classes.filter((cls) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cls.name?.toLowerCase().includes(q);
      const matchCode = cls.code?.toLowerCase().includes(q);
      const matchDept = cls.department_name?.toLowerCase().includes(q);
      const matchTeacher = cls.class_teacher_name?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDept && !matchTeacher) return false;
    }

    if (departmentFilter !== "ALL" && String(cls.department) !== String(departmentFilter)) {
      return false;
    }

    if (teacherFilter !== "ALL") {
      if (teacherFilter === "UNASSIGNED") {
        if (cls.class_teacher) return false;
      } else if (String(cls.class_teacher) !== String(teacherFilter)) {
        return false;
      }
    }

    if (statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE" && !cls.is_active) return false;
      if (statusFilter === "INACTIVE" && cls.is_active) return false;
    }

    return true;
  });

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
      key: "name",
      header: "Class Name & Code",
      render: (cls) => (
        <div className="space-y-0.5">
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
      render: (cls) => (
        <span className="text-xs font-semibold theme-text-primary">
          {cls.department_name || cls.department_type || "General"}
        </span>
      ),
    },
    {
      key: "class_teacher_name",
      header: "Class Teacher",
      render: (cls) => (
        <span className="text-xs font-semibold theme-text-primary">
          {cls.class_teacher_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "student_count",
      header: "Students",
      align: "center",
      render: (cls) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {cls.student_count || 0}
        </span>
      ),
    },
    {
      key: "section_count",
      header: "Sections",
      align: "center",
      render: (cls) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {cls.section_count || 0}
        </span>
      ),
    },
    {
      key: "group_count",
      header: "Groups",
      align: "center",
      render: (cls) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {cls.group_count || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      render: (cls) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(cls)} />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderClassCard = (cls) => (
    <div
      key={cls.id}
      onClick={() => handleOpenEdit(cls)}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold theme-text-primary text-sm leading-tight truncate">
                {cls.name}
              </h3>
              {cls.code && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg theme-bg-sub theme-text-secondary border theme-border">
                  {cls.code}
                </span>
              )}
            </div>
            <p className="text-xs font-medium theme-text-secondary mt-1">
              {cls.department_name || cls.department_type || "General"}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(cls)} />
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

  const totalClassesCount = metrics?.total_classes || classes.length;
  const totalEnrolledCount = metrics?.total_enrolled_students ?? classes.reduce((acc, c) => acc + (c.student_count || 0), 0);
  const avgStudentsCount = metrics?.avg_students_per_class ?? (classes.length ? (totalEnrolledCount / classes.length).toFixed(1) : 0);

  const departmentOptions = [
    { value: "ALL", label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const teacherOptions = [
    { value: "ALL", label: "All Teachers" },
    { value: "UNASSIGNED", label: "Unassigned Teachers" },
  ];

  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "ACTIVE", label: "Active Classes" },
    { value: "INACTIVE", label: "Inactive Classes" },
  ];

  const filterControls = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
      <CustomSelect
        label="Department"
        value={departmentFilter}
        onChange={handleFilterChange(setDepartmentFilter, "department")}
        options={departmentOptions}
        icon={BuildingOfficeIcon}
      />
      <CustomSelect
        label="Class Teacher"
        value={teacherFilter}
        onChange={handleFilterChange(setTeacherFilter, "teacher")}
        options={teacherOptions}
        icon={ClassIcon}
      />
      <CustomSelect
        label="Class Status"
        value={statusFilter}
        onChange={handleFilterChange(setStatusFilter, "status")}
        options={statusOptions}
      />
    </div>
  );

  return (
    <>
      <UniversalManagementView
        title="Class Management"
        subtitle="Manage academic classes, class teachers, and grade levels across departments."
        icon={ClassIcon}
        hideHeader={hideHeader}
        hideMetrics={hideMetrics}
        isEmbedded={isEmbedded}
        primaryAction={{
          label: "Add Class",
          icon: PlusIcon,
          onClick: handleOpenCreate,
        }}
        metrics={[
          {
            label: "Total Classes",
            value: totalClassesCount,
            icon: ClassIcon,
            color: "accent",
            subLabel: "Active grades",
          },
          {
            label: "Enrolled Students",
            value: totalEnrolledCount,
            icon: StudentIcon,
            color: "accent",
            subLabel: "Total enrollment",
          },
          {
            label: "Avg Students / Class",
            value: avgStudentsCount,
            icon: GroupIcon,
            color: "accent",
            subLabel: "Class density",
            onClick: () => navigate("/academy/classes-groups?tab=groups"),
          },
        ]}
        searchPlaceholder="Search classes by name, code, teacher, or department..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
        filterControls={filterControls}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        data={filteredClasses}
        columns={tableColumns}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(cls) => handleOpenEdit(cls)}
        renderCard={renderClassCard}
        page={page}
        pageSize={pageSize}
        totalCount={filteredClasses.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={(f, d) => {
          setSortField(f);
          setSortDirection(d);
        }}
        emptyState={{
          icon: ClassIcon,
          title: "No Classes Found",
          description: hasActiveFilters
            ? "No classes match the applied filters. Try resetting search criteria."
            : "No academic classes have been created yet. Click 'Add Class' to set up your first grade.",
        }}
      />

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
            loadMetrics();
            window.dispatchEvent(new CustomEvent("spr_class_updated"));
          }}
        />
      )}
    </>
  );
}
