import { useState, useEffect, useMemo, useRef } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { useTenant } from "../../context/TenantContext";
import { attendanceFilters } from "../../utils/localStore";
import { RefreshIcon, SaveIcon, MatrixIcon, CloseIcon } from "../../components/ui/Icons";

export default function TeacherPeriodMatrixView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const savedFilters = useMemo(() => {
    return attendanceFilters.getTeacherMatrixFilters(activeTenantId) || {};
  }, [activeTenantId]);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(() => savedFilters.year || currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => savedFilters.month || (currentDate.getMonth() + 1));
  const [selectedTeacherId, setSelectedTeacherId] = useState(() => savedFilters.teacherId || "ALL");
  const [selectedClassId, setSelectedClassId] = useState(() => savedFilters.classId || "ALL");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [modifiedCells, setModifiedCells] = useState({}); // { `${scheduleId}_${day}`: { status, substitute_teacher_id, remarks } }

  // Persist filters
  useEffect(() => {
    attendanceFilters.saveTeacherMatrixFilters(activeTenantId, {
      year: selectedYear,
      month: selectedMonth,
      teacherId: selectedTeacherId,
      classId: selectedClassId,
    });
  }, [selectedYear, selectedMonth, selectedTeacherId, selectedClassId, activeTenantId]);


  // Substitute modal state
  const [activeModalCell, setActiveModalCell] = useState(null); // { scheduleId, day, teacherName, subjectName, dateStr, currentStatus, substituteId, remarks }
  const [allTeachers, setAllTeachers] = useState([]);

  // Load teacher list for substitute selector
  useEffect(() => {
    fetchWithAuth("/api/v1/staff/teachers/")
      .then(async (res) => {
        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            setAllTeachers(data.results);
          } else if (Array.isArray(data)) {
            setAllTeachers(data);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Matrix Data
  const fetchMatrix = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/attendance/teacher-matrix/?year=${selectedYear}&month=${selectedMonth}`;
      if (selectedTeacherId !== "ALL") url += `&teacher_id=${selectedTeacherId}`;
      if (selectedClassId !== "ALL") url += `&class_id=${selectedClassId}`;

      const res = await fetchWithAuth(url);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.teachers) {
          setMatrixData(data);
          setModifiedCells({});
        }
      }
    } catch (err) {
      showToast(err.message || "Failed to load teacher matrix", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedYear, selectedMonth, selectedTeacherId, selectedClassId]);

  // Toggle present / absent on click
  const handleCellClick = (scheduleId, day, e) => {
    if (e.type === "contextmenu") {
      e.preventDefault();
      return;
    }

    const cellKey = `${scheduleId}_${day}`;
    const existingMod = modifiedCells[cellKey];

    // Find original status from data
    let origStatus = "ABSENT";
    if (matrixData && matrixData.teachers) {
      for (const t of matrixData.teachers) {
        for (const row of t.rows) {
          if (row.schedule_id === scheduleId) {
            const st = row.daily_statuses && row.daily_statuses[day];
            if (st) origStatus = st.status;
          }
        }
      }
    }

    const currentStatus = existingMod ? existingMod.status : origStatus;
    const nextStatus = currentStatus === "PRESENT" || currentStatus === "SUBSTITUTED" ? "ABSENT" : "PRESENT";

    setModifiedCells((prev) => ({
      ...prev,
      [cellKey]: {
        schedule_id: scheduleId,
        day,
        status: nextStatus,
        substitute_teacher_id: nextStatus === "PRESENT" ? null : (existingMod?.substitute_teacher_id || null),
        remarks: existingMod?.remarks || ""
      }
    }));
  };

  // Open substitute modal on right click or options click
  const handleOpenSubstituteModal = (scheduleId, day, row, teacherName, e) => {
    if (e) e.preventDefault();
    const cellKey = `${scheduleId}_${day}`;
    const existingMod = modifiedCells[cellKey];
    const orig = row.daily_statuses && row.daily_statuses[day];

    const currentStatus = existingMod ? existingMod.status : (orig ? orig.status : "ABSENT");
    const subId = existingMod ? existingMod.substitute_teacher_id : (orig ? orig.substitute_teacher_id : "");
    const rem = existingMod ? existingMod.remarks : (orig ? orig.remarks : "");

    const dateHeader = matrixData?.days_header?.find((h) => h.day === day);
    const dateStr = dateHeader ? dateHeader.date_str : `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setActiveModalCell({
      scheduleId,
      day,
      teacherName,
      subjectName: row.subject_or_kitab_name,
      className: row.class_name,
      periodName: row.period_name,
      dateStr,
      currentStatus,
      substituteId: subId || "",
      remarks: rem || ""
    });
  };

  // Apply modal changes
  const handleSaveModalCell = () => {
    if (!activeModalCell) return;
    const cellKey = `${activeModalCell.scheduleId}_${activeModalCell.day}`;
    setModifiedCells((prev) => ({
      ...prev,
      [cellKey]: {
        schedule_id: activeModalCell.scheduleId,
        day: activeModalCell.day,
        status: activeModalCell.currentStatus,
        substitute_teacher_id: activeModalCell.substituteId ? parseInt(activeModalCell.substituteId, 10) : null,
        remarks: activeModalCell.remarks
      }
    }));
    setActiveModalCell(null);
  };

  // Save all modified cells to backend
  const handleSaveChanges = async () => {
    const records = Object.values(modifiedCells).map((item) => {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
      return {
        schedule_id: item.schedule_id,
        date: dateStr,
        status: item.status,
        substitute_teacher_id: item.substitute_teacher_id,
        remarks: item.remarks || ""
      };
    });

    if (records.length === 0) {
      showToast("No changes to save.", "info");
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/v1/attendance/teacher-matrix/bulk-update/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records })
      });
      const data = await res.json().catch(() => ({}));
      showToast(data.message || "Teacher period matrix updated successfully.", "success");
      setModifiedCells({});
      fetchMatrix();
    } catch (err) {
      showToast(err.message || "Failed to save matrix changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!matrixData || !matrixData.teachers) return;
    let csv = "Sl,Teacher Name,Class,Period,Time,Subject";
    for (const h of matrixData.days_header) {
      csv += `,${h.day} (${h.weekday})`;
    }
    csv += ",Present Classes,Absence/Leave\n";

    let sl = 1;
    for (const t of matrixData.teachers) {
      for (const r of t.rows) {
        let line = `"${sl}","${t.teacher_name}","${r.class_name}","${r.period_name}","${r.time_display}","${r.subject_or_kitab_name}"`;
        for (const h of matrixData.days_header) {
          const st = r.daily_statuses && r.daily_statuses[h.day];
          const val = st ? st.status : "";
          line += `,"${val}"`;
        }
        line += `,"${r.present_count}","${r.absent_count}"\n`;
        sl++;
      }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teacher_matrix_${selectedYear}_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Month Names
  const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  const unsavedCount = Object.keys(modifiedCells).length;

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Controls Banner */}
      <div className="p-4 border-b theme-border flex flex-wrap items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <MatrixIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Teacher Period Matrix Register</h1>
            <p className="text-xs theme-text-secondary">
              Spreadsheet view with Hijri dates, Friday highlights, substitute tagging, and daily class totals.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-xs px-2.5 py-1.5 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="text-xs px-2.5 py-1.5 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchMatrix}
            disabled={loading}
            className="p-1.5 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
            title="Refresh Matrix"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="text-xs px-3 py-1.5 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary font-medium transition"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving || unsavedCount === 0}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              unsavedCount > 0
                ? "theme-bg-accent text-white shadow-md hover:opacity-90 active:scale-95"
                : "opacity-40 theme-bg-sub theme-text-secondary cursor-not-allowed"
            }`}
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>Save Changes {unsavedCount > 0 ? `(${unsavedCount})` : ""}</span>
          </button>
        </div>
      </div>

      {/* Hijri & Gregorian Title Bar */}
      {matrixData && (
        <div className="px-4 py-2 bg-gradient-to-r from-emerald-950/20 via-teal-950/20 to-emerald-950/20 border-b theme-border flex flex-wrap items-center justify-between text-xs font-semibold theme-text-secondary">
          <div className="flex items-center gap-4">
            <span>
              Hijri Month: <strong className="theme-text-primary font-bold">{matrixData.hijri_month_span} {matrixData.hijri_year} AH</strong>
            </span>
            <span>•</span>
            <span>
              Gregorian: <strong className="theme-text-primary font-bold">{MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500/20 border border-rose-500/40 inline-block" />
              <span>Friday / Holiday</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block" />
              <span>Conducted</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40 inline-block" />
              <span>Substituted</span>
            </span>
          </div>
        </div>
      )}

      {/* Spreadsheet Matrix Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {loading && !matrixData ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 theme-text-secondary">
            <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
            <span className="text-xs">Generating teacher period register...</span>
          </div>
        ) : !matrixData || !matrixData.teachers || matrixData.teachers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 theme-text-secondary border theme-border rounded-xl theme-bg-surface">
            <MatrixIcon className="w-8 h-8 opacity-40" />
            <p className="text-sm font-semibold">No Teacher Routine Schedules Found</p>
            <p className="text-xs max-w-sm text-center">
              Please configure dynamic period slots and assign teacher routine schedules in Attendance Settings.
            </p>
          </div>
        ) : (
          <div className="border theme-border rounded-xl shadow-lg overflow-x-auto theme-bg-surface">
            <table className="w-full border-collapse text-[11px] text-left select-none">
              {/* Table Header Row 1: Day Numbers */}
              <thead>
                <tr className="border-b theme-border theme-bg-sub/80 theme-text-primary text-[10px]">
                  {/* Sticky Frozen Columns Headers */}
                  <th className="p-2 border-r theme-border font-bold text-center w-10 sticky left-0 z-20 theme-bg-sub">Sl</th>
                  <th className="p-2 border-r theme-border font-bold min-w-[140px] sticky left-10 z-20 theme-bg-sub">Teacher Name</th>
                  <th className="p-2 border-r theme-border font-bold min-w-[100px]">Class</th>
                  <th className="p-2 border-r theme-border font-bold min-w-[80px]">Period</th>
                  <th className="p-2 border-r theme-border font-bold min-w-[90px]">Time</th>
                  <th className="p-2 border-r theme-border font-bold min-w-[130px]">Kitab / Subject</th>

                  {/* 1 to 31 Day Headers */}
                  {matrixData.days_header.map((h) => {
                    const isRed = h.is_friday || h.is_holiday;
                    return (
                      <th
                        key={h.day}
                        className={`p-1.5 border-r theme-border text-center min-w-[34px] max-w-[34px] font-mono ${
                          isRed ? "bg-rose-500/10 text-rose-300 font-bold" : ""
                        }`}
                        title={`${h.date_str} - ${h.holiday_title || h.weekday} (Hijri: ${h.hijri_formatted})`}
                      >
                        <div className="font-bold text-[11px]">{h.day}</div>
                        <div className="text-[9px] opacity-75 font-sans uppercase">{h.weekday}</div>
                        <div className="text-[8px] opacity-60 font-mono">{h.hijri_day}</div>
                      </th>
                    );
                  })}

                  {/* Right Row Totals Header */}
                  <th className="p-2 border-r theme-border font-bold text-center min-w-[85px] theme-bg-sub/90 text-emerald-400">
                    Present Classes
                  </th>
                  <th className="p-2 font-bold text-center min-w-[85px] theme-bg-sub/90 text-rose-400">
                    Absence / Leave
                  </th>
                </tr>
              </thead>

              <tbody>
                {(() => {
                  let globalSl = 1;
                  return matrixData.teachers.map((t) => {
                    return t.rows.map((r, rIdx) => {
                      const currentSl = globalSl++;
                      const isFirstRowOfTeacher = rIdx === 0;

                      // Live calculation of present / absent taking modifiedCells into account
                      let livePresent = 0;
                      let liveAbsent = 0;

                      for (const h of matrixData.days_header) {
                        const cellKey = `${r.schedule_id}_${h.day}`;
                        const mod = modifiedCells[cellKey];
                        const orig = r.daily_statuses && r.daily_statuses[h.day];
                        const effectiveStatus = mod ? mod.status : (orig ? orig.status : "ABSENT");

                        if (effectiveStatus === "PRESENT" || effectiveStatus === "SUBSTITUTED") {
                          livePresent++;
                        } else if (effectiveStatus === "ABSENT" || effectiveStatus === "LEAVE") {
                          liveAbsent++;
                        }
                      }

                      return (
                        <tr
                          key={r.schedule_id}
                          className="border-b theme-border hover:theme-bg-elevated/40 transition-colors"
                        >
                          {/* Sl Number */}
                          <td className="p-2 border-r theme-border text-center font-mono text-xs opacity-75 sticky left-0 z-10 theme-bg-surface">
                            {currentSl}
                          </td>

                          {/* Teacher Name (Merged rowSpan if desired, or per-row with clean distinction) */}
                          <td className="p-2 border-r theme-border font-semibold text-xs sticky left-10 z-10 theme-bg-surface truncate">
                            <div className="font-bold truncate" title={t.teacher_name}>{t.teacher_name}</div>
                            <div className="text-[10px] theme-text-secondary truncate">{t.designation}</div>
                          </td>

                          {/* Class */}
                          <td className="p-2 border-r theme-border truncate" title={r.class_name}>
                            <span className="font-medium">{r.class_name}</span>
                            {r.group_name && <span className="text-[10px] theme-text-secondary block">({r.group_name})</span>}
                          </td>

                          {/* Period */}
                          <td className="p-2 border-r theme-border font-medium text-center">
                            {r.period_name}
                          </td>

                          {/* Time */}
                          <td className="p-2 border-r theme-border text-center font-mono text-[10px] opacity-80 whitespace-nowrap">
                            {r.time_display || "--"}
                          </td>

                          {/* Kitab / Subject */}
                          <td className="p-2 border-r theme-border font-semibold theme-accent truncate" title={r.subject_or_kitab_name}>
                            {r.subject_or_kitab_name}
                          </td>

                          {/* Days 1 to 31 Checkbox Cells */}
                          {matrixData.days_header.map((h) => {
                            const cellKey = `${r.schedule_id}_${h.day}`;
                            const mod = modifiedCells[cellKey];
                            const orig = r.daily_statuses && r.daily_statuses[h.day];

                            const statusVal = mod ? mod.status : (orig ? orig.status : "ABSENT");
                            const isSubstituted = statusVal === "SUBSTITUTED";
                            const isPresent = statusVal === "PRESENT" || isSubstituted;
                            const isModified = Boolean(mod);
                            const isRedCol = h.is_friday || h.is_holiday;

                            const subName = mod ? (allTeachers.find((t) => t.id === mod.substitute_teacher_id)?.name_en || "Substitute") : (orig?.substitute_teacher_name || "");

                            return (
                              <td
                                key={h.day}
                                onClick={(e) => handleCellClick(r.schedule_id, h.day, e)}
                                onContextMenu={(e) => handleOpenSubstituteModal(r.schedule_id, h.day, r, t.teacher_name, e)}
                                className={`p-0 border-r theme-border text-center cursor-pointer transition-colors relative group ${
                                  isRedCol ? "bg-rose-500/5 hover:bg-rose-500/15" : "hover:theme-bg-elevated"
                                } ${isModified ? "ring-1 ring-inset ring-amber-400" : ""}`}
                                title={`Click to toggle Present/Absent. Right-click for Substitute options.\n${h.date_str} - ${t.teacher_name} (${r.subject_or_kitab_name})`}
                              >
                                <div className="h-9 w-full flex items-center justify-center">
                                  {isSubstituted ? (
                                    <span
                                      className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 truncate max-w-[30px]"
                                      title={`Substituted by ${subName}`}
                                    >
                                      Sub
                                    </span>
                                  ) : isPresent ? (
                                    <span className="w-4 h-4 rounded flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="w-4 h-4 rounded flex items-center justify-center border border-dashed theme-border opacity-30 text-[10px]">
                                      •
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Row Total Present */}
                          <td className="p-2 border-r theme-border text-center font-mono font-bold text-xs text-emerald-400 theme-bg-sub/30">
                            {livePresent}
                          </td>

                          {/* Row Total Absent */}
                          <td className="p-2 text-center font-mono font-bold text-xs text-rose-400 theme-bg-sub/30">
                            {liveAbsent}
                          </td>
                        </tr>
                      );
                    });
                  });
                })()}

                {/* Bottom Summary Row: Total Daily Classes */}
                <tr className="border-t-2 theme-border font-bold theme-bg-sub/90 text-xs">
                  <td colSpan={6} className="p-2.5 border-r theme-border text-right uppercase tracking-wider sticky left-0 z-20 theme-bg-sub">
                    Daily Classes Total:
                  </td>
                  {matrixData.days_header.map((h) => {
                    // Compute live daily class count across all routines
                    let dayClassTotal = 0;
                    for (const t of matrixData.teachers) {
                      for (const r of t.rows) {
                        const cellKey = `${r.schedule_id}_${h.day}`;
                        const mod = modifiedCells[cellKey];
                        const orig = r.daily_statuses && r.daily_statuses[h.day];
                        const effectiveStatus = mod ? mod.status : (orig ? orig.status : "ABSENT");
                        if (effectiveStatus === "PRESENT" || effectiveStatus === "SUBSTITUTED") {
                          dayClassTotal++;
                        }
                      }
                    }

                    const isRed = h.is_friday || h.is_holiday;
                    return (
                      <td
                        key={h.day}
                        className={`p-1.5 border-r theme-border text-center font-mono font-bold ${
                          isRed ? "bg-rose-500/10 text-rose-300" : "theme-text-primary"
                        }`}
                      >
                        {dayClassTotal}
                      </td>
                    );
                  })}

                  {/* Monthly Grand Total */}
                  <td colSpan={2} className="p-2.5 text-center font-mono font-bold text-xs theme-accent theme-bg-accent-soft">
                    {(() => {
                      let grand = 0;
                      for (const t of matrixData.teachers) {
                        for (const r of t.rows) {
                          for (const h of matrixData.days_header) {
                            const cellKey = `${r.schedule_id}_${h.day}`;
                            const mod = modifiedCells[cellKey];
                            const orig = r.daily_statuses && r.daily_statuses[h.day];
                            const effectiveStatus = mod ? mod.status : (orig ? orig.status : "ABSENT");
                            if (effectiveStatus === "PRESENT" || effectiveStatus === "SUBSTITUTED") {
                              grand++;
                            }
                          }
                        }
                      }
                      return `Grand Total: ${grand}`;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Substitute Teacher & Remarks Modal */}
      {activeModalCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b theme-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Period Attendance Options</h3>
                <p className="text-xs theme-text-secondary">{activeModalCell.dateStr} • {activeModalCell.periodName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalCell(null)}
                className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1">
                <div>Scheduled Teacher: <strong className="theme-text-primary">{activeModalCell.teacherName}</strong></div>
                <div>Subject / Kitab: <strong className="theme-accent">{activeModalCell.subjectName}</strong></div>
                <div>Class: <strong>{activeModalCell.className}</strong></div>
              </div>

              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Attendance Status</label>
                <select
                  value={activeModalCell.currentStatus}
                  onChange={(e) => setActiveModalCell({ ...activeModalCell, currentStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="PRESENT">Present (Conducted by Regular Teacher)</option>
                  <option value="SUBSTITUTED">Substituted (Conducted by Substitute Teacher)</option>
                  <option value="ABSENT">Absent (Not Conducted)</option>
                  <option value="LEAVE">Approved Leave</option>
                  <option value="HOLIDAY">Holiday / Weekend</option>
                </select>
              </div>

              {activeModalCell.currentStatus === "SUBSTITUTED" && (
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Substitute Teacher</label>
                  <select
                    value={activeModalCell.substituteId}
                    onChange={(e) => setActiveModalCell({ ...activeModalCell, substituteId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Substitute Teacher --</option>
                    {allTeachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name_en || t.user_phone || `Teacher #${t.id}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Remarks / Lesson Note</label>
                <textarea
                  rows={2}
                  value={activeModalCell.remarks}
                  onChange={(e) => setActiveModalCell({ ...activeModalCell, remarks: e.target.value })}
                  placeholder="Optional notes or reasons..."
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="p-3.5 border-t theme-border flex items-center justify-end gap-2 theme-bg-sub/50">
              <button
                type="button"
                onClick={() => setActiveModalCell(null)}
                className="px-3 py-1.5 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalCell}
                className="px-4 py-1.5 rounded-lg font-semibold theme-bg-accent text-white hover:opacity-90 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
