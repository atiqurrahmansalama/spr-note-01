import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { AttendanceIcon, RefreshIcon, SaveIcon, ShieldCheckIcon, CloseIcon, TimerIcon } from "../../components/ui/Icons";

export default function StudentPeriodRollCallView() {
  const { showToast } = useToast();

  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [periodSlots, setPeriodSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [conductedByTeacher, setConductedByTeacher] = useState("");
  const [substituteTeacher, setSubstituteTeacher] = useState("");

  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { [studentId]: { status, in_time, out_time, remarks } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live Bunk Discrepancies
  const [bunkList, setBunkList] = useState([]);
  const [showBunkDrawer, setShowBunkDrawer] = useState(false);

  // Load initial dropdown dependencies
  useEffect(() => {
    Promise.all([
      fetchWithAuth("/classes/"),
      fetchWithAuth("/groups/"),
      fetchWithAuth("/attendance/period-slots/"),
      fetchWithAuth("/staff/teachers/")
    ])
      .then(([clsRes, grpRes, slotRes, tchRes]) => {
        const clsList = clsRes?.results || (Array.isArray(clsRes) ? clsRes : []);
        const grpList = grpRes?.results || (Array.isArray(grpRes) ? grpRes : []);
        const sltList = slotRes?.results || (Array.isArray(slotRes) ? slotRes : []);
        const tchList = tchRes?.results || (Array.isArray(tchRes) ? tchRes : []);

        setClasses(clsList);
        setGroups(grpList);
        setPeriodSlots(sltList);
        setTeachers(tchList);

        if (clsList.length > 0) setSelectedClass(clsList[0].id);
        if (sltList.length > 0) setSelectedSlotId(sltList[0].id);
      })
      .catch((err) => {
        showToast("Failed to load attendance dependencies", "error");
      });
  }, []);

  // Fetch Bunk Discrepancies for the selected date
  const checkBunkDiscrepancies = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/attendance/students/bunk-discrepancy/?date=${selectedDate}`);
      if (res && Array.isArray(res.discrepancies)) {
        setBunkList(res.discrepancies);
      }
    } catch {
      // ignore
    }
  }, [selectedDate]);

  useEffect(() => {
    checkBunkDiscrepancies();
  }, [checkBunkDiscrepancies]);

  // Load Students and existing attendance records for the class and period
  const fetchStudentsAndAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      let studentUrl = `/students/?class_id=${selectedClass}&is_active=true`;
      if (selectedGroup && selectedGroup !== "ALL") {
        studentUrl += `&group_id=${selectedGroup}`;
      }
      const stRes = await fetchWithAuth(studentUrl);
      const studentList = stRes?.results || (Array.isArray(stRes) ? stRes : []);
      setStudents(studentList);

      // Fetch existing records for that date and slot
      let attUrl = `/attendance/students/?date=${selectedDate}&class_id=${selectedClass}`;
      if (selectedSlotId) attUrl += `&session_slot=${selectedSlotId}`;
      const attRes = await fetchWithAuth(attUrl);
      const existing = attRes?.results || (Array.isArray(attRes) ? attRes : []);

      const attMap = {};
      studentList.forEach((s) => {
        const found = existing.find((a) => String(a.student) === String(s.id));
        attMap[s.id] = {
          status: found ? found.status : "PRESENT",
          in_time: found?.in_time || "",
          out_time: found?.out_time || "",
          remarks: found?.remarks || ""
        };
      });
      setAttendanceRecords(attMap);
    } catch (err) {
      showToast(err.message || "Failed to load student attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, [selectedClass, selectedGroup, selectedSlotId, selectedDate]);

  // Handle single student status change
  const setStudentStatus = (studentId, statusVal) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: statusVal
      }
    }));
  };

  // Bulk status helpers
  const handleMarkAll = (statusVal) => {
    setAttendanceRecords((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: statusVal };
      });
      return updated;
    });
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["input", "textarea", "select"].includes(e.target.tagName.toLowerCase())) return;
      if (e.key === "p" || e.key === "P") {
        handleMarkAll("PRESENT");
        showToast("Marked All Present (P)", "info");
      } else if (e.key === "a" || e.key === "A") {
        handleMarkAll("ABSENT");
        showToast("Marked All Absent (A)", "info");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save Period Roll Call
  const handleSaveRollCall = async () => {
    if (!selectedSlotId) {
      showToast("Please select a Period Slot.", "warning");
      return;
    }

    setSaving(true);
    try {
      const records = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        student_id: parseInt(studentId, 10),
        status: data.status,
        in_time: data.in_time || null,
        out_time: data.out_time || null,
        remarks: data.remarks || ""
      }));

      const payload = {
        date: selectedDate,
        period_slot_id: selectedSlotId,
        class_id: selectedClass || null,
        group_id: selectedGroup && selectedGroup !== "ALL" ? selectedGroup : null,
        taken_by_teacher_id: conductedByTeacher ? parseInt(conductedByTeacher, 10) : null,
        substitute_teacher_id: substituteTeacher ? parseInt(substituteTeacher, 10) : null,
        records
      };

      const res = await fetchWithAuth("/attendance/students/period-roll-call/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      showToast(res.message || "Period roll call recorded successfully.", "success");
      checkBunkDiscrepancies();
    } catch (err) {
      showToast(err.message || "Failed to save roll call.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Status Counts
  const stats = useMemo(() => {
    let p = 0, l = 0, a = 0, lv = 0;
    Object.values(attendanceRecords).forEach((item) => {
      if (item.status === "PRESENT") p++;
      else if (item.status === "LATE") l++;
      else if (item.status === "ABSENT") a++;
      else if (item.status === "ON_LEAVE") lv++;
    });
    return { present: p, late: l, absent: a, leave: lv, total: Object.keys(attendanceRecords).length };
  }, [attendanceRecords]);

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Banner Controls */}
      <div className="p-4 border-b theme-border flex flex-wrap items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <AttendanceIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Period & Class Roll Call</h1>
            <p className="text-xs theme-text-secondary">
              Period-wise student attendance with live gate discrepancy tracking.
            </p>
          </div>
        </div>

        {/* Live Bunk Alert Badge */}
        <div className="flex items-center gap-3">
          {bunkList.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowBunkDrawer(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs hover:bg-rose-500/25 transition animate-pulse"
            >
              <ShieldCheckIcon className="w-4 h-4 text-rose-400" />
              <span>{bunkList.length} Gate Bunk Discrepancies</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span>Gate Sync Clean</span>
            </div>
          )}

          <button
            type="button"
            onClick={fetchStudentsAndAttendance}
            disabled={loading}
            className="p-1.5 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleSaveRollCall}
            disabled={saving || students.length === 0}
            className="text-xs px-4 py-1.5 rounded-lg font-semibold theme-bg-accent text-white shadow-md hover:opacity-90 active:scale-95 flex items-center gap-1.5 transition"
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>Save Attendance</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="p-4 border-b theme-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 theme-bg-sub/40 shrink-0 text-xs">
        <div>
          <label className="block font-semibold mb-1 theme-text-secondary">Class / Grade</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1 theme-text-secondary">Group (Optional)</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Groups</option>
            {groups
              .filter((g) => !selectedClass || String(g.student_class) === String(selectedClass))
              .map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1 theme-text-secondary">Dynamic Period Slot</label>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border theme-border theme-bg-surface theme-text-primary font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {periodSlots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.period_name} {s.start_time ? `(${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1 theme-text-secondary">Conducted By Teacher</label>
          <select
            value={conductedByTeacher}
            onChange={(e) => setConductedByTeacher(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">-- Regular Teacher --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name_en || t.user_phone || `Teacher #${t.id}`}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1 theme-text-secondary">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
          </input>
        </div>
      </div>

      {/* Quick Action & Stats Ribbon */}
      <div className="px-4 py-2 border-b theme-border flex flex-wrap items-center justify-between gap-3 text-xs theme-bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold theme-text-secondary">Quick Actions:</span>
          <button
            type="button"
            onClick={() => handleMarkAll("PRESENT")}
            className="px-2.5 py-1 rounded-md border theme-border theme-bg-sub hover:theme-bg-elevated font-medium text-emerald-400 transition"
          >
            Mark All Present (P)
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll("ABSENT")}
            className="px-2.5 py-1 rounded-md border theme-border theme-bg-sub hover:theme-bg-elevated font-medium text-rose-400 transition"
          >
            Mark All Absent (A)
          </button>
        </div>

        <div className="flex items-center gap-3 font-semibold">
          <span className="text-emerald-400">Present: {stats.present}</span>
          <span className="text-amber-400">Late: {stats.late}</span>
          <span className="text-rose-400">Absent: {stats.absent}</span>
          <span className="text-blue-400">Leave: {stats.leave}</span>
          <span className="theme-text-secondary">Total: {stats.total}</span>
        </div>
      </div>

      {/* Student Attendance Table */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 theme-text-secondary">
            <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
            <span className="text-xs">Loading students roster...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 theme-text-secondary border theme-border rounded-xl theme-bg-surface">
            <p className="text-sm font-semibold">No Students Found</p>
            <p className="text-xs">Select a class or group to begin roll call.</p>
          </div>
        ) : (
          <div className="border theme-border rounded-xl overflow-hidden shadow-lg theme-bg-surface">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b theme-border theme-bg-sub/80 font-bold theme-text-secondary text-[11px] uppercase">
                  <th className="p-3 w-12 text-center">Roll</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 w-28">Group</th>
                  <th className="p-3 text-center min-w-[280px]">Attendance Status</th>
                  <th className="p-3 w-28 text-center">In Time</th>
                  <th className="p-3">Remarks / Lesson Note</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {students.map((st) => {
                  const record = attendanceRecords[st.id] || { status: "PRESENT", in_time: "", remarks: "" };
                  const isBunking = bunkList.some((b) => b.student_id === st.id && record.status === "ABSENT");

                  return (
                    <tr
                      key={st.id}
                      className={`hover:theme-bg-elevated/40 transition-colors ${
                        isBunking ? "bg-rose-500/10" : ""
                      }`}
                    >
                      <td className="p-3 text-center font-mono font-bold">{st.roll_number || "--"}</td>
                      <td className="p-3">
                        <div className="font-bold theme-text-primary">{st.name || st.name_en}</div>
                        {isBunking && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Punched In at Gate
                          </span>
                        )}
                      </td>
                      <td className="p-3 theme-text-secondary">{st.group_name || "--"}</td>

                      {/* Status Toggle Buttons */}
                      <td className="p-3 text-center">
                        <div className="inline-flex rounded-lg border theme-border p-0.5 theme-bg-sub shadow-inner">
                          {[
                            { key: "PRESENT", label: "Present", color: "bg-emerald-500 text-white" },
                            { key: "LATE", label: "Late", color: "bg-amber-500 text-white" },
                            { key: "ABSENT", label: "Absent", color: "bg-rose-500 text-white" },
                            { key: "ON_LEAVE", label: "Leave", color: "bg-blue-500 text-white" }
                          ].map((btn) => {
                            const isSelected = record.status === btn.key;
                            return (
                              <button
                                key={btn.key}
                                type="button"
                                onClick={() => setStudentStatus(st.id, btn.key)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                                  isSelected ? btn.color : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                                }`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* In Time */}
                      <td className="p-3 text-center">
                        <input
                          type="time"
                          value={record.in_time || ""}
                          onChange={(e) =>
                            setAttendanceRecords((prev) => ({
                              ...prev,
                              [st.id]: { ...prev[st.id], in_time: e.target.value }
                            }))
                          }
                          className="px-2 py-1 rounded border theme-border theme-bg-sub theme-text-primary text-xs text-center"
                        />
                      </td>

                      {/* Remarks */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={record.remarks || ""}
                          onChange={(e) =>
                            setAttendanceRecords((prev) => ({
                              ...prev,
                              [st.id]: { ...prev[st.id], remarks: e.target.value }
                            }))
                          }
                          placeholder="Optional remarks..."
                          className="w-full px-2.5 py-1 rounded border theme-border theme-bg-sub theme-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Drawer: Gate Bunk Discrepancies */}
      {showBunkDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md theme-bg-surface border-l theme-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b theme-border flex items-center justify-between theme-bg-sub">
              <div className="flex items-center gap-2.5">
                <ShieldCheckIcon className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">Gate Entry vs Class Absences</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBunkDrawer(false)}
                className="p-1 rounded-lg hover:theme-bg-elevated theme-text-secondary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
              <p className="theme-text-secondary">
                These students were recorded entering the campus gate on <strong>{selectedDate}</strong>, but are currently marked <strong>ABSENT</strong> in classroom roll call.
              </p>

              {bunkList.map((b, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="theme-text-primary">[{b.roll_number}] {b.student_name}</span>
                    <span className="text-[11px] text-rose-400 font-mono">{b.gate_entry_time}</span>
                  </div>
                  <div className="text-xs theme-text-secondary">Class: {b.class_name || "--"} • Missed: {b.missed_period_name}</div>
                  <div className="text-[11px] text-amber-300/90 pt-1">{b.remarks}</div>
                </div>
              ))}
            </div>

            <div className="p-3.5 border-t theme-border theme-bg-sub flex justify-end">
              <button
                type="button"
                onClick={() => setShowBunkDrawer(false)}
                className="px-4 py-1.5 rounded-lg border theme-border theme-bg-surface hover:theme-bg-elevated font-semibold text-xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
