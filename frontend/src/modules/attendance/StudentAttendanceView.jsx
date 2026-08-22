import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AttendanceIcon,
  RefreshIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  SleekCheckIcon,
  TimerIcon,
} from '../../components/ui/Icons';
import {
  getStudentAttendance,
  bulkMarkStudentAttendance,
  getStudentAttendanceSummary,
} from '../../api/attendance';
import { checkHoliday } from '../../api/calendar';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { masterCalendarStore } from '../../utils/localStore';
import { getEventColors } from '../../components/common/MasterTimeCalendar';

const DEFAULT_PERIOD_SLOTS = [
  { id: 'DEFAULT', period_name: 'Regular Lecture Period', start_time: '08:00:00', end_time: '08:45:00', period_order: 1 }
];

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
  const [selectedSlotId, setSelectedSlotId] = useState('ALL'); // "ALL" = All Periods per student

  // Roster & Attendance States
  const [students, setStudents] = useState([]);
  // Key format: `${studentId}_${slotId}` -> { status, in_time, remarks, student_id, period_slot_id }
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Holiday Softening & Override States
  const [holidayInfo, setHolidayInfo] = useState({ is_holiday: false, reason: '', is_weekend: false });
  const [overrideHoliday, setOverrideHoliday] = useState(false);

  // 1. Fetch Classes and Periods
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [clsRes, slotsRes] = await Promise.all([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/academy/periods/'),
        ]);

        if (clsRes.ok) {
          const clsData = await clsRes.json();
          const clsList = Array.isArray(clsData) ? clsData : clsData.results || [];
          setClasses(clsList);
          if (clsList.length > 0 && !selectedClassId) {
            setSelectedClassId(String(clsList[0].id));
          }
        }

        if (slotsRes.ok) {
          const pData = await slotsRes.json();
          const pList = Array.isArray(pData) ? pData : pData.results || [];
          pList.sort((a, b) => (a.period_order || 0) - (b.period_order || 0));
          setSlots(pList);
        }
      } catch (err) {
        console.error('Error fetching classes/slots:', err);
      }
    };

    fetchMetadata();
  }, [activeTenantId]);

  // 2. Fetch Groups and Class-specific Periods when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setGroups([]);
      setSelectedGroupId('');
      return;
    }

    const fetchGroupsAndPeriods = async () => {
      try {
        const [grpRes, perRes] = await Promise.all([
          fetchWithAuth(`/api/v1/groups/?student_class=${selectedClassId}`),
          fetchWithAuth(`/api/v1/academy/periods/?class=${selectedClassId}`),
        ]);

        if (grpRes.ok) {
          const data = await grpRes.json();
          setGroups(Array.isArray(data) ? data : data.results || []);
          setSelectedGroupId('');
        }

        if (perRes.ok) {
          const pData = await perRes.json();
          let list = Array.isArray(pData) ? pData : pData.results || [];
          list.sort((a, b) => (a.period_order || 0) - (b.period_order || 0));
          setSlots(list);
        }
      } catch (err) {
        console.warn('Error fetching groups/periods:', err);
      }
    };

    fetchGroupsAndPeriods();
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
        console.warn('Holiday check error:', err);
      }
    };

    runHolidayCheck();
  }, [selectedDate]);

  // Version counter to trigger re-check when master calendar updates
  const [calendarVersion, setCalendarVersion] = useState(0);

  useEffect(() => {
    const handleCalUpdate = () => setCalendarVersion((v) => v + 1);
    window.addEventListener('spr_calendar_events_updated', handleCalUpdate);
    return () => window.removeEventListener('spr_calendar_events_updated', handleCalUpdate);
  }, []);

  // Check if selectedDate has an active Calendar Event impacting Attendance
  const activeCalendarEvent = useMemo(() => {
    if (!selectedDate) return null;
    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];
    const dObj = new Date(selectedDate);
    const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

    const hasAttendanceImpact = (evt) => {
      if (!evt) return false;
      if (!evt.impacts) return true;
      const impacts = Array.isArray(evt.impacts)
        ? evt.impacts
        : (typeof evt.impacts === 'string' ? evt.impacts.split(',').map((s) => s.trim()) : []);
      if (impacts.length === 0) return true;
      return impacts.some((imp) => {
        const s = String(imp).toUpperCase();
        return s === 'ALL' || s === 'ATTENDANCE' || s === 'IMP-1' || s === 'CLASS_ATTENDANCE';
      });
    };

    for (const evt of calendarEvents) {
      if (!hasAttendanceImpact(evt)) continue;
      if (Array.isArray(evt.exceptions) && evt.exceptions.includes(selectedDate)) continue;
      if (evt.startDate === selectedDate && (!evt.endDate || evt.endDate === selectedDate)) return evt;
      if (evt.startDate && evt.endDate && selectedDate >= evt.startDate && selectedDate <= evt.endDate) return evt;
      if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
        if (!evt.startDate || selectedDate >= evt.startDate) {
          if (evt.until === 'DATE' && evt.untilDate && selectedDate > evt.untilDate) continue;
          return evt;
        }
      }
    }
    return null;
  }, [selectedDate, activeTenantId, calendarVersion]);

  // Active periods list for rendering
  const activePeriods = useMemo(() => {
    if (selectedSlotId && selectedSlotId !== 'ALL') {
      return slots.filter((s) => String(s.id) === String(selectedSlotId));
    }
    return slots.length > 0 ? slots : DEFAULT_PERIOD_SLOTS;
  }, [slots, selectedSlotId]);

  // 4. Load Student Roster and Attendance
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
          session_slot: selectedSlotId !== 'ALL' ? selectedSlotId : undefined,
        }),
      ]);

      let stuList = [];
      if (stuRes.ok) {
        const sData = await stuRes.json();
        stuList = Array.isArray(sData) ? sData : sData.results || [];
      }
      stuList.sort((a, b) => (a.roll_number || 0) - (b.roll_number || 0));
      setStudents(stuList);

      const attList = Array.isArray(attRes) ? attRes : attRes.results || [];
      const newMap = {};

      stuList.forEach((s) => {
        activePeriods.forEach((p) => {
          const recKey = `${s.id}_${p.id}`;
          const found = attList.find(
            (a) =>
              String(a.student) === String(s.id) &&
              (a.period_slot_id === p.id || a.period_slot === p.id || String(a.period_slot_id) === String(p.id))
          );

          newMap[recKey] = {
            student_id: s.id,
            period_slot_id: p.id,
            status: found
              ? found.status
              : holidayInfo.is_holiday && !overrideHoliday
              ? 'HOLIDAY_EXCUSED'
              : 'PRESENT',
            in_time: found?.in_time ? found.in_time.slice(0, 5) : p.start_time ? p.start_time.slice(0, 5) : '08:00',
            remarks: found?.remarks || '',
          };
        });
      });

      setAttendanceMap(newMap);
    } catch (err) {
      console.error('Error loading attendance roster:', err);
      showToast('Failed to load attendance roster', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedGroupId, selectedDate, selectedSlotId, activePeriods, holidayInfo.is_holiday, overrideHoliday, showToast]);

  useEffect(() => {
    loadRosterAndAttendance();
  }, [loadRosterAndAttendance]);

  // Status Change Handlers
  const handleStatusChange = (studentId, slotId, status) => {
    const key = `${studentId}_${slotId}`;
    setAttendanceMap((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        student_id: studentId,
        period_slot_id: slotId,
        status,
      },
    }));
  };

  const handleFieldChange = (studentId, slotId, field, value) => {
    const key = `${studentId}_${slotId}`;
    setAttendanceMap((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        student_id: studentId,
        period_slot_id: slotId,
        [field]: value,
      },
    }));
  };

  // Batch Quick Actions
  const handleMarkAll = (status) => {
    const updated = { ...attendanceMap };
    Object.keys(updated).forEach((k) => {
      updated[k] = {
        ...updated[k],
        status,
      };
    });
    setAttendanceMap(updated);
    showToast(`All period slots marked as ${status}`, 'info');
  };

  // Submit Bulk Attendance
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const records = Object.values(attendanceMap).map((item) => ({
        student_id: item.student_id,
        period_slot_id: item.period_slot_id !== 'DEFAULT' ? item.period_slot_id : null,
        status: item.status || 'PRESENT',
        in_time: item.in_time ? (item.in_time.length === 5 ? `${item.in_time}:00` : item.in_time) : null,
        remarks: item.remarks || '',
      }));

      const payload = {
        date: selectedDate,
        class_id: selectedClassId ? Number(selectedClassId) : null,
        group_id: selectedGroupId ? Number(selectedGroupId) : null,
        session_slot_id: selectedSlotId && selectedSlotId !== 'ALL' && selectedSlotId !== 'DEFAULT' ? selectedSlotId : null,
        override_holiday: overrideHoliday,
        records,
      };

      const res = await bulkMarkStudentAttendance(payload);
      showToast(`Success! Attendance synced for ${res.count || records.length} records.`, 'success');
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
    const values = Object.values(attendanceMap);
    values.forEach((stObj) => {
      const st = stObj?.status || 'PRESENT';
      if (st === 'PRESENT') p++;
      else if (st === 'LATE') l++;
      else if (st === 'ABSENT') a++;
      else if (st === 'HALF_DAY') h++;
      else if (st === 'ON_LEAVE') lv++;
      else if (st === 'HOLIDAY_EXCUSED') hol++;
    });
    const total = p + l + a + h + lv;
    const rate = total > 0 ? Math.round(((p + l + h * 0.5) / total) * 100) : 0;
    return { p, l, a, h, lv, hol, totalRecorded: values.length, totalStudents: students.length, rate };
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
                Class Attendance & Period Roll Sheet
              </h1>
              <p className="text-xs theme-text-secondary">
                Multi-period daily student attendance with synchronized routine timings from Period Section.
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
            <span>{isSaving ? 'Syncing Attendance...' : 'Save & Sync Attendance'}</span>
          </button>
        </div>
      </div>

      {/* 2. Active Calendar Schedule / Event Alert Banner */}
      {activeCalendarEvent && (() => {
        const evtColors = getEventColors(activeCalendarEvent);
        return (
          <div className={`p-4 rounded-3xl ${evtColors.bg} border ${evtColors.border} shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${evtColors.bg} ${evtColors.text} border ${evtColors.border}`}>
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
                  <span>Active Schedule Event:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${evtColors.text}`}>
                    {activeCalendarEvent.title}
                  </span>
                </div>
                <p className="text-xs theme-text-secondary mt-0.5">
                  {activeCalendarEvent.description || "This date has an active event scheduled in the Master Calendar with Attendance integration."}
                </p>
              </div>
            </div>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border ${evtColors.border} ${evtColors.text} shrink-0`}>
              {activeCalendarEvent.startTime && activeCalendarEvent.endTime
                ? `${activeCalendarEvent.startTime} - ${activeCalendarEvent.endTime}`
                : "Full Day Schedule"}
            </span>
          </div>
        );
      })()}

      {/* 3. Holiday Softening Alert Banner */}
      {holidayInfo.is_holiday && !activeCalendarEvent && (
        <div className="p-4 rounded-3xl theme-bg-sub border border-amber-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
                <span>Scheduled Holiday / Off-Day:</span>
                <span className="text-amber-400 font-semibold">{holidayInfo.reason}</span>
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
                Override & Mark Anyway
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
            Period Filter
          </label>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer font-medium"
          >
            <option value="ALL">All Periods ({slots.length} Routine Slots)</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.period_order || ''} {s.period_name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Live Real-Time Attendance KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        <div className="p-3 rounded-2xl theme-bg-surface border theme-border text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">Students</div>
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
          Roll Sheet: {students.length} Students × {activePeriods.length} Periods ({liveStats.totalRecorded} Total Slots)
        </div>
      </div>

      {/* 6. Main Student Multi-Period Roll Call Table with Uniform Borders */}
      <div className="rounded-3xl theme-bg-surface border theme-border shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs theme-text-secondary flex flex-col items-center gap-3">
            <RefreshIcon className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Loading student roster and period schedule...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs theme-text-secondary">
            No students found for this class / group selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              {/* Header: All horizontal and vertical lines use the exact same theme-border */}
              <thead>
                <tr className="border-b theme-border theme-bg-sub text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="py-3 px-4 w-16 text-center border-r theme-border">Roll</th>
                  <th className="py-3 px-4 min-w-[170px] border-r theme-border">Student Name</th>
                  {/* 🎯 Dedicated Time Column right after Student Name */}
                  <th className="py-3 px-4 min-w-[220px] border-r theme-border">
                    <div className="flex items-center gap-1.5">
                      <TimerIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Scheduled Period & Timing</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 min-w-[280px] text-center border-r theme-border">Attendance Status</th>
                  <th className="py-3 px-4 w-32 text-center border-r theme-border">Actual In Time</th>
                  <th className="py-3 px-4 min-w-[160px]">Remarks / Note</th>
                </tr>
              </thead>

              {/* Body: Multi-period rows per student with uniform borders */}
              <tbody className="divide-y theme-border">
                {students.map((student) => {
                  return activePeriods.map((slot, pIdx) => {
                    const recKey = `${student.id}_${slot.id}`;
                    const currentRec = attendanceMap[recKey] || {
                      status: 'PRESENT',
                      in_time: slot.start_time ? slot.start_time.slice(0, 5) : '08:00',
                      remarks: '',
                    };
                    const currentStatus = currentRec.status;
                    const isFirstRow = pIdx === 0;

                    return (
                      <tr
                        key={recKey}
                        className={`hover:theme-bg-elevated/40 transition-colors ${
                          isFirstRow ? 'border-t-2 border-t-black/10 dark:border-t-white/10' : ''
                        }`}
                      >
                        {/* Roll Number (Merged across all periods for this student) */}
                        {isFirstRow && (
                          <td
                            rowSpan={activePeriods.length}
                            className="py-3 px-4 text-center border-r border-b theme-border theme-text-primary align-middle"
                          >
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold font-mono theme-bg-sub border theme-border shadow-xs">
                              {student.roll_number || '—'}
                            </span>
                          </td>
                        )}

                        {/* Name & Halqa (Merged across all periods for this student) */}
                        {isFirstRow && (
                          <td
                            rowSpan={activePeriods.length}
                            className="py-3 px-4 border-r border-b theme-border align-middle"
                          >
                            <div className="font-bold theme-text-primary text-sm">
                              {student.name || student.name_en}
                            </div>
                            <div className="text-[11px] theme-text-secondary font-mono mt-0.5">
                              {student.student_class_name || ''}{' '}
                              {student.student_group_name ? `• ${student.student_group_name}` : ''}
                            </div>
                          </td>
                        )}

                        {/* 🎯 Dedicated Time & Period Schedule Column */}
                        <td className="py-3 px-4 border-r theme-border">
                          <div className="flex items-center gap-2">
                            <div className="font-mono font-bold theme-text-primary text-xs">
                              {slot.start_time ? slot.start_time.slice(0, 5) : '--'} -{' '}
                              {slot.end_time ? slot.end_time.slice(0, 5) : '--'}
                            </div>
                            {slot.duration_minutes && (
                              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                                ({slot.duration_minutes}m)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold theme-text-secondary mt-0.5 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              P-{slot.period_order || pIdx + 1}
                            </span>
                            <span className="truncate">{slot.period_name}</span>
                          </div>
                        </td>

                        {/* Status Toggle Buttons */}
                        <td className="py-3 px-4 text-center border-r theme-border">
                          <div className="inline-flex rounded-xl border theme-border p-1 theme-bg-sub shadow-inner gap-1">
                            {[
                              { id: 'PRESENT', label: 'P', name: 'Present', color: 'bg-emerald-600 text-white shadow-sm' },
                              { id: 'LATE', label: 'L', name: 'Late', color: 'bg-amber-500 text-black shadow-sm' },
                              { id: 'ABSENT', label: 'A', name: 'Absent', color: 'bg-rose-600 text-white shadow-sm' },
                              { id: 'HALF_DAY', label: 'H', name: 'Half Day', color: 'bg-sky-600 text-white shadow-sm' },
                              { id: 'ON_LEAVE', label: 'LV', name: 'Leave', color: 'bg-purple-600 text-white shadow-sm' },
                              { id: 'HOLIDAY_EXCUSED', label: 'HOL', name: 'Holiday', color: 'bg-slate-600 text-white shadow-sm' },
                            ].map((btn) => {
                              const isActive = currentStatus === btn.id;
                              return (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, slot.id, btn.id)}
                                  className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs transition-all cursor-pointer ${
                                    isActive
                                      ? `${btn.color} ring-1 ring-white/40 scale-105`
                                      : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                                  }`}
                                  title={btn.name}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Actual In Time */}
                        <td className="py-3 px-4 text-center border-r theme-border">
                          <input
                            type="time"
                            value={currentRec.in_time || ''}
                            onChange={(e) => handleFieldChange(student.id, slot.id, 'in_time', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary font-mono text-center focus:outline-none focus:border-[var(--accent-main)]/50"
                          />
                        </td>

                        {/* Remarks */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional lesson note..."
                            value={currentRec.remarks || ''}
                            onChange={(e) => handleFieldChange(student.id, slot.id, 'remarks', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary/50"
                          />
                        </td>
                      </tr>
                    );
                  });
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
            {isSaving ? 'Saving Roll Call...' : 'Save & Sync Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}
