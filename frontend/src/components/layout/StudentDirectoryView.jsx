import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";
import { 
  students as studentStore, 
  isOnline, 
  mergeStudents 
} from "../../utils/localStore";
import StudentSavePanel from "../session/StudentSavePanel";
import { GroupsIcon, UsersIcon, TrashIcon, CheckIcon } from "../ui/Icons";

export default function StudentDirectoryView() {
  const { showToast } = useToast();

  const [studentList, setStudentList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [offline, setOffline] = useState(!isOnline());

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadStudents();
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
      const res = await fetchWithAuth("/students/");
      if (res.ok) {
        const raw = await res.json();
        const apiStudents = raw.map((s) => ({
          id: typeof s === "object" ? s.id : null,
          label: typeof s === "object" ? (s.name || s.student_name || s.label) : s,
          sub: typeof s === "object" ? (s.group || s.group_name || s.sub || "General Group") : "General Group",
        }));

        const localStudents = studentStore.getAll();
        const merged = mergeStudents(apiStudents, localStudents);
        setStudentList(merged);
      }
    } catch (err) {
      console.warn("[StudentDirectory] API fetch failed, using cache:", err.message);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Available groups for filtering
  const groupsList = Array.from(
    new Set(studentList.map((s) => s.sub || "General Group"))
  ).filter(Boolean);

  // Filter logic
  const filteredStudents = studentList.filter((student) => {
    const nameMatch = (student.label || "").toLowerCase().includes(searchQuery.toLowerCase());
    const groupMatch = (student.sub || "").toLowerCase().includes(searchQuery.toLowerCase());
    const passesSearch = nameMatch || groupMatch;

    const passesGroup =
      selectedGroupFilter === "ALL" ||
      (student.sub || "General Group").toLowerCase() === selectedGroupFilter.toLowerCase();

    return passesSearch && passesGroup;
  });

  // Save student callback (reusing StudentSavePanel)
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

  // Delete student handler (Offline & Online API DELETE)
  const handleDeleteStudent = async (student) => {
    const label = typeof student === "object" ? student.label : student;
    const studentId = typeof student === "object" ? student.id : null;

    if (!window.confirm(`Are you sure you want to delete student "${label}"?`)) {
      return;
    }

    // 1. Remove from LocalStorage store immediately
    const updated = studentStore.remove(label);
    setStudentList(updated);

    // 2. If online, send DELETE request to API backend
    if (isOnline()) {
      try {
        const deleteEndpoint = studentId 
          ? `/students/${studentId}/` 
          : `/students/${encodeURIComponent(label)}/`;

        const res = await fetchWithAuth(deleteEndpoint, { method: "DELETE" });

        if (res.ok || res.status === 204) {
          showToast(`Student "${label}" deleted permanently!`, "success");
        } else {
          showToast(`Student "${label}" removed locally.`, "info");
        }
      } catch (err) {
        showToast(`Student "${label}" removed locally.`, "info");
      }
    } else {
      showToast(`Student "${label}" removed locally (offline).`, "info");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      {/* 1. Top Header Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
            <GroupsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">
              Groups & Student Directory
            </h2>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              Manage student profiles, group assignments, and sync records.
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

      {/* 2. Filter & Search Controls */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or group..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs theme-text-secondary hover:theme-text-primary"
              >
                ✕
              </button>
            )}
          </div>

          {/* Group Dropdown Filter */}
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="theme-bg-sub border theme-border theme-text-primary px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          >
            <option value="ALL">All Groups ({studentList.length})</option>
            {groupsList.map((grp, i) => (
              <option key={i} value={grp}>
                {grp}
              </option>
            ))}
          </select>
        </div>

        {/* Group Quick Filter Pills */}
        {groupsList.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-mono theme-text-secondary uppercase pr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedGroupFilter === "ALL"
                  ? "theme-bg-accent theme-accent-text"
                  : "theme-bg-sub theme-text-secondary hover:theme-text-primary border theme-border"
              }`}
            >
              All
            </button>
            {groupsList.map((grp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedGroupFilter(grp)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedGroupFilter === grp
                    ? "theme-bg-accent theme-accent-text"
                    : "theme-bg-sub theme-text-secondary hover:theme-text-primary border theme-border"
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Reusable StudentSavePanel Component */}
      {isAddPanelOpen && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl">
          <StudentSavePanel
            isOpen={true}
            onClose={() => setIsAddPanelOpen(false)}
            studentOptions={studentList}
            groups={groupsList}
            onSave={handleSaveStudent}
          />
        </div>
      )}

      {/* 4. Professional Student List View */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b theme-border">
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
            <UsersIcon className="w-4 h-4 theme-accent" />
            <span>Student Directory</span>
          </h3>
          <span className="text-[11px] font-mono theme-text-secondary">
            Showing {filteredStudents.length} of {studentList.length}
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 theme-text-secondary text-xs space-y-2">
            <p>No students match your search filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedGroupFilter("ALL");
              }}
              className="theme-accent hover:underline font-semibold text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredStudents.map((student, idx) => {
              const name = student.label || "Unnamed Student";
              const group = student.sub || "General Group";
              const initial = name.charAt(0).toUpperCase();

              return (
                <div
                  key={idx}
                  className="theme-bg-sub border theme-border rounded-xl p-3.5 flex items-center justify-between gap-3 hover:theme-bg-elevated transition group"
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
                            title="Saved locally (unsynced)"
                          />
                        )}
                      </div>
                      <span className="text-[10px] theme-text-secondary font-medium block truncate">
                        {group}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(student)}
                    className="p-1.5 text-xs theme-text-secondary hover:text-rose-400 opacity-60 group-hover:opacity-100 transition rounded-lg hover:theme-bg-surface shrink-0"
                    title="Delete Student"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
