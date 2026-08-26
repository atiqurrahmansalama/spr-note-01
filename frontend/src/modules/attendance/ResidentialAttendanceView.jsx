import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  RefreshIcon,
  CalendarIcon,
  TimerIcon,
  PrintIcon,
  DownloadIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  AttendanceIcon,
  FullScreenIcon,
  MinimizeIcon,
  ClockIcon,
  TimelineIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import { ClassSelect, GroupSelect, DateRangePicker } from '../../components/selectors';
import CheckpointForm from './CheckpointForm';
import AdminAttendanceDrawer from '../../components/common/AdminAttendanceDrawer';
import { fetchWithAuth } from '../../utils/authService';
import { getMonthlyAttendanceMatrix } from '../../api/attendance';
import {
  calendarSettings,
  attendanceFilters,
  masterCalendarStore,
  attendanceTimingPolicyStore,
  academicYearsStore,
} from '../../utils/localStore';
import { getHijriDateString, getCurrentHijriMonthRange } from '../../utils/hijriUtils';
import { getEventColors, DayAgendaDrawer, TimeScheduleDrawerForm } from '../../components/calendar';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import {
  ATTENDANCE_STATUSES,
  getAttendanceRateColor,
} from '../../constants/attendanceConstants';
import {
  getAttendanceCellTimingState,
  cycleStatusWithinAllowed,
  calculateLateDelayMinutes,
} from '../../utils/attendanceTimingEngine';
import AttendanceTable, { TakeAttendanceButton, AttendanceDateStepper } from '../../components/common/AttendanceTable';
import ScheduleTimelineDrawer from '../../components/common/ScheduleTimelineDrawer';
import { useFullscreen } from '../../hooks/useFullscreen';

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

export default function ResidentialAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
} = {}) {
  const { showToast } = useToast();
  const { activeTenantId, isMultiTenantAdmin } = useTenant();
  const { openRightSidebar, closeRightSidebar, openDrawer } = useRightSidebar();

  const userProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem('spr_user_profile');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);
  const isAdmin = Boolean(
    isMultiTenantAdmin ||
    userProfile.is_superuser ||
    userProfile.user_type === 'SUPER_ADMIN' ||
    userProfile.user_type === 'ADMIN' ||
    userProfile.role_code === 'ADMIN' ||
    userProfile.role_code === 'PRINCIPAL'
  );

  const [timingPolicy, setTimingPolicy] = useState(() => attendanceTimingPolicyStore.getPolicy(activeTenantId));

  useEffect(() => {
    attendanceTimingPolicyStore.fetchRemotePolicy(activeTenantId).then((res) => {
      if (res) setTimingPolicy(res);
    });

    const handlePolicyUpdate = (e) => {
      setTimingPolicy(e.detail || attendanceTimingPolicyStore.getPolicy(activeTenantId));
    };

    window.addEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    return () => {
      window.removeEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    };
  }, [activeTenantId]);

  const [academicYearsVersion, setAcademicYearsVersion] = useState(0);
  useEffect(() => {
    const handleAcademicUpdate = () => setAcademicYearsVersion((v) => v + 1);
    window.addEventListener('spr_academic_years_updated', handleAcademicUpdate);
    return () => window.removeEventListener('spr_academic_years_updated', handleAcademicUpdate);
  }, []);

  const academicBounds = useMemo(() => {
    return academicYearsStore.getDateBounds(activeTenantId);
  }, [activeTenantId, academicYearsVersion]);

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

  // Date Navigation State (identical to Class Attendance)
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

  // Attendance Marking & UI State
  const [isEditing, setIsEditing] = useState(false);
  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen();
  const [isLoading, setIsLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());
  const [calendarEventsVersion, setCalendarEventsVersion] = useState(0);

  // Roster & Matrix Data
  const [matrixData, setMatrixData] = useState(null);
  const tableScrollRef = useRef(null);

  // Dynamic Residential Checkpoints
  const [checkpoints, setCheckpoints] = useState(() => {
    try {
      const saved = localStorage.getItem(`spr_res_checkpoints_${activeTenantId || 'default'}`);
      return saved ? JSON.parse(saved) : DEFAULT_INITIAL_CHECKPOINTS;
    } catch {
      return DEFAULT_INITIAL_CHECKPOINTS;
    }
  });

  // Checkpoint-specific Attendance Records: { [`${studentId}_${checkpointId}_${dateStr}`]: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' }
  const [residentialRecords, setResidentialRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(`spr_res_records_${activeTenantId || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Update Checkpoints and Records on activeTenantId change
  useEffect(() => {
    try {
      const savedCp = localStorage.getItem(`spr_res_checkpoints_${activeTenantId || 'default'}`);
      setCheckpoints(savedCp ? JSON.parse(savedCp) : DEFAULT_INITIAL_CHECKPOINTS);
      const savedRec = localStorage.getItem(`spr_res_records_${activeTenantId || 'default'}`);
      setResidentialRecords(savedRec ? JSON.parse(savedRec) : {});
    } catch {
      setCheckpoints(DEFAULT_INITIAL_CHECKPOINTS);
      setResidentialRecords({});
    }
  }, [activeTenantId]);

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

  // Listen to live calendar setting changes
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
    };
    const handleCalendarUpdate = () => {
      setCalendarEventsVersion((v) => v + 1);
    };

    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    window.addEventListener('spr_calendar_events_updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
      window.removeEventListener('spr_calendar_events_updated', handleCalendarUpdate);
    };
  }, []);

  // Fetch Lookups & Initial Groups in parallel
  useEffect(() => {
    let isMounted = true;

    const fetchLookups = async () => {
      try {
        setMetadataLoaded(false);
        const initialClass = propClassId || savedFilters.classId || '';
        const [clsRes, grpRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth(initialClass ? `/api/v1/groups/?student_class=${initialClass}` : '/api/v1/groups/?page_size=500'),
        ]);

        if (!isMounted) return;

        if (clsRes.status === 'fulfilled' && clsRes.value.ok) {
          const data = await clsRes.value.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setClasses(list);
          if (list.length > 0) {
            const isValid = selectedClassId && (selectedClassId === 'ALL' || list.some(c => String(c.id) === String(selectedClassId)));
            if (!isValid) {
              const matchingSaved = savedFilters.classId && (savedFilters.classId === 'ALL' || list.some(c => String(c.id) === String(savedFilters.classId)));
              setSelectedClassId(matchingSaved ? String(savedFilters.classId) : 'ALL');
            }
          } else {
            setSelectedClassId('ALL');
          }
        }

        if (grpRes.status === 'fulfilled' && grpRes.value.ok) {
          const gData = await grpRes.value.json();
          setGroups(Array.isArray(gData) ? gData : gData.results || []);
        }
      } catch (err) {
        console.error('Failed to load classes for residential attendance:', err);
      } finally {
        if (isMounted) {
          setMetadataLoaded(true);
        }
      }
    };

    fetchLookups();

    const handleTenantChanged = () => {
      fetchLookups();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
    };
  }, [activeTenantId]);

  // Fetch Groups when Class changes subsequently
  useEffect(() => {
    if (!metadataLoaded || !selectedClassId || selectedClassId === 'ALL') {
      if (selectedClassId === 'ALL') {
        fetchWithAuth('/api/v1/groups/?page_size=500')
          .then((r) => r.json())
          .then((data) => setGroups(Array.isArray(data) ? data : data.results || []))
          .catch(() => {});
      }
      return;
    }
    let isMounted = true;

    const fetchGroups = async () => {
      try {
        const res = await fetchWithAuth(`/api/v1/groups/?student_class=${selectedClassId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setGroups(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.warn('Failed to load groups:', err);
      }
    };

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, [selectedClassId, metadataLoaded]);

  // Load Residential Attendance Matrix
  const loadMatrix = useCallback(async () => {
    if (!metadataLoaded && !propClassId) {
      return;
    }

    setIsLoading(true);
    try {
      const params = {
        class_id: selectedClassId && selectedClassId !== 'ALL' ? selectedClassId : undefined,
        group_id: selectedGroupId && selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
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
  }, [metadataLoaded, selectedClassId, selectedGroupId, selectedYear, selectedMonth, startDate, endDate, classes.length, propClassId, showToast]);

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
    if (dayCount === 1) return { prev: 'Prev Day', next: 'Next Day' };
    return { prev: 'Prev Period', next: 'Next Period' };
  };

  const stepLabels = getStepLabels();

  const isAtMinBound = useMemo(() => {
    if (isAdmin || !academicBounds.minDate) return false;
    if (startDate) {
      return startDate <= academicBounds.minDate;
    }
    const currentMonthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const currentMonthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    return currentMonthStart <= academicBounds.minDate || currentMonthEnd <= academicBounds.minDate;
  }, [isAdmin, academicBounds.minDate, startDate, selectedYear, selectedMonth]);

  const isAtMaxBound = useMemo(() => {
    if (isAdmin || !academicBounds.maxDate) return false;
    if (endDate) {
      return endDate >= academicBounds.maxDate;
    }
    const currentMonthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const maxMonthPrefix = academicBounds.maxDate.slice(0, 7);
    return currentMonthStart >= `${maxMonthPrefix}-01`;
  }, [isAdmin, academicBounds.maxDate, endDate, selectedYear, selectedMonth]);

  const handleGoToToday = useCallback(() => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setStartDate('');
    setEndDate('');
  }, []);

  const isCurrentPeriodToday = useMemo(() => {
    const now = new Date();
    if (startDate && endDate) {
      return todayStr >= startDate && todayStr <= endDate;
    }
    return selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);
  }, [startDate, endDate, selectedYear, selectedMonth, todayStr]);

  const handleStepBackward = () => {
    if (!startDate || !endDate) {
      let targetMonth = selectedMonth;
      let targetYear = selectedYear;
      if (selectedMonth === 1) {
        targetMonth = 12;
        targetYear = selectedYear - 1;
      } else {
        targetMonth = selectedMonth - 1;
      }

      // Enforce Academic Year bounds for non-admins
      if (!isAdmin && academicBounds.minDate) {
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
        const targetMonthEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayOfTargetMonth).padStart(2, '0')}`;
        if (targetMonthEnd < academicBounds.minDate) {
          showToast(`Navigation before the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted to administrators.`, 'warning');
          return;
        }
      }

      setSelectedMonth(targetMonth);
      setSelectedYear(targetYear);
      return;
    }

    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    s.setDate(s.getDate() - dayCount);
    e.setDate(e.getDate() - dayCount);
    const newStart = s.toISOString().split('T')[0];
    const newEnd = e.toISOString().split('T')[0];

    if (!isAdmin && academicBounds.minDate && newEnd < academicBounds.minDate) {
      showToast(`Navigation before the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted to administrators.`, 'warning');
      return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleStepForward = () => {
    if (!startDate || !endDate) {
      let targetMonth = selectedMonth;
      let targetYear = selectedYear;
      if (selectedMonth === 12) {
        targetMonth = 1;
        targetYear = selectedYear + 1;
      } else {
        targetMonth = selectedMonth + 1;
      }

      // Enforce Academic Year bounds for non-admins
      if (!isAdmin && academicBounds.maxDate) {
        const targetMonthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        if (targetMonthStart > academicBounds.maxDate) {
          showToast(`Navigation beyond the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted to administrators.`, 'warning');
          return;
        }
      }

      setSelectedMonth(targetMonth);
      setSelectedYear(targetYear);
      return;
    }

    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    s.setDate(s.getDate() + dayCount);
    e.setDate(e.getDate() + dayCount);
    const newStart = s.toISOString().split('T')[0];
    const newEnd = e.toISOString().split('T')[0];

    if (!isAdmin && academicBounds.maxDate && newStart > academicBounds.maxDate) {
      showToast(`Navigation beyond the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted to administrators.`, 'warning');
      return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleDateRangeSelect = (start, end) => {
    let safeStart = start;
    let safeEnd = end;
    if (!isAdmin && academicBounds.minDate && safeStart && safeStart < academicBounds.minDate) {
      showToast(`Selected date cannot precede the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}).`, 'warning');
      safeStart = academicBounds.minDate;
    }
    if (!isAdmin && academicBounds.maxDate && safeEnd && safeEnd > academicBounds.maxDate) {
      showToast(`Selected date cannot exceed the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}).`, 'warning');
      safeEnd = academicBounds.maxDate;
    }
    setStartDate(safeStart);
    setEndDate(safeEnd);
  };

  const handleResetDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  // Universal Drawer Registration for Residential Checkpoint
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
        content: (
          <CheckpointForm
            checkpoint={foundChk}
            onSave={(chkData) => {
              if (foundChk) {
                const updated = checkpoints.map((c) => (c.id === foundChk.id ? { ...c, ...chkData } : c));
                saveCheckpoints(updated);
                showToast(`Checkpoint "${chkData.name}" updated.`, 'success');
              } else {
                const newId = `chk_${Date.now()}`;
                saveCheckpoints([...checkpoints, { ...chkData, id: newId }]);
                showToast(`Checkpoint "${chkData.name}" created.`, 'success');
              }
              closeRightSidebar();
            }}
            onCancel={closeRightSidebar}
          />
        ),
      };
    }
  );

  const handleAddCheckpoint = () => {
    openDrawer('checkpoint', { mode: 'add' });
  };

  // Toggle "Take Attendance" mode & automatically trigger Full Screen
  const handleToggleTakeAttendance = () => {
    const nextIsEditing = !isEditing;
    setIsEditing(nextIsEditing);
    setIsFullscreen(nextIsEditing);

    if (nextIsEditing) {
      showToast('Attendance marking mode enabled in Full Screen. Click any student cell to mark checkpoint attendance.', 'info');
    } else {
      showToast('Attendance marking finished. Exited full screen.', 'success');
    }
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

      const hijriRange = getCurrentHijriMonthRange(new Date(startDate));
      const isFullHijriMonth = (startDate === hijriRange.start && endDate === hijriRange.end);

      if (isFullHijriMonth) {
        const gregorianTitle = `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`;
        const hijriTitle = `${hijriRange.hijriMonthName} ${hijriRange.hijriYear} AH`;
        return { gregorianTitle, hijriTitle, isSingleDay: false, isFullHijriMonth: true };
      }

      if (startDate === endDate) {
        const gregorianTitle = `${sd}/${sm}/${sy}`;
        const hijriTitle = getHijriDateString(startDate);
        return { gregorianTitle, hijriTitle, isSingleDay: true, isFullHijriMonth: false };
      }

      const gregorianTitle = `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`;
      const hijriTitle = `${getHijriDateString(startDate)} – ${getHijriDateString(endDate)}`;

      return { gregorianTitle, hijriTitle, isSingleDay: false, isFullHijriMonth: false };
    }

    const firstDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const gregorianTitle = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    const hijriTitle = getHijriDateString(firstDayStr);
    return { gregorianTitle, hijriTitle, isSingleDay: false, isFullHijriMonth: false };
  };

  const { gregorianTitle, hijriTitle, isFullHijriMonth } = getHeaderDateDetails();

  // Merge Master Calendar Events & Holidays — ONLY for Date Header styling, NEVER disabling attendance
  const enrichedMatrixData = useMemo(() => {
    if (!matrixData || !matrixData.days_header) return matrixData;

    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];

    const hasAttendanceImpact = (evt) => {
      if (!evt) return false;
      const impacts = Array.isArray(evt.impacts)
        ? evt.impacts
        : (typeof evt.impacts === 'string' ? evt.impacts.split(',').map((s) => s.trim()) : []);

      if (impacts.length > 0) {
        return impacts.some((imp) => {
          const s = String(imp).toUpperCase();
          return s === 'ALL' || s === 'ATTENDANCE' || s === 'RESIDENTIAL_ATTENDANCE' || s === 'RESIDENTIAL';
        });
      }
      return Boolean(evt.category === 'HOLIDAY' || evt.category === 'EXAM' || evt.category === 'ACADEMIC_EVENT' || evt.is_holiday || evt.affects_students);
    };

    const findMatchingAttendanceEvent = (dateStr, weekdayNum) => {
      const matched = [];
      for (const evt of calendarEvents) {
        if (!hasAttendanceImpact(evt)) continue;
        if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) continue;

        if (evt.startDate === dateStr && (!evt.endDate || evt.endDate === dateStr)) {
          matched.push(evt);
          continue;
        }
        if (evt.startDate && evt.endDate && dateStr >= evt.startDate && dateStr <= evt.endDate) {
          matched.push(evt);
          continue;
        }
        if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
          if (!evt.startDate || dateStr >= evt.startDate) {
            if (evt.until === 'DATE' && evt.untilDate && dateStr > evt.untilDate) continue;
            matched.push(evt);
          }
        }
      }

      if (matched.length === 0) return null;
      matched.sort((a, b) => {
        const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
        const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
        return rankA - rankB;
      });
      return matched[0];
    };

    const enrichedDaysHeader = matrixData.days_header.map((d) => {
      const dateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      const dObj = new Date(dateStr);
      const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

      const matchedEvt = findMatchingAttendanceEvent(dateStr, weekdayNum);
      const eventColors = matchedEvt ? getEventColors(matchedEvt) : null;
      const isCalHoliday = Boolean(
        matchedEvt && (matchedEvt.category === 'HOLIDAY' || matchedEvt.is_holiday)
      );

      return {
        ...d,
        date: dateStr,
        is_holiday: isCalHoliday,
        is_disabled: false, // Attendance is NEVER disabled in residential
        holiday_title: matchedEvt?.title || (isCalHoliday ? 'Holiday' : ''),
        calendar_event: matchedEvt,
        event_title: matchedEvt?.title,
        event_color: matchedEvt?.color,
        event_colors: eventColors,
      };
    });

    return {
      ...matrixData,
      days_header: enrichedDaysHeader,
    };
  }, [matrixData, activeTenantId, selectedYear, selectedMonth, calendarEventsVersion]);

  // Open Day Agenda Drawer on Header Date Click
  const handleOpenDayAgenda = (dateStr) => {
    const matchedDay = enrichedMatrixData?.days_header?.find((d) => d.date === dateStr);
    const matchedEvt = matchedDay?.calendar_event;

    openRightSidebar({
      title: `Day Agenda: ${dateStr}`,
      subtitle: `${getHijriDateString(dateStr)} • Master Calendar & Events`,
      icon: CalendarIcon,
      width: 580,
      content: (
        <DayAgendaDrawer
          dateStr={dateStr}
          activeTenantId={activeTenantId}
          calendarEvent={matchedEvt}
          isHoliday={matchedDay?.is_holiday}
          holidayTitle={matchedDay?.holiday_title}
          onClose={closeRightSidebar}
          onOpenEventForm={(eventToEdit) => {
            openRightSidebar({
              title: eventToEdit ? `Edit: ${eventToEdit.title}` : 'Schedule Event / Holiday',
              subtitle: `Date: ${dateStr}`,
              icon: CalendarIcon,
              width: 600,
              content: (
                <TimeScheduleDrawerForm
                  event={eventToEdit}
                  initialDate={dateStr}
                  onSaveSuccess={() => {
                    closeRightSidebar();
                    setCalendarEventsVersion((v) => v + 1);
                    showToast('Calendar event updated successfully.', 'success');
                  }}
                  onCancel={closeRightSidebar}
                />
              ),
            });
          }}
        />
      ),
    });
  };

  // Helper to extract status from either string or rich object record
  const getResidentialStatus = (rec) => {
    if (!rec) return '';
    if (typeof rec === 'string') return rec;
    return rec.status || '';
  };

  // Toggle Cell Checkpoint Attendance with Timing & Lockout Enforcement and Conductor Tracking
  const handleToggleCell = (studentId, dateStr, currentStatus, checkpointId) => {
    // 0. Check Academic Year Date Guard
    if (
      (academicBounds.minDate && dateStr < academicBounds.minDate) ||
      (academicBounds.maxDate && dateStr > academicBounds.maxDate)
    ) {
      showToast(
        `Checkpoint attendance cannot be marked outside the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}).`,
        'warning'
      );
      return;
    }

    const chk = checkpoints.find((c) => String(c.id) === String(checkpointId)) || {};
    const timingState = getAttendanceCellTimingState({
      moduleType: 'RESIDENTIAL',
      targetDate: dateStr,
      startTime: chk.time,
      policy: timingPolicy,
      isAdmin,
      currentStatus,
    });

    if (!timingState.isEditable) {
      showToast(timingState.tooltip || 'Checkpoint attendance cannot be marked at this time.', 'warning');
      return;
    }

    const nextStatus = cycleStatusWithinAllowed(currentStatus, timingState.allowedStatuses);

    const conductorName =
      userProfile.name ||
      userProfile.name_en ||
      (userProfile.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : '') ||
      'Warden';

    const recordKey = `${studentId}_${checkpointId}_${dateStr}`;
    const newRecords = { ...residentialRecords };
    if (nextStatus) {
      newRecords[recordKey] = {
        status: nextStatus,
        recorded_by_id: userProfile.id || userProfile.teacher_profile_id || null,
        recorded_by_name: conductorName,
        recorded_at: new Date().toISOString(),
      };
    } else {
      delete newRecords[recordKey];
    }
    setResidentialRecords(newRecords);

    try {
      localStorage.setItem(`spr_res_records_${activeTenantId || 'default'}`, JSON.stringify(newRecords));
    } catch {}
  };

  // Admin Override Drawer for Residential Attendance
  const handleAdminEditCell = (row, dateStr, currentStatus, checkpointId) => {
    const chk = checkpoints.find((c) => String(c.id) === String(checkpointId)) || {};
    const conductorName = userProfile.name || userProfile.name_en || 'Admin';

    openRightSidebar({
      title: 'Admin Checkpoint Override',
      subtitle: `${row.name || 'Student'} • ${dateStr}`,
      icon: ClockIcon,
      content: (
        <AdminAttendanceDrawer
          personName={row.name || 'Student'}
          personSubtitle={`Roll: ${row.roll_number || '—'} • Checkpoint: ${chk.name || 'Roll Call'}`}
          dateStr={dateStr}
          scheduledStartTime={chk.time || '05:30'}
          initialStatus={currentStatus || 'PRESENT'}
          initialInTime={chk.time || '05:30'}
          initialRemarks=""
          onClose={closeRightSidebar}
          onSave={async (formData) => {
            closeRightSidebar();
            const recordKey = `${row.id || row.student_id}_${checkpointId}_${dateStr}`;
            const newRecords = {
              ...residentialRecords,
              [recordKey]: {
                status: formData.status,
                recorded_by_id: userProfile.id || null,
                recorded_by_name: conductorName,
                recorded_at: new Date().toISOString(),
                in_time: formData.in_time,
                remarks: formData.remarks,
              },
            };
            setResidentialRecords(newRecords);
            try {
              localStorage.setItem(`spr_res_records_${activeTenantId || 'default'}`, JSON.stringify(newRecords));
            } catch {}
            showToast(`Attendance updated for ${row.name}`, 'success');
          }}
        />
      ),
    });
  };

  // Active checkpoints to show with temporal validity filtering
  const activeCheckpoints = useMemo(() => {
    const monthStart = startDate || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthEnd = endDate || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const temporallyValid = checkpoints.filter((chk) => {
      if (chk.is_deleted) {
        if (chk.deleted_at && chk.deleted_at.slice(0, 10) < monthStart) {
          // Check if there are recorded attendances in this window
          const hasRecorded = Object.keys(residentialRecords || {}).some((k) => {
            if (!k.includes(`_${chk.id}_`)) return false;
            const dPart = k.split('_').pop();
            return dPart >= monthStart && dPart <= monthEnd;
          });
          if (!hasRecorded) return false;
        }
      }
      if (chk.effective_from && chk.effective_from > monthEnd) {
        return false;
      }
      if (chk.effective_to && chk.effective_to < monthStart) {
        const hasRecorded = Object.keys(residentialRecords || {}).some((k) => {
          if (!k.includes(`_${chk.id}_`)) return false;
          const dPart = k.split('_').pop();
          return dPart >= monthStart && dPart <= monthEnd;
        });
        if (!hasRecorded) return false;
      }
      return true;
    });

    if (selectedCheckpointId === 'ALL') {
      return temporallyValid.length > 0 ? temporallyValid : checkpoints;
    }
    const found = temporallyValid.filter((c) => String(c.id) === String(selectedCheckpointId));
    return found.length > 0 ? found : (temporallyValid.length > 0 ? temporallyValid : checkpoints);
  }, [checkpoints, selectedCheckpointId, startDate, endDate, selectedYear, selectedMonth, residentialRecords]);

  // Unique Students from matrix with guaranteed unique IDs
  const uniqueStudents = useMemo(() => {
    if (!enrichedMatrixData?.students_matrix) return [];
    const seen = new Set();
    const list = [];
    enrichedMatrixData.students_matrix.forEach((st) => {
      const sId = st.student_id || st.id;
      if (sId !== undefined && sId !== null && !seen.has(String(sId))) {
        seen.add(String(sId));
        list.push({
          ...st,
          student_id: sId,
          id: sId,
          name: st.name || st.student_name,
        });
      }
    });
    return list;
  }, [enrichedMatrixData]);

  // Compute student totals across active checkpoints
  const computeStudentTotals = useCallback((studentId) => {
    let p = 0, l = 0, a = 0, lv = 0;
    if (!enrichedMatrixData?.days_header || !studentId) {
      return { present: 0, late: 0, absent: 0, on_leave: 0, total_recorded: 0, attendance_rate: 100 };
    }

    enrichedMatrixData.days_header.forEach((d) => {
      const dateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      activeCheckpoints.forEach((chk) => {
        const key = `${studentId}_${chk.id}_${dateStr}`;
        const rawRec = residentialRecords[key];
        const rawStatus = getResidentialStatus(rawRec);
        const timingState = getAttendanceCellTimingState({
          moduleType: 'RESIDENTIAL',
          targetDate: dateStr,
          startTime: chk.time,
          policy: timingPolicy,
          isAdmin,
          currentStatus: rawStatus,
        });

        const st = rawStatus || timingState.displayStatus || '';

        if (st === 'PRESENT') p += 1;
        else if (st === 'LATE') l += 1;
        else if (st === 'ABSENT') a += 1;
        else if (st === 'ON_LEAVE') lv += 1;
      });
    });

    const total = p + l + a + lv;
    const effective = p + l;
    const rate = total > 0 ? Math.round((effective / total) * 100) : 100;
    return { present: p, late: l, absent: a, on_leave: lv, total_recorded: total, attendance_rate: rate };
  }, [enrichedMatrixData, activeCheckpoints, selectedYear, selectedMonth, residentialRecords, timingPolicy, isAdmin]);

  // Export CSV
  const handleExportCSV = () => {
    if (!matrixData || !matrixData.days_header || uniqueStudents.length === 0) {
      showToast('No attendance records to export.', 'warning');
      return;
    }

    const headers = [
      'Roll',
      'Student Name',
      'Class',
      'Group',
      'Time & Checkpoint',
      ...matrixData.days_header.map((d) => `Day ${d.day} (${d.weekday})`),
      'Present',
      'Late',
      'Absent',
      'Leave',
      'Rate %',
    ];

    const rows = [];
    uniqueStudents.forEach((student) => {
      const studentId = student.student_id || student.id;
      activeCheckpoints.forEach((chk) => {
        const dayStatuses = matrixData.days_header.map((d) => {
          const fullDateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
          const recordKey = `${studentId}_${chk.id}_${fullDateStr}`;
          return residentialRecords[recordKey] || '—';
        });

        const totals = computeStudentTotals(studentId);

        rows.push([
          `"${student.roll_number || ''}"`,
          `"${(student.name || '').replace(/"/g, '""')}"`,
          `"${student.class_name || ''}"`,
          `"${student.group_name || ''}"`,
          `"${chk.name} (${chk.time || ''})"`,
          ...dayStatuses.map((s) => `"${s}"`),
          totals.present,
          totals.late,
          totals.absent,
          totals.on_leave,
          `"${totals.attendance_rate}%"`,
        ].join(','));
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Residential_Attendance_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Residential attendance CSV exported.', 'success');
  };

  // Secondary 3-Dot Action Menu Items
  const headerActionMenuItems = [
    {
      label: isFullscreen ? 'Exit Full Screen' : 'Full Screen View',
      icon: isFullscreen ? MinimizeIcon : FullScreenIcon,
      onClick: () => setIsFullscreen((prev) => !prev),
    },
    {
      label: 'Add Checkpoint',
      icon: TimerIcon,
      onClick: handleAddCheckpoint,
    },
    {
      label: 'Export CSV',
      icon: DownloadIcon,
      onClick: handleExportCSV,
    },
    {
      label: 'Print Register',
      icon: PrintIcon,
      onClick: () => window.print(),
    },
    {
      label: 'Refresh Data',
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

  const groupOptions = useMemo(() => {
    let list = groups;
    if (selectedClassId) {
      const classSpecific = groups.filter((g) => String(g.student_class) === String(selectedClassId) || String(g.student_class_id) === String(selectedClassId) || String(g.student_class?.id) === String(selectedClassId));
      const others = groups.filter((g) => !classSpecific.some((cg) => cg.id === g.id));
      list = classSpecific.length > 0 ? [...classSpecific, ...others] : groups;
    }
    return [
      { value: '', label: 'All Groups' },
      ...list.map((g) => ({
        value: String(g.id),
        label: g.student_class_name ? `${g.name} (${g.student_class_name})` : g.name,
      })),
    ];
  }, [groups, selectedClassId]);

  const checkpointOptions = useMemo(() => [
    { value: 'ALL', label: 'All Checkpoints (Daily Roll Call)' },
    ...checkpoints.map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.time || '--:--'})`,
    })),
  ], [checkpoints]);

  const innerContent = (
    <>
      {/* 1. Page Header (Hidden when in Full Screen) */}
      {!isFullscreen && !hideHeader && (
        <div className="print:hidden">
          <PageHeader
            icon={TimerIcon}
            title="Residential Attendance"
            subtitle="Time & Checkpoint roll-call attendance register for boarding/dormitory students"
            actions={
              <div className="flex items-center gap-2">
                <TakeAttendanceButton
                  isEditing={isEditing}
                  onToggle={handleToggleTakeAttendance}
                />
                <ActionMenu items={headerActionMenuItems} />
              </div>
            }
          />
        </div>
      )}

      {/* 2. Fullscreen Single-Line Top Header Bar */}
      {isFullscreen && (
        <div className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl theme-bg-surface border theme-border flex items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5">
            <TimerIcon className="w-5 h-5 theme-accent shrink-0" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
              Residential Attendance
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <TakeAttendanceButton
              isEditing={isEditing}
              onToggle={handleToggleTakeAttendance}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* 3. Unified Combined Header & Filter Card */}
      {!isFullscreen && (
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 print:hidden">
          {/* Top Row: Date Display & Smart Adaptive Stepper (Matching Class Attendance) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
                  {isFullHijriMonth ? hijriTitle : gregorianTitle}
                </h2>
                {isEditing && (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 uppercase tracking-wider animate-pulse">
                    Attendance Marking Active
                  </span>
                )}
              </div>

              {isFullHijriMonth ? (
                <p className="text-xs theme-accent font-medium pl-6">
                  Gregorian Range: <span className="font-semibold">{gregorianTitle}</span>
                </p>
              ) : isHijriEnabled ? (
                <p className="text-xs theme-accent font-medium pl-6">
                  Islamic Hijri: <span className="font-semibold">{hijriTitle}</span>
                </p>
              ) : null}

              {/* Tracking Baseline Date Indicator */}
              <div className="flex items-center gap-2 flex-wrap text-xs theme-text-secondary pt-1 pl-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium theme-bg-sub border theme-border theme-text-secondary">
                  <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span>Calculated from: <strong className="theme-text-primary">{academicBounds.activeYear?.startDate || academicBounds.minDate || 'Session Start'}</strong> ({academicBounds.activeYear?.name || 'Active Academic Year'})</span>
                </span>
              </div>
            </div>

            {/* Reusable Enterprise Stepper Controls */}
            <AttendanceDateStepper
              stepLabels={stepLabels}
              onStepBackward={handleStepBackward}
              onStepForward={handleStepForward}
              onToday={handleGoToToday}
              isToday={isCurrentPeriodToday}
              isAtMinBound={isAtMinBound}
              isAtMaxBound={isAtMaxBound}
              minBoundTooltip={`Reached start of Academic Year (${academicBounds.activeYear?.name || 'Active Year'})`}
              maxBoundTooltip={`Reached end of Academic Year (${academicBounds.activeYear?.name || 'Active Year'})`}
            />
          </div>

          {/* Bottom Row: 4 Filters with Standard Project Labels (Matching Class Attendance) */}
          <div className="border-t theme-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
            <div>
              <ClassSelect
                label="Select Class"
                classes={classes}
                value={selectedClassId}
                onChange={(val) => {
                  setSelectedClassId(val);
                  setSelectedGroupId('ALL');
                }}
                allowAll={true}
                allLabel="All Classes"
                allValue="ALL"
              />
            </div>

            <div>
              <GroupSelect
                label="Select Group"
                groups={groups}
                classId={selectedClassId}
                value={selectedGroupId}
                onChange={(val) => setSelectedGroupId(val)}
                allLabel="All Groups (General)"
              />
            </div>

            <div>
              <CustomSelect
                label="Select Checkpoint"
                options={checkpointOptions}
                value={selectedCheckpointId}
                onChange={(val) => setSelectedCheckpointId(val)}
                placeholder="All Checkpoints"
                searchable={false}
              />
            </div>

            <div>
              <DateRangePicker
                label="Date Range"
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                minDate={academicBounds.minDate}
                maxDate={academicBounds.maxDate}
                onMonthChange={(m) => {
                  setSelectedMonth(m);
                  setStartDate('');
                  setEndDate('');
                }}
                onYearChange={(y) => {
                  setSelectedYear(y);
                  setStartDate('');
                  setEndDate('');
                }}
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
        <AttendanceTable
          daysHeader={enrichedMatrixData?.days_header || []}
          rows={uniqueStudents.flatMap((student) => {
            const studentId = student.student_id || student.id;

            return activeCheckpoints.map((chk, chkIdx) => {
              const dailyStatuses = {};
              let chkP = 0, chkL = 0, chkA = 0, chkLv = 0;

              (enrichedMatrixData?.days_header || []).forEach((d) => {
                const dateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                const key = `${studentId}_${chk.id}_${dateStr}`;
                const rawRec = residentialRecords[key];
                const rawStatus = getResidentialStatus(rawRec);
                const timingState = getAttendanceCellTimingState({
                  moduleType: 'RESIDENTIAL',
                  targetDate: dateStr,
                  policy: timingPolicy,
                  slotType: 'RESIDENTIAL',
                  isAdmin,
                });

                if (rawStatus === 'PRESENT') chkP += 1;
                else if (rawStatus === 'LATE') chkL += 1;
                else if (rawStatus === 'ABSENT') chkA += 1;
                else if (rawStatus === 'ON_LEAVE' || rawStatus === 'LEAVE') chkLv += 1;

                dailyStatuses[dateStr] = {
                  status: rawStatus,
                  time_in: rawRec?.time_in,
                  late_minutes: rawRec?.late_minutes || 0,
                  verified_by: rawRec?.verified_by_name,
                  locked: timingState.isLocked,
                  notes: rawRec?.notes,
                };
              });

              const totalUnits = chkP + chkL + chkA + chkLv;
              const ratePct = totalUnits > 0 ? Math.round(((chkP + chkL) / totalUnits) * 100) : 100;

              return {
                ...chk,
                id: studentId,
                student_id: studentId,
                roll_number: student.roll_number || '—',
                name: student.name_en || student.name || 'Student',
                student_name: student.name_en || student.name || 'Student',
                group_name: student.group_name || student.student_group_name || student.student_class_name,
                class_name: selectedClassName || student.class_name,
                checkpoint_id: chk.id,
                checkpoint_name: chk.name,
                period_name: chk.name,
                checkpoint_time: chk.time,
                time: chk.time,
                warden_name: chk.warden_name,
                effective_from: chk.effective_from || student.admission_date || 'Session Start',
                effective_to: chk.effective_to,
                history_log: chk.history_log || [],
                has_history: Boolean(chk.history_log && chk.history_log.length > 0),
                is_deleted: chk.is_deleted,
                checkpoint_count: activeCheckpoints.length,
                checkpoint_index: chkIdx,
                daily_statuses: dailyStatuses,
                totals: {
                  present: chkP,
                  late: chkL,
                  absent: chkA,
                  leave: chkLv,
                  rate: ratePct,
                },
              };
            });
          })}
          idLabel="Roll"
          nameLabel="Student Name"
          descriptorLabel="Time & Checkpoint"
          descriptorIcon={TimerIcon}
          isEditing={isEditing}
          onToggleCell={(row, d, rawStatus) => {
            const dateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
            handleToggleCell(row.student_id || row.id, dateStr, rawStatus, row.checkpoint_id);
          }}
          onAdminEditCell={isAdmin ? (row, d, rawStatus) => {
            const dateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
            handleAdminEditCell(row, dateStr, rawStatus, row.checkpoint_id);
          } : undefined}
          onInspectHistory={(row) => {
            if (!row) return;
            openRightSidebar({
              title: 'Residential Checkpoint Timeline',
              subtitle: `${row.checkpoint_name || row.period_name || 'Checkpoint'} • ${row.student_name || row.name || 'Student Routine'}`,
              icon: TimelineIcon,
              width: 520,
              content: (
                <ScheduleTimelineDrawer
                  item={row}
                  onClose={closeRightSidebar}
                />
              ),
            });
          }}
          isHijriEnabled={isHijriEnabled}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onStudentClick={onStudentClick}
          onDateClick={handleOpenDayAgenda}
          isLoading={isLoading}
          emptyMessage="No students found for this class and residential selection."
          calculationBaselineDate={academicBounds.activeYear?.startDate || academicBounds.minDate || 'Session Start'}
          calculationBaselineLabel="Tracking Since"
          totalCount={uniqueStudents.length}
          totalCountLabel="Total Students"
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          tableContainerClass={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}
        />
      </div>
    </>
  );

  return (
    <PageContainer isFullscreen={isFullscreen} className="space-y-4">
      {innerContent}
    </PageContainer>
  );
}
