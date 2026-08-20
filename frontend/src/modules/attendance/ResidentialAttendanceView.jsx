import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  TimerIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  PrintIcon,
  DownloadIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  MatrixIcon,
  StudentIcon,
  TeacherIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import DateRangePicker from '../../components/common/DateRangePicker';
import CheckpointForm from './CheckpointForm';
import { fetchWithAuth } from '../../utils/authService';
import { getMonthlyAttendanceMatrix, bulkMarkStudentAttendance } from '../../api/attendance';
import { calendarSettings } from '../../utils/localStore';
import { getHijriDateString } from '../../utils/hijriUtils';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar } from '../../context/RightSidebarContext';

const DEFAULT_INITIAL_CHECKPOINTS = [
  {
    id: 'chk_fajr',
    name: 'Morning Fajr Wakeup & Attendance',
    time: '05:30',
    warden_name: '',
    warden_id: '',
  },
  {
    id: 'chk_maghrib',
    name: 'Evening Maghrib Study Roll Call',
    time: '18:45',
    warden_name: '',
    warden_id: '',
  },
  {
    id: 'chk_night',
    name: 'Night Dormitory Bed Check',
    time: '22:15',
    warden_name: '',
    warden_id: '',
  },
];

const PRESET_TITLES = [
  'Night Dormitory Bed Check',
  'Morning Fajr Wakeup & Attendance',
  'Evening Maghrib Study Roll Call',
  'Afternoon Asr Checkpoint',
  'Midday Zuhr Attendance',
  'Dining Hall Meal Attendance',
  'Tahajjud & Early Morning Check',
  'Dormitory Cleaning & Inspection',
];

export default function ResidentialAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
} = {}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  // Class, Group & Checkpoint Filters
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(propClassId || '');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(propGroupId || '');
  const [selectedCheckpointId, setSelectedCheckpointId] = useState('ALL');

  // Date Navigation State
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Attendance Marking State
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());

  // Roster & Matrix Data
  const [matrixData, setMatrixData] = useState(null);

  // Dynamic Residential Checkpoints / Rows
  const [checkpoints, setCheckpoints] = useState(() => {
    try {
      const saved = localStorage.getItem(`spr_res_checkpoints_${activeTenantId || 'default'}`);
      return saved ? JSON.parse(saved) : DEFAULT_INITIAL_CHECKPOINTS;
    } catch {
      return DEFAULT_INITIAL_CHECKPOINTS;
    }
  });

  // Checkpoint-specific Attendance Records: { [`${studentId}_${checkpointId}_${dateStr}`]: 'PRESENT' | 'ABSENT' | 'LATE' }
  const [residentialRecords, setResidentialRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(`spr_res_records_${activeTenantId || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save checkpoints to localStorage
  const saveCheckpoints = useCallback((newCheckpoints) => {
    setCheckpoints(newCheckpoints);
    try {
      localStorage.setItem(`spr_res_checkpoints_${activeTenantId || 'default'}`, JSON.stringify(newCheckpoints));
    } catch {}
  }, [activeTenantId]);

  // Listen to calendar settings
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
    };
    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
  }, []);

  // Fetch Lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [clsRes, staffRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/staff/'),
        ]);

        if (clsRes.status === 'fulfilled' && clsRes.value.ok) {
          const data = await clsRes.value.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setClasses(list);
        }

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          setStaffList(Array.isArray(sData) ? sData : sData.results || []);
        }
      } catch (err) {
        console.error('Failed to load classes or staff for residential attendance:', err);
      }
    };

    fetchLookups();
  }, [activeTenantId]);

  // Fetch Groups when Class changes
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
        console.warn('Failed to load groups:', err);
      }
    };

    fetchGroups();
  }, [selectedClassId]);

  // Load Residential Attendance Matrix
  const loadMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        class_id: selectedClassId || undefined,
        group_id: selectedGroupId || undefined,
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
      console.error('Error loading residential attendance matrix:', err);
      showToast('Failed to load residential attendance register', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedGroupId, selectedYear, selectedMonth, startDate, endDate, showToast]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Stepper Controls
  const getStepLabels = () => {
    if (!startDate || !endDate) {
      return { prev: 'Prev Month', next: 'Next Month' };
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (dayCount === 7) return { prev: 'Prev Week', next: 'Next Week' };
    if (dayCount === 14) return { prev: 'Prev 2 Weeks', next: 'Next 2 Weeks' };
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

  // Checkpoint Right Sidebar Handlers
  const handleOpenAddCheckpoint = () => {
    openRightSidebar({
      title: 'Add Residential Checkpoint',
      width: 560,
      content: (
        <CheckpointForm
          onSaved={(newChk) => {
            saveCheckpoints([...checkpoints, newChk]);
            showToast('New residential checkpoint added for all students.', 'success');
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleOpenEditCheckpoint = (chk) => {
    openRightSidebar({
      title: `Edit Checkpoint: ${chk.name}`,
      width: 560,
      content: (
        <CheckpointForm
          editingCheckpoint={chk}
          onSaved={(updatedChk) => {
            const updated = checkpoints.map((c) => (c.id === chk.id ? updatedChk : c));
            saveCheckpoints(updated);
            showToast('Checkpoint updated successfully.', 'success');
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  const handleDeleteCheckpoint = (chkId) => {
    if (checkpoints.length <= 1) {
      showToast('At least one checkpoint row is required in the register.', 'warning');
      return;
    }
    const updated = checkpoints.filter((c) => c.id !== chkId);
    saveCheckpoints(updated);
    showToast('Checkpoint row removed.', 'info');
  };

  // Toggle Cell Attendance Handler for individual Checkpoint row
  const handleToggleCell = async (studentId, dateStr, currentStatus, checkpointId) => {
    let nextStatus = 'PRESENT';
    if (currentStatus === 'PRESENT') nextStatus = 'ABSENT';
    else if (currentStatus === 'ABSENT') nextStatus = 'LATE';
    else if (currentStatus === 'LATE') nextStatus = 'PRESENT';

    const recordKey = `${studentId}_${checkpointId}_${dateStr}`;

    setResidentialRecords((prev) => {
      const next = { ...prev, [recordKey]: nextStatus };
      try {
        localStorage.setItem(`spr_res_records_${activeTenantId || 'default'}`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
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
            status: nextStatus,
          },
        ],
      });
    } catch (err) {
      console.warn('Residential attendance marked locally:', err);
    }
  };

  // Checkpoint Options for Dropdown Filter
  const checkpointOptions = [
    { value: 'ALL', label: `All Checkpoints (${checkpoints.length} Active Slots)` },
    ...checkpoints.map((c) => ({
      value: c.id,
      label: `${c.time} — ${c.name}`,
    })),
    { value: '__ADD_NEW__', label: '+ Add More Checkpoint...' },
  ];

  const activeCheckpoints = useMemo(() => {
    if (!selectedCheckpointId || selectedCheckpointId === 'ALL') return checkpoints;
    return checkpoints.filter((c) => c.id === selectedCheckpointId);
  }, [checkpoints, selectedCheckpointId]);

  // Get Total Metrics per student across all checkpoints
  const getStudentTotals = useCallback((studentId) => {
    let present = 0;
    let late = 0;
    let absent = 0;
    if (!matrixData || !matrixData.days_header) {
      return { present: 0, late: 0, absent: 0, attendance_rate: 0 };
    }

    matrixData.days_header.forEach((d) => {
      const dateStr =
        d.date ||
        `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      activeCheckpoints.forEach((chk) => {
        const recordKey = `${studentId}_${chk.id}_${dateStr}`;
        const status = residentialRecords[recordKey];

        if (status === 'PRESENT') present++;
        else if (status === 'LATE') late++;
        else if (status === 'ABSENT') absent++;
      });
    });

    const totalMarked = present + late + absent;
    const rate = totalMarked > 0 ? Math.round(((present + late * 0.5) / totalMarked) * 100) : 0;
    return { present, late, absent, attendance_rate: rate };
  }, [matrixData, activeCheckpoints, residentialRecords, selectedYear, selectedMonth]);

  // Month Names & Titles
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

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

  // Options
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

  // Distinct Student Rows from matrixData
  const uniqueStudents = useMemo(() => {
    if (!matrixData || !matrixData.students_matrix) return [];
    const seen = new Set();
    const list = [];
    for (const r of matrixData.students_matrix) {
      if (!seen.has(r.student_id)) {
        seen.add(r.student_id);
        list.push(r);
      }
    }
    return list;
  }, [matrixData]);

  // Action Menu Items
  const headerActionMenuItems = [
    {
      label: 'Add More Checkpoint',
      icon: PlusIcon,
      onClick: handleOpenAddCheckpoint,
    },
    {
      label: 'Print Register',
      icon: PrintIcon,
      onClick: () => window.print(),
    },
    {
      label: 'Refresh Register',
      icon: RefreshIcon,
      onClick: loadMatrix,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1720px] w-full mx-auto min-h-screen theme-text-primary animate-fade-in select-none">
      {/* 1. Header Hub with PageHeader */}
      {!hideHeader && (
        <div className="print:hidden">
          <PageHeader
            icon={MatrixIcon}
            title="Residential Attendance"
            subtitle="Residential dormitory roll call register with customizable checkpoint rows and scheduled timing"
            actions={
              <div className="flex items-center gap-2">
                {/* Take Attendance Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
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
                      <TimerIcon className="w-4 h-4" />
                      <span>Take Attendance</span>
                    </>
                  )}
                </button>

                <ActionMenu items={headerActionMenuItems} />
              </div>
            }
          />
        </div>
      )}

      {/* 2. Unified Header & Filter Card */}
      <div className="p-5 rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 print:hidden">
        {/* Top Row: Date Display & Stepper */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
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

            {isHijriEnabled && (
              <p className="text-xs theme-accent font-medium pl-6">
                Islamic Hijri: <span className="font-semibold">{hijriTitle}</span>
              </p>
            )}
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={handleStepBackward}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              <span>←</span>
              <span>{stepLabels.prev}</span>
            </button>
            <button
              type="button"
              onClick={handleStepForward}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              <span>{stepLabels.next}</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Filters Row: Class, Group, Checkpoint Dropdown, Date Range */}
        <div className="border-t theme-border pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
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

          {/* 3. Checkpoint Filter Dropdown */}
          <div>
            <CustomSelect
              label="Residential Checkpoint"
              value={selectedCheckpointId}
              onChange={(val) => {
                if (val === '__ADD_NEW__') {
                  handleOpenAddCheckpoint();
                } else {
                  setSelectedCheckpointId(val);
                }
              }}
              options={checkpointOptions}
              placeholder="All Checkpoints"
              searchable={false}
            />
          </div>

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

      {/* 4. Residential Attendance Matrix Table */}
      <div className="rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs theme-text-secondary flex flex-col items-center justify-center gap-3">
            <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
            <span>Generating residential attendance register...</span>
          </div>
        ) : !matrixData || uniqueStudents.length === 0 ? (
          <div className="p-16 text-center text-xs theme-text-secondary">
            No students found for this class and residential group selection.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left border-collapse text-[11px]">
              {/* Sticky Headers */}
              <thead className="sticky top-0 z-20 theme-bg-sub border-b theme-border shadow-xs select-none">
                <tr className="border-b theme-border text-center font-bold">
                  <th className="py-3 px-3 w-12 sticky left-0 z-30 theme-bg-sub border-r theme-border text-xs">
                    Roll
                  </th>
                  <th className="py-3 px-3 min-w-[150px] sticky left-12 z-30 theme-bg-sub border-r theme-border text-left text-xs">
                    Student Name
                  </th>
                  <th className="py-3 px-3 min-w-[180px] border-r theme-border text-left text-xs">
                    <div className="flex items-center gap-1.5">
                      <TimerIcon className="w-3.5 h-3.5 theme-accent" />
                      <span>Time & Checkpoint</span>
                    </div>
                  </th>

                  {/* Day Columns */}
                  {matrixData.days_header.map((d) => {
                    const fullDateStr =
                      d.date ||
                      `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                    const hijriDayNumber = isHijriEnabled
                      ? getHijriDateString(fullDateStr).split(' ')[0]
                      : null;
                    const isWeekend = d.is_weekend;
                    const isHoliday = d.is_holiday;

                    return (
                      <th
                        key={d.date || d.day}
                        className={`py-3 px-1 min-w-[36px] sm:min-w-[42px] font-mono border-r theme-border transition-colors ${
                          isWeekend
                            ? 'bg-rose-400/[0.045] dark:bg-rose-400/[0.08] text-rose-500/80'
                            : isHoliday
                            ? 'theme-bg-accent-soft theme-accent'
                            : ''
                        }`}
                        title={d.holiday_title || `${d.weekday} - ${fullDateStr}`}
                      >
                        <div className="flex flex-col items-center justify-between min-h-[58px] py-0.5">
                          <div className="space-y-0.5">
                            <div className="font-bold text-sm sm:text-base tracking-tight leading-none theme-text-primary">
                              {d.day}
                            </div>
                            {isHijriEnabled && hijriDayNumber && (
                              <div className="text-[11px] sm:text-xs font-mono theme-accent font-semibold leading-none pt-0.5">
                                {hijriDayNumber}
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] font-semibold uppercase opacity-60 leading-none mt-2.5 pt-1.5 border-t theme-border w-full text-center">
                            {d.weekday.slice(0, 2)}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  <th className="py-3 px-2 w-11 text-emerald-600/90 dark:text-emerald-400/90 border-l theme-border text-xs" title="Present">P</th>
                  <th className="py-3 px-2 w-11 text-amber-600/90 dark:text-amber-400/90 text-xs" title="Late">L</th>
                  <th className="py-3 px-2 w-11 text-rose-500/85 dark:text-rose-400/85 text-xs" title="Absent">A</th>
                  <th className="py-3 px-2 w-20 sm:w-24 min-w-[76px] text-right pr-4 text-xs" title="Attendance Rate %">Rate %</th>
                </tr>
              </thead>

              {/* Student Rows Iterated Across Checkpoints */}
              <tbody>
                {uniqueStudents.map((student, sIdx) => {
                  const studentTotals = getStudentTotals(student.student_id);

                  return activeCheckpoints.map((chk, chkIdx) => {
                    const isFirstRow = chkIdx === 0;

                    return (
                      <tr
                        key={`${student.student_id}_${chk.id}`}
                        className={`border-b theme-border hover:theme-bg-elevated/40 transition-colors h-11 sm:h-12 ${
                          isFirstRow && sIdx > 0 ? 'border-t border-t-[var(--border-color)]' : ''
                        }`}
                      >
                        {/* Sticky Roll No (Merged with rowSpan) */}
                        {isFirstRow && (
                          <td
                            rowSpan={activeCheckpoints.length}
                            className="py-2.5 px-3 text-center font-bold font-mono sticky left-0 z-10 theme-bg-surface border-r border-b theme-border theme-text-primary align-middle"
                          >
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold font-mono shadow-xs">
                              {student.roll_number || '—'}
                            </span>
                          </td>
                        )}

                        {/* Sticky Student Name (Merged with rowSpan) */}
                        {isFirstRow && (
                          <td
                            rowSpan={activeCheckpoints.length}
                            onClick={() => onStudentClick && onStudentClick(student.student_id)}
                            className={`py-2.5 px-3 sticky left-12 z-10 theme-bg-surface border-r border-b theme-border align-middle ${
                              onStudentClick ? 'cursor-pointer hover:underline' : ''
                            }`}
                          >
                            <div className="font-bold theme-text-primary truncate max-w-[140px]" title={student.name}>
                              {student.name}
                            </div>
                            <div className="text-[10px] theme-text-secondary truncate max-w-[140px] mt-0.5">
                              {student.group_name || student.class_name}
                            </div>
                          </td>
                        )}

                        {/* Dedicated Time & Checkpoint Column */}
                        <td className="py-2.5 px-3 border-r theme-border theme-bg-sub/30 min-w-[170px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs theme-text-primary">
                              {chk.time || '--:--'}
                            </span>
                          </div>
                          <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[160px] mt-0.5" title={chk.name}>
                            {chk.name}
                          </div>
                        </td>

                        {/* Day Status Cells (Independent per Checkpoint) */}
                        {matrixData.days_header.map((d) => {
                          const dateStr =
                            d.date ||
                            `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                          const recordKey = `${student.student_id}_${chk.id}_${dateStr}`;
                          const status = residentialRecords[recordKey];
                          const isWeekend = d.is_weekend;
                          const isHoliday = d.is_holiday;
                          const isOffDay = isWeekend || isHoliday;
                          const canEditCell = isEditing && !isOffDay;

                          return (
                            <td
                              key={d.date || d.day}
                              onClick={() => {
                                if (canEditCell) {
                                  handleToggleCell(student.student_id, dateStr, status, chk.id);
                                }
                              }}
                              className={`py-2 px-1 min-w-[36px] sm:min-w-[42px] text-center font-mono text-[10px] border-r theme-border transition-colors ${
                                isWeekend
                                  ? 'bg-rose-400/[0.025] dark:bg-rose-400/[0.045]'
                                  : ''
                              } ${
                                canEditCell
                                  ? 'cursor-pointer select-none hover:theme-bg-elevated/80'
                                  : 'cursor-default'
                              }`}
                              title={`${dateStr} [${chk.name}]: ${status || 'Unrecorded'}`}
                            >
                              {status === 'PRESENT' ? (
                                <FilledCheckCircleIcon className="w-4.5 h-4.5 text-emerald-600/80 dark:text-emerald-400/85 hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs" />
                              ) : status === 'ABSENT' ? (
                                <FilledXCircleIcon className="w-4.5 h-4.5 text-rose-500/75 dark:text-rose-400/80 hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs" />
                              ) : status === 'LATE' ? (
                                <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-amber-500/10 text-amber-600/85 dark:text-amber-400/85 font-bold text-[10px] hover:scale-125 active:scale-95 transition-transform">
                                  L
                                </span>
                              ) : status === 'HALF_DAY' ? (
                                <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-sky-500/10 text-sky-600/85 dark:text-sky-400/85 font-bold text-[10px]">
                                  H
                                </span>
                              ) : status === 'ON_LEAVE' ? (
                                <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-purple-500/10 text-purple-600/85 dark:text-purple-400/85 font-bold text-[10px]">
                                  LV
                                </span>
                              ) : isOffDay ? (
                                <span className="opacity-35 font-mono text-xs select-none">—</span>
                              ) : canEditCell ? (
                                <span className="inline-block w-3.5 h-3.5 rounded-full border theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all"></span>
                              ) : (
                                <span className="opacity-25 font-mono text-xs select-none">·</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Metrics (Merged per Student with rowSpan) */}
                        {isFirstRow && (
                          <>
                            <td
                              rowSpan={activeCheckpoints.length}
                              className="py-2.5 px-1 text-center font-bold font-mono text-emerald-600/90 dark:text-emerald-400/90 border-l theme-border align-middle"
                            >
                              {studentTotals.present}
                            </td>
                            <td
                              rowSpan={activeCheckpoints.length}
                              className="py-2.5 px-1 text-center font-bold font-mono text-amber-600/90 dark:text-amber-400/90 align-middle"
                            >
                              {studentTotals.late}
                            </td>
                            <td
                              rowSpan={activeCheckpoints.length}
                              className="py-2.5 px-1 text-center font-bold font-mono text-rose-500/85 dark:text-rose-400/85 align-middle"
                            >
                              {studentTotals.absent}
                            </td>
                            <td
                              rowSpan={activeCheckpoints.length}
                              className="py-2.5 px-2 text-right pr-4 font-mono align-middle"
                            >
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                                  studentTotals.attendance_rate >= 85
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                    : studentTotals.attendance_rate >= 70
                                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                                }`}
                              >
                                {studentTotals.attendance_rate}%
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
