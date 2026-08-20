import React, { useState, useEffect, useCallback } from 'react';
import {
  MatrixIcon,
  RefreshIcon,
  DownloadIcon,
  PrintIcon,
  CalendarIcon,
  AttendanceIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import CustomSelect from '../../components/ui/CustomSelect';
import DateRangePicker from '../../components/common/DateRangePicker';
import ActionMenu from '../../components/ui/ActionMenu';
import AttendanceMatrixTable from '../../components/common/AttendanceMatrixTable';
import { getMonthlyAttendanceMatrix, bulkMarkStudentAttendance } from '../../api/attendance';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { calendarSettings } from '../../utils/localStore';
import { getHijriDateString } from '../../utils/hijriUtils';

export default function MonthlyAttendanceRegisterView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
} = {}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  // Class, Group & Teacher State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(propClassId || '');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(propGroupId || '');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Year & Month for standard month navigation
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  // Custom Date Range State (e.g. Past 1 Week, Past 2 Weeks, Custom)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Interactive Attendance Marking Mode (Toggled by "Take Attendance" button)
  const [isEditing, setIsEditing] = useState(false);

  // Hijri Setting State
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());

  // Matrix Data & Loading
  const [matrixData, setMatrixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to live calendar setting changes for Hijri toggle
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
    };
    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
  }, []);

  // 1. Fetch Classes and Teachers on Mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [classRes, staffRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/staff/'),
        ]);

        if (classRes.status === 'fulfilled' && classRes.value.ok) {
          const data = await classRes.value.json();
          const classList = Array.isArray(data) ? data : data.results || [];
          setClasses(classList);
        }

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          setTeachers(Array.isArray(sData) ? sData : sData.results || []);
        }
      } catch (err) {
        console.error('Error fetching classes or staff:', err);
      }
    };

    fetchMetadata();
  }, [activeTenantId]);

  // 2. Fetch Groups when Class changes
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const url = selectedClassId
          ? `/api/v1/groups/?student_class=${selectedClassId}`
          : `/api/v1/groups/`;
        const res = await fetchWithAuth(url);
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

  // 3. Fetch Monthly / Range Attendance Matrix
  const loadMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        class_id: selectedClassId || undefined,
        group_id: selectedGroupId || undefined,
        teacher_id: selectedTeacherId || undefined,
      };

      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        params.year = selectedYear;
        params.month = selectedMonth;
      }

      const res = await getMonthlyAttendanceMatrix(params);
      setMatrixData(res);
    } catch (err) {
      console.error('Error loading attendance matrix:', err);
      showToast('Failed to load class attendance matrix', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedGroupId, selectedTeacherId, selectedYear, selectedMonth, startDate, endDate, showToast]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Dynamic Stepper Labels and Shifting
  const getStepLabels = () => {
    if (!startDate || !endDate) {
      return { prev: 'Prev Month', next: 'Next Month' };
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (dayCount === 7) return { prev: 'Prev Week', next: 'Next Week' };
    if (dayCount === 14) return { prev: 'Prev 2 Weeks', next: 'Next 2 Weeks' };
    if (dayCount === 1) return { prev: 'Prev Day', next: 'Next Day' };
    return { prev: 'Prev Period', next: 'Next Period' };
  };

  const stepLabels = getStepLabels();

  const handleStepBackward = () => {
    if (!startDate || !endDate) {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
      return;
    }

    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    s.setDate(s.getDate() - dayCount);
    e.setDate(e.getDate() - dayCount);
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  const handleStepForward = () => {
    if (!startDate || !endDate) {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
      return;
    }

    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    s.setDate(s.getDate() + dayCount);
    e.setDate(e.getDate() + dayCount);
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  const handleDateRangeSelect = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleResetDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  // Toggle "Take Attendance" mode
  const handleToggleTakeAttendance = () => {
    setIsEditing((prev) => {
      const next = !prev;
      if (next) {
        showToast('Attendance marking mode enabled. Click any student date cell to mark attendance.', 'info');
      } else {
        showToast('Attendance marking mode saved.', 'success');
      }
      return next;
    });
  };

  // Month Names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Compute Header Date Details
  const getHeaderDateDetails = () => {
    if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      const gregorianTitle = `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`;
      const hijriTitle = `${getHijriDateString(startDate)} – ${getHijriDateString(endDate)}`;
      return { gregorianTitle, hijriTitle };
    }

    const firstDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const gregorianTitle = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    const hijriTitle = getHijriDateString(firstDayStr);
    return { gregorianTitle, hijriTitle };
  };

  const { gregorianTitle, hijriTitle } = getHeaderDateDetails();

  // Interactive Click to Mark/Toggle Cell Attendance (Excludes Holidays/Weekends)
  const handleToggleCellAttendance = async (studentId, dateStr, currentStatus, periodSlotId) => {
    // Determine next status in cycle
    let nextStatus = 'PRESENT';
    if (currentStatus === 'PRESENT') {
      nextStatus = 'ABSENT';
    } else if (currentStatus === 'ABSENT') {
      nextStatus = 'LATE';
    } else if (currentStatus === 'LATE') {
      nextStatus = 'PRESENT';
    }

    // Optimistic Update
    setMatrixData((prev) => {
      if (!prev || !prev.students_matrix) return prev;

      const updatedMatrix = prev.students_matrix.map((row) => {
        const isMatch =
          row.student_id === studentId &&
          (!periodSlotId || !row.period_slot_id || String(row.period_slot_id) === String(periodSlotId));
        if (!isMatch) return row;

        const updatedStatuses = { ...row.daily_statuses, [dateStr]: nextStatus };

        // Recalculate totals (Excludes holidays and weekends)
        let p_count = 0;
        let l_count = 0;
        let a_count = 0;
        let hd_count = 0;
        let lv_count = 0;
        let hol_count = 0;

        prev.days_header.forEach((d) => {
          const isOff = d.is_holiday || d.is_weekend;
          const st = updatedStatuses[d.date] || updatedStatuses[d.day];

          if (isOff) {
            hol_count += 1;
          } else if (st === 'PRESENT') {
            p_count += 1;
          } else if (st === 'LATE') {
            l_count += 1;
          } else if (st === 'ABSENT') {
            a_count += 1;
          } else if (st === 'HALF_DAY') {
            hd_count += 1;
          } else if (st === 'ON_LEAVE') {
            lv_count += 1;
          }
        });

        const totalRecorded = p_count + l_count + a_count + hd_count + lv_count;
        const effectivePresent = p_count + l_count + hd_count * 0.5;
        const attendanceRate = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 1000) / 10 : 0.0;

        return {
          ...row,
          daily_statuses: updatedStatuses,
          totals: {
            present: p_count,
            late: l_count,
            absent: a_count,
            half_day: hd_count,
            on_leave: lv_count,
            holiday_excused: hol_count,
            total_recorded: totalRecorded,
            attendance_rate: attendanceRate,
          },
        };
      });

      return {
        ...prev,
        students_matrix: updatedMatrix,
      };
    });

    try {
      await bulkMarkStudentAttendance({
        date: dateStr,
        class_id: selectedClassId ? Number(selectedClassId) : null,
        group_id: selectedGroupId ? Number(selectedGroupId) : null,
        override_holiday: true,
        records: [
          {
            student_id: studentId,
            period_slot_id: periodSlotId && periodSlotId !== 'DEFAULT' ? periodSlotId : null,
            status: nextStatus,
          },
        ],
      });
    } catch (err) {
      console.error('Failed to update student attendance cell:', err);
      showToast('Could not save attendance change', 'error');
      loadMatrix();
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!matrixData || !matrixData.students_matrix || matrixData.students_matrix.length === 0) {
      showToast('No attendance matrix data available to export.', 'warning');
      return;
    }

    const headerRow = ['Roll', 'Student Name', 'Class', 'Group'];
    matrixData.days_header.forEach((d) => {
      headerRow.push(`${d.weekday} ${d.day}`);
    });
    headerRow.push('Present', 'Late', 'Absent', 'Rate %');

    const csvRows = [headerRow.join(',')];

    matrixData.students_matrix.forEach((s) => {
      const row = [
        s.roll_number || '',
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${s.class_name || ''}"`,
        `"${s.group_name || ''}"`,
      ];

      matrixData.days_header.forEach((d) => {
        const st = s.daily_statuses[d.date] || s.daily_statuses[d.day] || '—';
        row.push(st);
      });

      row.push(s.totals.present);
      row.push(s.totals.late);
      row.push(s.totals.absent);
      row.push(`${s.totals.attendance_rate}%`);

      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Class_Attendance_Matrix_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance register exported to CSV!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // 3-Dot Action Menu Items
  const headerActionMenuItems = [
    {
      label: 'Print Register',
      icon: PrintIcon,
      onClick: handlePrint,
    },
    {
      label: 'Export CSV / Excel',
      icon: DownloadIcon,
      onClick: handleExportCSV,
    },
    {
      label: 'Refresh Register',
      icon: RefreshIcon,
      onClick: loadMatrix,
    },
  ];

  // Options for CustomSelect
  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classes.map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.code || 'Class'})`,
    })),
  ];

  const groupOptions = [
    { value: '', label: 'All Groups' },
    ...groups.map((g) => ({
      value: String(g.id),
      label: g.name,
    })),
  ];

  const teacherOptions = [
    { value: '', label: 'All Teachers' },
    ...teachers.map((t) => ({
      value: String(t.id),
      label: `${t.user_name || t.employee_id || 'Teacher'} (${t.designation || 'Faculty'})`,
    })),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1720px] w-full mx-auto min-h-screen theme-text-primary animate-fade-in select-none">
      
      {/* 1. Header Hub with Reusable PageHeader */}
      {!hideHeader && (
        <div className="print:hidden">
          <PageHeader
            icon={MatrixIcon}
            title="Class Attendance"
            subtitle="Monthly attendance matrix and register for classes & groups with automated computations"
            actions={
              <div className="flex items-center gap-2">
                {/* Take Attendance Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleTakeAttendance}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                      : 'theme-bg-accent theme-accent-text hover:opacity-90'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <FilledCheckCircleIcon className="w-4 h-4 text-white" />
                      <span>Done Marking</span>
                    </>
                  ) : (
                    <>
                      <AttendanceIcon className="w-4 h-4" />
                      <span>Take Attendance</span>
                    </>
                  )}
                </button>

                {/* 3-Dot Action Menu for secondary actions */}
                <ActionMenu items={headerActionMenuItems} />
              </div>
            }
          />
        </div>
      )}

      {/* 2. Unified Combined Header & Filter Card */}
      <div className="p-5 rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 print:hidden">
        
        {/* Top Row: Date Display & Smart Adaptive Stepper */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            {/* Line 1: Gregorian Date / Month Year / Range */}
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
              <h2 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
                {gregorianTitle}
              </h2>
              {startDate && endDate && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent uppercase tracking-wider">
                  Custom Range
                </span>
              )}
              {isEditing && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider animate-pulse">
                  Attendance Marking Active
                </span>
              )}
            </div>

            {/* Line 2: Islamic Hijri Summary (if setting enabled) */}
            {isHijriEnabled && (
              <p className="text-xs theme-accent font-medium pl-6">
                Islamic Hijri: <span className="font-semibold">{hijriTitle}</span>
              </p>
            )}
          </div>

          {/* Smart Stepper Controls */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={handleStepBackward}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary text-xs font-medium transition-all cursor-pointer shadow-xs"
              title={stepLabels.prev}
            >
              <span>←</span>
              <span>{stepLabels.prev}</span>
            </button>
            <button
              type="button"
              onClick={handleStepForward}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary text-xs font-medium transition-all cursor-pointer shadow-xs"
              title={stepLabels.next}
            >
              <span>{stepLabels.next}</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: 4-Column Clean Filters (Class, Group, Teacher, Date Range) */}
        <div className="border-t theme-border pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
          
          {/* 1. Class Filter */}
          <div>
            <CustomSelect
              label="Select Class"
              value={selectedClassId}
              onChange={setSelectedClassId}
              options={classOptions}
              placeholder="Select Class..."
              searchable={false}
            />
          </div>

          {/* 2. Group Filter */}
          <div>
            <CustomSelect
              label="Select Group"
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              options={groups.length > 0 ? groupOptions : [{ value: '', label: 'All Groups (General)' }]}
              placeholder="All Groups"
              searchable={false}
            />
          </div>

          {/* 3. Teacher Filter */}
          <div>
            <CustomSelect
              label="Assigned Teacher"
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              options={teacherOptions}
              placeholder="All Teachers"
              searchable={true}
            />
          </div>

          {/* 4. Reusable Date Range Filter */}
          <div>
            <DateRangePicker
              label="View Period / Date Range"
              startDate={startDate}
              endDate={endDate}
              onRangeSelect={handleDateRangeSelect}
              onReset={handleResetDateRange}
              isHijriEnabled={isHijriEnabled}
              placeholder="Full Month View"
            />
          </div>
        </div>
      </div>

      {/* 3. Reusable Attendance Matrix Table */}
      <div className="rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden">
        
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b theme-border text-center">
          <h2 className="text-lg font-bold">Monthly Student Attendance Register</h2>
          <p className="text-xs">
            Period: {gregorianTitle} {isHijriEnabled && `(${hijriTitle})`} | Class:{' '}
            {classes.find((c) => String(c.id) === selectedClassId)?.name || 'All'}
          </p>
        </div>

        {/* Reusable AttendanceMatrixTable Component */}
        <AttendanceMatrixTable
          matrixData={matrixData}
          isEditing={isEditing}
          onToggleCell={handleToggleCellAttendance}
          isHijriEnabled={isHijriEnabled}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onStudentClick={onStudentClick}
          isLoading={isLoading}
        />

        {/* Legend Ribbon */}
        <div className="p-3.5 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3 text-[11px] theme-text-secondary">
          <div className="flex items-center gap-3.5 flex-wrap font-mono">
            <span className="flex items-center gap-1.5">
              <FilledCheckCircleIcon className="w-3.5 h-3.5 text-emerald-600/85 dark:text-emerald-400/90" /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <FilledXCircleIcon className="w-3.5 h-3.5 text-rose-500/80 dark:text-rose-400/85" /> Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500/10 text-amber-600/90 dark:text-amber-400/90 font-bold flex items-center justify-center text-[9px]">L</span> Late
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-500/10 text-sky-600/90 dark:text-sky-400/90 font-bold flex items-center justify-center text-[9px]">H</span> Half Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-500/10 text-purple-600/90 dark:text-purple-400/90 font-bold flex items-center justify-center text-[9px]">LV</span> Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="opacity-35 font-mono text-xs">—</span> Holiday / Weekend
            </span>
          </div>

          <div className="font-mono font-medium">
            Total Students: <strong className="theme-text-primary">{matrixData?.total_students || 0}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
