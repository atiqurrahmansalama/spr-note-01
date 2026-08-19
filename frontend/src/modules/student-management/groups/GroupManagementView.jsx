import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  GroupIcon,
  ClassIcon,
  StudentIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  BuildingOfficeIcon,
  DepartmentIcon,
} from "../../../components/ui/Icons";
import DataTable from "../../../components/ui/DataTable";
import DataCardGrid from "../../../components/ui/DataCardGrid";
import ActionMenu from "../../../components/ui/ActionMenu";
import CustomSelect from "../../../components/ui/CustomSelect";
import MetricsGrid from "../../../components/ui/MetricsGrid";
import GroupFormModal from "./GroupFormModal";
import GroupMigrationModal from "./GroupMigrationModal";
import DeleteImpactModal from "../../../components/common/DeleteImpactModal";

export default function GroupManagementView() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassFilter = searchParams.get("student_class") || "ALL";

  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("spr_groups_view_mode") || "grid";
    } catch {
      return "grid";
    }
  });

  const [metrics, setMetrics] = useState({
    total_groups: 0,
    total_assigned_students: 0,
    total_classes: 0,
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState(initialClassFilter);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_groups_view_mode", mode);
    } catch {}
  };

  useEffect(() => {
    loadClasses();
    loadMetrics();
    loadGroups();

    const handleTenantChanged = () => {
      loadClasses();
      loadMetrics();
      loadGroups();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, []);

  useEffect(() => {
    const qClass = searchParams.get("student_class") || "ALL";
    setClassFilter(qClass);
  }, [searchParams]);

  useEffect(() => {
    loadGroups();
  }, [classFilter]);

  const loadClasses = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/classes/");
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/groups/";
      const params = new URLSearchParams();
      if (classFilter !== "ALL") {
        params.append("student_class", classFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : data.results || []);
      }
    } catch {
      showToast("Failed to load groups.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/groups/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  };

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (grp) => {
    setEditingGroup(grp);
    setIsFormModalOpen(true);
  };

  const handleDeletePrompt = (grp) => {
    setDeletingGroup(grp);
    setIsDeleteModalOpen(true);
  };

  const performDirectDelete = async () => {
    if (!deletingGroup) return;
    try {
      setIsDeleting(true);
      const res = await fetchWithAuth(`/api/v1/groups/${deletingGroup.id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Group "${deletingGroup.name}" deleted successfully.`, "success");
        setIsDeleteModalOpen(false);
        setDeletingGroup(null);
        loadGroups();
        loadMetrics();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete group.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered in-memory search
  const filteredGroups = groups.filter((grp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      grp.name?.toLowerCase().includes(q) ||
      grp.mentor_teacher_name?.toLowerCase().includes(q) ||
      grp.student_class_name?.toLowerCase().includes(q)
    );
  });

  const getActionMenuItems = (grp) => [
    {
      label: "View Students",
      icon: StudentIcon,
      onClick: () => navigate(`/students?student_group=${grp.id}`),
    },
    { divider: true },
    {
      label: "Edit Group",
      icon: EditIcon,
      onClick: () => handleOpenEdit(grp),
    },
    {
      label: "Delete Group",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeletePrompt(grp),
    },
  ];

  // Reusable Table Columns
  const tableColumns = [
    {
      key: "name",
      header: "Group / Halqa Name",
      render: (grp) => (
        <span className="font-bold text-sm theme-text-primary block">
          {grp.name}
        </span>
      ),
    },
    {
      key: "student_class_name",
      header: "Parent Class",
      render: (grp) =>
        grp.student_class_name ? (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1">
            <ClassIcon className="w-3 h-3" />
            <span>{grp.student_class_name}</span>
          </span>
        ) : (
          <span className="text-zinc-500 italic text-xs">None</span>
        ),
    },
    {
      key: "mentor_teacher_name",
      header: "Mentor Teacher",
      render: (grp) =>
        grp.mentor_teacher_name ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-[10px] shrink-0">
              {grp.mentor_teacher_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-xs theme-text-primary">{grp.mentor_teacher_name}</span>
          </div>
        ) : (
          <span className="text-zinc-500 italic text-[11px]">Unassigned</span>
        ),
    },
    {
      key: "student_count",
      header: "Enrolled Students",
      align: "center",
      render: (grp) => (
        <span
          onClick={() => navigate(`/students?student_group=${grp.id}`)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          title="View Enrolled Students"
        >
          <StudentIcon className="w-3.5 h-3.5" />
          <span>{grp.student_count || 0}</span>
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      render: (grp) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
            grp.is_active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          }`}
        >
          {grp.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-20 text-right",
      render: (grp) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(grp)} />
        </div>
      ),
    },
  ];

  // Reusable Card Renderer
  const renderGroupCard = (grp) => {
    const studentCount = grp.student_count || 0;

    return (
      <div
        key={grp.id}
        className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group"
      >
        <div className="space-y-3.5">
          {/* Top Section */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center font-bold text-xs theme-accent shrink-0 shadow-xs">
                <GroupIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold theme-text-primary text-sm leading-tight truncate">
                  {grp.name}
                </h3>
                <div className="mt-1">
                  {grp.student_class_name ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <ClassIcon className="w-3 h-3" />
                      <span>{grp.student_class_name}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">No Parent Class</span>
                  )}
                </div>
              </div>
            </div>

            <ActionMenu items={getActionMenuItems(grp)} />
          </div>

          {/* Mentor Teacher */}
          <div className="p-2.5 rounded-xl theme-bg-sub border theme-border flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
              {grp.mentor_teacher_name ? grp.mentor_teacher_name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] theme-text-secondary block font-medium">
                Halqa Mentor
              </span>
              <span className="font-semibold theme-text-primary truncate block text-xs">
                {grp.mentor_teacher_name || "Unassigned Mentor"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t theme-border flex items-center justify-between">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              grp.is_active
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
            }`}
          >
            {grp.is_active ? "Active" : "Inactive"}
          </span>

          <button
            onClick={() => navigate(`/students?student_group=${grp.id}`)}
            className="text-xs font-bold theme-accent hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <StudentIcon className="w-3.5 h-3.5" />
            <span>{studentCount} Students &rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  const totalGroupsCount = metrics?.total_groups || groups.length;
  const totalAssignedStudents = metrics?.total_assigned_students ?? groups.reduce((acc, g) => acc + (g.student_count || 0), 0);
  const totalClassesCount = classes.length;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 font-sans theme-text-primary animate-fade-in space-y-6 text-left">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
            <GroupIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              Group
            </h1>
            <p className="text-xs theme-text-secondary mt-0.5">
              Configure academic sub-sections, halqa mentors, and student allocations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/student-management/classes")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub transition-all flex items-center gap-2 cursor-pointer"
          >
            <ClassIcon className="w-4 h-4 text-sky-400" />
            <span>View Classes &rarr;</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Group</span>
          </button>
        </div>
      </div>

      {/* 2. Reusable Metric Cards */}
      <MetricsGrid
        items={[
          {
            label: "Total Groups",
            value: totalGroupsCount,
            icon: GroupIcon,
            color: "sky",
          },
          {
            label: "Assigned Students",
            value: totalAssignedStudents,
            icon: StudentIcon,
            color: "emerald",
          },
          {
            label: "Parent Classes",
            value: totalClassesCount,
            icon: ClassIcon,
            color: "purple",
          },
        ]}
      />

      {/* 3. Search & View Mode Switcher Toolbar */}
      <div className="theme-bg-surface border theme-border p-3.5 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-center shadow-xs">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search group name, class, mentor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 py-2 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-current transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Parent Class Filter Dropdown using project's CustomSelect */}
          <div className="w-48 sm:w-56 shrink-0">
            <CustomSelect
              size="sm"
              value={classFilter}
              onChange={(val) => {
                setClassFilter(val);
                const newP = new URLSearchParams(searchParams);
                if (val && val !== "ALL") {
                  newP.set("student_class", val);
                } else {
                  newP.delete("student_class");
                }
                setSearchParams(newP);
              }}
              options={[
                { value: "ALL", label: "All Parent Classes" },
                ...classes.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.code ? ` (${c.code})` : ""}`,
                })),
              ]}
              placeholder="All Parent Classes"
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
          data={filteredGroups}
          renderCard={renderGroupCard}
          isLoading={loading}
          loadingMessage="Loading student groups & halqas..."
          emptyIcon={GroupIcon}
          emptyTitle="No Groups Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL"
              ? "No groups match your active filter criteria."
              : "Get started by adding your first group or halqa."
          }
          gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        />
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredGroups}
          isLoading={loading}
          loadingMessage="Loading student groups & halqas..."
          emptyIcon={GroupIcon}
          emptyTitle="No Groups Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL"
              ? "No groups match your active filter criteria."
              : "Get started by adding your first group or halqa."
          }
        />
      )}

      {/* --- MODALS --- */}
      <GroupFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingGroup={editingGroup}
        classes={classes}
        defaultClassId={classFilter !== "ALL" ? classFilter : ""}
        onSuccess={() => {
          loadGroups();
          loadMetrics();
        }}
      />

      <GroupMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => {
          setIsMigrationModalOpen(false);
          setDeletingGroup(null);
        }}
        deletingGroup={deletingGroup}
        availableGroups={groups}
        onSuccess={() => {
          loadGroups();
          loadMetrics();
        }}
      />

      {/* Reusable Delete Impact Modal */}
      <DeleteImpactModal
        isOpen={isDeleteModalOpen && Boolean(deletingGroup)}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingGroup(null);
        }}
        onConfirm={performDirectDelete}
        title="Delete Student Group"
        subtitle={`You are about to delete student group "${deletingGroup?.name}".`}
        entityName={deletingGroup?.name || ""}
        entityType="Group"
        requireAck={true}
        requireNameMatch={false}
        isDeleting={isDeleting}
        confirmButtonText="Confirm Delete"
        impactItems={[
          { label: "Assigned Class", count: deletingGroup?.student_class_name || "Class Assigned" },
          { label: "Enrolled Students", count: deletingGroup?.student_count ?? 0 },
        ]}
        onMigrate={
          deletingGroup?.student_count > 0
            ? () => {
                setIsDeleteModalOpen(false);
                setIsMigrationModalOpen(true);
              }
            : undefined
        }
        migrateButtonText="Safely Migrate Students to Another Group"
        warningMessage="Deleting this group will remove student roster groupings and daily attendance batches."
      />
    </div>
  );
}
