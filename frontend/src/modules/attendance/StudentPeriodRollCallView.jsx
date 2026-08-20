import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import {
  AttendanceIcon,
  RefreshIcon,
  SaveIcon,
  ShieldCheckIcon,
  CloseIcon,
  TimerIcon,
  ClassIcon,
  SparklesIcon,
} from "../../components/ui/Icons";

export default function StudentPeriodRollCallView() {
  const { showToast } = useToast();

  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [periodSlots, setPeriodSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedSlotId, setSelectedSlotId] = useState("ALL"); // "ALL" = All Periods per student
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [conductedByTeacher, setConductedByTeacher] = useState("");
  const [substituteTeacher, setSubstituteTeacher] = useState("");

  const [students, setStudents] = useState([]);
  // Key format: `${studentId}_${slotId}` -> { status, in_time, out_time, remarks, student_id, period_slot_id }
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live Bunk Discrepancies
  const [bunkList, setBunkList] = useState([]);
  const [showBunkDrawer, setShowBunkDrawer] = useState(false);

  // Load initial lookups (Classes, Groups, Period Slots, Teachers)
  useEffect(() => {
    loadInitialLookups();
  }, []);

  const loadInitialLookups = async () => {
    try {
      const [clsRes, grpRes, periodsRes, tchRes] = await Promise.allSettled([
        fetchWithAuth("/api/v1/classes/"),
        fetchWithAuth("/api/v1/groups/"),
        fetchWithAuth("/api/v1/academy/periods/"),
        fetchWithAuth("/api/v1/staff/"),
      ]);

      if (clsRes.status === "fulfilled" && clsRes.value.ok) {
        const clsData = await clsRes.value.json();
        const clsList = Array.isArray(clsData) ? clsData : clsData.results || [];
        setClasses(clsList);
        if (clsList.length > 0 && !selectedClass) {
          setSelectedClass(String(clsList[0].id));
        }
      }

      if (grpRes.status === "fulfilled" && grpRes.value.ok) {
        const grpData = await grpRes.value.json();
        setGroups(Array.isArray(grpData) ? grpData : grpData.results || []);
      }

      if (periodsRes.status === "fulfilled" && periodsRes.value.ok) {
        const pData = await periodsRes.value.json();
        const pList = Array.isArray(pData) ? pData : pData.results || [];
        pList.sort((a, b) => (a.period_order || 0) - (b.period_order || 0));
        setPeriodSlots(pList);
      }

      if (tchRes.status === "fulfilled" && tchRes.value.ok) {
        const tData = await tchRes.value.json();
        setTeachers(Array.isArray(tData) ? tData : tData.results || []);
      }
    } catch (err) {
      console.warn("Failed to load initial lookups:", err);
    }
  };

  // When selectedClass changes, reload period slots specific to this class or fallback to all slots
  useEffect(() => {
    if (!selectedClass) return;

    const loadClassPeriodSlots = async () => {
      try {
        const res = await fetchWithAuth(`/api/v1/academy/periods/?class=${selectedClass}`);
        if (res.ok) {
          const data = await res.json();
          let list = Array.isArray(data) ? data : data.results || [];
          if (list.length === 0) {
            // Fallback to all period slots
            const allRes = await fetchWithAuth("/api/v1/academy/periods/");
            if (allRes.ok) {
              const allData = await allRes.json();
              list = Array.isArray(allData) ? allData : allData.results || [];
            }
          }
          list.sort((a, b) => (a.period_order || 0) - (b.period_order || 0));
          setPeriodSlots(list);
        }
      } catch (err) {
        console.warn("Error fetching class period slots:", err);
      }
    };

    loadClassPeriodSlots();
  }, [selectedClass]);

  // Fetch Bunk Discrepancies for the selected date
  const checkBunkDiscrepancies = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/v1/attendance/students/bunk-discrepancy/?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.discrepancies)) {
          setBunkList(data.discrepancies);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedDate]);

  useEffect(() => {
    checkBunkDiscrepancies();
  }, [checkBunkDiscrepancies]);

  // Filtered period slots for rendering
  const activePeriods = useMemo(() => {
    if (selectedSlotId && selectedSlotId !== "ALL") {
      return periodSlots.filter((p) => String(p.id) === String(selectedSlotId));
    }
    return periodSlots.length > 0
      ? periodSlots
      : [{ id: "DEFAULT", period_name: "Regular Lecture Period", start_time: "08:00:00", end_time: "08:45:00", period_order: 1 }];
  }, [periodSlots, selectedSlotId]);

  // Load Students and existing attendance records
  const fetchStudentsAndAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      let studentUrl = `/api/v1/students/?student_class=${selectedClass}&is_active=true`;
      if (selectedGroup && selectedGroup !== "ALL") {
        studentUrl += `&student_group=${selectedGroup}`;
      }
      const stRes = await fetchWithAuth(studentUrl);
      if (!stRes.ok) throw new Error("Failed to load student list");
      const stData = await stRes.json();
      const studentList = Array.isArray(stData) ? stData : stData.results || [];
      studentList.sort((a, b) => (a.roll_number || 0) - (b.roll_number || 0));
      setStudents(studentList);

      // Fetch existing records for date & class
      let attUrl = `/api/v1/attendance/students/?date=${selectedDate}&class_id=${selectedClass}`;
      const attRes = await fetchWithAuth(attUrl);
      let existing = [];
      if (attRes.ok) {
        const attData = await attRes.json();
        existing = Array.isArray(attData) ? attData : attData.results || [];
      }

      // Populate attendance records map for all student x period combinations
      const attMap = {};
      studentList.forEach((s) => {
        activePeriods.forEach((p) => {
          const recKey = `${s.id}_${p.id}`;
          const found = existing.find(
            (a) =>
              String(a.student) === String(s.id) &&
              (a.period_slot_id === p.id || a.period_slot === p.id || String(a.period_slot_id) === String(p.id))
          );

          attMap[recKey] = {
            student_id: s.id,
            period_slot_id: p.id,
            status: found ? found.status : "PRESENT",
            in_time: found?.in_time ? found.in_time.slice(0, 5) : p.start_time ? p.start_time.slice(0, 5) : "08:00",
            out_time: found?.out_time ? found.out_time.slice(0, 5) : p.end_time ? p.end_time.slice(0, 5) : "",
            remarks: found?.remarks || "",
          };
        });
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
  }, [selectedClass, selectedGroup, selectedDate, activePeriods]);

  // Handle single student-period status change
  const setStudentPeriodStatus = (studentId, slotId, statusVal) => {
    const key = `${studentId}_${slotId}`;
    setAttendanceRecords((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        student_id: studentId,
        period_slot_id: slotId,
        status: statusVal,
      },
    }));
  };

  // Handle in_time change
  const setStudentPeriodInTime = (studentId, slotId, val) => {
    const key = `${studentId}_${slotId}`;
    setAttendanceRecords((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        student_id: studentId,
        period_slot_id: slotId,
        in_time: val,
      },
    }));
  };

  // Handle remarks change
  const setStudentPeriodRemarks = (studentId, slotId, val) => {
    const key = `${studentId}_${slotId}`;
    setAttendanceRecords((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        student_id: studentId,
        period_slot_id: slotId,
        remarks: val,
      },
    }));
  };

  // Bulk status helper for all visible rows
  const handleMarkAll = (statusVal) => {
    setAttendanceRecords((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], status: statusVal };
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
    setSaving(true);
    try {
      const records = Object.values(attendanceRecords).map((data) => ({
        student_id: data.student_id,
        period_slot_id: data.period_slot_id !== "DEFAULT" ? data.period_slot_id : null,
        status: data.status || "PRESENT",
        in_time: data.in_time ? (data.in_time.length === 5 ? `${data.in_time}:00` : data.in_time) : null,
        out_time: data.out_time ? (data.out_time.length === 5 ? `${data.out_time}:00` : data.out_time) : null,
        remarks: data.remarks || "",
      }));

      const payload = {
        date: selectedDate,
        class_id: selectedClass ? Number(selectedClass) : null,
        group_id: selectedGroup && selectedGroup !== "ALL" ? Number(selectedGroup) : null,
        period_slot_id: selectedSlotId && selectedSlotId !== "ALL" && selectedSlotId !== "DEFAULT" ? selectedSlotId : null,
        taken_by_teacher_id: conductedByTeacher ? Number(conductedByTeacher) : null,
        substitute_teacher_id: substituteTeacher ? Number(substituteTeacher) : null,
        records,
      };

      const res = await fetchWithAuth("/api/v1/attendance/students/bulk-mark/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || errData.message || "Failed to save roll call");
      }

      showToast(`Success! Recorded attendance for ${records.length} student-period slots.`, "success");
      checkBunkDiscrepancies();
    } catch (err) {
      showToast(err.message || "Failed to save roll call.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Status Counts
  const stats = useMemo(() => {
    let p = 0, l = 0, a = 0, h = 0, lv = 0;
    Object.values(attendanceRecords).forEach((item) => {
      if (item.status === "PRESENT") p++;
      else if (item.status === "LATE") l++;
      else if (item.status === "ABSENT") a++;
      else if (item.status === "HALF_DAY") h++;
      else if (item.status === "ON_LEAVE") lv++;
    });
    return {
      present: p,
      late: l,
      absent: a,
      half_day: h,
      leave: lv,
      total: Object.keys(attendanceRecords).length,
    };
  }, [attendanceRecords]);

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Banner Header */}
      <div className="p-4 border-b theme-border flex flex-col md:flex-row md:items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border border-[var(--accent-main)]/20 shadow-xs">
            <AttendanceIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
              Class Attendance & Period Roll Call
            </h1>
            <p className="text-xs theme-text-secondary">
              Multi-period student attendance sheet with synchronized scheduled timings from Period Section.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {bunkList.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowBunkDrawer(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs hover:bg-rose-500/25 transition cursor-pointer animate-pulse"
            >
              <ShieldCheckIcon className="w-4 h-4 text-rose-400" />
              <span>{bunkList.length} Gate Bunk Discrepancies</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span>Gate Sync Clean</span>
            </div>
          )}

          <button
            type="button"
            onClick={fetchStudentsAndAttendance}
            disabled={loading}
            className="p-2 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleSaveRollCall}
            disabled={saving || students.length === 0}
            className="w-full sm:w-auto text-xs px-4 py-2 rounded-xl font-bold theme-bg-accent theme-accent-text shadow-md hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <SaveIcon className="w-4 h-4" />
            <span>{saving ? "Saving Roll Call..." : "Save Attendance"}</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="p-3.5 sm:p-4 border-b theme-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 theme-bg-surface shrink-0 text-xs">
        {/* Class Selector */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-[10px] mb-1 theme-text-secondary">
            Class / Grade <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60 font-medium cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code || "Class"})
              </option>
            ))}
          </select>
        </div>

        {/* Group / Halqa Selector */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-[10px] mb-1 theme-text-secondary">
            Group / Halqa
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60 font-medium cursor-pointer"
          >
            <option value="ALL">All Groups / Halqas</option>
            {groups
              .filter((g) => !selectedClass || String(g.student_class) === String(selectedClass))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
        </div>

        {/* Dynamic Period Slot Filter */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-[10px] mb-1 theme-text-secondary">
            Period Filter
          </label>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary font-medium focus:outline-none focus:border-[var(--accent-main)]/60 cursor-pointer"
          >
            <option value="ALL">All Periods ({periodSlots.length} Routine Slots)</option>
            {periodSlots.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.period_order || ""} {s.period_name}{" "}
                {s.start_time ? `(${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Conducted By Teacher */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-[10px] mb-1 theme-text-secondary">
            Conducted By Teacher
          </label>
          <select
            value={conductedByTeacher}
            onChange={(e) => setConductedByTeacher(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60 font-medium cursor-pointer"
          >
            <option value="">-- Assigned Routine Teacher --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.name_en || t.user_phone || `Teacher #${t.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block font-bold uppercase tracking-wider text-[10px] mb-1 theme-text-secondary">
            Roll Call Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/60 font-medium cursor-pointer"
          />
        </div>
      </div>

      {/* Quick Action & Live Stats Ribbon */}
      <div className="px-4 py-3 border-b theme-border flex flex-wrap items-center justify-between gap-3 text-xs theme-bg-sub/60 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold theme-text-secondary">Quick Fill:</span>
          <button
            type="button"
            onClick={() => handleMarkAll("PRESENT")}
            className="px-3 py-1 rounded-lg border theme-border theme-bg-surface hover:theme-bg-elevated font-bold text-emerald-400 transition cursor-pointer shadow-xs"
          >
            Mark All Present (P)
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll("ABSENT")}
            className="px-3 py-1 rounded-lg border theme-border theme-bg-surface hover:theme-bg-elevated font-bold text-rose-400 transition cursor-pointer shadow-xs"
          >
            Mark All Absent (A)
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3.5 font-bold flex-wrap text-xs">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Present: {stats.present}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Late: {stats.late}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Absent: {stats.absent}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Leave: {stats.leave}
          </span>
          <span className="theme-text-secondary font-mono">
            Total Slots: {stats.total} ({students.length} Students × {activePeriods.length} Periods)
          </span>
        </div>
      </div>

      {/* Main Multi-Period Attendance Table */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 theme-text-secondary">
            <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
            <span className="text-xs font-semibold">Loading student roster and period slots...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 theme-text-secondary border theme-border rounded-2xl theme-bg-surface">
            <ClassIcon className="w-8 h-8 opacity-40 mb-1" />
            <p className="text-sm font-bold theme-text-primary">No Students Found</p>
            <p className="text-xs">Select an active class or group to begin roll call.</p>
          </div>
        ) : (
          <div className="border theme-border rounded-2xl overflow-hidden shadow-lg theme-bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                {/* Table Header: All horizontal and vertical lines use the exact same theme-border */}
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/80 font-bold theme-text-secondary text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center border-r theme-border">Roll</th>
                    <th className="py-3 px-4 min-w-[170px] border-r theme-border">Student Name</th>
                    {/* Dedicated Time & Period Schedule Column */}
                    <th className="py-3 px-4 min-w-[220px] border-r theme-border">
                      <div className="flex items-center gap-1.5">
                        <TimerIcon className="w-3.5 h-3.5 theme-accent" />
                        <span>Scheduled Period & Timing</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center min-w-[260px] border-r theme-border">Attendance Status</th>
                    <th className="py-3 px-4 w-32 text-center border-r theme-border">Actual In Time</th>
                    <th className="py-3 px-4 min-w-[160px]">Remarks / Lesson Note</th>
                  </tr>
                </thead>

                {/* Table Body: Multi-period rows per student with uniform borders */}
                <tbody className="divide-y theme-border">
                  {students.map((student) => {
                    const isBunking = bunkList.some((b) => b.student_id === student.id);

                    return activePeriods.map((slot, periodIdx) => {
                      const recKey = `${student.id}_${slot.id}`;
                      const record = attendanceRecords[recKey] || {
                        status: "PRESENT",
                        in_time: slot.start_time ? slot.start_time.slice(0, 5) : "08:00",
                        remarks: "",
                      };
                      const isFirstPeriodRow = periodIdx === 0;

                      return (
                        <tr
                          key={recKey}
                          className={`hover:theme-bg-elevated/40 transition-colors ${
                            isFirstPeriodRow ? "border-t-2 border-t-black/10 dark:border-t-white/10" : ""
                          } ${isBunking && record.status === "ABSENT" ? "bg-rose-500/10" : ""}`}
                        >
                          {/* Roll Number (Merged across all periods for this student) */}
                          {isFirstPeriodRow && (
                            <td
                              rowSpan={activePeriods.length}
                              className="py-3 px-4 text-center font-mono font-bold border-r border-b theme-border theme-text-primary align-middle"
                            >
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold font-mono theme-bg-sub border theme-border shadow-xs">
                                {student.roll_number || "—"}
                              </span>
                            </td>
                          )}

                          {/* Student Name (Merged across all periods for this student) */}
                          {isFirstPeriodRow && (
                            <td
                              rowSpan={activePeriods.length}
                              className="py-3 px-4 border-r border-b theme-border align-middle"
                            >
                              <div className="font-bold theme-text-primary text-sm">
                                {student.name || student.name_en}
                              </div>
                              <div className="text-[10px] theme-text-secondary font-mono mt-0.5">
                                {student.student_class_name || ""}
                                {student.student_group_name ? ` • ${student.student_group_name}` : ""}
                              </div>
                              {isBunking && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Punched In at Gate
                                </span>
                              )}
                            </td>
                          )}

                          {/* 🎯 Dedicated Time & Period Schedule Column (configured from Period Section) */}
                          <td className="py-3 px-4 border-r theme-border">
                            <div className="flex items-center gap-2">
                              <div className="font-mono font-bold theme-text-primary text-xs">
                                {slot.start_time ? slot.start_time.slice(0, 5) : "--"} -{" "}
                                {slot.end_time ? slot.end_time.slice(0, 5) : "--"}
                              </div>
                              {slot.duration_minutes && (
                                <span className="text-[10px] font-mono theme-accent font-semibold">
                                  ({slot.duration_minutes}m)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-semibold theme-text-secondary mt-0.5 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                                P-{slot.period_order || periodIdx + 1}
                              </span>
                              <span className="truncate">{slot.period_name}</span>
                            </div>
                            {slot.teacher_name && (
                              <div className="text-[10px] theme-accent font-semibold truncate mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] shrink-0"></span>
                                <span>{slot.teacher_name}</span>
                              </div>
                            )}
                          </td>

                          {/* Attendance Status Buttons */}
                          <td className="py-3 px-4 text-center border-r theme-border">
                            <div className="inline-flex rounded-xl border theme-border p-1 theme-bg-sub shadow-inner gap-1">
                              {[
                                { key: "PRESENT", label: "P", name: "Present", color: "bg-emerald-600 text-white shadow-sm" },
                                { key: "LATE", label: "L", name: "Late", color: "bg-amber-500 text-black shadow-sm" },
                                { key: "ABSENT", label: "A", name: "Absent", color: "bg-rose-600 text-white shadow-sm" },
                                { key: "HALF_DAY", label: "H", name: "Half Day", color: "bg-sky-600 text-white shadow-sm" },
                                { key: "ON_LEAVE", label: "LV", name: "Leave", color: "bg-purple-600 text-white shadow-sm" },
                              ].map((btn) => {
                                const isSelected = record.status === btn.key;
                                return (
                                  <button
                                    key={btn.key}
                                    type="button"
                                    onClick={() => setStudentPeriodStatus(student.id, slot.id, btn.key)}
                                    className={`px-2.5 py-1 text-[11px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                                      isSelected
                                        ? `${btn.color} ring-1 ring-white/40 scale-105`
                                        : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                                    }`}
                                    title={btn.name}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Actual In Time Input */}
                          <td className="py-3 px-4 text-center border-r theme-border">
                            <input
                              type="time"
                              value={record.in_time || ""}
                              onChange={(e) => setStudentPeriodInTime(student.id, slot.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl border theme-border theme-bg-sub theme-text-primary font-mono text-xs text-center focus:outline-none focus:border-[var(--accent-main)]/60"
                            />
                          </td>

                          {/* Remarks / Lesson Note */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={record.remarks || ""}
                              onChange={(e) => setStudentPeriodRemarks(student.id, slot.id, e.target.value)}
                              placeholder="Lesson note / remarks..."
                              className="w-full px-3 py-1.5 rounded-xl border theme-border theme-bg-sub theme-text-primary text-xs focus:outline-none focus:border-[var(--accent-main)]/60 placeholder:theme-text-secondary/50"
                            />
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
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
                  <div className="font-bold text-sm theme-text-primary">{b.student_name}</div>
                  <div className="text-[11px] theme-text-secondary">
                    Gate In: <span className="font-mono text-emerald-400">{b.gate_in_time}</span> | Class: {b.class_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
