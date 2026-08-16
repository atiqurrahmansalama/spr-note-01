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
import DepartmentFormModal from "./DepartmentFormModal";
import DepartmentMigrationModal from "./DepartmentMigrationModal";

export default function DepartmentManagementView() {
  const { showToast } = useToast();
  const navigate = useNavigate();

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

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [decommissioningDept, setDecommissioningDept] = useState(null);

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

  const handleDeleteDirect = async (dept) => {
    if (dept.classes_count > 0) {
      setDecommissioningDept(dept);
      setIsMigrationOpen(true);
      return;
    }

    if (!window.confirm(`Are you sure you want to deactivate department "${dept.name}"?`)) return;

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
            onClick={() => {
              setEditingDept(null);
              setIsFormOpen(true);
            }}
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
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      {loading ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center animate-pulse">
          <div className="h-6 w-32 bg-zinc-800 rounded mx-auto mb-4" />
          <div className="h-4 w-48 bg-zinc-800 rounded mx-auto" />
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <DepartmentIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold">No academic departments found</h3>
          <p className="text-xs theme-text-secondary mt-1">
            Create your first department or adjust your search filters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border theme-border rounded-2xl theme-bg-surface shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border text-xs font-semibold theme-text-secondary uppercase tracking-wider bg-black/10">
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4">Department Name &amp; Code</th>
                <th className="px-6 py-4">Department Head / Dean</th>
                <th className="px-6 py-4 text-center">Classes</th>
                <th className="px-6 py-4 text-center">Students</th>
                <th className="px-6 py-4">Tracker Preset</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-xs font-medium">
              {filteredDepartments.map((d, index) => (
                <tr key={d.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-center font-mono text-zinc-400">
                    {d.order_rank || index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                        <DepartmentIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold theme-text-primary text-sm">{d.name}</div>
                        {d.code && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border theme-border">
                            {d.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {d.department_head_name ? (
                      <div>
                        <div className="font-bold theme-text-primary">{d.department_head_name}</div>
                        <div className="text-[10px] theme-text-secondary mt-0.5">
                          {d.department_head_phone || "No Phone"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => navigate(`/student-management/classes?department=${d.id}`)}
                      className="px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors font-bold cursor-pointer inline-flex items-center gap-1.5"
                      title="Click to view classes under this department"
                    >
                      <ClassIcon className="w-3.5 h-3.5" />
                      <span>{d.classes_count || 0}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-purple-400 font-mono">
                    {d.students_count || 0}
                  </td>
                  <td className="px-6 py-4">
                    {d.has_quran_tracker ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                        <BookOpenIcon className="w-3 h-3 text-emerald-400" />
                        <span>30 Juz Tracker</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border theme-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        <span>Standard</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                        title="Manage Classes"
                      >
                        <ClassIcon className="w-3 h-3 text-sky-400" />
                        <span>Classes</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingDept(d);
                          setIsFormOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <EditIcon className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDirect(d)}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                        title="Decommission &amp; Migrate Classes"
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

      {/* --- FORM MODAL --- */}
      {isFormOpen && (
        <DepartmentFormModal
          isOpen={isFormOpen}
          department={editingDept}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDept(null);
          }}
          onSaved={() => {
            loadDepartments();
            loadMetrics();
          }}
        />
      )}

      {/* --- MIGRATION / DECOMMISSION MODAL --- */}
      {isMigrationOpen && (
        <DepartmentMigrationModal
          isOpen={isMigrationOpen}
          department={decommissioningDept}
          onClose={() => {
            setIsMigrationOpen(false);
            setDecommissioningDept(null);
          }}
          onMigrated={() => {
            loadDepartments();
            loadMetrics();
          }}
        />
      )}
    </div>
  );
}
