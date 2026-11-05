import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import { useFeatureControl } from "../../../../context/FeatureControlContext";
import {
  GroupIcon,
  ClassIcon,
  SectionIcon,
  TeacherIcon,
  EditIcon,
  TrashIcon,
  TableIcon,
  Squares2X2Icon,
  PlusIcon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import DataTable from "../../../../components/ui/DataTable";
import DataCardGrid from "../../../../components/ui/DataCardGrid";
import EmptyState from "../../../../components/ui/EmptyState";
import { useRightSidebar, useDrawerRegistration } from "../../../../context/RightSidebarContext";
import { useTenant } from "../../../../context/TenantContext";
import GroupForm from "./GroupForm";
import GroupMigrationModal from "./GroupMigrationModal";
import DeleteImpactModal from "../../../../components/common/DeleteImpactModal";
import ClassesSectionsToolbar from "../components/ClassesSectionsToolbar";
import { PageContainer } from "../../../../components/layout";
import { getDepartments } from "../../../../api/academy";
import {
  AcademicGroup,
  AcademicClass,
  AcademicSection,
  AcademicDepartment,
  TeacherUser,
  GroupManagementViewProps,
} from "../types";

export default function GroupManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}: GroupManagementViewProps) {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();
  const { isSectionEnabled } = useFeatureControl();
  const [searchParams, setSearchParams] = useSearchParams();

  const canMigrateDelete = isSectionEnabled("groups_action_migrate_delete") !== false;
  const canAddGroup = isSectionEnabled("groups_action_add_group") !== false;

  const queryDept = searchParams.get("department") || "ALL";
  const queryClass = searchParams.get("student_class") || searchParams.get("class") || "ALL";
  const querySection = searchParams.get("section") || "ALL";

  const [groups, setGroups] = useState<AcademicGroup[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<AcademicSection[]>([]);
  const [departments, setDepartments] = useState<AcademicDepartment[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>(queryDept);
  const [classFilter, setClassFilter] = useState<string>(queryClass);
  const [sectionFilter, setSectionFilter] = useState<string>(querySection);
  const [viewMode, setViewMode] = useState<"table" | "card">(() => {
    try {
      const saved = localStorage.getItem("spr_groups_view_mode");
      return saved === "card" || saved === "grid" ? "card" : "table";
    } catch {
      return "table";
    }
  });

  const handleViewModeChange = (mode: "table" | "card") => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_groups_view_mode", mode);
    } catch {}
  };

  // Modals
  const [deletingGroup, setDeletingGroup] = useState<AcademicGroup | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (queryDept !== deptFilter) {
      setDeptFilter(queryDept);
    }
  }, [queryDept]);

  useEffect(() => {
    if (queryClass !== classFilter) {
      setClassFilter(queryClass);
    }
  }, [queryClass]);

  useEffect(() => {
    if (querySection !== sectionFilter) {
      setSectionFilter(querySection);
    }
  }, [querySection]);

  const loadGroups = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && groups.length === 0) {
        setLoading(true);
      }
      const tenantParam = activeTenantId && activeTenantId !== "ALL" ? `&institution=${activeTenantId}` : "";
      const res = await fetchWithAuth(`/api/v1/groups/?page_size=500&all=true${tenantParam}`);
      if (res.ok) {
        const data = await res.json();
        const list: AcademicGroup[] = Array.isArray(data) ? data : data.results || [];
        setGroups(list.filter((g) => !g.is_deleted));
      }
    } catch {
      showToast("Failed to load study groups.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, activeTenantId, groups.length]);

  const loadLookups = useCallback(async () => {
    try {
      const tenantParam = activeTenantId && activeTenantId !== "ALL" ? `&institution=${activeTenantId}` : "";
      const [classRes, secRes, teacherRes, deptRes] = await Promise.allSettled([
        fetchWithAuth(`/api/v1/classes/?page_size=500&all=true${tenantParam}`),
        fetchWithAuth(`/api/v1/academy/sections/?page_size=500&all=true${tenantParam}`),
        fetchWithAuth(`/api/v1/staff/?page_size=500${tenantParam}`),
        getDepartments({ page_size: 500, all: true, ...(activeTenantId && activeTenantId !== "ALL" ? { institution: activeTenantId } : {}) }),
      ]);

      if (classRes.status === "fulfilled" && classRes.value.ok) {
        const d = await classRes.value.json();
        const list: AcademicClass[] = Array.isArray(d) ? d : d.results || [];
        setClasses(list.filter((c) => !c.is_deleted));
      }

      if (secRes.status === "fulfilled" && secRes.value.ok) {
        const d = await secRes.value.json();
        const list: AcademicSection[] = Array.isArray(d) ? d : d.results || [];
        setSections(list.filter((s) => !s.is_deleted));
      }

      if (deptRes.status === "fulfilled" && deptRes.value) {
        const d = deptRes.value;
        const list = Array.isArray(d) ? d : (d as any).results || [];
        setDepartments(list.filter((dp: any) => !dp.is_deleted));
      }

      if (teacherRes.status === "fulfilled" && teacherRes.value.ok) {
        const d = await teacherRes.value.json();
        const list: TeacherUser[] = Array.isArray(d) ? d : d.results || [];
        setTeachers(list.filter((u: any) => u.is_active && !u.is_deactivated));
      }
    } catch {}
  }, [activeTenantId]);

  useEffect(() => {
    loadGroups();
    loadLookups();

    const handleTenantChanged = () => {
      loadGroups(false);
      loadLookups();
    };

    const handleGroupUpdated = () => {
      loadGroups(true);
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
            teachers={teachers}
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
    [groups, classes, teachers, classFilter, sectionFilter, loadGroups, closeDrawer]
  );

  const handleOpenAdd = () => {
    openDrawer("group", { mode: "add" });
  };

  const handleOpenEdit = (grp: AcademicGroup) => {
    openDrawer("group", { mode: "edit", id: grp.id });
  };

  const handleDeletePrompt = (group: AcademicGroup) => {
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

  const classMap = useMemo(() => {
    const map = new Map<string | number, AcademicClass>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const eligibleClasses = useMemo(() => {
    if (deptFilter === "ALL" || !deptFilter) return classes;
    return classes.filter(
      (c) => String(c.department || (c as any).department_id) === String(deptFilter)
    );
  }, [classes, deptFilter]);

  const eligibleSections = useMemo(() => {
    let list = sections;
    if (deptFilter !== "ALL" && deptFilter) {
      list = list.filter((s) => {
        const parentClass = classMap.get(s.student_class);
        const secDept = s.department || (s as any).department_id || parentClass?.department || (parentClass as any)?.department_id;
        return String(secDept) === String(deptFilter);
      });
    }
    if (classFilter !== "ALL" && classFilter) {
      list = list.filter((s) => String(s.student_class) === String(classFilter));
    }
    return list;
  }, [sections, deptFilter, classFilter, classMap]);

  const handleDeptFilterChange = (val: string) => {
    setDeptFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "ALL" || !val) {
      newParams.delete("department");
    } else {
      newParams.set("department", val);
    }
    // If current classFilter does not belong to the selected department, reset class & section
    if (classFilter !== "ALL" && val !== "ALL") {
      const cls = classMap.get(classFilter);
      if (cls && String(cls.department || (cls as any).department_id) !== String(val)) {
        setClassFilter("ALL");
        setSectionFilter("ALL");
        newParams.delete("student_class");
        newParams.delete("class");
        newParams.delete("section");
      }
    }
    setSearchParams(newParams);
  };

  const handleClassFilterChange = (val: string) => {
    setClassFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "ALL" || !val) {
      newParams.delete("student_class");
      newParams.delete("class");
    } else {
      newParams.set("student_class", val);
    }
    // If current section does not belong to the newly selected class, reset sectionFilter
    if (sectionFilter !== "ALL" && val !== "ALL") {
      const sec = sections.find((s) => String(s.id) === String(sectionFilter));
      if (sec && String(sec.student_class) !== String(val)) {
        setSectionFilter("ALL");
        newParams.delete("section");
      }
    }
    setSearchParams(newParams);
  };

  const handleFilterChange = (setter: (val: string) => void, key: string) => (val: string) => {
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

  // Filtered dataset by search query, department, class, and section
  const filteredGroups = groups.filter((grp) => {
    if (!grp) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = grp.name?.toLowerCase().includes(q);
      const matchClass = (grp as any).student_class_name?.toLowerCase().includes(q);
      const matchSection = (grp as any).section_name?.toLowerCase().includes(q);
      const matchMentor = (grp as any).mentor_teacher_name?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchSection && !matchMentor) return false;
    }

    if (deptFilter !== "ALL") {
      const parentClass = classMap.get(grp.student_class);
      const grpDept = grp.department || (grp as any).department_id || parentClass?.department || (parentClass as any)?.department_id;
      if (String(grpDept) !== String(deptFilter)) {
        return false;
      }
    }

    if (classFilter !== "ALL" && String(grp.student_class) !== String(classFilter)) {
      return false;
    }

    if (sectionFilter !== "ALL" && String(grp.section) !== String(sectionFilter)) {
      return false;
    }

    return true;
  });

  const getActionMenuItems = (grp: AcademicGroup) => [
    {
      label: "Edit Group",
      icon: EditIcon,
      onClick: () => handleOpenEdit(grp),
    },
    ...(canMigrateDelete
      ? [
          { divider: true },
          {
            label: "Delete Group",
            icon: TrashIcon,
            danger: true,
            onClick: () => handleDeletePrompt(grp),
          },
        ]
      : []),
  ];

  // Table Columns
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
      header: "Group Name",
      headerClassName: "min-w-[160px] sm:min-w-[200px]",
      cellClassName: "min-w-[160px] sm:min-w-[200px]",
      render: (grp: AcademicGroup) => (
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
      render: (grp: AcademicGroup) => (
        <span className="text-xs font-semibold theme-text-primary">
          {(grp as any).student_class_name || "Academic Class"}
        </span>
      ),
    },
    {
      key: "section_name",
      header: "Section",
      headerClassName: "min-w-[140px] sm:min-w-[180px]",
      cellClassName: "min-w-[140px] sm:min-w-[180px]",
      render: (grp: AcademicGroup) => (
        <span className="text-xs font-semibold theme-text-secondary">
          {(grp as any).section_name || "Direct Class Level"}
        </span>
      ),
    },
    {
      key: "mentor_teacher_name",
      header: "Assigned Mentor",
      headerClassName: "min-w-[160px] sm:min-w-[200px]",
      cellClassName: "min-w-[160px] sm:min-w-[200px]",
      render: (grp: AcademicGroup) => (
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary py-1">
          <TeacherIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
          <span className={`font-semibold ${(grp as any).mentor_teacher_name ? "theme-text-primary" : "theme-text-muted italic"}`}>
            {(grp as any).mentor_teacher_name || "Unassigned"}
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
      render: (grp: AcademicGroup) => (
        <span className="text-xs font-semibold font-mono theme-accent">
          {(grp as any).student_count || grp.total_students || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      cellClassName: "w-16 text-right",
      render: (grp: AcademicGroup) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(grp)} align="right" />
        </div>
      ),
    },
  ];

  // Card Renderer
  const renderGroupCard = (grp: AcademicGroup) => (
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
              {(grp as any).student_class_name || "Class"}
              {(grp as any).section_name ? ` • ${(grp as any).section_name}` : ""}
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={getActionMenuItems(grp)} align="right" />
          </div>
        </div>

        <div className="text-xs theme-text-secondary flex items-center justify-between">
          <span>Mentor:</span>
          <span className="font-semibold theme-text-primary">{(grp as any).mentor_teacher_name || "Unassigned"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer
      isEmbedded={isEmbedded}
      maxWidth="7xl"
      animate={!isEmbedded}
      className="space-y-3.5"
    >
      {/* ─── Reusable Responsive Filter & View Toolbar ─── */}
      <ClassesSectionsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search groups by name, mentor..."
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        departmentFilter={{
          value: deptFilter,
          onChange: handleDeptFilterChange,
          departments,
        }}
        classFilter={{
          value: classFilter,
          onChange: handleClassFilterChange,
          classes: eligibleClasses,
        }}
        sectionFilter={{
          value: sectionFilter,
          onChange: handleFilterChange(setSectionFilter, "section"),
          sections: eligibleSections,
          classId: classFilter !== "ALL" ? classFilter : null,
        }}
        totalCount={filteredGroups.length}
        entityName="Groups"
      />

      {/* Main View Content (Table or Cards Grid with EmptyState fallback) */}
      {!loading && filteredGroups.length === 0 ? (
        <EmptyState
          icon={GroupIcon}
          iconVariant="sub"
          title={searchQuery || classFilter !== "ALL" || sectionFilter !== "ALL" || deptFilter !== "ALL" ? "No Matching Groups" : "No Groups Found"}
          description={
            searchQuery || classFilter !== "ALL" || sectionFilter !== "ALL" || deptFilter !== "ALL"
              ? "No groups match the applied search or filter criteria."
              : "Groups allow organizing students into study circles, halaqahs, or batches."
          }
          action={
            searchQuery || classFilter !== "ALL" || sectionFilter !== "ALL" || deptFilter !== "ALL"
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchQuery("");
                    handleDeptFilterChange("ALL");
                    handleClassFilterChange("ALL");
                    handleFilterChange(setSectionFilter, "section")("ALL");
                  },
                }
              : canAddGroup
              ? {
                  label: "Add Group",
                  icon: PlusIcon,
                  onClick: () => handleOpenAdd(),
                }
              : undefined
          }
        />
      ) : viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filteredGroups}
          loading={loading}
          loadingMessage="Loading study groups..."
          keyExtractor={(g: AcademicGroup, idx: number) => g.id || `grp_${idx}`}
          cellPaddingClass="py-3.5 px-4 sm:px-5"
          headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
          emptyIcon={GroupIcon}
          emptyTitle="No Groups Found"
          emptySubMessage={
            searchQuery || classFilter !== "ALL" || sectionFilter !== "ALL"
              ? "No groups match the applied search or filter criteria."
              : "Get started by creating your first study group or circle."
          }
          onRowClick={(grp: AcademicGroup) => handleOpenEdit(grp)}
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
            direct_students: (deletingGroup as any).student_count || deletingGroup.total_students || 0,
          }}
          onConfirm={performDirectDelete}
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
    </PageContainer>
  );
}

