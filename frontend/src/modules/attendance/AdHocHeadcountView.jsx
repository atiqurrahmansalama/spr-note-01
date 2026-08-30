import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { useAcademicSession } from "../../context/AcademicSessionContext";
import { ChecklistIcon, RefreshIcon, SaveIcon, CloseIcon } from "../../components/ui/Icons";
import { ClassSelect, GroupSelect } from "../../components/selectors";

export default function AdHocHeadcountView() {
  const { showToast } = useToast();
  const { activeYear, activeSemester } = useAcademicSession();

  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Session Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("Night Mutala'a Roll Call");
  const [newClassId, setNewClassId] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Active Session Drawer/View
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const [sessionSearch, setSessionSearch] = useState("");
  const [savingSession, setSavingSession] = useState(false);

  // Load Sessions and Classes
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [sessRes, clsRes, grpRes] = await Promise.allSettled([
        fetchWithAuth("/api/v1/attendance/adhoc-headcounts/"),
        fetchWithAuth("/api/v1/classes/"),
        fetchWithAuth("/api/v1/groups/")
      ]);

      if (sessRes.status === "fulfilled" && sessRes.value?.ok) {
        const data = await sessRes.value.json();
        setSessions(data?.results || (Array.isArray(data) ? data : []));
      }
      let clsList = [];
      if (clsRes.status === "fulfilled" && clsRes.value?.ok) {
        const data = await clsRes.value.json();
        clsList = data?.results || (Array.isArray(data) ? data : []);
        setClasses(clsList);
        if (clsList.length > 0) setNewClassId(clsList[0].id);
      }
      if (grpRes.status === "fulfilled" && grpRes.value?.ok) {
        const data = await grpRes.value.json();
        setGroups(data?.results || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      showToast(err.message || "Failed to load headcount sessions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Create new session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast("Please enter a session title.", "warning");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    // Use global session context bounds
    const minDate = activeSemester?.startDate || activeYear?.startDate || '';
    const maxDate = activeSemester?.endDate || activeYear?.endDate || '';
    if (
      (minDate && todayStr < minDate) ||
      (maxDate && todayStr > maxDate)
    ) {
      showToast(
        `Headcount sessions cannot be initiated outside the active Academic Year (${activeYear?.name || 'Active Year'}).`,
        "warning"
      );
      return;
    }

    setCreating(true);
    try {
      // First fetch students of the selected class to calculate total_expected
      let stUrl = `/api/v1/students/?class_id=${newClassId}&is_active=true`;
      if (newGroupId && newGroupId !== "ALL") stUrl += `&group_id=${newGroupId}`;
      const stRes = await fetchWithAuth(stUrl);
      const stData = stRes && stRes.ok ? await stRes.json() : {};
      const stList = stData?.results || (Array.isArray(stData) ? stData : []);

      const payload = {
        title: newTitle.trim(),
        student_class: newClassId || null,
        student_group: newGroupId && newGroupId !== "ALL" ? newGroupId : null,
        total_expected: stList.length,
        total_verified: 0,
        verified_student_ids: [],
        notes: newNotes.trim()
      };

      const res = await fetchWithAuth("/api/v1/attendance/adhoc-headcounts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = res && res.ok ? await res.json() : null;

      showToast("Headcount session started.", "success");
      setIsModalOpen(false);
      fetchSessions();
      if (resData) handleOpenSession(resData);
    } catch (err) {
      showToast(err.message || "Failed to create session.", "error");
    } finally {
      setCreating(false);
    }
  };

  // Open session for live verification
  const handleOpenSession = async (session) => {
    setActiveSession(session);
    setVerifiedIds(new Set(session.verified_student_ids || []));

    // Load students for this class/group
    try {
      let stUrl = `/api/v1/students/?is_active=true`;
      if (session.student_class) stUrl += `&class_id=${session.student_class}`;
      if (session.student_group) stUrl += `&group_id=${session.student_group}`;
      const res = await fetchWithAuth(stUrl);
      if (res && res.ok) {
        const data = await res.json();
        setSessionStudents(data?.results || (Array.isArray(data) ? data : []));
      }
    } catch {
      setSessionStudents([]);
    }
  };

  // Toggle single student verification
  const toggleStudentVerification = (studentId) => {
    setVerifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Mark all verified
  const handleVerifyAll = () => {
    const all = new Set(sessionStudents.map((s) => s.id));
    setVerifiedIds(all);
  };

  // Save active session progress
  const handleSaveActiveSession = async () => {
    if (!activeSession) return;
    setSavingSession(true);
    try {
      const list = Array.from(verifiedIds);
      const res = await fetchWithAuth(`/api/v1/attendance/adhoc-headcounts/${activeSession.id}/verify-students/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verified_student_ids: list,
          notes: activeSession.notes
        })
      });
      const resData = res && res.ok ? await res.json() : null;
      showToast("Headcount verification saved.", "success");
      if (resData) setActiveSession(resData);
      fetchSessions();
    } catch (err) {
      showToast(err.message || "Failed to save verification.", "error");
    } finally {
      setSavingSession(false);
    }
  };

  const filteredStudents = sessionStudents.filter((s) => {
    if (!sessionSearch) return true;
    const q = sessionSearch.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || String(s.roll_number || "").includes(q);
  });

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Banner */}
      <div className="p-4 border-b theme-border flex flex-wrap items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <ChecklistIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Surprise Roll Call & Night Mutala'a Headcount</h1>
            <div className="flex items-center gap-2 flex-wrap text-xs theme-text-secondary mt-0.5">
              <span>Instant physical presence verification for study hours, dormitories, and surprise inspections.</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium theme-bg-sub border theme-border">
                Active Year: <strong className="theme-text-primary">{activeYear?.name || "Active Session"}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSessions}
            disabled={loading}
            className="p-2 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs px-3.5 py-2 rounded-lg font-bold theme-bg-accent text-white shadow-md hover:opacity-90 active:scale-95 flex items-center gap-1.5 transition"
          >
            <span>+ Start New Inspection</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
        {/* Left 2 Cols: Active Headcount Checklist or Instructions */}
        <div className="lg:col-span-2 border theme-border rounded-2xl p-4 theme-bg-surface shadow-md flex flex-col">
          {activeSession ? (
            <div className="flex flex-col h-full space-y-3">
              {/* Active Session Header */}
              <div className="border-b theme-border pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm theme-text-primary">{activeSession.title}</h2>
                  <p className="text-xs theme-text-secondary">
                    {activeSession.student_class_name || "All Classes"} • {new Date(activeSession.date_time).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyAll}
                    className="px-2.5 py-1 rounded-lg border theme-border theme-bg-sub font-semibold text-xs text-emerald-400 hover:theme-bg-elevated transition"
                  >
                    Verify All
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveActiveSession}
                    disabled={savingSession}
                    className="px-3.5 py-1 rounded-lg font-bold text-xs theme-bg-accent text-white shadow-sm flex items-center gap-1 hover:opacity-90 transition"
                  >
                    <SaveIcon className="w-3.5 h-3.5" />
                    <span>{savingSession ? "Saving..." : "Save Count"}</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar & Counter */}
              <div className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1.5 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Presence Verification Progress</span>
                  <span className="theme-accent">
                    {verifiedIds.size} / {sessionStudents.length} Verified ({sessionStudents.length > 0 ? Math.round((verifiedIds.size / sessionStudents.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{
                      width: `${sessionStudents.length > 0 ? (verifiedIds.size / sessionStudents.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Student Checklist Filter */}
              <div className="pt-1">
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Filter student by name or roll..."
                  className="w-full px-3 py-1.5 rounded-lg border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Checklist Table */}
              <div className="flex-1 overflow-y-auto border theme-border rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b theme-border theme-bg-sub/70 font-bold theme-text-secondary text-[11px] uppercase">
                      <th className="p-2.5 w-12 text-center">Status</th>
                      <th className="p-2.5 w-16 text-center">Roll</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5">Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border font-sans">
                    {filteredStudents.map((st) => {
                      const isVerified = verifiedIds.has(st.id);
                      return (
                        <tr
                          key={st.id}
                          onClick={() => toggleStudentVerification(st.id)}
                          className={`cursor-pointer transition-colors ${
                            isVerified ? "bg-emerald-500/10 hover:bg-emerald-500/15" : "hover:theme-bg-elevated/40"
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isVerified}
                              onChange={() => toggleStudentVerification(st.id)}
                              className="w-4 h-4 rounded border theme-border text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">{st.roll_number || "--"}</td>
                          <td className="p-2.5 font-bold theme-text-primary">{st.name || st.name_en}</td>
                          <td className="p-2.5 theme-text-secondary">{st.group_name || "--"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-2 theme-text-secondary my-auto">
              <ChecklistIcon className="w-8 h-8 opacity-40" />
              <p className="font-semibold text-sm">No Active Inspection Open</p>
              <p className="text-xs max-w-xs text-center">
                Select a previous inspection session from the right or start a new surprise roll call.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Historical Headcount Sessions */}
        <div className="lg:col-span-1 border theme-border rounded-2xl p-4 theme-bg-surface shadow-md flex flex-col">
          <h2 className="text-sm font-bold border-b theme-border pb-3 mb-3">Inspection History</h2>

          <div className="flex-1 overflow-y-auto space-y-2.5 text-xs">
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshIcon className="w-4 h-4 animate-spin theme-accent" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 theme-text-secondary">No inspection sessions yet.</div>
            ) : (
              sessions.map((sess) => {
                const isSelected = activeSession && activeSession.id === sess.id;
                const percent = sess.total_expected > 0 ? Math.round((sess.total_verified / sess.total_expected) * 100) : 0;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleOpenSession(sess)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? "theme-border-accent theme-bg-accent-soft shadow-sm"
                        : "theme-border theme-bg-sub hover:theme-bg-elevated"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="theme-text-primary truncate">{sess.title}</span>
                      <span className="text-[11px] text-emerald-400 font-mono">{percent}%</span>
                    </div>
                    <div className="text-[11px] theme-text-secondary mt-1">
                      {sess.student_class_name || "All Classes"} • {new Date(sess.date_time).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">
                      Verified: {sess.total_verified} / {sess.total_expected} students
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Start New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b theme-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Start Headcount Inspection</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Session Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Night Mutala'a Inspection, Dormitory Check"
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <ClassSelect
                  label="Target Class / Grade"
                  value={newClassId}
                  onChange={(val) => {
                    setNewClassId(val);
                    setNewGroupId('ALL');
                  }}
                  classes={classes}
                  allowAll={false}
                  required={true}
                />
              </div>

              <div>
                <GroupSelect
                  label="Group (Optional)"
                  value={newGroupId === 'ALL' ? '' : newGroupId}
                  onChange={(val) => setNewGroupId(val || 'ALL')}
                  classId={newClassId}
                  groups={groups}
                  allLabel="All Groups in Class"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Notes / Objectives</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional inspection notes..."
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border theme-border theme-bg-sub font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg font-bold theme-bg-accent text-white hover:opacity-90 transition"
                >
                  {creating ? "Starting..." : "Begin Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
