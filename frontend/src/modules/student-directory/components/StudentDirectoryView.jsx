import { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { 
  students as studentStore, 
  isOnline, 
  mergeStudents 
} from "../../../utils/localStore";
import { syncLocalStudentsToBackend } from "../../../utils/syncEngine";
import StudentSavePanel from "./StudentSavePanel";
import AutocompleteDropdown from "../../../components/ui/AutocompleteDropdown";
import { GroupsIcon, UsersIcon, TrashIcon, EditIcon, CloudIcon } from "../../../components/ui/Icons";

export default function StudentDirectoryView() {
  const { showToast } = useToast();

  const [studentList, setStudentList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [offline, setOffline] = useState(!isOnline());

  // Inline editing state for Student
  const [editingStudentLabel, setEditingStudentLabel] = useState(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentGroup, setEditStudentGroup] = useState("");

  // Inline editing state for Group
  const [editingGroupName, setEditingGroupName] = useState(null);
  const [newGroupNameInput, setNewGroupNameInput] = useState("");

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadStudents();
      loadReports();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load students from LocalStorage & API
  const loadStudents = async () => {
    const cached = studentStore.getAll();
    if (cached.length > 0) {
      setStudentList(cached);
    }

    if (!isOnline()) return;

    try {
      await syncLocalStudentsToBackend();

      const res = await fetchWithAuth("/students/");
      if (res.ok) {
        const raw = await res.json();
        const apiStudents = (Array.isArray(raw) ? raw : []).map((s) => ({
          id: typeof s === "object" ? s.id : null,
          label: typeof s === "object" ? (s.name || s.student_name || s.label || String(s)) : String(s),
          sub: typeof s === "object" ? (s.group_name || s.group || s.sub || "General Group") : "General Group",
        }));

        const localStudents = studentStore.getAll();
        const merged = mergeStudents(apiStudents, localStudents);
        setStudentList(merged);
      }
    } catch (err) {
      console.warn("[StudentDirectory] API fetch failed, using cache:", err.message);
    }
  };

  // Load daily reports from LocalStorage & API
  const loadReports = async () => {
    try {
      const localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
      if (localReps.length > 0) {
        setReportsList(localReps);
      }
    } catch {
      setReportsList([]);
    }

    if (!isOnline()) return;

    try {
      const res = await fetchWithAuth("/reports/");
      if (res.ok) {
        const raw = await res.json();
        setReportsList(Array.isArray(raw) ? raw : []);
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(Array.isArray(raw) ? raw : []));
      }
    } catch (err) {
      console.warn("[StudentDirectory] Reports API fetch failed:", err.message);
    }
  };

  useEffect(() => {
    loadStudents();
    loadReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique list of groups (sorted alphabetically)
  const groupsList = Array.from(
    new Set(studentList.map((s) => s.sub || "General Group"))
  ).filter(Boolean).sort((a, b) => a.localeCompare(b));

  // Group dropdown options for AutocompleteDropdown in Student Edit Panel
  const groupDropdownOptions = (groupsList.length > 0 ? groupsList : ["General Group"]).map((g) => ({
    label: g,
    value: g,
  }));

  // Filter and sort logic
  const filteredStudents = studentList.filter((student) => {
    const nameMatch = (student.label || "").toLowerCase().includes(searchQuery.toLowerCase());
    const groupMatch = (student.sub || "").toLowerCase().includes(searchQuery.toLowerCase());
    const passesSearch = nameMatch || groupMatch;

    const passesGroup =
      selectedGroupFilter === "ALL" ||
      (student.sub || "General Group").toLowerCase() === selectedGroupFilter.toLowerCase();

    return passesSearch && passesGroup;
  }).sort((a, b) => (a.label || "").localeCompare(b.label || ""));

  // Save student callback (from StudentSavePanel)
  const handleSaveStudent = async (result) => {
    const newStudent = {
      label: result.name,
      sub: result.group || "General Group",
      _local: true,
    };

    let updated;
    if (result.mode === "REPLACE" && result.oldStudent) {
      updated = studentStore.replace(result.oldStudent, newStudent);
    } else {
      updated = studentStore.add(newStudent);
    }
    setStudentList(updated);

    if (isOnline()) {
      try {
        const res = await fetchWithAuth("/students/", {
          method: "POST",
          body: JSON.stringify({
            name: result.name,
            group: result.group || "General Group",
          }),
        });

        if (res.ok) {
          showToast(`Student "${result.name}" saved to database!`, "success");
          await loadStudents();
        } else {
          showToast(`"${result.name}" saved locally.`, "info");
        }
      } catch {
        showToast(`"${result.name}" saved locally (offline).`, "info");
      }
    } else {
      showToast(`"${result.name}" saved locally (offline).`, "info");
    }
  };

  // Delete single student
  const handleDeleteStudent = async (student) => {
    const label = typeof student === "object" ? student.label : student;
    const studentId = typeof student === "object" ? student.id : null;

    if (!window.confirm(`Are you sure you want to delete student "${label}"?`)) {
      return;
    }

    const updated = studentStore.remove(label);
    setStudentList(updated);
    window.dispatchEvent(new CustomEvent("spr_student_saved"));
    window.dispatchEvent(new CustomEvent("spr_project_changed"));

    if (isOnline()) {
      try {
        const deleteEndpoint = studentId 
          ? `/students/${studentId}/` 
          : `/students/${encodeURIComponent(label)}/`;

        const res = await fetchWithAuth(deleteEndpoint, { method: "DELETE" });

        if (res.ok || res.status === 204) {
          showToast(`Student "${label}" deleted!`, "success");
        } else {
          showToast(`Student "${label}" removed locally.`, "info");
        }
      } catch {
        showToast(`Student "${label}" removed locally.`, "info");
      }
    } else {
      showToast(`Student "${label}" removed locally.`, "info");
    }
  };

  // Start editing student
  const startEditStudent = (student) => {
    setEditingStudentLabel(student.label);
    setEditStudentName(student.label);
    setEditStudentGroup(student.sub || "General Group");
  };

  // Save edited student
  const saveEditStudent = async (student) => {
    const trimmedName = editStudentName.trim();
    const trimmedGroup = editStudentGroup.trim() || "General Group";
    if (!trimmedName) {
      showToast("Student name cannot be empty", "error");
      return;
    }

    const updatedStudent = {
      ...student,
      label: trimmedName,
      sub: trimmedGroup,
      _local: true,
    };

    const updated = studentStore.replace(student.label, updatedStudent);
    setStudentList(updated);
    setEditingStudentLabel(null);
    showToast(`Updated student "${trimmedName}"!`, "success");

    if (isOnline()) {
      try {
        const studentId = student.id;
        const endpoint = studentId ? `/students/${studentId}/` : "/students/";
        const method = studentId ? "PUT" : "POST";

        const res = await fetchWithAuth(endpoint, {
          method,
          body: JSON.stringify({
            name: trimmedName,
            group: trimmedGroup,
          }),
        });

        if (res.ok) {
          showToast(`Student "${trimmedName}" synced to Database!`, "success");
          await loadStudents();
        }
      } catch (err) {
        console.warn("[StudentDirectory] Save student API failed:", err.message);
      }
    }
  };

  // Start editing group
  const startEditGroup = (grpName) => {
    setEditingGroupName(grpName);
    setNewGroupNameInput(grpName);
  };

  // Save edited group
  const saveEditGroup = async (oldGrpName) => {
    const trimmedGrp = newGroupNameInput.trim();
    if (!trimmedGrp) {
      showToast("Group name cannot be empty", "error");
      return;
    }

    const updated = studentStore.updateGroupName(oldGrpName, trimmedGrp);
    setStudentList(updated);
    if (selectedGroupFilter === oldGrpName) {
      setSelectedGroupFilter(trimmedGrp);
    }
    setEditingGroupName(null);
    showToast(`Renamed group "${oldGrpName}" to "${trimmedGrp}"!`, "success");

    if (isOnline()) {
      try {
        await fetchWithAuth("/groups/", {
          method: "POST",
          body: JSON.stringify({ name: trimmedGrp }),
        });

        const groupStudents = updated.filter((s) => (s.sub || "").toLowerCase() === trimmedGrp.toLowerCase());
        for (const s of groupStudents) {
          if (s.id) {
            await fetchWithAuth(`/students/${s.id}/`, {
              method: "PATCH",
              body: JSON.stringify({ group: trimmedGrp }),
            });
          }
        }
      } catch (err) {
        console.warn("[StudentDirectory] Edit group API warning:", err.message);
      }
    }
  };

  // Delete whole group and its students
  const handleDeleteGroup = (grpName) => {
    const studentCount = studentList.filter((s) => (s.sub || "General Group").toLowerCase() === grpName.toLowerCase()).length;
    if (!window.confirm(`Are you sure you want to delete group "${grpName}" and its ${studentCount} student(s)?`)) {
      return;
    }

    const updated = studentStore.removeGroup(grpName);
    setStudentList(updated);
    if (selectedGroupFilter === grpName) {
      setSelectedGroupFilter("ALL");
    }
    window.dispatchEvent(new CustomEvent("spr_student_saved"));
    window.dispatchEvent(new CustomEvent("spr_project_changed"));
    showToast(`Group "${grpName}" and its students deleted!`, "success");
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      
      {/* Single Unified Card Container */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-5">
        
        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <GroupsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary tracking-tight">
                Groups & Student Directory
              </h2>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                Manage student profiles, group assignments, and edit/delete directory records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono theme-accent theme-bg-accent-soft px-3 py-1 rounded-xl font-bold">
              {filteredStudents.length} Students
            </span>

            <button
              type="button"
              onClick={() => setIsAddPanelOpen(!isAddPanelOpen)}
              className="px-3.5 py-1.5 text-xs font-semibold theme-accent-text theme-bg-accent hover:opacity-90 rounded-xl transition cursor-pointer shadow-sm"
            >
              {isAddPanelOpen ? "Close Panel" : "+ Add Student"}
            </button>
          </div>
        </div>

        {/* Offline Alert Badge */}
        {offline && (
          <div className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>Offline mode active — changes will save to LocalStorage and sync later.</span>
          </div>
        )}

        {/* 2. Add Student Panel Drawer */}
        {isAddPanelOpen && (
          <StudentSavePanel
            isOpen={true}
            onClose={() => setIsAddPanelOpen(false)}
            studentOptions={studentList}
            groups={groupsList}
            onSave={handleSaveStudent}
          />
        )}

        {/* 3. Group List Roster Section (With In-Column Edit & Expanded Scroll Area) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between pb-1 border-b theme-border">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
              <GroupsIcon className="w-4 h-4 theme-accent" />
              <span>Group Roster</span>
            </h3>
            <span className="text-[11px] font-mono theme-text-secondary">
              Total {groupsList.length} Groups
            </span>
          </div>

          {/* Group Roster Cards with Dual Independent Column Layout */}
          <div className="max-h-72 overflow-y-auto overflow-x-hidden pr-1" style={{ scrollbarGutter: "stable" }}>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              
              {/* Left Column (All Groups Filter + Even Indices) */}
              <div className="flex-1 w-full flex flex-col gap-3">
                {/* All Groups Filter Card */}
                <div
                  onClick={() => setSelectedGroupFilter("ALL")}
                  className={`w-full p-3.5 rounded-xl border theme-border transition cursor-pointer flex items-center justify-between select-none ${
                    selectedGroupFilter === "ALL"
                      ? "theme-bg-sub theme-accent shadow-sm font-bold"
                      : "theme-bg-sub theme-text-primary hover:theme-bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${selectedGroupFilter === "ALL" ? "theme-bg-accent" : "theme-bg-sub opacity-50"}`} />
                    <span className="text-xs font-semibold">All Groups</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                    {studentList.length} students
                  </span>
                </div>

                {/* Even Group Cards */}
                {groupsList.filter((_, idx) => idx % 2 === 0).map((grp, idx) => {
                  const isSelected = selectedGroupFilter.toLowerCase() === grp.toLowerCase();
                  const count = studentList.filter((s) => (s.sub || "General Group").toLowerCase() === grp.toLowerCase()).length;
                  const isEditingThisGroup = editingGroupName === grp;

                  if (isEditingThisGroup) {
                    return (
                      <div key={grp + idx} className="w-full theme-bg-sub border theme-border rounded-xl p-3.5 space-y-3 shadow-sm animate-fade-in">
                        <div className="text-xs font-bold theme-text-primary pb-1 border-b theme-border">
                          Edit Group Name
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                            Group Name
                          </label>
                          <input
                            type="text"
                            value={newGroupNameInput}
                            onChange={(e) => setNewGroupNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditGroup(grp); }}
                            autoFocus
                            className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t theme-border">
                          <button
                            type="button"
                            onClick={() => setEditingGroupName(null)}
                            className="px-3 py-1 text-xs font-semibold theme-text-secondary hover:theme-text-primary rounded-lg theme-bg-surface cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditGroup(grp)}
                            className="px-3 py-1 text-xs font-semibold theme-accent-text theme-bg-accent rounded-lg cursor-pointer shadow-sm"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={grp + idx}
                      onClick={() => setSelectedGroupFilter(grp)}
                      className={`w-full p-3.5 rounded-xl border theme-border transition cursor-pointer flex items-center justify-between select-none group/grp ${
                        isSelected
                          ? "theme-bg-sub theme-accent shadow-sm font-bold"
                          : "theme-bg-sub theme-text-primary hover:theme-bg-elevated"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "theme-bg-accent" : "theme-bg-sub opacity-50"}`} />
                        <span className="text-xs font-semibold truncate">{grp}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                          {count} students
                        </span>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/grp:opacity-100 group-active/grp:opacity-100 group-focus-within/grp:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditGroup(grp);
                            }}
                            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition cursor-pointer"
                            title="Edit Group Name"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(grp);
                            }}
                            className="p-1 rounded-lg theme-text-secondary hover:text-rose-400 hover:theme-bg-surface transition cursor-pointer"
                            title="Delete Group"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column (Odd Indices) */}
              <div className="flex-1 w-full flex flex-col gap-3">
                {groupsList.filter((_, idx) => idx % 2 === 1).map((grp, idx) => {
                  const isSelected = selectedGroupFilter.toLowerCase() === grp.toLowerCase();
                  const count = studentList.filter((s) => (s.sub || "General Group").toLowerCase() === grp.toLowerCase()).length;
                  const isEditingThisGroup = editingGroupName === grp;

                  if (isEditingThisGroup) {
                    return (
                      <div key={grp + idx} className="w-full theme-bg-sub border theme-border rounded-xl p-3.5 space-y-3 shadow-sm animate-fade-in">
                        <div className="text-xs font-bold theme-text-primary pb-1 border-b theme-border">
                          Edit Group Name
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                            Group Name
                          </label>
                          <input
                            type="text"
                            value={newGroupNameInput}
                            onChange={(e) => setNewGroupNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditGroup(grp); }}
                            autoFocus
                            className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t theme-border">
                          <button
                            type="button"
                            onClick={() => setEditingGroupName(null)}
                            className="px-3 py-1 text-xs font-semibold theme-text-secondary hover:theme-text-primary rounded-lg theme-bg-surface cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditGroup(grp)}
                            className="px-3 py-1 text-xs font-semibold theme-accent-text theme-bg-accent rounded-lg cursor-pointer shadow-sm"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={grp + idx}
                      onClick={() => setSelectedGroupFilter(grp)}
                      className={`w-full p-3.5 rounded-xl border theme-border transition cursor-pointer flex items-center justify-between select-none group/grp ${
                        isSelected
                          ? "theme-bg-sub theme-accent shadow-sm font-bold"
                          : "theme-bg-sub theme-text-primary hover:theme-bg-elevated"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "theme-bg-accent" : "theme-bg-sub opacity-50"}`} />
                        <span className="text-xs font-semibold truncate">{grp}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-app theme-accent font-semibold">
                          {count} students
                        </span>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/grp:opacity-100 group-active/grp:opacity-100 group-focus-within/grp:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditGroup(grp);
                            }}
                            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition cursor-pointer"
                            title="Edit Group Name"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(grp);
                            }}
                            className="p-1 rounded-lg theme-text-secondary hover:text-rose-400 hover:theme-bg-surface transition cursor-pointer"
                            title="Delete Group"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>          {/* 4. Student Roster Section */}
          <div className="space-y-3 pt-3 border-t theme-border">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
                <UsersIcon className="w-4 h-4 theme-accent" />
                <span>Student Roster</span>
              </h3>

              {/* Search Input for Students */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1.5 text-xs theme-text-secondary hover:theme-text-primary"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 theme-text-secondary text-xs space-y-2">
                <p>No students match your current search filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedGroupFilter("ALL");
                  }}
                  className="theme-accent hover:underline font-semibold text-xs cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              /* Two independent vertical flex columns: edit card pushes only items underneath it! */
              <div className="max-h-[30rem] overflow-y-auto overflow-x-hidden pr-1" style={{ scrollbarGutter: "stable" }}>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {/* Left Column (Even Indices) */}
                  <div className="flex-1 w-full flex flex-col gap-3">
                    {filteredStudents.filter((_, idx) => idx % 2 === 0).map((student, idx) => {
                      const name = student.label || "Unnamed Student";
                      const group = student.sub || "General Group";
                      const initial = name.charAt(0).toUpperCase();
                      const isEditingThisStudent = editingStudentLabel === student.label;

                      if (isEditingThisStudent) {
                        return (
                          <div key={student.label + idx} className="w-full theme-bg-sub border theme-border rounded-xl p-3.5 space-y-3 shadow-sm animate-fade-in">
                            <div className="text-xs font-bold theme-text-primary pb-1 border-b theme-border">
                              Edit Student Profile
                            </div>

                            <div className="space-y-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                                  Student Name
                                </label>
                                <input
                                  type="text"
                                  value={editStudentName}
                                  onChange={(e) => setEditStudentName(e.target.value)}
                                  placeholder="Student Name"
                                  className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                                  Group Name
                                </label>
                                <AutocompleteDropdown
                                  options={groupDropdownOptions}
                                  value={editStudentGroup}
                                  onChange={(val) => {
                                    const groupVal = typeof val === "object" ? (val.label || val.value) : val;
                                    setEditStudentGroup(groupVal);
                                  }}
                                  placeholder="Select or type group name..."
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t theme-border">
                              <button
                                type="button"
                                onClick={() => setEditingStudentLabel(null)}
                                className="px-3 py-1 text-xs font-semibold theme-text-secondary hover:theme-text-primary rounded-lg theme-bg-surface cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditStudent(student)}
                                className="px-3 py-1 text-xs font-semibold theme-accent-text theme-bg-accent rounded-lg cursor-pointer shadow-sm"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={student.label + idx}
                          className="w-full theme-bg-sub border theme-border rounded-xl p-3.5 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group select-none cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold theme-text-primary truncate">
                                  {name}
                                </span>
                                {student._local && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                                    title="Saved locally"
                                  />
                                )}
                              </div>
                              <span className="text-[10px] theme-text-secondary font-medium block truncate">
                                {group}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => startEditStudent(student)}
                              className="p-1.5 text-xs theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition rounded-lg cursor-pointer"
                              title="Edit Student"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student)}
                              className="p-1.5 text-xs theme-text-secondary hover:text-rose-400 hover:theme-bg-surface transition rounded-lg cursor-pointer"
                              title="Delete Student"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column (Odd Indices) */}
                  <div className="flex-1 w-full flex flex-col gap-3">
                    {filteredStudents.filter((_, idx) => idx % 2 === 1).map((student, idx) => {
                      const name = student.label || "Unnamed Student";
                      const group = student.sub || "General Group";
                      const initial = name.charAt(0).toUpperCase();
                      const isEditingThisStudent = editingStudentLabel === student.label;

                      if (isEditingThisStudent) {
                        return (
                          <div key={student.label + idx} className="w-full theme-bg-sub border theme-border rounded-xl p-3.5 space-y-3 shadow-sm animate-fade-in">
                            <div className="text-xs font-bold theme-text-primary pb-1 border-b theme-border">
                              Edit Student Profile
                            </div>

                            <div className="space-y-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                                  Student Name
                                </label>
                                <input
                                  type="text"
                                  value={editStudentName}
                                  onChange={(e) => setEditStudentName(e.target.value)}
                                  placeholder="Student Name"
                                  className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                                  Group Name
                                </label>
                                <AutocompleteDropdown
                                  options={groupDropdownOptions}
                                  value={editStudentGroup}
                                  onChange={(val) => {
                                    const groupVal = typeof val === "object" ? (val.label || val.value) : val;
                                    setEditStudentGroup(groupVal);
                                  }}
                                  placeholder="Select or type group name..."
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t theme-border">
                              <button
                                type="button"
                                onClick={() => setEditingStudentLabel(null)}
                                className="px-3 py-1 text-xs font-semibold theme-text-secondary hover:theme-text-primary rounded-lg theme-bg-surface cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditStudent(student)}
                                className="px-3 py-1 text-xs font-semibold theme-accent-text theme-bg-accent rounded-lg cursor-pointer shadow-sm"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={student.label + idx}
                          className="w-full theme-bg-sub border theme-border rounded-xl p-3.5 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group select-none cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold theme-text-primary truncate">
                                  {name}
                                </span>
                                {student._local && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                                    title="Saved locally"
                                  />
                                )}
                              </div>
                              <span className="text-[10px] theme-text-secondary font-medium block truncate">
                                {group}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => startEditStudent(student)}
                              className="p-1.5 text-xs theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition rounded-lg cursor-pointer"
                              title="Edit Student"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student)}
                              className="p-1.5 text-xs theme-text-secondary hover:text-rose-400 hover:theme-bg-surface transition rounded-lg cursor-pointer"
                              title="Delete Student"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

      </div>
    </div>
  );
}
