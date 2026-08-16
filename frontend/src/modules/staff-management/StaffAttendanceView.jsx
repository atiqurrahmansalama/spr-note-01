import React, { useState, useEffect, useCallback } from 'react';
import {
  AttendanceIcon,
  SaveIcon,
  RefreshIcon,
  CalendarIcon,
  SearchIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import { getStaffList, getStaffAttendance, bulkPunchAttendance, getMonthlyAttendanceSummary } from '../../api/staff';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';

export default function StaffAttendanceView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeViewMode, setActiveViewMode] = useState('daily'); // 'daily' | 'monthly'

  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Attendance grid rows state: { [staff_id]: { status: 'PRESENT', in_time: '08:30', out_time: '16:30', remarks: '' } }
  const [attendanceSheet, setAttendanceSheet] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Monthly summary analytics state
  const [monthlyYear, setMonthlyYear] = useState(() => new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(() => new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);

  // Fetch departments lookup
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/departments/');
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.warn('Error loading departments in attendance view:', err);
      }
    };
    fetchDepts();
  }, [activeTenantId]);

  // Load Daily Attendance Sheet
  const loadDailyAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, attRes] = await Promise.all([
        getStaffList({ is_active: true, department: selectedDept }),
        getStaffAttendance({ date: activeDate, department: selectedDept }),
      ]);

      const staffArray = Array.isArray(staffRes) ? staffRes : staffRes.results || [];
      const attArray = Array.isArray(attRes) ? attRes : attRes.results || [];

      setStaffList(staffArray);

      // Build sheet mapping
      const sheet = {};
      staffArray.forEach((s) => {
        sheet[s.id] = {
          staff_id: s.id,
          status: 'PRESENT',
          in_time: '08:30',
          out_time: '16:30',
          remarks: '',
        };
      });

      attArray.forEach((a) => {
        if (sheet[a.staff]) {
          sheet[a.staff] = {
            staff_id: a.staff,
            status: a.status || 'PRESENT',
            in_time: a.in_time ? a.in_time.slice(0, 5) : '08:30',
            out_time: a.out_time ? a.out_time.slice(0, 5) : '16:30',
            remarks: a.remarks || '',
            source: a.source,
          };
        }
      });

      setAttendanceSheet(sheet);
    } catch (err) {
      console.error('Error loading attendance sheet:', err);
      showToast('Failed to load attendance records', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeDate, selectedDept, showToast]);

  // Load Monthly Analytics
  const loadMonthlySummary = useCallback(async () => {
    setIsLoadingMonthly(true);
    try {
      const summary = await getMonthlyAttendanceSummary({
        year: monthlyYear,
        month: monthlyMonth,
        department: selectedDept,
      });
      setMonthlyData(summary);
    } catch (err) {
      console.error('Error loading monthly summary:', err);
      showToast('Failed to load monthly summary', 'error');
    } finally {
      setIsLoadingMonthly(false);
    }
  }, [monthlyYear, monthlyMonth, selectedDept, showToast]);

  useEffect(() => {
    if (activeViewMode === 'daily') {
      loadDailyAttendance();
    } else {
      loadMonthlySummary();
    }
  }, [activeViewMode, loadDailyAttendance, loadMonthlySummary]);

  // Bulk Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    setAttendanceSheet((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        if (updated[id].status !== 'ON_LEAVE') {
          updated[id] = {
            ...updated[id],
            status: 'PRESENT',
            in_time: '08:30',
            out_time: '16:30',
          };
        }
      });
      return updated;
    });
    showToast('All non-leave staff marked PRESENT!', 'info');
  };

  const handleRowChange = (staffId, field, value) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const records = Object.values(attendanceSheet);
      await bulkPunchAttendance({
        date: activeDate,
        records,
      });
      showToast(`Attendance for ${records.length} staff members saved successfully!`, 'success');
      loadDailyAttendance();
    } catch (err) {
      showToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const currentRecords = Object.values(attendanceSheet);
  const countPresent = currentRecords.filter((r) => r.status === 'PRESENT').length;
  const countLate = currentRecords.filter((r) => r.status === 'LATE').length;
  const countAbsent = currentRecords.filter((r) => r.status === 'ABSENT').length;
  const countHalfDay = currentRecords.filter((r) => r.status === 'HALF_DAY').length;
  const countOnLeave = currentRecords.filter((r) => r.status === 'ON_LEAVE').length;

  const filteredStaff = staffList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.user_name && s.user_name.toLowerCase().includes(q)) ||
      (s.employee_id && s.employee_id.toLowerCase().includes(q)) ||
      (s.designation && s.designation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen theme-text-primary animate-fade-in select-none">
      {/* 1. Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
            <AttendanceIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
              Staff Daily Attendance Sheet
            </h1>
            <p className="text-xs theme-text-secondary">
              Bulk daily punch recording, automated late detection, and monthly aggregated metrics
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex p-1 theme-bg-sub border theme-border rounded-xl">
            <button
              onClick={() => setActiveViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeViewMode === 'daily'
                  ? 'theme-bg-accent theme-accent-text shadow'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Daily Punch Sheet
            </button>
            <button
              onClick={() => setActiveViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeViewMode === 'monthly'
                  ? 'theme-bg-accent theme-accent-text shadow'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Monthly Analytics
            </button>
          </div>
        </div>
      </div>

      {activeViewMode === 'daily' ? (
        <>
          {/* 2. Date Selector & Summary Counters Bar */}
          <div className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Date Picker & Dept Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 theme-bg-sub border theme-border px-3 py-1.5 rounded-xl">
                  <CalendarIcon className="w-4 h-4 text-emerald-400" />
                  <input
                    type="date"
                    value={activeDate}
                    onChange={(e) => setActiveDate(e.target.value)}
                    className="bg-transparent text-xs theme-text-primary focus:outline-none font-semibold cursor-pointer"
                  />
                </div>

                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <div className="relative min-w-[200px]">
                  <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 theme-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search staff on sheet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                  />
                </div>
              </div>

              {/* Sheet Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 theme-bg-sub hover:theme-bg-elevated theme-text-primary text-xs font-semibold rounded-xl border theme-border transition-colors cursor-pointer"
                >
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark All Present</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={isSaving || staffList.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
                >
                  <SaveIcon className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Sheet...' : 'Save Attendance Sheet'}</span>
                </button>
              </div>
            </div>

            {/* Counter Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t theme-border">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-lg font-bold text-emerald-400">{countPresent}</div>
                <div className="text-[10px] uppercase font-semibold text-emerald-300">Present</div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-lg font-bold text-amber-400">{countLate}</div>
                <div className="text-[10px] uppercase font-semibold text-amber-300">Late</div>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-lg font-bold text-rose-400">{countAbsent}</div>
                <div className="text-[10px] uppercase font-semibold text-rose-300">Absent</div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                <div className="text-lg font-bold text-purple-400">{countHalfDay}</div>
                <div className="text-[10px] uppercase font-semibold text-purple-300">Half-Day</div>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                <div className="text-lg font-bold text-sky-400">{countOnLeave}</div>
                <div className="text-[10px] uppercase font-semibold text-sky-300">On Leave</div>
              </div>
            </div>
          </div>

          {/* 3. Bulk Punch Table Sheet */}
          {isLoading ? (
            <div className="p-12 text-center theme-text-secondary flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm font-medium">Loading attendance sheet...</span>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center rounded-2xl theme-bg-surface border theme-border theme-text-secondary text-xs">
              No staff members found for the selected department.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl theme-bg-surface border theme-border shadow-xl">
              <table className="w-full text-left text-xs theme-text-primary">
                <thead className="theme-bg-sub theme-text-secondary text-[11px] uppercase tracking-wider border-b theme-border">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Employee</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Attendance Status</th>
                    <th className="py-3.5 px-3 font-semibold">In Time</th>
                    <th className="py-3.5 px-3 font-semibold">Out Time</th>
                    <th className="py-3.5 px-4 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredStaff.map((staff) => {
                    const row = attendanceSheet[staff.id] || { status: 'PRESENT', in_time: '08:30', out_time: '16:30', remarks: '' };
                    const isTeaching = staff.staff_type === 'TEACHING';

                    return (
                      <tr key={staff.id} className="hover:theme-bg-elevated/40 transition-colors">
                        {/* Employee Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isTeaching ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'
                            }`}>
                              {staff.user_name ? staff.user_name[0] : 'S'}
                            </div>
                            <div>
                              <div className="font-semibold theme-text-primary">
                                {staff.user_name || 'Staff Member'}
                              </div>
                              <div className="text-[11px] theme-text-secondary font-mono">
                                {staff.employee_id} • {staff.designation}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Pills Selector */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {[
                              { label: 'P', full: 'PRESENT', color: 'peer-checked:bg-emerald-600 peer-checked:text-white' },
                              { label: 'L', full: 'LATE', color: 'peer-checked:bg-amber-600 peer-checked:text-white' },
                              { label: 'A', full: 'ABSENT', color: 'peer-checked:bg-rose-600 peer-checked:text-white' },
                              { label: 'HD', full: 'HALF_DAY', color: 'peer-checked:bg-purple-600 peer-checked:text-white' },
                              { label: 'LV', full: 'ON_LEAVE', color: 'peer-checked:bg-sky-600 peer-checked:text-white' },
                            ].map((pill) => (
                              <label
                                key={pill.full}
                                className="cursor-pointer"
                                title={pill.full}
                              >
                                <input
                                  type="radio"
                                  name={`status_${staff.id}`}
                                  value={pill.full}
                                  checked={row.status === pill.full}
                                  onChange={(e) => handleRowChange(staff.id, 'status', e.target.value)}
                                  className="sr-only peer"
                                />
                                <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg text-xs font-bold font-mono theme-bg-sub border theme-border theme-text-secondary hover:border-[var(--accent-main)]/50 transition-all ${pill.color}`}>
                                  {pill.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>

                        {/* In Time */}
                        <td className="py-3 px-3">
                          <input
                            type="time"
                            value={row.in_time || ''}
                            onChange={(e) => handleRowChange(staff.id, 'in_time', e.target.value)}
                            disabled={row.status === 'ABSENT' || row.status === 'ON_LEAVE'}
                            className="px-2 py-1 theme-bg-sub border theme-border rounded-lg text-xs font-mono theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 disabled:opacity-30"
                          />
                        </td>

                        {/* Out Time */}
                        <td className="py-3 px-3">
                          <input
                            type="time"
                            value={row.out_time || ''}
                            onChange={(e) => handleRowChange(staff.id, 'out_time', e.target.value)}
                            disabled={row.status === 'ABSENT' || row.status === 'ON_LEAVE'}
                            className="px-2 py-1 theme-bg-sub border theme-border rounded-lg text-xs font-mono theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 disabled:opacity-30"
                          />
                        </td>

                        {/* Remarks */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional notes..."
                            value={row.remarks || ''}
                            onChange={(e) => handleRowChange(staff.id, 'remarks', e.target.value)}
                            className="w-full px-2.5 py-1 theme-bg-sub border theme-border rounded-lg text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* MONTHLY ANALYTICS SUMMARY */
        <div className="p-6 rounded-2xl theme-bg-surface border theme-border space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b theme-border pb-4">
            <h3 className="text-base font-bold theme-text-primary">
              Monthly Attendance Analytics Summary
            </h3>

            <div className="flex items-center gap-2">
              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <button
                onClick={loadMonthlySummary}
                className="p-2 theme-bg-sub hover:theme-bg-elevated theme-text-primary rounded-xl text-xs font-semibold cursor-pointer border theme-border"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoadingMonthly ? (
            <div className="p-8 text-center theme-text-secondary">Loading analytics...</div>
          ) : monthlyData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl theme-bg-sub border theme-border text-center">
                  <div className="text-3xl font-extrabold text-emerald-400">
                    {monthlyData.attendance_percentage}%
                  </div>
                  <div className="text-xs theme-text-secondary font-semibold mt-1">Attendance Ratio</div>
                </div>

                <div className="p-5 rounded-3xl theme-bg-sub border theme-border text-center">
                  <div className="text-3xl font-extrabold theme-text-primary">
                    {monthlyData.total_recorded_logs}
                  </div>
                  <div className="text-xs theme-text-secondary font-semibold mt-1">Total Logs Punched</div>
                </div>

                <div className="p-5 rounded-3xl theme-bg-sub border theme-border text-center">
                  <div className="text-3xl font-extrabold text-amber-400">
                    {monthlyData.late_count}
                  </div>
                  <div className="text-xs theme-text-secondary font-semibold mt-1">Late Arrivals</div>
                </div>

                <div className="p-5 rounded-3xl theme-bg-sub border theme-border text-center">
                  <div className="text-3xl font-extrabold text-sky-400">
                    {monthlyData.on_leave_count}
                  </div>
                  <div className="text-xs theme-text-secondary font-semibold mt-1">Approved Leaves</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
