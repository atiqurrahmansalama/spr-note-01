import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  ClassIcon,
  DepartmentIcon,
  GroupIcon,
  StudentIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  BookOpenIcon,
  DashboardIcon,
  BuildingOfficeIcon,
} from "../../../components/ui/Icons";
import DataTable from "../../../components/ui/DataTable";
import DataCardGrid from "../../../components/ui/DataCardGrid";
import ActionMenu from "../../../components/ui/ActionMenu";
import CustomSelect from "../../../components/ui/CustomSelect";
import MetricsGrid from "../../../components/ui/MetricsGrid";
import ClassFormModal from "./ClassFormModal";
import ClassMigrationModal from "./ClassMigrationModal";
import DeleteImpactModal from "../../../components/common/DeleteImpactModal";

export default function ClassManagementView() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryDept = searchParams.get("department") || "ALL";

  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("spr_classes_view_mode") || "grid";
    } catch {
      return "grid";
    }
  });

  const [metrics, setMetrics] = useState({
    total_classes: 0,
    total_enrolled_students: 0,
    avg_students_per_class: 0.0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(queryDept);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_classes_view_mode", mode);
    } catch {}
  };

  useEffect(() => {
    loadDepartments();
    loadMetrics();
    loadClasses();

    const handleTenantChanged = () => {
      loadDepartments();
      loadMetrics();
      loadClasses();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, []);

  useEffect(() => {
    const qd = searchParams.get("department") || "ALL";
    setDepartmentFilter(qd);
  }, [searchParams]);

  useEffect(() => {
    loadClasses();
  }, [departmentFilter]);

  const loadDepartments = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/classes/";
      if (departmentFilter && departmentFilter !== "ALL") {
        url += `?department=${departmentFilter}`;
      }
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.results || []);
      }
    } catch {
      showToast("Could not load classes.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/classes/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // Fallback calculation from classes state
    }
  };

  const handleOpenCreate = () => {
    setEditingClass(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    setIsFormModalOpen(true);
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
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete class.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered in-memory search
  const filteredClasses = classes.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.class_teacher_name?.toLowerCase().includes(q)
    );
  });

  const getActionMenuItems = (cls) => [
    {
      label: "Manage Groups",
      icon: GroupIcon,
      onClick: () => navigate(`/student-management/groups?student_class=${cls.id}`),
    },
    {
      label: "View Students",
      icon: StudentIcon,
      onClick: () => navigate(`/students?student_class=${cls.id}`),
    },
    { divider: true },
    {
      label: "Edit Class",
      icon: EditIcon,
      onClick: () => handleOpenEdit(cls),
    },
    {
      label: "Delete Class",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeletePrompt(cls),
    },
  ];

  // Reusable Table Columns
  const tableColumns = [
    {
      key: "order_rank",
      header: "Rank",
      align: "center",
      cellClassName: "w-14 text-center font-mono font-bold text-zinc-400",
      render: (cls) => `#${cls.order_rank ?? 1}`,
    },
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
      render: (cls) => {
        let deptBadge = "bg-sky-500/10 text-sky-400 border-sky-500/20";
        if (cls.department_type === "GENERAL") {
          deptBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
        } else if (cls.department_type === "OTHER") {
          deptBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        }
        return (
          <div className="space-y-0.5">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border tracking-wider inline-block ${deptBadge}`}>
              {cls.department_name || cls.department_type || "HIFZ"}
            </span>
            {cls.has_quran_tracker && (
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                <BookOpenIcon className="w-3 h-3 text-emerald-400" />
                <span>30 Juz Tracker</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "class_teacher_name",
      header: "Class Teacher",
      render: (cls) =>
        cls.class_teacher_name ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
              {cls.class_teacher_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-semibold block theme-text-primary text-xs">{cls.class_teacher_name}</span>
              {cls.class_teacher_phone && (
                <span className="text-[10px] theme-text-secondary block font-mono">{cls.class_teacher_phone}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-zinc-500 italic text-[11px]">Unassigned</span>
        ),
    },
    {
      key: "student_count",
      header: "Students",
      align: "center",
      render: (cls) => (
        <span
          onClick={() => navigate(`/students?student_class=${cls.id}`)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          title="View Enrolled Students"
        >
          <StudentIcon className="w-3.5 h-3.5" />
          <span>{cls.student_count || 0}</span>
        </span>
      ),
    },
    {
      key: "group_count",
      header: "Groups",
      align: "center",
      render: (cls) => (
        <span
          onClick={() => navigate(`/student-management/groups?student_class=${cls.id}`)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          title="View Groups in Class"
        >
          <GroupIcon className="w-3.5 h-3.5" />
          <span>{cls.group_count || 0}</span>
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      render: (cls) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
            cls.is_active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          }`}
        >
          {cls.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-20 text-right",
      render: (cls) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(cls)} />
        </div>
      ),
    },
  ];

  // Reusable Card Renderer
  const renderClassCard = (cls) => {
    let deptBadge = "bg-sky-500/10 text-sky-400 border-sky-500/20";
    if (cls.department_type === "GENERAL") {
      deptBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    } else if (cls.department_type === "OTHER") {
      deptBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }

    return (
      <div
        key={cls.id}
        className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group"
      >
        <div className="space-y-3.5">
          {/* Top header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center font-mono font-bold text-xs theme-accent shrink-0 shadow-xs">
                #{cls.order_rank ?? 1}
              </div>
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
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wider ${deptBadge}`}>
                    {cls.department_name || cls.department_type || "HIFZ"}
                  </span>
                  {cls.has_quran_tracker && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <BookOpenIcon className="w-3 h-3 text-emerald-400" />
                      <span>30 Juz</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ActionMenu items={getActionMenuItems(cls)} />
          </div>

          {/* Teacher Block */}
          <div className="p-2.5 rounded-xl theme-bg-sub border theme-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                {cls.class_teacher_name ? cls.class_teacher_name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] theme-text-secondary block font-medium">Class Teacher</span>
                <span className="font-semibold theme-text-primary truncate block text-xs">
                  {cls.class_teacher_name || "Unassigned"}
                </span>
              </div>
            </div>
            {cls.class_teacher_phone && (
              <span className="text-[10px] font-mono theme-text-secondary">{cls.class_teacher_phone}</span>
            )}
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
            <div
              onClick={() => navigate(`/students?student_class=${cls.id}`)}
              className="cursor-pointer hover:opacity-80 transition"
            >
              <span className="block text-sm font-bold text-emerald-400">{cls.student_count || 0}</span>
              <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Students</span>
            </div>
            <div
              onClick={() => navigate(`/student-management/groups?student_class=${cls.id}`)}
              className="border-l theme-border cursor-pointer hover:opacity-80 transition"
            >
              <span className="block text-sm font-bold text-sky-400">{cls.group_count || 0}</span>
              <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Groups</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t theme-border flex items-center justify-between">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              cls.is_active
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
            }`}
          >
            {cls.is_active ? "Active" : "Inactive"}
          </span>

          <button
            onClick={() => navigate(`/student-management/groups?student_class=${cls.id}`)}
            className="text-xs font-bold theme-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <GroupIcon className="w-3.5 h-3.5" />
            <span>Manage Groups &rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  const totalClassesCount = metrics?.total_classes || classes.length;
  const totalEnrolledCount = metrics?.total_enrolled_students ?? classes.reduce((acc, c) => acc + (c.student_count || 0), 0);
  const avgStudentsCount = metrics?.avg_students_per_class ?? (classes.length ? (totalEnrolledCount / classes.length).toFixed(1) : 0);

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 font-sans theme-text-primary animate-fade-in space-y-6 text-left">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
            <ClassIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              Class
            </h1>
            <p className="text-xs theme-text-secondary mt-0.5">
              Configure academic grades, head teacher assignments, and student promotion pipelines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/student-management/groups")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub transition-all flex items-center gap-2 cursor-pointer"
          >
            <GroupIcon className="w-4 h-4 text-sky-400" />
            <span>Manage Groups &rarr;</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* 2. Reusable Metric Cards */}
      <MetricsGrid
        items={[
          {
            label: "Total Classes",
            value: totalClassesCount,
            icon: ClassIcon,
            color: "sky",
          },
          {
            label: "Enrolled Students",
            value: totalEnrolledCount,
            icon: StudentIcon,
            color: "emerald",
          },
          {
            label: "Avg Students / Class",
            value: avgStudentsCount,
            icon: DashboardIcon,
            color: "amber",
          },
        ]}
      />

      {/* 3. Search & View Mode Switcher Toolbar */}
      <div className="theme-bg-surface border theme-border p-3.5 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-center shadow-xs">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search class name, code, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 py-2 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Department Filter Dropdown using project's CustomSelect */}
          <div className="w-48 sm:w-56 shrink-0">
            <CustomSelect
              size="sm"
              value={departmentFilter}
              onChange={(val) => {
                setDepartmentFilter(val);
                const newP = new URLSearchParams(searchParams);
                if (val && val !== "ALL") {
                  newP.set("department", val);
                } else {
                  newP.delete("department");
                }
                setSearchParams(newP);
              }}
              options={[
                { value: "ALL", label: "All Departments" },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
              placeholder="All Departments"
            />
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center h-10 p-1 rounded-xl theme-bg-sub border theme-border shrink-0">
            <button
              type="button"
              onClick={() => handleToggleViewMode("grid")}
              className={`h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "theme-bg-accent theme-accent-text shadow-xs"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode("table")}
              className={`h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "theme-bg-accent theme-accent-text shadow-xs"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <DepartmentIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Display: Reusable DataCardGrid or DataTable */}
      {viewMode === "grid" ? (
        <DataCardGrid
          data={filteredClasses}
          renderCard={renderClassCard}
          isLoading={loading}
          loadingMessage="Loading academic classes..."
          emptyIcon={ClassIcon}
          emptyTitle="No Classes Found"
          emptySubMessage={
            searchQuery || departmentFilter !== "ALL"
              ? "No classes match your active filter criteria."
              : "Get started by adding your first academic class or grade level."
          }
          gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        />
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredClasses}
          isLoading={loading}
          loadingMessage="Loading academic classes..."
          emptyIcon={ClassIcon}
          emptyTitle="No Classes Found"
          emptySubMessage={
            searchQuery || departmentFilter !== "ALL"
              ? "No classes match your active filter criteria."
              : "Get started by adding your first academic class or grade level."
          }
        />
      )}

      {/* --- MODALS --- */}
      {isFormModalOpen && (
        <ClassFormModal
          isOpen={isFormModalOpen}
          editingClass={editingClass}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingClass(null);
          }}
          onSuccess={() => {
            loadClasses();
            loadMetrics();
          }}
        />
      )}

      {isMigrationModalOpen && (
        <ClassMigrationModal
          isOpen={isMigrationModalOpen}
          deletingClass={deletingClass}
          onClose={() => {
            setIsMigrationModalOpen(false);
            setDeletingClass(null);
          }}
          onSuccess={() => {
            loadClasses();
            loadMetrics();
          }}
        />
      )}

      {/* Reusable Delete Impact Modal */}
      <DeleteImpactModal
        isOpen={isDeleteModalOpen && Boolean(deletingClass)}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingClass(null);
        }}
        onConfirm={performDirectDelete}
        title="Delete Academic Class"
        subtitle={`You are about to delete class "${deletingClass?.name}".`}
        entityName={deletingClass?.name || ""}
        entityType="Class"
        requireAck={true}
        requireNameMatch={false}
        isDeleting={isDeleting}
        confirmButtonText="Confirm Delete"
        impactItems={[
          { label: "Student Groups", count: deletingClass?.group_count ?? 0 },
          { label: "Enrolled Students", count: deletingClass?.student_count ?? 0 },
        ]}
        onMigrate={
          deletingClass?.group_count > 0 || deletingClass?.student_count > 0
            ? () => {
                setIsDeleteModalOpen(false);
                setIsMigrationModalOpen(true);
              }
            : undefined
        }
        migrateButtonText="Safely Migrate Students & Groups Instead"
        warningMessage="Deleting this class will remove its section structure and dissociate enrolled students and period attendance rosters."
      />
    </div>
  );
}
