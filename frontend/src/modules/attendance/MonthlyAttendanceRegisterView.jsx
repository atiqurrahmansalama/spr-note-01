import React, { useState, useEffect, useCallback } from 'react';
import {
  AttendanceIcon,
  RefreshIcon,
  FilterIcon,
  CalendarIcon,
  DownloadIcon,
  PrintIcon,
  AdmissionIcon,
} from '../../components/ui/Icons';
import { getMonthlyAttendanceMatrix, getAttendanceSlots } from '../../api/attendance';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';

export default function MonthlyAttendanceRegisterView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  const [matrixData, setMatrixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Classes & Slots
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [clsRes, slotsRes] = await Promise.all([
          fetchWithAuth('/api/v1/classes/'),
          getAttendanceSlots({ is_active: true }),
        ]);

        if (clsRes.ok) {
          const clsData = await clsRes.json();
          const clsList = Array.isArray(clsData) ? clsData : clsData.results || [];
          setClasses(clsList);
          if (clsList.length > 0 && !selectedClassId) {
            setSelectedClassId(String(clsList[0].id));
          }
        }

        const slotList = Array.isArray(slotsRes) ? slotsRes : slotsRes.results || [];
        setSlots(slotList);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };

    fetchMetadata();
  }, [activeTenantId]);

  // 2. Fetch Groups when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setGroups([]);
      setSelectedGroupId('');
      return;
    }

    const fetchGroups = async () => {
      try {
        const res = await fetchWithAuth(`/api/v1/groups/?student_class=${selectedClassId}`);
        if (res.ok) {
          const data = await res.json();
          setGroups(Array.isArray(data) ? data : data.results || []);
          setSelectedGroupId('');
        }
      } catch (err) {
        console.warn('Error fetching groups:', err);
      }
    };

    fetchGroups();
  }, [selectedClassId]);

  // 3. Fetch Monthly Matrix
  const loadMatrix = useCallback(async () => {
    if (!selectedClassId) {
      setMatrixData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await getMonthlyAttendanceMatrix({
        class_id: selectedClassId,
        group_id: selectedGroupId || undefined,
        session_slot_id: selectedSlotId || undefined,
        year: selectedYear,
        month: selectedMonth,
      });

      setMatrixData(res);
    } catch (err) {
      console.error('Error loading monthly attendance matrix:', err);
      showToast('Failed to load monthly attendance register', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedGroupId, selectedSlotId, selectedYear, selectedMonth, showToast]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!matrixData || !matrixData.students_matrix || matrixData.students_matrix.length === 0) {
      showToast('No attendance matrix data available to export.', 'warning');
      return;
    }

    const daysCount = matrixData.total_days;
    const headerRow = ['Roll', 'Student Name', 'Class', 'Group'];
    for (let d = 1; d <= daysCount; d++) {
      headerRow.push(`Day ${d}`);
    }
    headerRow.push('Present', 'Late', 'Absent', 'Rate %');

    const csvRows = [headerRow.join(',')];

    matrixData.students_matrix.forEach((s) => {
      const row = [
        s.roll_number || '',
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.class_name}"`,
        `"${s.group_name}"`,
      ];

      for (let d = 1; d <= daysCount; d++) {
        const st = s.daily_statuses[d] || '—';
        row.push(st);
      }

      row.push(s.totals.present);
      row.push(s.totals.late);
      row.push(s.totals.absent);
      row.push(`${s.totals.attendance_rate}%`);

      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Monthly_Attendance_Register_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Monthly register exported to CSV!', 'success');
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen theme-text-primary animate-fade-in select-none">
      {/* 1. Header Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <AdmissionIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
                Monthly Attendance Register
              </h1>
              <p className="text-xs theme-text-secondary">
                31-Day Excel-like attendance matrix with automated percentage computations & export
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadMatrix}
            disabled={isLoading}
            className="p-2 rounded-xl theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
            title="Refresh Matrix"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl theme-bg-surface border theme-border hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition-colors cursor-pointer"
          >
            <PrintIcon className="w-4 h-4" />
            <span>Print Register</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Month Selector & Filter Ribbon */}
      <div className="p-4 rounded-3xl theme-bg-surface border theme-border shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
        {/* Month Navigator */}
        <div className="flex items-center gap-2 md:col-span-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary text-xs font-bold cursor-pointer"
          >
            ←
          </button>
          <div className="flex-1 text-center py-2 px-3 rounded-xl theme-bg-sub border theme-border font-bold text-xs theme-text-primary">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary text-xs font-bold cursor-pointer"
          >
            →
          </button>
        </div>

        {/* Class Filter */}
        <div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          >
            <option value="">-- Select Class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code || 'Class'})
              </option>
            ))}
          </select>
        </div>

        {/* Group Filter */}
        <div>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          >
            <option value="">-- All Groups --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Slot Filter */}
        <div>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          >
            <option value="">-- Daily General Slot --</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. 31-Day Excel-Style Matrix Table */}
      <div className="rounded-3xl theme-bg-surface border theme-border shadow-xl overflow-hidden">
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b theme-border text-center">
          <h2 className="text-lg font-bold">Monthly Student Attendance Register</h2>
          <p className="text-xs">
            Month: {monthNames[selectedMonth - 1]} {selectedYear} | Class:{' '}
            {classes.find((c) => String(c.id) === selectedClassId)?.name || 'All'}
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs theme-text-secondary flex flex-col items-center gap-3">
            <RefreshIcon className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Generating 31-day attendance register matrix...</span>
          </div>
        ) : !matrixData || matrixData.students_matrix.length === 0 ? (
          <div className="p-12 text-center text-xs theme-text-secondary">
            No attendance records found for this class in {monthNames[selectedMonth - 1]} {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-[11px]">
              {/* Table Sticky Headers */}
              <thead className="sticky top-0 z-20 theme-bg-sub border-b theme-border">
                {/* 1st Row: Day Numbers */}
                <tr className="border-b theme-border text-center font-bold">
                  <th className="py-2.5 px-3 w-12 sticky left-0 z-30 theme-bg-sub border-r theme-border">
                    Roll
                  </th>
                  <th className="py-2.5 px-3 min-w-[140px] sticky left-12 z-30 theme-bg-sub border-r theme-border text-left">
                    Student Name
                  </th>

                  {/* Day Number Headers (1 to 31) */}
                  {matrixData.days_header.map((d) => (
                    <th
                      key={d.day}
                      className={`py-1.5 px-1 min-w-[28px] max-w-[32px] font-mono border-r theme-border ${
                        d.is_holiday ? 'bg-amber-500/20 text-amber-300' : ''
                      }`}
                      title={d.holiday_title || `${d.weekday} - Day ${d.day}`}
                    >
                      <div>{d.day}</div>
                      <div className="text-[9px] font-normal uppercase opacity-75">{d.weekday.slice(0, 2)}</div>
                    </th>
                  ))}

                  {/* Summary Metric Headers */}
                  <th className="py-2 px-2 w-10 text-emerald-400 border-l theme-border">P</th>
                  <th className="py-2 px-2 w-10 text-amber-400">L</th>
                  <th className="py-2 px-2 w-10 text-rose-400">A</th>
                  <th className="py-2 px-2 w-14 text-right pr-3">Rate %</th>
                </tr>
              </thead>

              {/* Student Matrix Rows */}
              <tbody className="divide-y theme-border">
                {matrixData.students_matrix.map((row) => {
                  const rate = row.totals.attendance_rate;

                  return (
                    <tr key={row.student_id} className="hover:theme-bg-elevated/40 transition-colors">
                      {/* Sticky Roll No */}
                      <td className="py-2 px-3 text-center font-bold font-mono sticky left-0 z-10 theme-bg-surface border-r theme-border">
                        {row.roll_number || '—'}
                      </td>

                      {/* Sticky Student Name */}
                      <td className="py-2 px-3 sticky left-12 z-10 theme-bg-surface border-r theme-border">
                        <div className="font-bold theme-text-primary truncate max-w-[130px]" title={row.name}>
                          {row.name}
                        </div>
                        <div className="text-[10px] theme-text-secondary truncate max-w-[130px]">
                          {row.group_name || row.class_name}
                        </div>
                      </td>

                      {/* Day Status Cells (1 to 31) */}
                      {matrixData.days_header.map((d) => {
                        const status = row.daily_statuses[d.day];

                        let cellText = '·';
                        let cellClass = 'theme-text-secondary/40';

                        if (status === 'PRESENT') {
                          cellText = 'P';
                          cellClass = 'bg-emerald-500/20 text-emerald-400 font-bold';
                        } else if (status === 'LATE') {
                          cellText = 'L';
                          cellClass = 'bg-amber-500/20 text-amber-400 font-bold';
                        } else if (status === 'ABSENT') {
                          cellText = 'A';
                          cellClass = 'bg-rose-500/25 text-rose-400 font-bold';
                        } else if (status === 'HALF_DAY') {
                          cellText = 'H';
                          cellClass = 'bg-sky-500/20 text-sky-400 font-bold';
                        } else if (status === 'ON_LEAVE') {
                          cellText = 'LV';
                          cellClass = 'bg-purple-500/20 text-purple-400 font-bold';
                        } else if (status === 'HOLIDAY_EXCUSED' || d.is_holiday) {
                          cellText = '—';
                          cellClass = 'bg-amber-500/10 text-amber-400/50';
                        }

                        return (
                          <td
                            key={d.day}
                            className={`py-1.5 px-0.5 text-center font-mono text-[10px] border-r theme-border ${cellClass}`}
                            title={`Day ${d.day}: ${status || 'Unrecorded'}`}
                          >
                            {cellText}
                          </td>
                        );
                      })}

                      {/* Totals & Attendance Percentage */}
                      <td className="py-2 px-1 text-center font-bold font-mono text-emerald-400 border-l theme-border">
                        {row.totals.present}
                      </td>
                      <td className="py-2 px-1 text-center font-bold font-mono text-amber-400">
                        {row.totals.late}
                      </td>
                      <td className="py-2 px-1 text-center font-bold font-mono text-rose-400">
                        {row.totals.absent}
                      </td>
                      <td className="py-2 px-2 text-right pr-3 font-bold font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            rate >= 85
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : rate >= 70
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend Ribbon */}
        <div className="p-3.5 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3 text-[11px] theme-text-secondary">
          <div className="flex items-center gap-3 flex-wrap font-mono">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">P</span> Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">L</span> Late
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-rose-500/25 text-rose-400 font-bold flex items-center justify-center text-[10px]">A</span> Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px]">H</span> Half Day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-[10px]">LV</span> Leave
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px]">—</span> Holiday
            </span>
          </div>

          <div className="font-mono">
            Total Students: {matrixData?.total_students || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
