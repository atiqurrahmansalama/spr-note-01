import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import {
  GroupIcon,
  ClassIcon,
  SectionIcon,
  StudentIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { ClassSelect, SectionSelect, TeacherSelect } from "../../../../components/selectors";
import UniversalManagementView from "../../../../components/common/UniversalManagementView";
import { useRightSidebar, useDrawerRegistration } from "../../../../context/RightSidebarContext";
import GroupForm from "./GroupForm";
import GroupMigrationModal from "./GroupMigrationModal";
import DeleteImpactModal from "../../../../components/common/DeleteImpactModal";

export default function GroupManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassFilter = searchParams.get("student_class") || searchParams.get("class") || "ALL";
  const initialSectionFilter = searchParams.get("section") || "ALL";

  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    total_groups: 0,
    total_assigned_students: 0,
    total_classes: 0,
    available_seats: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [sectionFilter, setSectionFilter] = useState(initialSectionFilter);
  const [mentorFilter, setMentorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection & UI
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("table");

  // Modals
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState("order_rank");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    if (initialClassFilter !== classFilter) {
      setClassFilter(initialClassFilter);
    }
    if (initialSectionFilter !== sectionFilter) {
      setSectionFilter(initialSectionFilter);
    }
  }, [initialClassFilter, initialSectionFilter]);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/v1/groups/?page_size=500&all=true");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setGroups(list.filter((g) => !g.is_deleted));
      }
    } catch {
      showToast("Failed to load study groups.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadLookups = useCallback(async () => {
    try {
      const [classRes, secRes, teacherRes] = await Promise.allSettled([
        fetchWithAuth("/api/v1/classes/?page_size=500&all=true"),
        fetchWithAuth("/api/v1/academy/sections/"),
        fetchWithAuth("/api/v1/users/"),
      ]);

      if (classRes.status === "fulfilled" && classRes.value.ok) {
        const d = await classRes.value.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setClasses(list.filter((c) => !c.is_deleted));
      }

      if (secRes.status === "fulfilled" && secRes.value.ok) {
        const d = await secRes.value.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setSections(list.filter((s) => !s.is_deleted));
      }

      if (teacherRes.status === "fulfilled" && teacherRes.value.ok) {
        const d = await teacherRes.value.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setTeachers(list.filter((u) => u.is_active && !u.is_deactivated));
      }
    } catch {}
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/v1/groups/metrics/");
      if (res.ok) {
        const d = await res.json();
        setMetrics({
          total_groups: d.total_groups || 0,
          total_assigned_students: d.total_assigned_students || 0,
          total_classes: d.total_classes || 0,
          available_seats: d.available_seats || 0,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadGroups();
    loadLookups();
    loadMetrics();

    const handleTenantChanged = () => {
      loadGroups();
      loadLookups();
      loadMetrics();
    };

    const handleGroupUpdated = () => {
      loadGroups();
      loadMetrics();
    };

    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_group_updated", handleGroupUpdated);
    return () => {
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_group_updated", handleGroupUpdated);
    };
  }, [loadGroups, loadLookups, loadMetrics]);

  const handleFilterChange = (setter, key) => (val) => {
    setter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "ALL" || !val) {
      newParams.delete(key);
      if (key === "class") newParams.delete("student_class");
    } else {
      newParams.set(key, val);
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setClassFilter("ALL");
    setSectionFilter("ALL");
    setMentorFilter("ALL");
    setStatusFilter("ALL");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("class");
    newParams.delete("student_class");
    newParams.delete("section");
    newParams.delete("mentor");
    newParams.delete("status");
    setSearchParams(newParams);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    classFilter !== "ALL" ||
    sectionFilter !== "ALL" ||
    mentorFilter !== "ALL" ||
    statusFilter !== "ALL"
  );

  const activeFilterCount = [
    classFilter !== "ALL",
    sectionFilter !== "ALL",
    mentorFilter !== "ALL",
    statusFilter !== "ALL",
  ].filter(Boolean).length;

  // Drawer Registration for Group Form
  useDrawerRegistration(
    "group",
    (params) => {
      const mode = params.get("mode") || "add";
      const groupId = params.get("id");
      const foundGroup = groupId ? groups.find((g) => String(g.id) === String(groupId)) : null;

      return {
        title: mode === "edit" ? "Edit Study Group" : "Create New Group",
        subtitle:
          mode === "edit"
            ? `Update settings for ${foundGroup?.name || "Group"}`
            : "Define a new study group or halqa unit",
        width: "lg",
        content: (
          <GroupForm
            editingGroup={foundGroup}
            classes={classes}
            defaultClassId={classFilter !== "ALL" ? classFilter : ""}
            defaultSectionId={sectionFilter !== "ALL" ? sectionFilter : ""}
            onSaved={() => {
              loadGroups();
              loadMetrics();
              window.dispatchEvent(new CustomEvent("spr_group_updated"));
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [groups, classes, classFilter, sectionFilter, loadGroups, loadMetrics, closeDrawer]
  );

  const handleOpenCreate = () => {
    openDrawer("group", { mode: "add" });
  };

  const handleOpenEdit = (group) => {
    openDrawer("group", { mode: "edit", id: group.id });
  };

  const handleDeletePrompt = (group) => {
    setDeletingGroup(group);
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
        window.dispatchEvent(new CustomEvent("spr_group_updated"));
        setIsDeleteModalOpen(false);
        setDeletingGroup(null);
        loadGroups();
        loadMetrics();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete group.", "error");
      }
    } catch {
      showToast("Network error while deleting group.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered dataset
  const filteredGroups = groups.filter((grp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = grp.name?.toLowerCase().includes(q);
      const matchClass = grp.student_class_name?.toLowerCase().includes(q);
      const matchSection = grp.section_name?.toLowerCase().includes(q);
      const matchMentor = grp.mentor_teacher_name?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchSection && !matchMentor) return false;
    }

    if (classFilter !== "ALL" && String(grp.student_class) !== String(classFilter)) {
      return false;
    }

    if (sectionFilter !== "ALL" && String(grp.section) !== String(sectionFilter)) {
      return false;
    }

    if (mentorFilter !== "ALL") {
      if (mentorFilter === "UNASSIGNED") {
        if (grp.mentor_teacher) return false;
      } else if (String(grp.mentor_teacher) !== String(mentorFilter)) {
        return false;
      }
    }

    if (statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE" && !grp.is_active) return false;
      if (statusFilter === "INACTIVE" && grp.is_active) return false;
    }

    return true;
  });

  const getActionMenuItems = (grp) => [
    {
      label: "Edit Group",
      icon: EditIcon,
      onClick: () => handleOpenEdit(grp),
    },
    { divider: true },
    {
      label: "Delete Group",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeletePrompt(grp),
    },
  ];

  // Table Columns
  const tableColumns = [
    {
      key: "name",
      header: "Group & Academic Unit",
      render: (grp) => (
        <div className="space-y-0.5">
          <span className="font-bold text-sm theme-text-primary block">{grp.name}</span>
          <span className="text-xs theme-text-secondary block">
            {grp.student_class_name || "Academic Class"}
            {grp.section_name ? ` • ${grp.section_name}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "mentor_teacher_name",
      header: "Assigned Mentor",
      render: (grp) => (
        <span className="text-xs font-semibold theme-text-primary">
          {grp.mentor_teacher_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "student_count",
      header: "Assigned Students",
      align: "center",
      render: (grp) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {grp.student_count || 0}
        </span>
      ),
    },
    {
      key: "order_rank",
      header: "Rank",
      align: "center",
      render: (grp) => (
        <span className="text-xs font-mono theme-text-secondary">{grp.order_rank ?? 1}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      render: (grp) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(grp)} />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderGroupCard = (grp) => (
    <div
      key={grp.id}
      onClick={() => handleOpenEdit(grp)}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold theme-text-primary text-sm leading-tight truncate">
              {grp.name}
            </h3>
            <p className="text-xs font-medium theme-text-secondary mt-1 truncate">
              {grp.student_class_name || "Class"}
              {grp.section_name ? ` • ${grp.section_name}` : ""}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(grp)} />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>Mentor:</span>
          <span className="font-semibold theme-text-primary">{grp.mentor_teacher_name || "Unassigned"}</span>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <span className="block text-sm font-bold theme-accent font-mono">{grp.student_count || 0}</span>
          <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">
            Assigned Students
          </span>
        </div>
      </div>
    </div>
  );

  const teacherOptions = [
    { value: "ALL", label: "All Mentors" },
    { value: "UNASSIGNED", label: "Unassigned Mentors" },
    ...teachers.map((t) => ({ value: t.id, label: t.name })),
  ];

  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "ACTIVE", label: "Active Groups" },
    { value: "INACTIVE", label: "Inactive Groups" },
  ];

  const filterControls = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
      <ClassSelect
        label="Class"
        classes={classes}
        value={classFilter}
        onChange={handleFilterChange(setClassFilter, "class")}
        allowAll={true}
      />
      <SectionSelect
        label="Section"
        sections={sections}
        classId={classFilter !== "ALL" ? classFilter : null}
        value={sectionFilter}
        onChange={handleFilterChange(setSectionFilter, "section")}
        allowAll={true}
      />
      <CustomSelect
        label="Mentor Teacher"
        value={mentorFilter}
        onChange={handleFilterChange(setMentorFilter, "mentor")}
        options={teacherOptions}
        icon={TeacherSelect}
      />
      <CustomSelect
        label="Group Status"
        value={statusFilter}
        onChange={handleFilterChange(setStatusFilter, "status")}
        options={statusOptions}
      />
    </div>
  );

  return (
    <>
      <UniversalManagementView
        title="Study Groups & Circles"
        subtitle="Manage peer learning circles, halqas, and assigned mentors."
        icon={GroupIcon}
        hideHeader={hideHeader}
        hideMetrics={hideMetrics}
        isEmbedded={isEmbedded}
        primaryAction={{
          label: "Add Group",
          icon: PlusIcon,
          onClick: handleOpenCreate,
        }}
        metrics={[
          {
            label: "Total Groups",
            value: metrics.total_groups || groups.length,
            icon: GroupIcon,
            color: "accent",
            subLabel: "Active study units",
          },
          {
            label: "Assigned Students",
            value: metrics.total_assigned_students || 0,
            icon: StudentIcon,
            color: "accent",
            subLabel: "Total enrolled",
          },
          {
            label: "Parent Classes",
            value: metrics.total_classes || 0,
            icon: ClassIcon,
            color: "accent",
            subLabel: "Active classes",
          },
          {
            label: "Available Seats",
            value: metrics.available_seats || 0,
            icon: SectionIcon,
            color: "accent",
            subLabel: "Capacity available",
          },
        ]}
        searchPlaceholder="Search groups by name, class, section, or mentor..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
        filterControls={filterControls}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        data={filteredGroups}
        columns={tableColumns}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(grp) => handleOpenEdit(grp)}
        renderCard={renderGroupCard}
        page={page}
        pageSize={pageSize}
        totalCount={filteredGroups.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={(f, d) => {
          setSortField(f);
          setSortDirection(d);
        }}
        emptyState={{
          icon: GroupIcon,
          title: "No Groups Found",
          description: hasActiveFilters
            ? "No study groups match the selected filter criteria."
            : "No study groups or circles have been created yet. Click 'Add Group' to set up your first circle.",
        }}
      />

      {/* Delete Impact Modal */}
      {deletingGroup && (
        <DeleteImpactModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingGroup(null);
          }}
          title="Delete Group"
          itemName={deletingGroup.name}
          itemType="group"
          impactData={{
            direct_students: deletingGroup.student_count || 0,
          }}
          onDirectDelete={performDirectDelete}
          onMigrateOpen={() => {
            setIsDeleteModalOpen(false);
            setIsMigrationModalOpen(true);
          }}
          isDeleting={isDeleting}
        />
      )}

      {/* Group Migration Modal */}
      {deletingGroup && (
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
            window.dispatchEvent(new CustomEvent("spr_group_updated"));
          }}
        />
      )}
    </>
  );
}
