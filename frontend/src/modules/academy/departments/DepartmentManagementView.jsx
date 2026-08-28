import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import {
  DepartmentIcon,
  ClassIcon,
  GroupsIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from "../../../components/ui/Icons";
import ActionMenu from "../../../components/ui/ActionMenu";
import CustomSelect from "../../../components/ui/CustomSelect";
import UniversalManagementView from "../../../components/common/UniversalManagementView";
import { useRightSidebar, useDrawerRegistration } from "../../../context/RightSidebarContext";
import DepartmentForm from "./DepartmentForm";

const DEPARTMENT_STATUS_OPTIONS = [
  { label: "All Departments", value: "ALL" },
  { label: "Active Status", value: "ACTIVE" },
  { label: "Inactive Status", value: "INACTIVE" },
  { label: "Quran / Hifz Tracker", value: "QURAN_TRACKER" },
];

export default function DepartmentManagementView({
  hideHeader = false,
  hideMetrics = false,
  isEmbedded = false,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingDept, setDeletingDept] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [metrics, setMetrics] = useState({
    total_departments: 0,
    total_classes: 0,
    total_enrolled_students: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : data.results || []);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Failed to load departments.", "error");
      }
    } catch (e) {
      showToast(e.message || "Failed to load departments.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/v1/departments/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDepartments();
    loadMetrics();

    const handleTenantChanged = () => {
      loadDepartments();
      loadMetrics();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, [loadDepartments, loadMetrics]);

  // Drawer Registration
  useDrawerRegistration(
    "department",
    (params) => {
      const mode = params.get("mode") || "add";
      const deptId = params.get("id");
      const foundDept = deptId ? departments.find((d) => String(d.id) === String(deptId)) : null;

      return {
        title: mode === "add" ? "Create Academic Department" : `Edit: ${foundDept?.name || "Department"}`,
        category: "Student Management",
        size: "md",
        content: (
          <DepartmentForm
            editingDepartment={foundDept}
            onSaved={() => {
              loadDepartments();
              loadMetrics();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [departments, loadDepartments, loadMetrics, closeDrawer]
  );

  const handleOpenAdd = () => {
    openDrawer("department", { mode: "add" });
  };

  const handleOpenEdit = (dept) => {
    openDrawer("department", { mode: "edit", id: dept.id });
  };

  const handleDelete = (dept) => {
    setDeletingDept(dept);
  };

  const confirmDelete = async () => {
    if (!deletingDept) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/v1/departments/${deletingDept.id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Department "${deletingDept.name}" deleted successfully.`, "success");
        setDeletingDept(null);
        loadDepartments();
        loadMetrics();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete department.", "error");
      }
    } catch {
      showToast("Network error occurred.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        d.dean_name?.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (statusFilter === "ACTIVE" && !d.is_active) return false;
    if (statusFilter === "INACTIVE" && d.is_active) return false;
    if (statusFilter === "QURAN_TRACKER" && !d.has_quran_tracker) return false;

    return true;
  });

  const getActionMenuItems = (dept) => [
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
    {
      label: "Delete Department",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDelete(dept),
    },
  ];

  const tableColumns = [
    {
      key: "name",
      header: "Department Name & Code",
      render: (dept) => (
        <div className="space-y-0.5">
          <span className="font-bold text-sm theme-text-primary block">{dept.name}</span>
          {dept.code && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border inline-block">
              {dept.code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "dean_name",
      header: "Dean / Head",
      render: (dept) => (
        <span className="text-xs font-semibold theme-text-primary">
          {dept.dean_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "classes",
      header: "Classes",
      align: "center",
      render: (dept) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {dept.class_count || 0}
        </span>
      ),
    },
    {
      key: "students",
      header: "Students",
      align: "center",
      render: (dept) => (
        <span className="text-xs font-bold font-mono theme-text-primary">
          {dept.student_count || 0}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      render: (dept) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            dept.is_active
              ? "theme-bg-accent-soft theme-accent border theme-border"
              : "theme-bg-sub theme-text-secondary border theme-border"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? "theme-bg-accent" : "theme-bg-elevated"}`}></span>
          {dept.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      render: (dept) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(dept)} align="right" />
        </div>
      ),
    },
  ];

  const renderDepartmentCard = (dept) => (
    <div
      key={dept.id}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between hover:theme-bg-sub/20 transition-all space-y-4 group"
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold theme-text-primary text-sm leading-tight truncate">
                {dept.name}
              </h3>
              {dept.code && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg theme-bg-sub theme-text-secondary border theme-border">
                  {dept.code}
                </span>
              )}
            </div>
            <p className="text-xs theme-text-secondary mt-1">
              Head: <span className="font-semibold theme-text-primary">{dept.dean_name || "Unassigned"}</span>
            </p>
          </div>
          <ActionMenu items={getActionMenuItems(dept)} align="right" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <div>
            <span className="block text-sm font-bold theme-accent font-mono">{dept.class_count || 0}</span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Classes</span>
          </div>
          <div className="border-l theme-border">
            <span className="block text-sm font-bold theme-text-primary font-mono">{dept.student_count || 0}</span>
            <span className="text-[9px] theme-text-secondary uppercase tracking-wider font-semibold">Students</span>
          </div>
        </div>
      </div>
    </div>
  );

  const totalDeptsCount = metrics?.total_departments || departments.length;
  const totalClassesCount = metrics?.total_classes || 0;
  const totalStudentsCount = metrics?.total_enrolled_students || 0;

  return (
    <UniversalManagementView
      title="Academic Departments"
      subtitle="Configure faculties, Quranic study divisions, and curriculum streams"
      icon={DepartmentIcon}
      hideHeader={hideHeader}
      hideMetrics={hideMetrics}
      isEmbedded={isEmbedded}
      storageKey="spr_dept_view_mode"
      defaultViewMode="table"
      headerActions={
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add Department</span>
        </button>
      }
      metrics={[
        {
          label: "Total Departments",
          value: totalDeptsCount,
          icon: DepartmentIcon,
          color: "accent",
        },
        {
          label: "Active Classes",
          value: totalClassesCount,
          icon: ClassIcon,
          color: "default",
        },
        {
          label: "Enrolled Students",
          value: totalStudentsCount,
          icon: GroupsIcon,
          color: "default",
        },
      ]}
      searchLabel="Search Departments"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search department, code, dean..."
      filters={
        <div className="w-36 sm:w-44 shrink-0">
          <CustomSelect
            label="Department Status"
            options={DEPARTMENT_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="All Status"
            size="md"
          />
        </div>
      }
      hasActiveFilters={searchQuery.trim() !== "" || statusFilter !== "ALL"}
      loading={loading}
      loadingMessage="Loading academic departments..."
      data={filteredDepartments}
      totalCount={departments.length}
      itemLabel="departments"
      columns={tableColumns}
      renderCard={renderDepartmentCard}
      onRowClick={(dept) => handleOpenEdit(dept)}
      selectable={true}
      emptyIcon={DepartmentIcon}
      emptyTitle="No Departments Found"
      emptySubMessage={
        searchQuery || statusFilter !== "ALL"
          ? "No departments match your active search criteria."
          : "Get started by adding your first academic faculty or department."
      }
      modals={
        deletingDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
              <h3 className="text-base font-bold theme-text-primary">Delete Department</h3>
              <p className="text-xs theme-text-secondary">
                Are you sure you want to delete <span className="font-semibold theme-text-primary">"{deletingDept.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setDeletingDept(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 transition disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )
      }
    />
  );
}
