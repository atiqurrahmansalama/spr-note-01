import React, { useState, useEffect } from "react";
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
  DashboardIcon
} from "../../../components/ui/Icons";
import GroupFormModal from "./GroupFormModal";
import GroupMigrationModal from "./GroupMigrationModal";

export default function GroupManagementView() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassFilter = searchParams.get("student_class") || "ALL";

  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_groups: 0,
    total_assigned_students: 0,
    total_capacity: 0,
    available_seats: 0,
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [capacityFilter, setCapacityFilter] = useState("ALL");
  const [viewLayout, setViewLayout] = useState("grid"); // "grid" vs "table"

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(null);

  useEffect(() => {
    loadClasses();
    loadMetrics();
  }, []);

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
    } catch {
      // Fallback
    }
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
      showToast("Failed to load groups.", "error");
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
    } catch {
      // Fallback calculation
    }
  };

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (grp) => {
    setEditingGroup(grp);
    setIsFormModalOpen(true);
  };

  const handleDeletePrompt = (grp) => {
    const studentCount = grp.student_count || 0;
    if (studentCount > 0) {
      setDeletingGroup(grp);
      setIsMigrationModalOpen(true);
    } else {
      if (window.confirm(`Are you sure you want to delete group "${grp.name}"?`)) {
        performDirectDelete(grp.id);
      }
    }
  };

  const performDirectDelete = async (groupId) => {
    try {
      const res = await fetchWithAuth(`/api/v1/groups/${groupId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Group deleted successfully.", "success");
        loadGroups();
        loadMetrics();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete group.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    }
  };

  // Filtered in-memory search
  const filteredGroups = groups.filter((grp) => {
    const nameMatch = !searchQuery.trim() || 
      grp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grp.mentor_teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grp.student_class_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;

    // Capacity status filter
    const count = grp.student_count || 0;
    const cap = grp.capacity || 0;
    if (capacityFilter === "AVAILABLE") {
      if (cap > 0 && count >= cap) return false;
    } else if (capacityFilter === "NEAR_FULL") {
      if (cap <= 0 || (count / cap) < 0.8 || count >= cap) return false;
    } else if (capacityFilter === "FULL") {
      if (cap <= 0 || count < cap) return false;
    }

    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 font-sans theme-text-primary animate-fade-in select-none space-y-8">
      
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <GroupIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight theme-text-primary">
                Group &amp; Halqa Management
              </h1>
              <p className="text-xs theme-text-secondary mt-0.5">
                Configure sub-sections, halqa mentor ustadhs, seat capacities, and student allocations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/student-management/classes")}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-all flex items-center gap-2 cursor-pointer"
          >
            <ClassIcon className="w-4 h-4 text-sky-400" />
            <span>View Classes</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all shadow-lg hover:shadow-sky-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add New Group</span>
          </button>
        </div>
      </div>

      {/* --- METRIC CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Total Groups
            </span>
            <p className="text-2xl font-black text-sky-400">
              {metrics.total_groups}
            </p>
            <span className="text-[10px] theme-text-secondary">Halqa Sub-sections</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <GroupIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Assigned Students
            </span>
            <p className="text-2xl font-black text-emerald-400">
              {metrics.total_assigned_students}
            </p>
            <span className="text-[10px] text-emerald-400 font-medium">Currently in Halqas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <StudentIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Total Capacity
            </span>
            <p className="text-2xl font-black text-purple-400">
              {metrics.total_capacity} Seats
            </p>
            <span className="text-[10px] theme-text-secondary">Institutional Target</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <DashboardIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="theme-bg-surface border theme-border p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Available Seats
            </span>
            <p className="text-2xl font-black text-amber-400">
              {metrics.available_seats} Seats
            </p>
            <span className="text-[10px] text-amber-400 font-medium">Vacant Allocations</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <DashboardIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- FILTERS & CONTROLS --- */}
      <div className="theme-bg-surface border theme-border p-4 rounded-3xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-zinc-400 pointer-events-none">
            <SearchIcon className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search group name, class, mentor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
          />
        </div>

        {/* Parent Class Filter & Capacity Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Parent Class Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold theme-text-secondary whitespace-nowrap">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSearchParams(e.target.value !== "ALL" ? { student_class: e.target.value } : {});
              }}
              className="px-3 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-semibold"
            >
              <option value="ALL">All Parent Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Capacity Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold theme-text-secondary whitespace-nowrap">Capacity:</span>
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-semibold"
            >
              <option value="ALL">All Capacities</option>
              <option value="AVAILABLE">Available Seats Only</option>
              <option value="NEAR_FULL">Near Full (80%+)</option>
              <option value="FULL">Full / At Max Capacity</option>
            </select>
          </div>

          {/* View Layout Toggle */}
          <div className="flex items-center border theme-border rounded-xl p-0.5 theme-bg-sub">
            <button
              onClick={() => setViewLayout("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === "grid"
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
              title="Grid View"
            >
              Grid
            </button>
            <button
              onClick={() => setViewLayout("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === "table"
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
              title="Table View"
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTENT CONTAINER --- */}
      {loading ? (
        <div className="p-16 text-center space-y-4 theme-bg-surface border theme-border rounded-3xl">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs theme-text-secondary animate-pulse">Loading Groups &amp; Halqas...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-16 text-center space-y-4 theme-bg-surface border theme-border rounded-3xl shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <GroupIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base theme-text-primary">No Groups Found</h3>
            <p className="text-xs theme-text-secondary mt-1">
              {searchQuery || classFilter !== "ALL" || capacityFilter !== "ALL"
                ? "No groups match your active filter criteria."
                : "Get started by adding your first group or halqa."}
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Create First Group</span>
          </button>
        </div>
      ) : viewLayout === "grid" ? (
        /* --- GRID VIEW --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((grp) => {
            const studentCount = grp.student_count || 0;
            const capacity = grp.capacity || 0;
            const percentage = capacity > 0 ? Math.min(100, Math.round((studentCount / capacity) * 100)) : 0;
            
            // Progress bar color
            let barColor = "bg-emerald-500";
            let textColor = "text-emerald-400";
            if (percentage >= 100) {
              barColor = "bg-rose-500";
              textColor = "text-rose-400";
            } else if (percentage >= 80) {
              barColor = "bg-amber-500";
              textColor = "text-amber-400";
            }

            return (
              <div
                key={grp.id}
                className="theme-bg-surface border theme-border rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all space-y-5 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base theme-text-primary group-hover:theme-accent transition-colors">
                        {grp.name}
                      </h3>
                      {grp.student_class_name ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <ClassIcon className="w-3 h-3" />
                          <span>{grp.student_class_name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">No Parent Class</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(grp)}
                        className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated text-xs theme-text-secondary hover:text-amber-400 transition-colors cursor-pointer"
                        title="Edit Group"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(grp)}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs cursor-pointer"
                        title="Delete Group (Safe Migration)"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mentor Teacher */}
                  <div className="p-3 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs">
                      {grp.mentor_teacher_name ? grp.mentor_teacher_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <span className="text-[10px] theme-text-secondary block font-bold uppercase tracking-wider">
                        Halqa Mentor
                      </span>
                      <span className="font-semibold text-sm">
                        {grp.mentor_teacher_name || "Unassigned Mentor"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-2 pt-2 border-t theme-border">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="theme-text-secondary">Capacity Occupancy</span>
                    <span className={textColor}>
                      {studentCount} / {capacity > 0 ? capacity : "∞"} ({capacity > 0 ? `${percentage}%` : "Unlimited"})
                    </span>
                  </div>

                  {capacity > 0 && (
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-zinc-400">
                      {capacity > 0 ? `${Math.max(0, capacity - studentCount)} seats free` : "Open Enrolment"}
                    </span>
                    <button
                      onClick={() => navigate(`/students?student_group=${grp.id}`)}
                      className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <StudentIcon className="w-3.5 h-3.5" />
                      <span>View {studentCount} Students &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- TABLE VIEW --- */
        <div className="theme-bg-surface border theme-border rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="py-4 px-6">Group / Halqa Name</th>
                  <th className="py-4 px-6">Parent Class</th>
                  <th className="py-4 px-6">Mentor Teacher</th>
                  <th className="py-4 px-6">Capacity Progress</th>
                  <th className="py-4 px-6 text-center">Enrolled</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filteredGroups.map((grp) => {
                  const studentCount = grp.student_count || 0;
                  const capacity = grp.capacity || 0;
                  const percentage = capacity > 0 ? Math.min(100, Math.round((studentCount / capacity) * 100)) : 0;
                  
                  return (
                    <tr key={grp.id} className="hover:theme-bg-sub transition-colors">
                      <td className="py-4 px-6 font-bold text-sm theme-text-primary">
                        {grp.name}
                      </td>
                      <td className="py-4 px-6">
                        {grp.student_class_name ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1">
                            <ClassIcon className="w-3 h-3" />
                            <span>{grp.student_class_name}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {grp.mentor_teacher_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                              {grp.mentor_teacher_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold">{grp.mentor_teacher_name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>{studentCount} / {capacity > 0 ? capacity : "∞"}</span>
                            <span>{capacity > 0 ? `${percentage}%` : "Unlimited"}</span>
                          </div>
                          {capacity > 0 && (
                            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percentage >= 100 ? "bg-rose-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          onClick={() => navigate(`/students?student_group=${grp.id}`)}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <StudentIcon className="w-3.5 h-3.5" />
                          <span>{studentCount}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          grp.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}>
                          {grp.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(grp)}
                            className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-xs theme-text-secondary hover:text-amber-400 cursor-pointer"
                            title="Edit Group"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(grp)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs cursor-pointer"
                            title="Delete Group (Safe Migration)"
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
        </div>
      )}

      {/* --- MODALS --- */}
      <GroupFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingGroup={editingGroup}
        classes={classes}
        defaultClassId={classFilter !== "ALL" ? classFilter : ""}
        onSuccess={() => {
          loadGroups();
          loadMetrics();
        }}
      />

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
    </div>
  );
}
