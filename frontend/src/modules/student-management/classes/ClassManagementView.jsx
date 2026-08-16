import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  ClassIcon,
  DepartmentIcon,
  GroupIcon,
  StudentIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  BookOpenIcon,
  DashboardIcon
} from "../../../components/ui/Icons";
import ClassFormModal from "./ClassFormModal";
import ClassMigrationModal from "./ClassMigrationModal";

export default function ClassManagementView() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryDept = searchParams.get("department") || "ALL";

  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_classes: 0,
    total_enrolled_students: 0,
    avg_students_per_class: 0.0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(queryDept);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState(null);

  useEffect(() => {
    loadDepartments();
    loadMetrics();
  }, []);

  useEffect(() => {
    const qd = searchParams.get("department") || "ALL";
    setDepartmentFilter(qd);
  }, [searchParams]);

  useEffect(() => {
    loadClasses();
  }, [departmentFilter]);

  const loadDepartments = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/classes/";
      const params = new URLSearchParams();
      if (departmentFilter !== "ALL") {
        params.append("department", departmentFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.results || []);
      }
    } catch {
      showToast("Failed to load classes.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/classes/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // Fallback calculation from classes state
    }
  };

  const handleOpenCreate = () => {
    setEditingClass(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    setIsFormModalOpen(true);
  };

  const handleDeletePrompt = (cls) => {
    const studentCount = cls.student_count || 0;
    const groupCount = cls.group_count || 0;

    // If there are active students or groups, always open the migration modal
    if (studentCount > 0 || groupCount > 0) {
      setDeletingClass(cls);
      setIsMigrationModalOpen(true);
    } else {
      if (window.confirm(`Are you sure you want to delete class "${cls.name}"?`)) {
        performDirectDelete(cls.id);
      }
    }
  };

  const performDirectDelete = async (classId) => {
    try {
      const res = await fetchWithAuth(`/api/v1/classes/${classId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Class deleted successfully.", "success");
        loadClasses();
        loadMetrics();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete class.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    }
  };

  // Filtered in-memory search
  const filteredClasses = classes.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.class_teacher_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 font-sans theme-text-primary animate-fade-in select-none space-y-8">
      
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <ClassIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight theme-text-primary">
                Class &amp; Grade Management
              </h1>
              <p className="text-xs theme-text-secondary mt-0.5">
                Configure academic grades, head teacher assignments, and safe student promotion pipelines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/student-management/groups")}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-all flex items-center gap-2 cursor-pointer"
          >
            <GroupIcon className="w-4 h-4 text-sky-400" />
            <span>Manage Groups</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all shadow-lg hover:shadow-sky-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add New Class</span>
          </button>
        </div>
      </div>

      {/* --- METRIC CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Total Classes
            </span>
            <p className="text-3xl font-black text-sky-400">
              {metrics.total_classes}
            </p>
            <span className="text-[10px] theme-text-secondary">Configured Grade Levels</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
            <ClassIcon className="w-7 h-7" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Total Enrolled Students
            </span>
            <p className="text-3xl font-black text-emerald-400">
              {metrics.total_enrolled_students}
            </p>
            <span className="text-[10px] text-emerald-400 font-medium">Assigned to Classes</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
            <StudentIcon className="w-7 h-7" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Avg Students / Class
            </span>
            <p className="text-3xl font-black text-amber-400">
              {metrics.avg_students_per_class}
            </p>
            <span className="text-[10px] theme-text-secondary">Capacity Balance Ratio</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
            <DashboardIcon className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* --- SEARCH & FILTERS BAR --- */}
      <div className="theme-bg-surface border theme-border p-4 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-zinc-400 pointer-events-none">
            <SearchIcon className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search class name, code, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
          />
        </div>

        {/* Department Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setDepartmentFilter("ALL");
              const newP = new URLSearchParams(searchParams);
              newP.delete("department");
              setSearchParams(newP);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              departmentFilter === "ALL"
                ? "theme-bg-accent theme-accent-text shadow-sm"
                : "theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary"
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => {
                setDepartmentFilter(dept.id);
                const newP = new URLSearchParams(searchParams);
                newP.set("department", dept.id);
                setSearchParams(newP);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                departmentFilter === dept.id
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary"
              }`}
            >
              {dept.has_quran_tracker ? (
                <BookOpenIcon className="w-3.5 h-3.5" />
              ) : (
                <DepartmentIcon className="w-3.5 h-3.5" />
              )}
              <span>{dept.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- CLASSES DATA TABLE --- */}
      <div className="theme-bg-surface border theme-border rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs theme-text-secondary animate-pulse">Loading Classes &amp; Rosters...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <ClassIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">No Classes Found</h3>
              <p className="text-xs theme-text-secondary mt-1">
                {searchQuery
                  ? "No classes match your search query."
                  : "Get started by adding your first academic class or grade level."}
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Create First Class</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Class Name &amp; Code</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Class Teacher</th>
                  <th className="py-4 px-6 text-center">Enrolled Students</th>
                  <th className="py-4 px-6 text-center">Assigned Groups</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filteredClasses.map((cls) => {
                  let deptBadge = "bg-sky-500/10 text-sky-400 border-sky-500/20";
                  if (cls.department_type === "GENERAL") {
                    deptBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                  } else if (cls.department_type === "OTHER") {
                    deptBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  }

                  return (
                    <tr
                      key={cls.id}
                      className="hover:theme-bg-sub transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-6 font-mono font-bold text-zinc-400">
                        #{cls.order_rank ?? 1}
                      </td>

                      {/* Name & Code */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="font-bold text-sm theme-text-primary block">
                            {cls.name}
                          </span>
                          {cls.code && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border theme-border inline-block">
                              {cls.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wider inline-block ${deptBadge}`}>
                            {cls.department_name || cls.department_type || "HIFZ"}
                          </span>
                          {cls.has_quran_tracker && (
                            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                              <BookOpenIcon className="w-3 h-3 text-emerald-400" />
                              <span>30 Juz Tracker</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Class Teacher */}
                      <td className="py-4 px-6">
                        {cls.class_teacher_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-xs">
                              {cls.class_teacher_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold block">{cls.class_teacher_name}</span>
                              {cls.class_teacher_phone && (
                                <span className="text-[10px] theme-text-secondary block font-mono">
                                  {cls.class_teacher_phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Students Count */}
                      <td className="py-4 px-6 text-center">
                        <span
                          onClick={() => navigate(`/students?student_class=${cls.id}`)}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          title="View Enrolled Students"
                        >
                          <StudentIcon className="w-3.5 h-3.5" />
                          <span>{cls.student_count || 0}</span>
                        </span>
                      </td>

                      {/* Groups Count */}
                      <td className="py-4 px-6 text-center">
                        <span
                          onClick={() => navigate(`/student-management/groups?student_class=${cls.id}`)}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          title="View Groups in Class"
                        >
                          <GroupIcon className="w-3.5 h-3.5" />
                          <span>{cls.group_count || 0}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          cls.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}>
                          {cls.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/student-management/groups?student_class=${cls.id}`)}
                            className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-xs theme-text-secondary hover:text-sky-400 cursor-pointer"
                            title="Manage Groups in this Class"
                          >
                            <GroupIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cls)}
                            className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-xs theme-text-secondary hover:text-amber-400 cursor-pointer"
                            title="Edit Class"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(cls)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs cursor-pointer"
                            title="Delete or Migrate Class"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {isFormModalOpen && (
        <ClassFormModal
          isOpen={isFormModalOpen}
          editingClass={editingClass}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingClass(null);
          }}
          onSuccess={() => {
            loadClasses();
            loadMetrics();
          }}
        />
      )}

      {isMigrationModalOpen && (
        <ClassMigrationModal
          isOpen={isMigrationModalOpen}
          deletingClass={deletingClass}
          onClose={() => {
            setIsMigrationModalOpen(false);
            setDeletingClass(null);
          }}
          onSuccess={() => {
            loadClasses();
            loadMetrics();
          }}
        />
      )}
    </div>
  );
}
