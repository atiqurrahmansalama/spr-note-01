import React, { useState, useEffect, useCallback } from "react";
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
import PageHeader from "../../../components/ui/PageHeader";
import DataViewToolbar from "../../../components/ui/DataViewToolbar";
import DataViewFooter from "../../../components/ui/DataViewFooter";
import { useRightSidebar, useDrawerRegistration } from "../../../context/RightSidebarContext";
import GroupForm from "./GroupForm";
import GroupMigrationModal from "./GroupMigrationModal";
import DeleteImpactModal from "../../../components/common/DeleteImpactModal";

export default function GroupManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassFilter = searchParams.get("student_class") || "ALL";

  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
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

  const handleSelectRow = useCallback((id) => {
    setSelectedIds((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    });
  }, []);

  const handleSelectAll = useCallback((val) => {
    if (Array.isArray(val)) {
      setSelectedIds(val);
    } else {
      setSelectedIds([]);
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => handleOpenCreate();
    window.addEventListener("spr_open_create_group", handleOpen);
    return () => window.removeEventListener("spr_open_create_group", handleOpen);
  }, []);

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
      showToast("Could not load student groups.", "error");
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

  // Universal Drawer Registration for Group Form (survives F5 refresh)
  useDrawerRegistration(
    "group",
    (params) => {
      const mode = params.get("mode") || "add";
      const groupId = params.get("id");
      const paramClassId = params.get("classId") || (classFilter !== "ALL" ? classFilter : "");
      const foundGroup = groupId ? groups.find((g) => String(g.id) === String(groupId)) : null;

      return {
        title: mode === "add" ? "Create New Group / Halqa" : `Edit: ${foundGroup?.name || "Group"}`,
        category: "Classes & Groups",
        size: "md",
        content: (
          <GroupForm
            editingGroup={foundGroup}
            classes={classes}
            defaultClassId={foundGroup?.student_class || paramClassId}
            onSaved={() => {
              loadGroups();
              loadMetrics();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [groups, classes, classFilter, loadGroups, loadMetrics, closeDrawer]
  );

  const handleOpenCreate = () => {
    openDrawer("group", { mode: "add", classId: classFilter !== "ALL" ? classFilter : "" });
  };

  const handleOpenEdit = (grp) => {
    openDrawer("group", { mode: "edit", id: grp.id });
  };

  const handleDeletePrompt = (grp) => {
    setDeletingGroup(grp);
    setIsDeleteModalOpen(true);
  };

  const performDirectDelete = async (payload) => {
    if (!deletingGroup) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/v1/groups/${deletingGroup.id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      if (res.ok) {
        showToast("Group deleted successfully.", "success");
        setIsDeleteModalOpen(false);
        setDeletingGroup(null);
        loadGroups();
        loadMetrics();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete group.", "error");
      }
    } catch {
      showToast("Network error deleting group.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered in-memory search
  const filteredGroups = groups.filter((grp) => {
    if (!searchQuery) return true;
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
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border inline-flex items-center gap-1">
            <ClassIcon className="w-3 h-3 theme-accent" />
            <span>{grp.student_class_name}</span>
          </span>
        ) : (
          <span className="theme-text-secondary italic text-xs">None</span>
        ),
    },
    {
      key: "mentor_teacher_name",
      header: "Mentor Teacher",
      render: (grp) =>
        grp.mentor_teacher_name ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center font-bold text-[10px] shrink-0 border border-[var(--accent-main)]/20">
              {grp.mentor_teacher_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-xs theme-text-primary">{grp.mentor_teacher_name}</span>
          </div>
        ) : (
          <span className="theme-text-secondary italic text-[11px]">Unassigned</span>
        ),
    },
    {
      key: "student_count",
      header: "Enrolled Students",
      align: "center",
      render: (grp) => (
        <span
          onClick={() => navigate(`/students?student_group=${grp.id}`)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 hover:opacity-80 transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            grp.is_active
              ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
              : "theme-bg-sub theme-text-secondary border theme-border"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${grp.is_active ? "bg-[var(--accent-main)]" : "theme-bg-elevated"}`}></span>
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
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border">
                      <ClassIcon className="w-3 h-3 theme-accent" />
                      <span>{grp.student_class_name}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] theme-text-secondary italic">No Parent Class</span>
                  )}
                </div>
              </div>
            </div>

            <ActionMenu items={getActionMenuItems(grp)} />
          </div>

          {/* Mentor Teacher */}
          <div className="p-2.5 rounded-xl theme-bg-sub border theme-border flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center font-bold text-xs shrink-0 border border-[var(--accent-main)]/20">
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
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
              grp.is_active
                ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
                : "theme-bg-sub theme-text-secondary border theme-border"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${grp.is_active ? "bg-[var(--accent-main)]" : "theme-bg-elevated"}`}></span>
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

  const classOptions = [
    { value: "ALL", label: "All Parent Classes" },
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.name}${c.code ? ` (${c.code})` : ""}`,
    })),
  ];

  return (
    <div className={`${isEmbedded ? "w-full space-y-6 font-sans theme-text-primary animate-fade-in text-left" : "w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 font-sans theme-text-primary animate-fade-in space-y-6 text-left"}`}>
      
      {/* 1. Header with Reusable PageHeader */}
      {!hideHeader && (
        <PageHeader
          icon={GroupIcon}
          title="Student Groups"
          subtitle="Configure academic sub-sections, halqa mentors, and student allocations"
          actions={
            <>
              <button
                type="button"
                onClick={() => navigate("/student-management/classes")}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub transition-all flex items-center gap-2 cursor-pointer"
              >
                <ClassIcon className="w-4 h-4 theme-accent" />
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
            </>
          }
        />
      )}

      {/* 2. Reusable Metric Cards */}
      {!hideMetrics && (
        <MetricsGrid
          items={[
            {
              label: "Total Groups",
              value: totalGroupsCount,
              icon: GroupIcon,
              color: "accent",
            },
            {
              label: "Assigned Students",
              value: totalAssignedStudents,
              icon: StudentIcon,
              color: "default",
            },
            {
              label: "Parent Classes",
              value: totalClassesCount,
              icon: ClassIcon,
              color: "default",
            },
          ]}
        />
      )}

      {/* 3. Search & View Mode Switcher Toolbar */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search group name, class, mentor..."
        filterElement={
          <CustomSelect
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
            options={classOptions}
            placeholder="Filter by Class"
          />
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* 4. Display: Reusable DataCardGrid or DataTable */}
      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold theme-text-primary">
              {selectedIds.length} {selectedIds.length === 1 ? 'group' : 'groups'} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-bold theme-text-secondary hover:theme-text-primary px-3 py-1 rounded-lg theme-bg-sub border theme-border transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}

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
            selectable={true}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            idField="id"
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

        {/* Reusable DataViewFooter */}
        {!loading && groups.length > 0 && (
          <DataViewFooter
            filteredCount={filteredGroups.length}
            totalCount={groups.length}
            itemLabel="student groups & halqas"
          />
        )}
      </div>

      {/* --- MODALS --- */}

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
