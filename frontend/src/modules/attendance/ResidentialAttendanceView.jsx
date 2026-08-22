import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { calendarSettings, attendanceFilters } from '../../utils/localStore';
import { getHijriDateString } from '../../utils/hijriUtils';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';

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

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const todayStr = new Date().toISOString().split('T')[0];

  const savedFilters = useMemo(() => {
    return attendanceFilters.getResidentialFilters(activeTenantId) || {};
  }, [activeTenantId]);

  // Class, Group & Checkpoint Filters
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(() => propClassId || savedFilters.classId || '');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => propGroupId || savedFilters.groupId || '');
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(() => savedFilters.checkpointId || 'ALL');

  // Date Navigation State
  const [selectedYear, setSelectedYear] = useState(() => savedFilters.year || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => savedFilters.month || (new Date().getMonth() + 1));
  const [startDate, setStartDate] = useState(() => {
    if (savedFilters.hasExplicitDateChoice) return savedFilters.startDate || '';
    if (isSmallScreen) return todayStr;
    return savedFilters.startDate || '';
  });
  const [endDate, setEndDate] = useState(() => {
    if (savedFilters.hasExplicitDateChoice) return savedFilters.endDate || '';
    if (isSmallScreen) return todayStr;
    return savedFilters.endDate || '';
  });

  // Attendance Marking State
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Persist filters to localStorage
  useEffect(() => {
    attendanceFilters.saveResidentialFilters(activeTenantId, {
      classId: selectedClassId,
      groupId: selectedGroupId,
      checkpointId: selectedCheckpointId,
      year: selectedYear,
      month: selectedMonth,
      startDate,
      endDate,
      hasExplicitDateChoice: true,
    });
  }, [selectedClassId, selectedGroupId, selectedCheckpointId, selectedYear, selectedMonth, startDate, endDate, activeTenantId]);


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

  // Listen to Escape key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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
          if (list.length > 0) {
            const isValid = selectedClassId && list.some(c => String(c.id) === String(selectedClassId));
            if (!isValid) {
              const matchingSaved = savedFilters.classId && list.some(c => String(c.id) === String(savedFilters.classId));
              setSelectedClassId(matchingSaved ? String(savedFilters.classId) : String(list[0].id));
            }
          } else {
            setSelectedClassId('');
          }
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
    if (!selectedClassId && classes.length > 0) {
      return;
    }
    if (!selectedClassId && !propClassId && classes.length === 0) {
      return;
    }

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
  }, [selectedClassId, selectedGroupId, selectedYear, selectedMonth, startDate, endDate, classes.length, propClassId, showToast]);

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

  const { openDrawer, closeDrawer } = useRightSidebar();

  // Universal Drawer Registration for Residential Checkpoint (survives F5 refresh)
  useDrawerRegistration(
    'checkpoint',
    (params) => {
      const mode = params.get('mode') || 'add';
      const chkId = params.get('id');
      const foundChk = chkId ? checkpoints.find((c) => String(c.id) === String(chkId)) : null;

      return {
        title: mode === 'add' ? 'Add Residential Checkpoint' : `Edit Checkpoint: ${foundChk?.name || 'Checkpoint'}`,
        category: 'Residential Attendance',
        size: 'md',
        width: 560,
        content: (
          <CheckpointForm
            editingCheckpoint={foundChk}
            onSaved={(savedChk) => {
              if (mode === 'add') {
                saveCheckpoints([...checkpoints, savedChk]);
                showToast('New residential checkpoint added for all students.', 'success');
              } else {
                const updated = checkpoints.map((c) => (c.id === savedChk.id ? savedChk : c));
                saveCheckpoints(updated);
                showToast('Checkpoint updated successfully.', 'success');
              }
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [checkpoints, closeDrawer, showToast]
  );

  // Checkpoint Right Sidebar Handlers
  const handleOpenAddCheckpoint = () => {
    openDrawer('checkpoint', { mode: 'add' });
  };

  const handleOpenEditCheckpoint = (chk) => {
    openDrawer('checkpoint', { mode: 'edit', id: chk.id });
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
    // Strictly disable on off-days (holiday/weekend)
    const dayHeader = matrixData?.days_header?.find(
      (d) => d.date === dateStr || String(d.day) === String(dateStr)
    );
    if (dayHeader?.is_holiday || dayHeader?.is_weekend) {
      showToast('Attendance marking is disabled on holidays and weekends.', 'warning');
      return;
    }

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
  const computeStudentTotals = useCallback((studentId) => {
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

  const getStudentTotals = computeStudentTotals;


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

  // Toggle "Take Attendance" mode
  const handleToggleTakeAttendance = () => {
    setIsEditing((prev) => {
      const next = !prev;
      if (next) {
        setIsFullscreen(true);
        showToast('Residential attendance marking enabled in Full Screen view. Click any cell to record.', 'info');
      } else {
        showToast('Residential attendance saved.', 'success');
      }
      return next;
    });
  };

  // Action Menu Items
  const headerActionMenuItems = [
    {
      label: isFullscreen ? 'Exit Full Screen' : 'Full Screen View',
      icon: isFullscreen ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 4v6m0 0H4m6 0L3 3m10 7h6m-6 0V4m0 6l7-7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      ),
      onClick: () => setIsFullscreen((prev) => !prev),
    },
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

  const tableScrollRef = useRef(null);

  // Enable Shift + Mouse Wheel Left-Right horizontal scroll
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.shiftKey && e.deltaY !== 0) {
        el.scrollLeft += e.deltaY * 1.2;
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const selectedClassName = classes.find((c) => String(c.id) === selectedClassId)?.name || 'All Classes';
  const selectedGroupName = groups.find((g) => String(g.id) === selectedGroupId)?.name || '';

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const content = (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] theme-bg-app p-3 sm:p-4 flex flex-col justify-between overflow-hidden shadow-2xl animate-fade-in select-none w-screen h-screen"
          : "p-4 md:p-6 space-y-6 max-w-[1720px] w-full mx-auto min-h-screen theme-text-primary animate-fade-in select-none"
      }
    >
      {/* 1. Header Hub with PageHeader (Hidden when in Full Screen) */}
      {!isFullscreen && !hideHeader && (
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
                  onClick={handleToggleTakeAttendance}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                    isEditing
                      ? 'theme-bg-accent theme-accent-text hover:opacity-90 ring-2 ring-[var(--accent-main)]/40 shadow-sm'
                      : 'theme-bg-accent theme-accent-text hover:opacity-90'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <FilledCheckCircleIcon className="w-4 h-4" />
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

      {/* 2. Fullscreen Single-Line Top Header Bar (Only Header Title & Attendance Button) */}
      {isFullscreen && (
        <div className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl theme-bg-surface border theme-border flex items-center justify-between gap-3 shadow-xs print:hidden">
          {/* Left: Only Header Title */}
          <div className="flex items-center gap-2.5">
            <MatrixIcon className="w-5 h-5 theme-accent shrink-0" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
              Residential Attendance
            </h1>
          </div>

          {/* Right: Only Attendance Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleTakeAttendance}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isEditing
                  ? 'theme-bg-accent theme-accent-text hover:opacity-90 ring-2 ring-[var(--accent-main)]/40 shadow-sm'
                  : 'theme-bg-accent theme-accent-text hover:opacity-90'
              }`}
            >
              {isEditing ? (
                <>
                  <FilledCheckCircleIcon className="w-4 h-4" />
                  <span>Done Marking</span>
                </>
              ) : (
                <>
                  <TimerIcon className="w-4 h-4" />
                  <span>Take Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Unified Header & Filter Card (Shown only when NOT in fullscreen) */}
      {!isFullscreen && (
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 print:hidden">
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
          <div className="border-t theme-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
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
                label="Select Date Range"
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
      )}

      {/* 4. Residential Attendance Matrix Table */}
      <div
        className={
          isFullscreen
            ? "flex-1 overflow-hidden flex flex-col rounded-2xl theme-bg-surface border theme-border shadow-md my-2"
            : "rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden"
        }
      >
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
          <div ref={tableScrollRef} className={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}>
            <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
              {/* Sticky Headers */}
              <thead className="sticky top-0 z-30 theme-bg-sub select-none">
                <tr className="text-center font-bold">
                  <th className="py-2.5 px-0.5 sm:px-1 w-[36px] min-w-[36px] max-w-[36px] sm:w-[42px] sm:min-w-[42px] sm:max-w-[42px] sticky left-0 z-40 theme-bg-sub border-r border-b theme-border text-xs text-center">
                    Roll
                  </th>
                  <th className="py-2.5 px-2 sm:px-2.5 w-[110px] min-w-[110px] max-w-[110px] sm:w-[140px] sm:min-w-[140px] sm:max-w-[140px] left-[36px] sm:left-[42px] sticky z-40 theme-bg-sub border-r border-b theme-border text-left text-xs shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]">
                    Student Name
                  </th>
                  <th className="py-2.5 px-1.5 sm:px-2 w-[100px] min-w-[100px] max-w-[100px] sm:w-[125px] sm:min-w-[125px] sm:max-w-[125px] border-r border-b theme-border text-left text-xs">
                    <div className="flex items-center gap-1">
                      <TimerIcon className="w-3 h-3 theme-accent shrink-0" />
                      <span className="truncate">Time & Checkpoint</span>
                    </div>
                  </th>

                  {/* Day Columns */}
                  {matrixData.days_header.map((d) => {
                    const fullDateStr =
                      d.date ||
                      `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                    const isToday =
                      new Date().toISOString().split('T')[0] === fullDateStr;

                    return (
                      <th
                        key={d.date || d.day}
                        className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] border-r border-b theme-border text-center transition-colors ${
                          d.is_weekend
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : isToday
                            ? 'bg-[var(--accent-main)]/15 theme-accent'
                            : ''
                        }`}
                      >
                        <div className="text-[10px] font-medium opacity-75">{d.weekday}</div>
                        <div className="text-xs font-bold">{d.day}</div>
                        {isHijriEnabled && (
                          <div className="text-[8px] font-normal opacity-50">
                            {getHijriDateString(fullDateStr).split(' ')[0]}
                          </div>
                        )}
                      </th>
                    );
                  })}

                  <th className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold border-l border-b theme-border text-emerald-600 dark:text-emerald-400 text-xs">P</th>
                  <th className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold text-amber-600 dark:text-amber-400 border-l border-b theme-border text-xs">L</th>
                  <th className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold text-rose-500 dark:text-rose-400 border-l border-b theme-border text-xs">A</th>
                  <th className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold text-xs border-l border-r border-b theme-border">Rate %</th>
                </tr>
              </thead>

              {/* Student Rows Iterated Across Checkpoints */}
              <tbody className="divide-y theme-border font-sans">
                {uniqueStudents.map((student, sIdx) => {
                  const studentTotals = computeStudentTotals(student.student_id);

                  return activeCheckpoints.map((chk, chkIdx) => {
                    const isFirstRow = chkIdx === 0;

                    return (
                      <tr
                        key={`${student.student_id}_${chk.id}`}
                        className={`hover:theme-bg-sub/60 transition-colors ${
                          isFirstRow && activeCheckpoints.length > 1 ? 'border-t-2 theme-border' : ''
                        }`}
                      >
                        {/* Sticky Roll No */}
                        {isFirstRow && (
                          <td
                            rowSpan={activeCheckpoints.length}
                            className="py-2 px-0.5 sm:px-1 w-[36px] min-w-[36px] max-w-[36px] sm:w-[42px] sm:min-w-[42px] sm:max-w-[42px] text-center font-bold font-mono sticky left-0 z-20 theme-bg-surface border-r border-b theme-border theme-text-primary align-middle"
                          >
                            <span className="inline-flex items-center justify-center font-bold font-mono text-xs">
                              {student.roll_number || '—'}
                            </span>
                          </td>
                        )}

                        {/* Sticky Student Name */}
                        {isFirstRow && (
                          <td
                            rowSpan={activeCheckpoints.length}
                            onClick={() => onStudentClick && onStudentClick(student.student_id)}
                            className={`py-2 px-2 sm:px-2.5 w-[110px] min-w-[110px] max-w-[110px] sm:w-[140px] sm:min-w-[140px] sm:max-w-[140px] left-[36px] sm:left-[42px] sticky z-20 theme-bg-surface border-r border-b theme-border align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] ${
                              onStudentClick ? 'cursor-pointer hover:underline' : ''
                            }`}
                          >
                            <div className="font-semibold text-xs theme-text-primary truncate max-w-[95px] sm:max-w-[125px]" title={student.name}>
                              {student.name}
                            </div>
                            <div className="text-[10px] theme-text-secondary truncate max-w-[95px] sm:max-w-[125px] mt-0.5">
                              {student.group_name || student.class_name}
                            </div>
                          </td>
                        )}

                        {/* Dedicated Time & Checkpoint Column */}
                        <td className="py-2 px-1.5 sm:px-2 border-r border-b theme-border w-[100px] min-w-[100px] max-w-[100px] sm:w-[125px] sm:min-w-[125px] sm:max-w-[125px]">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs font-semibold theme-text-primary truncate">
                              {chk.time || '--:--'}
                            </span>
                          </div>
                          <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[90px] sm:max-w-[115px] mt-0.5" title={chk.name}>
                            {chk.name}
                          </div>
                        </td>

                        {/* Day Status Cells */}
                        {matrixData.days_header.map((d) => {
                          const dateStr =
                            d.date ||
                            `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                          const recordKey = `${student.student_id}_${chk.id}_${dateStr}`;
                          const status = residentialRecords[recordKey];
                          const isOffDay = d.is_weekend || d.is_holiday;
                          const canEditCell = isEditing && !isOffDay;

                          return (
                            <td
                              key={d.date || d.day}
                              onClick={() => {
                                if (canEditCell) {
                                  handleToggleCell(student.student_id, dateStr, status, chk.id);
                                }
                              }}
                              className={`py-2 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-mono text-[10px] border-r border-b theme-border transition-colors ${
                                isOffDay
                                  ? 'cursor-not-allowed select-none bg-zinc-500/[0.04] dark:bg-zinc-400/[0.04] opacity-60'
                                  : d.is_weekend
                                  ? 'bg-rose-400/[0.025] dark:bg-rose-400/[0.045]'
                                  : ''
                              } ${
                                canEditCell
                                  ? 'cursor-pointer select-none hover:theme-bg-elevated/80'
                                  : isOffDay
                                  ? 'cursor-not-allowed'
                                  : 'cursor-default'
                              }`}
                              title={
                                isOffDay
                                  ? `${d.holiday_title || (d.is_weekend ? 'Weekly Weekend' : 'Holiday')} (No Attendance Allowed)`
                                  : isEditing
                                  ? `${dateStr} [${chk.name}]: ${status || 'Unrecorded'} (Click to change)`
                                  : `${dateStr} [${chk.name}]: ${status || 'Unrecorded'}`
                              }
                            >
                              {status === 'PRESENT' ? (
                                <FilledCheckCircleIcon className="w-4 h-4 text-emerald-600/80 inline-block" />
                              ) : status === 'ABSENT' ? (
                                <FilledXCircleIcon className="w-4 h-4 text-rose-500/75 inline-block" />
                              ) : status === 'LATE' ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/10 text-amber-600 font-bold">L</span>
                              ) : status === 'HALF_DAY' ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500/10 text-sky-600 font-bold">H</span>
                              ) : status === 'ON_LEAVE' ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-500/10 text-purple-600 font-bold">LV</span>
                              ) : isOffDay ? (
                                <span className="opacity-35 font-mono text-xs select-none">—</span>
                              ) : canEditCell ? (
                                <span className="inline-block w-3.5 h-3.5 rounded-md border border-dashed theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all opacity-70 hover:opacity-100" title="Click to mark Present"></span>
                              ) : (
                                <span className="opacity-35 font-mono text-xs select-none theme-text-secondary">—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Metrics */}
                        {isFirstRow && (
                          <>
                            <td rowSpan={activeCheckpoints.length} className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 border-l border-b theme-border align-middle">
                              {studentTotals.present}
                            </td>
                            <td rowSpan={activeCheckpoints.length} className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono text-amber-600 dark:text-amber-400 border-l border-b theme-border align-middle">
                              {studentTotals.late}
                            </td>
                            <td rowSpan={activeCheckpoints.length} className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold font-mono text-rose-500 dark:text-rose-400 border-l border-b theme-border align-middle">
                              {studentTotals.absent}
                            </td>
                            <td rowSpan={activeCheckpoints.length} className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold font-mono text-xs border-l border-r border-b theme-border align-middle">
                              <span
                                className={
                                  studentTotals.attendance_rate >= 85
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : studentTotals.attendance_rate >= 70
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
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

        {/* Legend Ribbon & Bottom Controls */}
        <div className="p-3 sm:p-3.5 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3 text-[11px] theme-text-secondary shrink-0">
          <div className="flex items-center gap-3.5 flex-wrap font-mono">
            <span className="flex items-center gap-1.5">
              <FilledCheckCircleIcon className="w-3.5 h-3.5 text-emerald-600/85" /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <FilledXCircleIcon className="w-3.5 h-3.5 text-rose-500/80" /> Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-[9px]">L</span> Late
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-500/10 text-sky-600 font-bold flex items-center justify-center text-[9px]">H</span> Half Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-[9px]">LV</span> Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="opacity-35 font-mono text-xs">—</span> Holiday / Weekend
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="font-mono font-medium">
              Total Students: <strong className="theme-text-primary">{uniqueStudents.length}</strong>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={isFullscreen ? "Exit Full Screen View (Esc)" : "Enter Full Screen View"}
            >
              {isFullscreen ? (
                <>
                  <svg className="w-3.5 h-3.5 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 4v6m0 0H4m6 0L3 3m10 7h6m-6 0V4m0 6l7-7" />
                  </svg>
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
}
