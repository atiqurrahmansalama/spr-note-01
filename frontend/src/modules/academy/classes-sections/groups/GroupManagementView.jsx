import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import {
  GroupIcon,
  ClassIcon,
  SectionIcon,
  TeacherIcon,
  EditIcon,
  TrashIcon,
  TableIcon,
  Squares2X2Icon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import CustomInput from "../../../../components/ui/CustomInput";
import { ClassSelect, SectionSelect } from "../../../../components/selectors";
import DataTable from "../../../../components/ui/DataTable";
import DataCardGrid from "../../../../components/ui/DataCardGrid";
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
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassFilter = searchParams.get("student_class") || searchParams.get("class") || "ALL";
  const initialSectionFilter = searchParams.get("section") || "ALL";

  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [sectionFilter, setSectionFilter] = useState(initialSectionFilter);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("spr_groups_view_mode") || "table";
    } catch {
      return "table";
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_groups_view_mode", mode);
    } catch {}
  };

  // Modals
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    loadGroups();
    loadLookups();

    const handleTenantChanged = () => {
      loadGroups();
      loadLookups();
    };

    const handleGroupUpdated = () => {
      loadGroups();
    };

    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_group_updated", handleGroupUpdated);
    return () => {
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_group_updated", handleGroupUpdated);
    };
  }, [loadGroups, loadLookups]);

  // Drawer Registration for Add/Edit Group
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
            : "Configure a new study circle, batch, or student squad",
        width: "lg",
        content: (
          <GroupForm
            key={groupId ? `edit-grp-${groupId}` : "add-grp"}
            editingGroup={foundGroup}
            classes={classes}
            defaultClassId={classFilter !== "ALL" ? classFilter : ""}
            defaultSectionId={sectionFilter !== "ALL" ? sectionFilter : ""}
            onSaved={() => {
              loadGroups();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [groups, classes, classFilter, sectionFilter, loadGroups, closeDrawer]
  );

  const handleOpenEdit = (grp) => {
    openDrawer("group", { mode: "edit", id: grp.id });
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

  // Table Columns (Rank column removed)
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
      header: "Group Name",
      headerClassName: "min-w-[160px] sm:min-w-[200px]",
      cellClassName: "min-w-[160px] sm:min-w-[200px]",
      render: (grp) => (
        <span className="font-bold text-sm theme-text-primary block py-1">
          {grp.name}
        </span>
      ),
    },
    {
      key: "student_class_name",
      header: "Class",
      headerClassName: "min-w-[140px] sm:min-w-[180px]",
      cellClassName: "min-w-[140px] sm:min-w-[180px]",
      render: (grp) => (
        <span className="text-xs font-semibold theme-text-primary">
          {grp.student_class_name || "Academic Class"}
        </span>
      ),
    },
    {
      key: "section_name",
      header: "Section",
      headerClassName: "min-w-[140px] sm:min-w-[180px]",
      cellClassName: "min-w-[140px] sm:min-w-[180px]",
      render: (grp) => (
        <span className="text-xs font-semibold theme-text-secondary">
          {grp.section_name || "Direct Class Level"}
        </span>
      ),
    },
    {
      key: "mentor_teacher_name",
      header: "Assigned Mentor",
      headerClassName: "min-w-[160px] sm:min-w-[200px]",
      cellClassName: "min-w-[160px] sm:min-w-[200px]",
      render: (grp) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${grp.mentor_teacher_name ? "theme-text-primary" : "theme-text-muted italic"}`}>
            {grp.mentor_teacher_name || "Unassigned"}
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
      render: (grp) => (
        <span className="text-xs font-bold font-mono theme-accent px-2.5 py-0.5 rounded-lg theme-bg-accent-soft/40 border theme-border inline-block">
          {grp.student_count || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      cellClassName: "w-16 text-right",
      render: (grp) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(grp)} align="right" />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderGroupCard = (grp) => (
    <div
      key={grp.id}
      onClick={() => handleOpenEdit(grp)}
      className="rounded-2xl theme-bg-surface border theme-border p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group cursor-pointer"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold theme-text-primary text-sm leading-tight truncate group-hover:theme-accent transition-colors">
              {grp.name}
            </h3>
            <p className="text-xs font-medium theme-text-secondary mt-1 truncate">
              {grp.student_class_name || "Class"}
              {grp.section_name ? ` • ${grp.section_name}` : ""}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(grp)} align="right" />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>Mentor:</span>
          <span className="font-semibold theme-text-primary">{grp.mentor_teacher_name || "Unassigned"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full space-y-3.5">
      {/* ─── Top Filter & View Toolbar Card ─── */}
      <div className="p-2.5 sm:p-3 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Left Side: Search Bar + Class Filter + Section Filter */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-2.5 flex-1 min-w-0 flex-wrap">
          <div className="w-full sm:w-52 md:w-60 shrink-0">
            <CustomInput
              label="Search Groups"
              type="search"
              size="md"
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Search groups, mentor..."
              clearable={true}
            />
          </div>

          <div className="w-full sm:w-48 md:w-52 shrink-0">
            <ClassSelect
              label="Filter by Class"
              placeholder="All Classes"
              classes={classes}
              value={classFilter}
              onChange={handleFilterChange(setClassFilter, "class")}
              allowAll={true}
              allLabel="All Classes"
              size="md"
              icon={ClassIcon}
            />
          </div>

          <div className="w-full sm:w-48 md:w-52 shrink-0">
            <SectionSelect
              label="Filter by Section"
              placeholder="All Sections"
              sections={sections}
              classId={classFilter !== "ALL" ? classFilter : null}
              value={sectionFilter}
              onChange={handleFilterChange(setSectionFilter, "section")}
              allowAll={true}
              allLabel="All Sections"
              size="md"
              icon={SectionIcon}
            />
          </div>
        </div>

        {/* Right Side: View Switcher Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 theme-border sm:border-transparent pb-0.5">
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
      </div>

      {/* Main View Content (Table or Cards Grid) */}
      {viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filteredGroups}
          loading={loading}
          loadingMessage="Loading study groups..."
          keyExtractor={(g, idx) => g.id || `grp_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={GroupIcon}
          emptyTitle="No Groups Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL" || sectionFilter !== "ALL"
              ? "No groups match the applied search or filter criteria."
              : "Get started by creating your first study group or circle."
          }
          onRowClick={(grp) => handleOpenEdit(grp)}
        />
      ) : (
        <DataCardGrid
          data={filteredGroups}
          renderCard={renderGroupCard}
          isLoading={loading}
          loadingMessage="Loading study groups..."
          emptyIcon={GroupIcon}
          emptyTitle="No Groups Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL" || sectionFilter !== "ALL"
              ? "No groups match the applied search or filter criteria."
              : "Get started by creating your first study group or circle."
          }
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        />
      )}

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

      {/* Migration Modal */}
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
            window.dispatchEvent(new CustomEvent("spr_group_updated"));
          }}
        />
      )}
    </div>
  );
}
