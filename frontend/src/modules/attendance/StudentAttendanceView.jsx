import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AttendanceIcon,
  RefreshIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import {
  getAttendanceSlots,
  getStudentAttendance,
  bulkMarkStudentAttendance,
  getStudentAttendanceSummary,
} from '../../api/attendance';
import { checkHoliday } from '../../api/calendar';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';

export default function StudentAttendanceView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  // Filter States
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');

  // Roster & Attendance States
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: { status, in_time, remarks } }
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Holiday Softening & Override States
  const [holidayInfo, setHolidayInfo] = useState({ is_holiday: false, reason: '', is_weekend: false });
  const [overrideHoliday, setOverrideHoliday] = useState(false);

  // Summary Metrics
  const [summaryMetrics, setSummaryMetrics] = useState({
    present: 0,
    late: 0,
    absent: 0,
    half_day: 0,
    on_leave: 0,
    holiday_excused: 0,
    total_recorded: 0,
    attendance_rate: 0,
  });

  // 1. Fetch Classes and Attendance Slots
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
        console.error('Error fetching classes/slots:', err);
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
          setSelectedGroupId(''); // Reset to all groups in this class
        }
      } catch (err) {
        console.warn('Error fetching groups:', err);
      }
    };

    fetchGroups();
  }, [selectedClassId]);

  // 3. Holiday Check on Date Change
  useEffect(() => {
    if (!selectedDate) return;

    const runHolidayCheck = async () => {
      try {
        const res = await checkHoliday(selectedDate);
        setHolidayInfo(res);
        if (res.is_holiday) {
          setOverrideHoliday(false);
        }
      } catch (err) {
        console.warn('Error checking holiday status:', err);
      }
    };

    runHolidayCheck();
  }, [selectedDate, activeTenantId]);

  // 4. Fetch Students Roster & Existing Attendance
  const loadRosterAndAttendance = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let studentUrl = `/api/v1/students/?student_class=${selectedClassId}&limit=200`;
      if (selectedGroupId) {
        studentUrl += `&student_group=${selectedGroupId}`;
      }

      const [stuRes, attRes] = await Promise.all([
        fetchWithAuth(studentUrl),
        getStudentAttendance({
          date: selectedDate,
          class_id: selectedClassId,
          group_id: selectedGroupId || undefined,
          session_slot: selectedSlotId || undefined,
        }),
      ]);

      let stuList = [];
      if (stuRes.ok) {
        const sData = await stuRes.json();
        stuList = Array.isArray(sData) ? sData : sData.results || [];
      }
      setStudents(stuList);

      const attList = Array.isArray(attRes) ? attRes : attRes.results || [];
      const newMap = {};

      // Seed with existing attendance records
      attList.forEach((a) => {
        newMap[a.student] = {
          status: a.status,
          in_time: a.in_time ? a.in_time.slice(0, 5) : '',
          remarks: a.remarks || '',
        };
      });

      // Default unset students to PRESENT (or HOLIDAY_EXCUSED if holiday active)
      stuList.forEach((s) => {
        if (!newMap[s.id]) {
          newMap[s.id] = {
            status: holidayInfo.is_holiday && !overrideHoliday ? 'HOLIDAY_EXCUSED' : 'PRESENT',
            in_time: '08:00',
            remarks: '',
          };
        }
      });

      setAttendanceMap(newMap);

      // Fetch summary KPIs
      const sumRes = await getStudentAttendanceSummary({
        date: selectedDate,
        class_id: selectedClassId,
        group_id: selectedGroupId || undefined,
        session_slot_id: selectedSlotId || undefined,
      });
      setSummaryMetrics(sumRes);
    } catch (err) {
      console.error('Error loading attendance roster:', err);
      showToast('Failed to load attendance roster', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedGroupId, selectedDate, selectedSlotId, holidayInfo.is_holiday, overrideHoliday, showToast]);

  useEffect(() => {
    loadRosterAndAttendance();
  }, [loadRosterAndAttendance]);

  // Status Change Handlers
  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleFieldChange = (studentId, field, value) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  // Batch Quick Actions
  const handleMarkAll = (status) => {
    const updated = { ...attendanceMap };
    students.forEach((s) => {
      updated[s.id] = {
        ...updated[s.id],
        status,
      };
    });
    setAttendanceMap(updated);
    showToast(`All students marked as ${status}`, 'info');
  };

  // Submit Bulk Attendance
  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      showToast('No students in selected class/group to mark.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const records = students.map((s) => {
        const item = attendanceMap[s.id] || {};
        return {
          student_id: s.id,
          status: item.status || 'PRESENT',
          in_time: item.in_time ? `${item.in_time}:00` : null,
          remarks: item.remarks || '',
        };
      });

      const payload = {
        date: selectedDate,
        session_slot_id: selectedSlotId || null,
        class_id: selectedClassId ? Number(selectedClassId) : null,
        group_id: selectedGroupId ? Number(selectedGroupId) : null,
        override_holiday: overrideHoliday,
        records,
      };

      const res = await bulkMarkStudentAttendance(payload);
      showToast(`Success! Attendance synced for ${res.count} students.`, 'success');
      loadRosterAndAttendance();
    } catch (err) {
      console.error('Error saving bulk attendance:', err);
      showToast(err.message || 'Failed to sync roll call', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Live calculation of current view's numbers
  const liveStats = useMemo(() => {
    let p = 0, l = 0, a = 0, h = 0, lv = 0, hol = 0;
    students.forEach((s) => {
      const st = attendanceMap[s.id]?.status || 'PRESENT';
      if (st === 'PRESENT') p++;
      else if (st === 'LATE') l++;
      else if (st === 'ABSENT') a++;
      else if (st === 'HALF_DAY') h++;
      else if (st === 'ON_LEAVE') lv++;
      else if (st === 'HOLIDAY_EXCUSED') hol++;
    });
    const total = p + l + a + h + lv;
    const rate = total > 0 ? Math.round(((p + l + h * 0.5) / total) * 100) : 0;
    return { p, l, a, h, lv, hol, totalStudents: students.length, rate };
  }, [students, attendanceMap]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen theme-text-primary animate-fade-in select-none">
      {/* 1. Header Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <AttendanceIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
                Student Attendance & Roll Call
              </h1>
              <p className="text-xs theme-text-secondary">
                Daily period-wise roll sheet, multi-session tracking, and holiday-aware register
              </p>
            </div>
          </div>
        </div>

        {/* Top Sync Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadRosterAndAttendance}
            disabled={isLoading}
            className="p-2 rounded-xl theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
            title="Refresh Roster"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || students.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <SleekCheckIcon className="w-4 h-4" />
            <span>{isSaving ? 'Syncing Attendance...' : 'Save & Sync Roll Call'}</span>
          </button>
        </div>
      </div>

      {/* 2. Holiday Softening Alert Banner */}
      {holidayInfo.is_holiday && (
        <div className="p-4 rounded-3xl theme-bg-sub border border-amber-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
                <span>🏖️ Scheduled Holiday / Off-Day:</span>
                <span className="text-amber-400">{holidayInfo.reason}</span>
              </div>
              <p className="text-xs theme-text-secondary mt-0.5">
                Standard attendance is automatically excused. You can override below for special coaching or residential sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl theme-bg-surface border theme-border">
              <input
                type="checkbox"
                checked={overrideHoliday}
                onChange={(e) => {
                  setOverrideHoliday(e.target.checked);
                  if (e.target.checked) {
                    handleMarkAll('PRESENT');
                  } else {
                    handleMarkAll('HOLIDAY_EXCUSED');
                  }
                }}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs font-bold theme-text-primary">
                ⚡ Override & Mark Anyway
              </span>
            </label>
          </div>
        </div>
      )}

      {/* 3. Filter Bar & Slot Selector */}
      <div className="p-4 rounded-3xl theme-bg-surface border theme-border shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Date Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
            Roll Call Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          />
        </div>

        {/* Class Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
            Student Class <span className="text-rose-400">*</span>
          </label>
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

        {/* Group / Halqa Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
            Halqa / Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          >
            <option value="">-- All Groups / Halqas --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Session / Period Slot Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
            Session / Period Slot
          </label>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          >
            <option value="">-- Daily General Roll Call --</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Live Real-Time Attendance KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        <div className="p-3 rounded-2xl theme-bg-surface border theme-border text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Enrolled</div>
          <div className="text-lg font-black theme-text-primary mt-0.5">{liveStats.totalStudents}</div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Present (P)</div>
          <div className="text-lg font-black text-emerald-400 mt-0.5">{liveStats.p}</div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Late (L)</div>
          <div className="text-lg font-black text-amber-400 mt-0.5">{liveStats.l}</div>
        </div>

        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Absent (A)</div>
          <div className="text-lg font-black text-rose-400 mt-0.5">{liveStats.a}</div>
        </div>

        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Half Day</div>
          <div className="text-lg font-black text-sky-400 mt-0.5">{liveStats.h}</div>
        </div>

        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Leave</div>
          <div className="text-lg font-black text-purple-400 mt-0.5">{liveStats.lv}</div>
        </div>

        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Attendance %</div>
          <div className="text-lg font-black text-indigo-400 mt-0.5">{liveStats.rate}%</div>
        </div>
      </div>

      {/* 5. Quick Batch Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl theme-bg-surface border theme-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold theme-text-secondary mr-1">Quick Fill:</span>
          <button
            type="button"
            onClick={() => handleMarkAll('PRESENT')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 cursor-pointer"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('ABSENT')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 cursor-pointer"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('HOLIDAY_EXCUSED')}
            className="px-3 py-1 text-xs font-semibold rounded-lg theme-bg-sub theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
          >
            Mark All Holiday
          </button>
        </div>

        <div className="text-[11px] theme-text-secondary font-mono">
          Roll Sheet: {students.length} Students
        </div>
      </div>

      {/* 6. Main Student Roll Call Table */}
      <div className="rounded-3xl theme-bg-surface border theme-border shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs theme-text-secondary flex flex-col items-center gap-3">
            <RefreshIcon className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Loading student roster and attendance sheet...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs theme-text-secondary">
            No students found for this class / group selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="py-3 px-4 w-16 text-center">Roll</th>
                  <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                  <th className="py-3 px-4 min-w-[280px]">Attendance Status</th>
                  <th className="py-3 px-4 w-32">In Time</th>
                  <th className="py-3 px-4 min-w-[160px]">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {students.map((student) => {
                  const currentRec = attendanceMap[student.id] || { status: 'PRESENT', in_time: '08:00', remarks: '' };
                  const currentStatus = currentRec.status;

                  return (
                    <tr
                      key={student.id}
                      className="hover:theme-bg-elevated/40 transition-colors"
                    >
                      {/* Roll Number */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold font-mono theme-bg-sub border theme-border theme-text-primary shadow-sm">
                          {student.roll_number || '—'}
                        </span>
                      </td>

                      {/* Name & Halqa */}
                      <td className="py-3 px-4">
                        <div className="font-bold theme-text-primary text-sm">
                          {student.name || student.name_en}
                        </div>
                        <div className="text-[11px] theme-text-secondary font-mono">
                          {student.student_class_name || ''} {student.student_group_name ? `• ${student.student_group_name}` : ''}
                        </div>
                      </td>

                      {/* Status Toggle Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { id: 'PRESENT', label: 'P', name: 'Present', color: 'bg-emerald-600 text-white' },
                            { id: 'LATE', label: 'L', name: 'Late', color: 'bg-amber-500 text-black' },
                            { id: 'ABSENT', label: 'A', name: 'Absent', color: 'bg-rose-600 text-white' },
                            { id: 'HALF_DAY', label: 'H', name: 'Half Day', color: 'bg-sky-600 text-white' },
                            { id: 'ON_LEAVE', label: 'LV', name: 'Leave', color: 'bg-purple-600 text-white' },
                            { id: 'HOLIDAY_EXCUSED', label: 'HOL', name: 'Holiday', color: 'bg-slate-600 text-white' },
                          ].map((btn) => {
                            const isActive = currentStatus === btn.id;
                            return (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={() => handleStatusChange(student.id, btn.id)}
                                className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                                  isActive
                                    ? `${btn.color} ring-2 ring-white/50 shadow-md scale-105`
                                    : 'theme-bg-sub theme-text-secondary hover:theme-text-primary border theme-border'
                                }`}
                                title={btn.name}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* In Time */}
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={currentRec.in_time || ''}
                          onChange={(e) => handleFieldChange(student.id, 'in_time', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary font-mono focus:outline-none focus:border-[var(--accent-main)]/50"
                        />
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional note..."
                          value={currentRec.remarks || ''}
                          onChange={(e) => handleFieldChange(student.id, 'remarks', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Sync bar */}
        <div className="p-4 border-t theme-border theme-bg-sub flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs theme-text-secondary">
            Press <kbd className="px-1.5 py-0.5 rounded theme-bg-surface border theme-border font-mono text-[10px]">Save & Sync</kbd> to record changes to permanent register.
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || students.length === 0}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            {isSaving ? 'Saving Roll Call...' : 'Save & Sync Roll Call'}
          </button>
        </div>
      </div>
    </div>
  );
}
