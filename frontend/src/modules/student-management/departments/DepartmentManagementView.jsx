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
  BookOpenIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon
} from "../../../components/ui/Icons";
import { useRightSidebar } from "../../../context/RightSidebarContext";
import DepartmentForm from "./DepartmentForm";
import DepartmentMigrationForm from "./DepartmentMigrationForm";

export default function DepartmentManagementView() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_departments: 0,
    total_classes: 0,
    total_enrolled_students: 0,
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [trackerFilter, setTrackerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadDepartments();
    loadMetrics();
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
        showToast(err.detail || err.error || `Failed to load departments (Status ${res.status}).`, "error");
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
    if (dept.classes_count > 0) {
      openRightSidebar({
        title: `Decommission: ${dept.name}`,
        content: (
          <DepartmentMigrationForm
            department={dept}
            onMigrated={() => {
              loadDepartments();
              loadMetrics();
              closeRightSidebar();
            }}
            onCancel={closeRightSidebar}
          />
        ),
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to deactivate department "${dept.name}"?`)) return;

    (async () => {
      try {
        const res = await fetchWithAuth(`/api/v1/departments/${dept.id}/`, {
          method: "DELETE",
        });
        if (res.ok) {
          showToast("Department deactivated successfully.", "success");
          loadDepartments();
          loadMetrics();
        } else {
          const err = await res.json();
          showToast(err.error || "Failed to deactivate department.", "error");
        }
      } catch {
        showToast("Network connection error.", "error");
      }
    })();
  };

  const filteredDepartments = departments.filter((d) => {
    const name = (d.name || "").toLowerCase();
    const code = (d.code || "").toLowerCase();
    const head = (d.department_head_name || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !query || name.includes(query) || code.includes(query) || head.includes(query);

    let matchesTracker = true;
    if (trackerFilter === "QURAN") matchesTracker = d.has_quran_tracker === true;
    if (trackerFilter === "GENERAL") matchesTracker = d.has_quran_tracker === false;

    let matchesStatus = true;
    if (statusFilter === "ACTIVE") matchesStatus = d.is_active === true;
    if (statusFilter === "INACTIVE") matchesStatus = d.is_active === false;

    return matchesSearch && matchesTracker && matchesStatus;
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 font-sans theme-text-primary animate-fade-in select-none">
      {/* --- METRICS HEADER CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Academic Departments
            </span>
            <p className="text-2xl font-extrabold mt-1 text-sky-400">{metrics.total_departments}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
            <DepartmentIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Assigned Classes
            </span>
            <p className="text-2xl font-extrabold mt-1 text-emerald-400">{metrics.total_classes}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <ClassIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Enrolled Students
            </span>
            <p className="text-2xl font-extrabold mt-1 text-purple-400">{metrics.total_enrolled_students}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <GroupsIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- TOOLBAR HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Academic Department Hub</h1>
          <p className="text-xs theme-text-secondary mt-1">
            Configure institutional divisions, curriculum tracker presets, and head deans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate("/student-management/classes")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated cursor-pointer transition-all flex items-center gap-2"
          >
            <ClassIcon className="w-4 h-4 text-sky-400" />
            <span>Manage Classes &rarr;</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* --- ADVANCED FILTER BAR --- */}
      <div className="theme-bg-surface border theme-border p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center mb-6 shadow-sm">
        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search department, code, dean..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none focus:border-sky-500"
            />
            <span className="absolute left-3 top-2.5 text-zinc-400">
              <SearchIcon className="w-3.5 h-3.5" />
            </span>
          </div>

          <select
            value={trackerFilter}
            onChange={(e) => setTrackerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Curricula</option>
            <option value="QURAN">Quran Tracker Enabled</option>
            <option value="GENERAL">Standard General</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        <div className="text-xs font-semibold theme-text-secondary">
          Showing <span className="theme-text-primary font-bold">{filteredDepartments.length}</span> of{" "}
          <span className="theme-text-primary font-bold">{departments.length}</span> departments
        </div>
      </div>

      {/* --- TABLE VIEW --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold theme-text-secondary">Loading academic entities...</span>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="theme-bg-surface border theme-border p-12 rounded-3xl text-center space-y-3 shadow-sm">
          <DepartmentIcon className="w-12 h-12 text-zinc-500 mx-auto" />
          <h3 className="text-sm font-bold theme-text-primary">No Departments Found</h3>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto">
            {searchQuery || trackerFilter !== "ALL" || statusFilter !== "ALL"
              ? "No departments match the applied filters. Try resetting the search or category."
              : "Get started by adding your first academic division (e.g., Hifz, Nazera, General School)."}
          </p>
        </div>
      ) : (
        <div className="theme-bg-surface border theme-border rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border bg-black/10 text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                <th className="px-6 py-4">Department &amp; Code</th>
                <th className="px-6 py-4">Curriculum Preset</th>
                <th className="px-6 py-4">Head / Dean</th>
                <th className="px-6 py-4 text-center">Classes</th>
                <th className="px-6 py-4 text-center">Students</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-xs">
              {filteredDepartments.map((d) => (
                <tr key={d.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-xs">
                        {d.code || d.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold theme-text-primary block">{d.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">Order: {d.order_rank ?? 1}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {d.has_quran_tracker ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <BookOpenIcon className="w-3 h-3" />
                        <span>30 Juz Tracker</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="theme-text-primary font-medium block">{d.department_head_name || "Unassigned"}</span>
                    {d.department_head_phone && (
                      <span className="text-[10px] theme-text-secondary block">{d.department_head_phone}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-sky-400">{d.classes_count ?? 0}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-emerald-400">{d.students_count ?? 0}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/student-management/classes?department=${d.id}`)}
                        className="px-2.5 py-1 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <ClassIcon className="w-3 h-3 text-sky-400" />
                        <span>Classes</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(d)}
                        className="px-2.5 py-1 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <EditIcon className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDirect(d)}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <TrashIcon className="w-3 h-3" />
                        <span>Decommission</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
