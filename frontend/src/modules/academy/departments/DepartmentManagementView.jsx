import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import {
  DepartmentIcon,
  ClassIcon,
  GroupsIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  BuildingOfficeIcon,
} from "../../../components/ui/Icons";
import DataTable from "../../../components/ui/DataTable";
import DataCardGrid from "../../../components/ui/DataCardGrid";
import ActionMenu from "../../../components/ui/ActionMenu";
import CustomSelect from "../../../components/ui/CustomSelect";
import MetricsGrid from "../../../components/ui/MetricsGrid";
import PageHeader from "../../../components/ui/PageHeader";
import { PageContainer } from "../../../components/layout";
import DataViewToolbar from "../../../components/ui/DataViewToolbar";
import DataViewFooter from "../../../components/ui/DataViewFooter";
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
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("spr_dept_view_mode") || "table";
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingDept, setDeletingDept] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState([]);
  const [metrics, setMetrics] = useState({
    total_departments: 0,
    total_classes: 0,
    total_enrolled_students: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_dept_view_mode", mode);
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
    loadDepartments();
    loadMetrics();

    const handleTenantChanged = () => {
      loadDepartments();
      loadMetrics();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : data.results || []);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("[DepartmentManagementView] HTTP Error:", res.status, err);
        const errMsg = err.message || err.detail || err.error || `Failed to load departments (Status ${res.status}).`;
        showToast(errMsg, "error");
      }
    } catch (e) {
      console.error("[DepartmentManagementView] Exception:", e);
      showToast(e.message || "Failed to load departments.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/departments/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  };

  const { openDrawer, closeDrawer } = useRightSidebar();

  // Universal Drawer Registration for Department Form (survives F5 refresh)
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
            department={foundDept}
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
    [departments, closeDrawer]
  );

  const handleOpenCreate = () => {
    openDrawer("department", { mode: "add" });
  };

  const handleOpenEdit = (dept) => {
    openDrawer("department", { mode: "edit", id: dept.id });
  };

  const handleDeleteDirect = (dept) => {
    setDeletingDept(dept);
  };

  const handleConfirmDeleteDept = async () => {
    if (!deletingDept) return;
    try {
      setIsDeleting(true);
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
      showToast("Network connection error.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    if (statusFilter === "ACTIVE" && !d.is_active) return false;
    if (statusFilter === "INACTIVE" && d.is_active) return false;
    if (statusFilter === "QURAN_TRACKER" && !d.has_quran_tracker) return false;

    if (!searchQuery) return true;
    const name = (d.name || "").toLowerCase();
    const code = (d.code || "").toLowerCase();
    const head = (d.department_head_name || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    return name.includes(query) || code.includes(query) || head.includes(query);
  });

  const getActionMenuItems = (d) => [
    {
      label: "Manage Classes",
      icon: ClassIcon,
      onClick: () => navigate(`/student-management/classes?department=${d.id}`),
    },
    {
      label: "Edit Department",
      icon: EditIcon,
      onClick: () => handleOpenEdit(d),
    },
    {
      divider: true,
    },
    {
      label: "Decommission",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeleteDirect(d),
    },
  ];

  // Define Reusable DataTable Columns
  const columns = [
    {
      key: "name",
      header: "Department & Code",
      headerClassName: "min-w-[220px]",
      render: (d) => (
        <div>
          <span className="font-bold theme-text-primary block text-xs sm:text-sm">{d.name}</span>
          <span className="text-[10px] font-mono theme-text-secondary mt-0.5 block">
            {d.code ? `Code: ${d.code} • ` : ""}Order: {d.order_rank ?? 1}
          </span>
        </div>
      ),
    },
    {
      key: "department_head_name",
      header: "Head / Dean",
      headerClassName: "min-w-[240px] sm:w-1/3",
      render: (d) => (
        <div>
          <span className="theme-text-primary font-semibold block text-xs">
            {d.department_head_name || "Unassigned"}
          </span>
          {d.department_head_phone && (
            <span className="text-[10px] font-mono theme-text-secondary block mt-0.5">
              {d.department_head_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "classes_count",
      header: "Classes",
      align: "center",
      headerClassName: "w-24 text-center",
      render: (d) => (
        <span className="font-bold theme-text-primary">{d.classes_count ?? 0}</span>
      ),
    },
    {
      key: "students_count",
      header: "Students",
      align: "center",
      headerClassName: "w-24 text-center",
      render: (d) => (
        <span className="font-bold theme-accent">{d.students_count ?? 0}</span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      headerClassName: "w-28 text-center",
      render: (d) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            d.is_active
              ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
              : "theme-bg-sub theme-text-secondary border theme-border"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? "bg-[var(--accent-main)]" : "theme-bg-elevated"}`}></span>
          {d.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-16 text-right",
      render: (d) => (
        <div className="flex items-center justify-end">
          <ActionMenu items={getActionMenuItems(d)} />
        </div>
      ),
    },
  ];

  // Reusable Card Renderer for DataCardGrid
  const renderDepartmentCard = (d) => (
    <div
      key={d.id}
      className="rounded-2xl theme-bg-surface border theme-border p-5 shadow-xs flex flex-col justify-between group hover:theme-bg-sub/30 transition-all"
    >
      <div className="space-y-4">
        {/* Header with Title, Code, Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold theme-text-primary text-sm leading-tight break-words">
              {d.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {d.code && (
                <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border font-mono text-[10px] theme-accent font-bold">
                  {d.code}
                </span>
              )}
              <span className="text-[10px] font-mono theme-text-secondary">
                Order: {d.order_rank ?? 1}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
              d.is_active
                ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20"
                : "theme-bg-sub theme-text-secondary border theme-border"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? "bg-[var(--accent-main)]" : "theme-bg-elevated"}`}></span>
            {d.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Head / Dean details */}
        <div className="text-xs space-y-1 theme-text-secondary pt-2.5 border-t theme-border">
          <div className="flex items-center justify-between text-[11px]">
            <span>Head / Dean:</span>
            <span className="theme-text-primary font-medium">{d.department_head_name || "Unassigned"}</span>
          </div>
          {d.department_head_phone && (
            <div className="flex items-center justify-between text-[11px]">
              <span>Phone Contact:</span>
              <span className="theme-text-primary font-mono">{d.department_head_phone}</span>
            </div>
          )}
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl theme-bg-sub border theme-border text-center">
          <div>
            <span className="block text-sm font-bold theme-text-primary">{d.classes_count ?? 0}</span>
            <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Classes</span>
          </div>
          <div className="border-l theme-border">
            <span className="block text-sm font-bold theme-accent">{d.students_count ?? 0}</span>
            <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Students</span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3.5 mt-2 border-t theme-border flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/student-management/classes?department=${d.id}`)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border"
        >
          <ClassIcon className="w-3.5 h-3.5 theme-accent" />
          <span>Classes</span>
        </button>

        <ActionMenu items={getActionMenuItems(d)} />
      </div>
    </div>
  );

  const totalDeptsCount = metrics?.total_departments ?? departments.length;
  const totalClassesCount = metrics?.total_classes ?? departments.reduce((acc, d) => acc + (d.classes_count || 0), 0);
  const totalStudentsCount = metrics?.total_enrolled_students ?? departments.reduce((acc, d) => acc + (d.students_count || 0), 0);

  return (
    <PageContainer isEmbedded={isEmbedded}>
      {/* 1. Standard Module Header with Reusable PageHeader */}
      {!hideHeader && (
        <PageHeader
          icon={DepartmentIcon}
          title="Academic Departments"
          subtitle="Configure institutional academic divisions, branches, and department leadership"
          actions={
            <>
              <button
                type="button"
                onClick={() => navigate("/student-management/classes")}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub cursor-pointer transition-all flex items-center gap-2"
              >
                <ClassIcon className="w-4 h-4 theme-accent" />
                <span>Manage Classes &rarr;</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            </>
          }
        />
      )}

      {/* 2. Metrics Header Cards */}
      {!hideMetrics && (
        <MetricsGrid
          items={[
            {
              label: "Academic Departments",
              value: totalDeptsCount,
              icon: DepartmentIcon,
              color: "accent",
            },
            {
              label: "Assigned Classes",
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
        />
      )}

      {/* 3. Search & View Mode Switcher Toolbar */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search department, code, dean..."
        filterElement={
          <CustomSelect
            options={DEPARTMENT_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="Filter by Status"
          />
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* --- DISPLAY: DATA CARD GRID OR DATA TABLE --- */}
      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold theme-text-primary">
              {selectedIds.length} {selectedIds.length === 1 ? 'department' : 'departments'} selected
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
            data={filteredDepartments}
            renderCard={renderDepartmentCard}
            isLoading={loading}
            loadingMessage="Loading academic departments..."
            emptyIcon={DepartmentIcon}
            emptyTitle="No Departments Found"
            emptySubMessage={
              searchQuery
                ? "No departments matched your search query. Try clearing the search box."
                : "Get started by adding your first academic division."
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredDepartments}
            selectable={true}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            idField="id"
            isLoading={loading}
            loadingMessage="Loading academic departments..."
            emptyIcon={DepartmentIcon}
            emptyTitle="No Departments Found"
            emptySubMessage={
              searchQuery
                ? "No departments matched your search query. Try clearing the search box."
                : "Get started by adding your first academic division."
            }
          />
        )}

        {/* Reusable DataViewFooter */}
        {!loading && departments.length > 0 && (
          <DataViewFooter
            filteredCount={filteredDepartments.length}
            totalCount={departments.length}
            itemLabel="departments"
          />
        )}
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in text-left">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-text-primary">Delete Department</h3>
                <p className="text-xs theme-text-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs theme-text-secondary">
              Are you sure you want to permanently delete department{" "}
              <strong className="theme-text-primary">"{deletingDept.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDept}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Department"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
