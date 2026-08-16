import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { useFeatureControl } from "../../../context/FeatureControlContext";
import { fetchWithAuth } from "../../../utils/authService";
import {
  StudentIcon,
  ClassIcon,
  GroupIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  WhatsAppIcon,
  CloseIcon,
  SectionControlIcon
} from "../../../components/ui/Icons";
import StudentAdmissionModal from "../admission/StudentAdmissionModal";

export default function StudentDirectoryView({ viewMode = "all" }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSectionEnabled } = useFeatureControl();

  const urlGroup = searchParams.get("student_group") || searchParams.get("group") || "ALL";
  const urlClass = searchParams.get("student_class") || searchParams.get("class") || "ALL";

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_students: 0,
    active_students: 0,
    new_admissions_this_month: 0,
    avg_juz_completed: 0.0
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState(urlGroup);
  const [classFilter, setClassFilter] = useState(urlClass);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [displayMode, setDisplayMode] = useState("table"); // "table" vs "grid"
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modal toggle
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState("");
  const [bulkGroupInput, setBulkGroupInput] = useState("");
  const [bulkStatusInput, setBulkStatusInput] = useState("Active");
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    loadStudents();
    loadClassesAndGroups();
    loadMetrics();
  }, []);

  // Sync state when URL searchParams change
  useEffect(() => {
    const g = searchParams.get("student_group") || searchParams.get("group") || "ALL";
    const c = searchParams.get("student_class") || searchParams.get("class") || "ALL";
    setGroupFilter(g);
    setClassFilter(c);
  }, [searchParams]);

  const loadClassesAndGroups = async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        fetchWithAuth("/api/v1/classes/"),
        fetchWithAuth("/api/v1/groups/")
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setGroups(Array.isArray(gData) ? gData : gData.results || []);
      }
    } catch {}
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/students/");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.results || data);
      }
    } catch (err) {
      showToast("Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/students/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  };

  const handleGroupFilterChange = (val) => {
    setGroupFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "ALL") {
      newParams.delete("student_group");
      newParams.delete("group");
    } else {
      newParams.set("student_group", val);
    }
    setSearchParams(newParams);
  };

  const handleClassFilterChange = (val) => {
    setClassFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "ALL") {
      newParams.delete("student_class");
      newParams.delete("class");
    } else {
      newParams.set("student_class", val);
    }
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    setGroupFilter("ALL");
    setClassFilter("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setSearchParams({});
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkActionSubmit = async () => {
    if (!bulkActionType) return;
    if (selectedIds.length === 0) {
      showToast("No students selected.", "warning");
      return;
    }

    try {
      let payload = {
        action: bulkActionType,
        student_ids: selectedIds
      };

      if (bulkActionType === "assign_group") {
        if (!bulkGroupInput) {
          showToast("Please specify a group.", "warning");
          return;
        }
        payload.group_name = bulkGroupInput;
      } else if (bulkActionType === "change_status") {
        payload.status = bulkStatusInput;
      }

      const res = await fetchWithAuth("/api/v1/students/bulk-action/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast("Bulk operation successful!", "success");
        setShowBulkModal(false);
        setSelectedIds([]);
        loadStudents();
        loadMetrics();
      } else {
        const err = await res.json();
        showToast(err.error || "Bulk action failed.", "error");
      }
    } catch {
      showToast("Error processing bulk action.", "error");
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student record? This action cannot be undone.")) return;

    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Student record deleted.", "success");
        loadStudents();
        loadMetrics();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete record.", "error");
      }
    } catch {
      showToast("Failed to delete record.", "error");
    }
  };

  // Find active group or class object
  const activeGroupObj = groups.find(
    (g) => String(g.id) === String(groupFilter) || g.name?.toLowerCase() === String(groupFilter).toLowerCase()
  );
  const activeClassObj = classes.find(
    (c) => String(c.id) === String(classFilter) || c.name?.toLowerCase() === String(classFilter).toLowerCase()
  );

  // Extract unique groups fallback from loaded students
  const uniqueGroupNames = Array.from(
    new Set([
      ...groups.map((g) => g.name),
      ...students.map((s) => s.group_name || s.group).filter(Boolean)
    ])
  ).sort();

  // Filter students dynamically based on search, class, group and status selectors
  const filteredStudents = students.filter((s) => {
    const name = (s.name_en || s.name || "").toLowerCase();
    const bName = (s.bangla_name || "").toLowerCase();
    const roll = String(s.roll_number || s.roll || "");
    const gPhone = (s.details?.guardian_phone || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !query || name.includes(query) || bName.includes(query) || roll.includes(query) || gPhone.includes(query);
    
    // Group filter matching ID or Name
    let matchesGroup = true;
    if (groupFilter !== "ALL") {
      const targetGroupStr = String(groupFilter).toLowerCase();
      const sGroupId = s.student_group ? String(s.student_group).toLowerCase() : "";
      const sGroupName = (s.student_group_name || s.group_name || s.group || "").toLowerCase();
      matchesGroup =
        sGroupId === targetGroupStr ||
        sGroupName === targetGroupStr ||
        (activeGroupObj && sGroupName === activeGroupObj.name.toLowerCase());
    }

    // Class filter matching ID or Name
    let matchesClass = true;
    if (classFilter !== "ALL") {
      const targetClassStr = String(classFilter).toLowerCase();
      const sClassId = s.student_class ? String(s.student_class).toLowerCase() : "";
      const sClassName = (s.student_class_name || "").toLowerCase();
      matchesClass =
        sClassId === targetClassStr ||
        sClassName === targetClassStr ||
        (activeClassObj && sClassName === activeClassObj.name.toLowerCase());
    }
    
    const studentStatus = s.status || "Active";
    const matchesStatus = 
      statusFilter === "ALL" || 
      (statusFilter === "ACTIVE" && studentStatus.toUpperCase() === "ACTIVE") ||
      (statusFilter === "INACTIVE" && studentStatus.toUpperCase() === "INACTIVE") ||
      (statusFilter === "ALUMNI" && (studentStatus.toUpperCase() === "ALUMNI" || studentStatus.toUpperCase() === "TC"));

    return matchesSearch && matchesGroup && matchesClass && matchesStatus;
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 font-sans theme-text-primary animate-fade-in select-none">
      
      {/* --- METRICS HEADER CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="theme-bg-surface border theme-border p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">Total Students</span>
          <p className="text-xl font-extrabold mt-1">{metrics.total_students}</p>
        </div>
        <div className="theme-bg-surface border theme-border p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">Active Students</span>
          <p className="text-xl font-extrabold mt-1 text-emerald-400">{metrics.active_students}</p>
        </div>
        <div className="theme-bg-surface border theme-border p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">New Admissions</span>
          <p className="text-xl font-extrabold mt-1 text-sky-400">{metrics.new_admissions_this_month}</p>
        </div>
        {isSectionEnabled("quran_hifz_tracker") && (
          <div className="theme-bg-surface border theme-border p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">Avg Juz Completed</span>
            <p className="text-xl font-extrabold mt-1 text-purple-400">{metrics.avg_juz_completed} Juz</p>
          </div>
        )}
      </div>

      {/* --- TOOLBAR HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Student Information Hub</h1>
          <p className="text-xs theme-text-secondary mt-1">Manage admissions, lifecycle stages, and bulk properties.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                setBulkActionType("change_status");
                setShowBulkModal(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <SectionControlIcon className="w-3.5 h-3.5" />
              <span>Bulk Actions ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={() => setIsAdmissionModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* --- ACTIVE FILTER PILL BANNER --- */}
      {(groupFilter !== "ALL" || classFilter !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs animate-fade-in">
          <span className="font-bold text-sky-400">Active Filters:</span>
          {groupFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shadow-sm">
              <GroupIcon className="w-3.5 h-3.5 text-sky-300" />
              <span>Group: {activeGroupObj?.name || groupFilter}</span>
              <button
                onClick={() => handleGroupFilterChange("ALL")}
                className="hover:text-white ml-1 cursor-pointer"
                title="Remove Group Filter"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {classFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm">
              <ClassIcon className="w-3.5 h-3.5 text-emerald-300" />
              <span>Class: {activeClassObj?.name || classFilter}</span>
              <button
                onClick={() => handleClassFilterChange("ALL")}
                className="hover:text-white ml-1 cursor-pointer"
                title="Remove Class Filter"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {statusFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 shadow-sm">
              <span>Status: {statusFilter}</span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className="hover:text-white ml-1 cursor-pointer"
                title="Remove Status Filter"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          <button
            onClick={handleClearAllFilters}
            className="text-zinc-400 hover:text-white underline ml-auto text-[11px] font-semibold cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* --- ADVANCED FILTER TOOLBAR --- */}
      <div className="theme-bg-surface border theme-border p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center mb-6 shadow-sm">
        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
          {/* Search bar */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Search student, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none focus:border-sky-500"
            />
            <span className="absolute left-2.5 top-2.5 text-zinc-400">
              <SearchIcon className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => handleClassFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => handleGroupFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none cursor-pointer font-semibold"
          >
            <option value="ALL">All Groups / Halqas</option>
            {groups.length > 0
              ? groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.student_class_name ? `(${g.student_class_name})` : ""}
                  </option>
                ))
              : uniqueGroupNames.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border theme-border theme-bg-elevated text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
            <option value="ALUMNI">Alumni / TC</option>
          </select>
        </div>

        {/* View Mode switcher */}
        <div className="flex border theme-border rounded-xl overflow-hidden p-0.5 w-full sm:w-auto justify-center">
          <button
            onClick={() => setDisplayMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              displayMode === "table" ? "theme-bg-elevated text-sky-400 shadow-sm" : "theme-text-secondary hover:text-white"
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setDisplayMode("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              displayMode === "grid" ? "theme-bg-elevated text-sky-400 shadow-sm" : "theme-text-secondary hover:text-white"
            }`}
          >
            Grid Cards
          </button>
        </div>
      </div>

      {/* --- ROSTER DIRECTORY --- */}
      {loading ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center animate-pulse">
          <div className="h-6 w-32 bg-zinc-800 rounded mx-auto mb-4" />
          <div className="h-4 w-48 bg-zinc-800 rounded mx-auto" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <StudentIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold">No students match the criteria</h3>
          <p className="text-xs theme-text-secondary mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : displayMode === "table" ? (
        /* --- HIGH DENSITY TABLE VIEW --- */
        <div className="overflow-hidden border theme-border rounded-2xl theme-bg-surface shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border text-xs font-semibold theme-text-secondary uppercase tracking-wider bg-black/10">
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">Name (En/Bn)</th>
                <th className="px-6 py-4">ID / Roll</th>
                <th className="px-6 py-4">Group</th>
                <th className="px-6 py-4">Guardian (WhatsApp)</th>
                {isSectionEnabled("quran_hifz_tracker") && <th className="px-6 py-4">Hifz Progress</th>}
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border text-xs font-medium">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/students/${s.id}/profile`)}>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => handleSelectRow(s.id)}
                    />
                  </td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg theme-bg-elevated font-bold text-sky-400 flex items-center justify-center border theme-border">
                      {s.name_en ? s.name_en.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <div className="font-bold theme-text-primary text-sm">{s.name_en || s.name}</div>
                      {s.details?.name_bn && <div className="text-[10px] theme-text-secondary mt-0.5">{s.details.name_bn}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">{s.uniq_id || `STU-${s.id}`}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-block">
                        {s.student_group_name || s.group_name || s.group || "General Group"}
                      </span>
                      {s.student_class_name && (
                        <span className="text-[10px] theme-text-secondary flex items-center gap-1 font-semibold">
                          <ClassIcon className="w-3 h-3 text-sky-400" />
                          <span>{s.student_class_name}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {s.details?.guardian_phone ? (
                      <div className="flex items-center gap-1.5">
                        <span>{s.details.guardian_phone}</span>
                        <a
                          href={`https://wa.me/${s.details.guardian_phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:scale-110 transition-transform text-emerald-400 inline-flex items-center"
                          title="WhatsApp direct chat"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-zinc-500">--</span>
                    )}
                  </td>
                  {isSectionEnabled("quran_hifz_tracker") && (
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      {s.details?.initial_completed_juz || 0} Juz
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.status?.toUpperCase() === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {s.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/students/${s.id}/profile`)}
                        className="px-2 py-1 rounded border theme-border hover:theme-bg-elevated transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <SearchIcon className="w-3 h-3" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSingle(s.id)}
                        className="px-2 py-1 rounded border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <TrashIcon className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* --- GRID CARDS VIEW MODE --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/students/${s.id}/profile`)}
              className="theme-bg-surface border theme-border rounded-3xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl theme-bg-elevated font-bold text-lg text-sky-400 flex items-center justify-center border theme-border shrink-0">
                  {s.name_en ? s.name_en.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h3 className="font-bold text-sm truncate">{s.name_en || s.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono theme-text-secondary">{s.uniq_id || `STU-${s.id}`}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Roll #{s.roll_number || s.roll || "--"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-zinc-300 font-semibold px-2 py-0.5 rounded bg-zinc-800 border theme-border inline-flex items-center gap-1">
                      <GroupIcon className="w-3 h-3 text-sky-400" />
                      <span>{s.student_group_name || s.group_name || s.group || "General Group"}</span>
                    </span>
                    {s.student_class_name && (
                      <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 inline-flex items-center gap-1">
                        <ClassIcon className="w-3 h-3" />
                        <span>{s.student_class_name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isSectionEnabled("quran_hifz_tracker") && (
                <div className="space-y-1 mb-4 pt-3 border-t theme-border">
                  <div className="flex justify-between items-center text-[10px] font-bold theme-text-secondary">
                    <span>Hifz Progress</span>
                    <span className="text-emerald-400">Juz {s.details?.initial_completed_juz || 0} / 30</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${((s.details?.initial_completed_juz || 0) / 30) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t theme-border">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  s.status?.toUpperCase() === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}>
                  {s.status || 'Active'}
                </span>
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/students/${s.id}/profile`)}
                    className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <SearchIcon className="w-3 h-3" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSingle(s.id)}
                    className="p-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition-colors text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <TrashIcon className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADMISSION WIZARD MODAL --- */}
      {isAdmissionModalOpen && (
        <StudentAdmissionModal
          isOpen={isAdmissionModalOpen}
          onClose={() => {
            setIsAdmissionModalOpen(false);
            loadStudents();
            loadMetrics();
          }}
        />
      )}

      {/* --- BULK ACTIONS MODAL --- */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b theme-border flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-base">Bulk Operations ({selectedIds.length} Selected)</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-zinc-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Select Action</label>
                <select
                  value={bulkActionType}
                  onChange={(e) => setBulkActionType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-xs"
                >
                  <option value="change_status">Change Status</option>
                  <option value="assign_group">Assign Group/Halqa</option>
                  <option value="bulk_delete">Bulk Delete Students</option>
                </select>
              </div>

              {bulkActionType === "assign_group" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Group / Halqa Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Nazera Group"
                    value={bulkGroupInput}
                    onChange={(e) => setBulkGroupInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>
              )}

              {bulkActionType === "change_status" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Target Status</label>
                  <select
                    value={bulkStatusInput}
                    onChange={(e) => setBulkStatusInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Tc">Transfer Certificate (TC)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t theme-border flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkActionSubmit}
                  className="px-4 py-2 rounded-xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 shadow-md cursor-pointer"
                >
                  Execute Bulk Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
