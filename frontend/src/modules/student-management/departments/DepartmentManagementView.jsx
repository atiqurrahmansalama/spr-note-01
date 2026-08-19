import React, { useState, useEffect } from "react";
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
import MetricsGrid from "../../../components/ui/MetricsGrid";
import { useRightSidebar } from "../../../context/RightSidebarContext";
import DepartmentForm from "./DepartmentForm";

export default function DepartmentManagementView() {
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

  const handleOpenCreate = () => {
    openRightSidebar({
      title: "Create Academic Department",
      content: (
        <DepartmentForm
          onSaved={() => {
            loadDepartments();
            loadMetrics();
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleOpenEdit = (dept) => {
    openRightSidebar({
      title: `Edit: ${dept.name}`,
      content: (
        <DepartmentForm
          department={dept}
          onSaved={() => {
            loadDepartments();
            loadMetrics();
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
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
    const name = (d.name || "").toLowerCase();
    const code = (d.code || "").toLowerCase();
    const head = (d.department_head_name || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    return !query || name.includes(query) || code.includes(query) || head.includes(query);
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
        <span className="font-bold text-sky-400">{d.classes_count ?? 0}</span>
      ),
    },
    {
      key: "students_count",
      header: "Students",
      align: "center",
      headerClassName: "w-24 text-center",
      render: (d) => (
        <span className="font-bold text-emerald-400">{d.students_count ?? 0}</span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      headerClassName: "w-28 text-center",
      render: (d) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            d.is_active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          }`}
        >
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
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? "bg-emerald-400" : "bg-zinc-400"}`}></span>
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
            <span className="block text-sm font-bold text-sky-400">{d.classes_count ?? 0}</span>
            <span className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">Classes</span>
          </div>
          <div className="border-l theme-border">
            <span className="block text-sm font-bold text-emerald-400">{d.students_count ?? 0}</span>
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
          <ClassIcon className="w-3.5 h-3.5 text-sky-400" />
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
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 font-sans theme-text-primary animate-fade-in text-left">
      {/* 1. Standard Module Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
            <DepartmentIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
              Department
            </h1>
            <p className="text-xs theme-text-secondary mt-0.5">
              Configure institutional academic divisions and head deans
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/student-management/classes")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub cursor-pointer transition-all flex items-center gap-2"
          >
            <ClassIcon className="w-4 h-4 text-sky-400" />
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
        </div>
      </div>

      {/* 2. Metrics Header Cards */}
      <MetricsGrid
        items={[
          {
            label: "Academic Departments",
            value: totalDeptsCount,
            icon: DepartmentIcon,
            color: "sky",
          },
          {
            label: "Assigned Classes",
            value: totalClassesCount,
            icon: ClassIcon,
            color: "emerald",
          },
          {
            label: "Enrolled Students",
            value: totalStudentsCount,
            icon: GroupsIcon,
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
            placeholder="Search department, code, dean..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-current"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs font-semibold theme-text-secondary">
            Showing <span className="theme-text-primary font-bold">{filteredDepartments.length}</span> of{" "}
            <span className="theme-text-primary font-bold">{departments.length}</span> departments
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

      {/* --- DISPLAY: DATA CARD GRID OR DATA TABLE --- */}
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
    </div>
  );
}
