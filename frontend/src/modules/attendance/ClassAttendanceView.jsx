import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MatrixIcon,
  RefreshIcon,
  DownloadIcon,
  PrintIcon,
  CalendarIcon,
  AttendanceIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  FullScreenIcon,
  MinimizeIcon,
  ClockIcon,
  TimelineIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';
import CustomSelect from '../../components/ui/CustomSelect';
import { ClassSelect, GroupSelect, TeacherSelect, DateRangePicker } from '../../components/selectors';
import ActionMenu from '../../components/ui/ActionMenu';
import AttendanceTable, { TakeAttendanceButton, AttendanceDateStepper } from '../../components/common/AttendanceTable';
import AdminAttendanceDrawer from '../../components/common/AdminAttendanceDrawer';
import { useFullscreen } from '../../hooks/useFullscreen';
import { getMonthlyAttendanceMatrix, bulkMarkStudentAttendance } from '../../api/attendance';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { useAcademicSession } from '../../context/AcademicSessionContext';
import {
  calendarSettings,
  attendanceFilters,
  masterCalendarStore,
  attendanceEventRestrictionsStore,
  attendanceTimingPolicyStore,
  academicYearsStore,
  periodCategoriesStore,
} from '../../utils/localStore';
import { getHijriDateString, getCurrentHijriMonthRange } from '../../utils/hijriUtils';
import { getEventColors, DayAgendaDrawer, TimeScheduleDrawerForm, TimeScheduleDetailDrawer } from '../../components/calendar';
import {
  getAttendanceCellTimingState,
  cycleStatusWithinAllowed,
  calculateLateDelayMinutes,
} from '../../utils/attendanceTimingEngine';
import ScheduleTimelineDrawer from '../../components/common/ScheduleTimelineDrawer';

export default function ClassAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
} = {}) {
  const { showToast } = useToast();
  const { activeTenantId, isMultiTenantAdmin } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();
  // Global Academic Session — bounds come from the active year/semester selected globally
  const { activeYear, activeSemester } = useAcademicSession();

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
  const [periodSlots, setPeriodSlots] = useState([]);

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

  // Derive academic date bounds from the global AcademicSessionContext
  // Falls back to academicYearsStore.getDateBounds() when context is not yet ready
  const academicBounds = useMemo(() => {
    if (activeYear?.startDate && activeYear?.endDate) {
      return {
        minDate: activeSemester?.startDate || activeYear.startDate,
        maxDate: activeSemester?.endDate || activeYear.endDate,
        activeYear,
      };
    }
    return academicYearsStore.getDateBounds(activeTenantId);
  }, [activeYear, activeSemester, activeTenantId]);

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const todayStr = new Date().toISOString().split('T')[0];

  const savedFilters = useMemo(() => {
    return attendanceFilters.getMonthlyFilters(activeTenantId) || {};
  }, [activeTenantId]);

  // Class, Group & Teacher State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(() => propClassId || savedFilters.classId || '');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => propGroupId || savedFilters.groupId || '');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(() => savedFilters.teacherId || '');

  // Year & Month for standard month navigation
  const [selectedYear, setSelectedYear] = useState(() => savedFilters.year || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => savedFilters.month || (new Date().getMonth() + 1));

  // Custom Date Range State (e.g. Past 1 Week, Past 2 Weeks, Custom)
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

  // Interactive Attendance Marking Mode (Toggled by "Take Attendance" button)
  const [isEditing, setIsEditing] = useState(false);

  // Full Screen Mode
  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen();

  // Hijri Setting State
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());

  // Matrix Data & Loading
  const [matrixData, setMatrixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // Version counter to trigger re-enrichment when master calendar updates
  const [calendarEventsVersion, setCalendarEventsVersion] = useState(0);

  // Persist filters to localStorage
  useEffect(() => {
    attendanceFilters.saveMonthlyFilters(activeTenantId, {
      classId: selectedClassId,
      groupId: selectedGroupId,
      teacherId: selectedTeacherId,
      year: selectedYear,
      month: selectedMonth,
      startDate,
      endDate,
      hasExplicitDateChoice: true,
    });
  }, [selectedClassId, selectedGroupId, selectedTeacherId, selectedYear, selectedMonth, startDate, endDate, activeTenantId]);

  // Listen to live calendar setting changes for Hijri toggle & Calendar holidays
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
    };
    const handleCalendarUpdate = () => {
      setCalendarEventsVersion((v) => v + 1);
    };

    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    window.addEventListener('spr_calendar_events_updated', handleCalendarUpdate);
    window.addEventListener('spr_attendance_event_restrictions_updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
      window.removeEventListener('spr_calendar_events_updated', handleCalendarUpdate);
      window.removeEventListener('spr_attendance_event_restrictions_updated', handleCalendarUpdate);
    };
  }, []);

  // 1. Fetch Classes, Teachers, and Groups on Mount & Tenant Change
  useEffect(() => {
    let isMounted = true;

    const fetchAllMetadata = async () => {
      try {
        setMetadataLoaded(false);
        const [classRes, staffRes, grpRes, slotRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/staff/'),
          fetchWithAuth('/api/v1/groups/?page_size=500'),
          fetchWithAuth('/api/v1/period-slots/?page_size=500'),
        ]);

        if (!isMounted) return;

        if (slotRes.status === 'fulfilled' && slotRes.value.ok) {
          const slotData = await slotRes.value.json();
          const slotList = Array.isArray(slotData) ? slotData : slotData.results || [];
          const trackedSlots = slotList.filter((s) =>
            periodCategoriesStore.isAttendanceTrackedForSlot(activeTenantId, s)
          );
          setPeriodSlots(trackedSlots);
        }

        if (classRes.status === 'fulfilled' && classRes.value.ok) {
          const data = await classRes.value.json();
          const classList = Array.isArray(data) ? data : data.results || [];
          setClasses(classList);

          if (classList.length > 0) {
            const isValid = selectedClassId && (selectedClassId === 'ALL' || classList.some(c => String(c.id) === String(selectedClassId)));
            if (!isValid) {
              const matchingSaved = savedFilters.classId && (savedFilters.classId === 'ALL' || classList.some(c => String(c.id) === String(savedFilters.classId)));
              setSelectedClassId(matchingSaved ? String(savedFilters.classId) : 'ALL');
            }
          } else {
            setSelectedClassId('ALL');
          }
        }

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          setTeachers(Array.isArray(sData) ? sData : sData.results || []);
        }

        if (grpRes.status === 'fulfilled' && grpRes.value.ok) {
          const gData = await grpRes.value.json();
          const grpList = Array.isArray(gData) ? gData : gData.results || [];
          setGroups(grpList);
          if (savedFilters.groupId && (savedFilters.groupId === 'ALL' || grpList.some(g => String(g.id) === String(savedFilters.groupId)))) {
            setSelectedGroupId(String(savedFilters.groupId));
          } else if (selectedGroupId && selectedGroupId !== 'ALL' && !grpList.some(g => String(g.id) === String(selectedGroupId))) {
            setSelectedGroupId('');
          }
        }
      } catch (err) {
        console.error('Error fetching attendance metadata:', err);
      } finally {
        if (isMounted) {
          setMetadataLoaded(true);
        }
      }
    };

    fetchAllMetadata();

    const handleTenantChanged = () => {
      fetchAllMetadata();
    };
    const handleCategoriesUpdated = () => {
      fetchAllMetadata();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);
    window.addEventListener('spr_period_categories_updated', handleCategoriesUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
      window.removeEventListener('spr_period_categories_updated', handleCategoriesUpdated);
    };
  }, [activeTenantId]);

  // 2. Fetch Monthly / Range Attendance Matrix
  const loadMatrix = useCallback(async () => {
    if (!metadataLoaded && !propClassId) {
      return;
    }

    setIsLoading(true);
    try {
      const trackedCategories = periodCategoriesStore.getAttendanceTrackedCategoryCodes(activeTenantId);
      const params = {
        class_id: selectedClassId && selectedClassId !== 'ALL' ? selectedClassId : undefined,
        group_id: selectedGroupId && selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
        teacher_id: selectedTeacherId && selectedTeacherId !== 'ALL' ? selectedTeacherId : undefined,
        slot_types: trackedCategories.length > 0 ? trackedCategories.join(',') : undefined,
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
  }, [metadataLoaded, selectedClassId, selectedGroupId, selectedTeacherId, selectedYear, selectedMonth, startDate, endDate, propClassId, activeTenantId, showToast]);

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

  // Toggle "Take Attendance" mode & automatically trigger Full Screen / Exit Full Screen
  const handleToggleTakeAttendance = () => {
    const nextIsEditing = !isEditing;
    setIsEditing(nextIsEditing);
    setIsFullscreen(nextIsEditing);

    if (nextIsEditing) {
      showToast('Attendance marking mode enabled in Full Screen. Click any student cell to mark attendance.', 'info');
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

      // Check if it is Full Hijri Month
      const hijriRange = getCurrentHijriMonthRange(new Date(startDate));
      const isFullHijriMonth = (startDate === hijriRange.start && endDate === hijriRange.end);

      if (isFullHijriMonth) {
        const gregorianTitle = `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`;
        const hijriTitle = `${hijriRange.hijriMonthName} ${hijriRange.hijriYear} AH`;
        return { gregorianTitle, hijriTitle, isSingleDay: false, isFullHijriMonth: true };
      }

      // Single Day (e.g. Today or Yesterday or Custom single day)
      if (startDate === endDate) {
        const gregorianTitle = `${sd}/${sm}/${sy}`;
        const hijriTitle = getHijriDateString(startDate);
        return { gregorianTitle, hijriTitle, isSingleDay: true, isFullHijriMonth: false };
      }

      // Multi-Day Range (e.g. Last 7 Days, Last 14 Days, Custom Range)
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

  // Merge Master Calendar Events & Holidays impacting Attendance with API matrixData
  const enrichedMatrixData = useMemo(() => {
    if (!matrixData || !matrixData.days_header) return matrixData;

    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];

    const hasAttendanceImpact = (evt) => {
      if (!evt) return false;
      // 1. Check if configured as disabled in Attendance Settings
      if (attendanceEventRestrictionsStore.isAttendanceDisabledForEvent(activeTenantId, evt)) {
        return true;
      }

      const impacts = Array.isArray(evt.impacts)
        ? evt.impacts
        : (typeof evt.impacts === 'string' ? evt.impacts.split(',').map((s) => s.trim()) : []);

      // If impacts array is explicitly provided
      if (impacts.length > 0) {
        return impacts.some((imp) => {
          const s = String(imp).toUpperCase();
          return s === 'ALL' || s === 'ATTENDANCE' || s === 'IMP-1' || s === 'CLASS_ATTENDANCE' || s === 'CLASS';
        });
      }

      // If impacts are NOT specified, only genuine Holidays, Exams or Academic Events impact student attendance
      if (evt.category === 'HOLIDAY' || evt.category === 'EXAM' || evt.category === 'ACADEMIC_EVENT' || evt.is_holiday || evt.affects_students) {
        return true;
      }

      return false;
    };

    const findMatchingAttendanceEvent = (dateStr, weekdayNum) => {
      const matched = [];
      for (const evt of calendarEvents) {
        if (!hasAttendanceImpact(evt)) continue;
        if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) continue;

        // 1. Single date match
        if (evt.startDate === dateStr && (!evt.endDate || evt.endDate === dateStr)) {
          matched.push(evt);
          continue;
        }
        // 2. Date range match
        if (evt.startDate && evt.endDate && dateStr >= evt.startDate && dateStr <= evt.endDate) {
          matched.push(evt);
          continue;
        }
        // 3. Recurring match (e.g. weekly events / off-days)
        if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
          if (!evt.startDate || dateStr >= evt.startDate) {
            if (evt.until === 'DATE' && evt.untilDate && dateStr > evt.untilDate) {
              continue;
            }
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
      const isAttendanceDisabled = Boolean(
        matchedEvt && attendanceEventRestrictionsStore.isAttendanceDisabledForEvent(activeTenantId, matchedEvt)
      );
      const isCalHoliday = Boolean(
        matchedEvt && (matchedEvt.category === 'HOLIDAY' || matchedEvt.is_holiday || isAttendanceDisabled)
      );
      const isHoliday = Boolean(isCalHoliday);
      const holidayTitle = isCalHoliday
        ? (matchedEvt.title || (isAttendanceDisabled ? 'Class Attendance Off' : 'Institutional Holiday'))
        : '';

      return {
        ...d,
        date: dateStr,
        is_holiday: isHoliday,
        is_disabled: isAttendanceDisabled,
        is_weekend: false,
        holiday_title: holidayTitle,
        calendar_event: matchedEvt,
        event_title: matchedEvt?.title,
        event_color: matchedEvt?.color,
        event_colors: eventColors,
      };
    });

    const enrichedStudentsMatrix = (matrixData.students_matrix || []).map((row) => {
      let p_count = 0;
      let l_count = 0;
      let a_count = 0;
      let lv_count = 0;
      let hol_count = 0;

      const pSlot = periodSlots.find((p) => String(p.id) === String(row.period_slot_id)) || {};
      const cleanedDailyStatuses = { ...(row.daily_statuses || {}) };

      enrichedDaysHeader.forEach((d) => {
        const isOff = Boolean(d.is_holiday || d.is_disabled);
        if (isOff) {
          hol_count += 1;
          if (d.date) cleanedDailyStatuses[d.date] = null;
          if (d.day) cleanedDailyStatuses[d.day] = null;
        } else {
          const rawStatus = cleanedDailyStatuses[d.date] || cleanedDailyStatuses[d.day];
          const timingState = getAttendanceCellTimingState({
            moduleType: 'CLASS',
            targetDate: d.date,
            startTime: pSlot.start_time || row.start_time,
            endTime: pSlot.end_time || row.end_time,
            policy: timingPolicy,
            isAdmin,
            currentStatus: rawStatus && rawStatus !== 'NOT_APPLICABLE' ? rawStatus : '',
            effectiveStartDate: row.admission_date || null,
          });

          let effectiveStatus = '';
          if (rawStatus === 'NOT_APPLICABLE') {
            effectiveStatus = 'NOT_APPLICABLE';
          } else if (rawStatus) {
            effectiveStatus = rawStatus;
          } else {
            effectiveStatus = timingState.displayStatus || '';
          }

          if (effectiveStatus) {
            cleanedDailyStatuses[d.date] = effectiveStatus;
            if (d.day) cleanedDailyStatuses[d.day] = effectiveStatus;
          }

          if (effectiveStatus === 'PRESENT') {
            p_count += 1;
          } else if (effectiveStatus === 'LATE') {
            l_count += 1;
          } else if (effectiveStatus === 'ABSENT') {
            a_count += 1;
          } else if (effectiveStatus === 'ON_LEAVE') {
            lv_count += 1;
          }
        }
      });

      const totalRecorded = p_count + l_count + a_count + lv_count;
      const effectivePresent = p_count + l_count;
      const attendanceRate = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 1000) / 10 : 0.0;

      return {
        ...pSlot,
        ...row,
        period_name: row.period_name || pSlot.name || pSlot.period_name || 'Class Period',
        start_time: row.start_time || pSlot.start_time,
        end_time: row.end_time || pSlot.end_time,
        time: pSlot.start_time ? `${pSlot.start_time} – ${pSlot.end_time || ''}` : row.schedule_time,
        teacher_name: row.teacher_name || pSlot.teacher_name,
        class_name: row.class_name || pSlot.class_name || selectedClassName,
        effective_from: row.effective_from || pSlot.effective_from || pSlot.created_at?.slice(0, 10),
        effective_to: row.effective_to || pSlot.effective_to,
        is_deleted: row.is_deleted || pSlot.is_deleted,
        history_log: row.history_log || pSlot.history_log || [],
        has_history: Boolean((row.history_log && row.history_log.length > 0) || (pSlot.history_log && pSlot.history_log.length > 0)),
        daily_statuses: cleanedDailyStatuses,
        totals: {
          present: p_count,
          late: l_count,
          absent: a_count,
          on_leave: lv_count,
          holiday_excused: hol_count,
          total_recorded: totalRecorded,
          attendance_rate: attendanceRate,
        },
      };
    });

    return {
      ...matrixData,
      days_header: enrichedDaysHeader,
      students_matrix: enrichedStudentsMatrix,
    };
  }, [matrixData, activeTenantId, selectedYear, selectedMonth, calendarEventsVersion, periodSlots, timingPolicy, isAdmin]);

  // Open Day Agenda Drawer on Header Date Click
  const handleOpenDayAgenda = (dateParam) => {
    const fullDate = typeof dateParam === 'string' ? dateParam : (dateParam?.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dateParam?.day || 1).padStart(2, '0')}`);
    const matchedDay = enrichedMatrixData?.days_header?.find((d) => d.date === fullDate);
    const matchedEvt = matchedDay?.calendar_event;
    const isOff = Boolean(matchedDay?.is_holiday || matchedDay?.is_disabled);
    const offTitle = matchedDay?.holiday_title || (matchedDay?.is_disabled ? 'Class Attendance Off' : '');

    openRightSidebar({
      title: `Day Agenda: ${fullDate}`,
      subtitle: `${getHijriDateString(fullDate)} • Master Calendar & Events`,
      icon: CalendarIcon,
      width: 580,
      content: (
        <DayAgendaDrawer
          dateStr={fullDate}
          activeTenantId={activeTenantId}
          calendarEvent={matchedEvt}
          isHoliday={isOff}
          holidayTitle={offTitle}
          isClassOff={isOff}
          classOffReason={offTitle}
          onClose={closeRightSidebar}
          onOpenEventForm={(eventToEdit) => {
            openRightSidebar({
              title: eventToEdit ? `Edit: ${eventToEdit.title}` : 'Schedule Event / Holiday',
              subtitle: `Date: ${fullDate}`,
              icon: CalendarIcon,
              width: 600,
              content: (
                <TimeScheduleDrawerForm
                  event={eventToEdit}
                  initialDate={fullDate}
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

  // Interactive Click to Mark/Toggle Cell Attendance with Dynamic Timing & Lockout Enforcement
  const handleToggleCellAttendance = async (studentId, dateStr, currentStatus, periodSlotId) => {
    // 0. Conductor / Period Teacher Ownership Check
    const pSlot = periodSlots.find((p) => String(p.id) === String(periodSlotId)) || {};
    const matchingRow = enrichedMatrixData?.students_matrix?.find(
      (r) => r.student_id === studentId && (periodSlotId ? String(r.period_slot_id) === String(periodSlotId) : true)
    );
    const assignedTeacherId = matchingRow?.teacher_id || pSlot?.teacher_id || pSlot?.teacher?.id;
    const assignedTeacherName = matchingRow?.teacher_name || pSlot?.teacher_name || pSlot?.teacher?.name || '';

    if (!isAdmin && assignedTeacherId) {
      const currentTeacherId = userProfile.teacher_profile_id || userProfile.teacher_id || userProfile.id;
      const currentUserId = userProfile.id || userProfile.user_id;
      const assignedTeacherUserId = matchingRow?.teacher_user_id || pSlot?.teacher?.user?.id || pSlot?.teacher_user_id;

      const isAssigned =
        (currentTeacherId && String(currentTeacherId) === String(assignedTeacherId)) ||
        (currentUserId && assignedTeacherUserId && String(currentUserId) === String(assignedTeacherUserId)) ||
        (userProfile.phone_number && matchingRow?.teacher_phone === userProfile.phone_number);

      if (!isAssigned) {
        showToast(
          `Only the assigned teacher (${assignedTeacherName || 'Period Teacher'}) can mark attendance for this period.`,
          'warning'
        );
        return;
      }
    }

    // 0. Check Academic Year Date Guard
    if (
      (academicBounds.minDate && dateStr < academicBounds.minDate) ||
      (academicBounds.maxDate && dateStr > academicBounds.maxDate)
    ) {
      showToast(
        `Attendance cannot be marked outside the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}).`,
        'warning'
      );
      return;
    }

    // 1. Check Holiday Lock
    const dayHeader = enrichedMatrixData?.days_header?.find(
      (d) => d.date === dateStr || String(d.day) === String(dateStr)
    );
    if (dayHeader?.is_holiday) {
      showToast(`Attendance marking is disabled on ${dayHeader.holiday_title || 'scheduled holidays'}.`, 'warning');
      return;
    }

    // 2. Resolve Timing Rules & Allowed Statuses
    const timingState = getAttendanceCellTimingState({
      moduleType: 'CLASS',
      targetDate: dateStr,
      startTime: pSlot.start_time,
      endTime: pSlot.end_time,
      policy: timingPolicy,
      isAdmin,
      currentStatus,
    });

    if (!timingState.isEditable) {
      showToast(timingState.tooltip || 'Attendance cannot be marked at this time.', 'warning');
      return;
    }

    // 3. Determine Next Status based on Allowed Cycle
    const nextStatus = cycleStatusWithinAllowed(currentStatus, timingState.allowedStatuses);

    // Optimistic Update
    setMatrixData((prev) => {
      if (!prev || !prev.students_matrix) return prev;

      const updatedMatrix = prev.students_matrix.map((row) => {
        const isMatch =
          row.student_id === studentId &&
          (periodSlotId ? String(row.period_slot_id) === String(periodSlotId) : true);
        if (!isMatch) return row;

        const updatedStatuses = { ...row.daily_statuses, [dateStr]: nextStatus };

        let p_count = 0;
        let l_count = 0;
        let a_count = 0;
        let lv_count = 0;
        let hol_count = 0;

        prev.days_header.forEach((d) => {
          const isOff = Boolean(d.is_holiday);
          const st = updatedStatuses[d.date] || updatedStatuses[d.day];

          if (isOff) {
            hol_count += 1;
          } else if (st === 'PRESENT') {
            p_count += 1;
          } else if (st === 'LATE') {
            l_count += 1;
          } else if (st === 'ABSENT') {
            a_count += 1;
          } else if (st === 'ON_LEAVE') {
            lv_count += 1;
          }
        });

        const totalRecorded = p_count + l_count + a_count + lv_count;
        const effectivePresent = p_count + l_count;
        const attendanceRate = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 1000) / 10 : 0.0;

        return {
          ...row,
          daily_statuses: updatedStatuses,
          totals: {
            present: p_count,
            late: l_count,
            absent: a_count,
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
        class_id: selectedClassId && selectedClassId !== 'ALL' ? String(selectedClassId) : null,
        group_id: selectedGroupId && selectedGroupId !== 'ALL' ? String(selectedGroupId) : null,
        override_holiday: true,
        taken_by_teacher_id: userProfile.teacher_profile_id || userProfile.teacher_id || null,
        records: [
          {
            student_id: Number(studentId),
            period_slot_id: periodSlotId && periodSlotId !== 'DEFAULT' && periodSlotId !== 'main' ? String(periodSlotId) : null,
            status: nextStatus || 'UNMARKED',
          },
        ],
      });

      // Dispatch global attendance event for real-time synchronization with Teacher Attendance
      window.dispatchEvent(new CustomEvent('spr_attendance_updated', {
        detail: { date: dateStr, student_id: studentId, period_slot_id: periodSlotId, status: nextStatus },
      }));
    } catch (err) {
      console.error('Error saving attendance mark:', err);
      showToast('Failed to save attendance record', 'error');
    }
  };

  // Admin Override Drawer Handler (Full status & arrival time modification)
  const handleAdminEditCell = (row, dateStr, currentStatus, periodSlotId) => {
    if (
      (academicBounds.minDate && dateStr < academicBounds.minDate) ||
      (academicBounds.maxDate && dateStr > academicBounds.maxDate)
    ) {
      showToast(
        `Attendance cannot be modified outside the active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}).`,
        'warning'
      );
      return;
    }

    const pSlot = periodSlots.find((p) => String(p.id) === String(periodSlotId)) || {};
    openRightSidebar({
      title: 'Admin Attendance Override',
      subtitle: `${row.student_name || row.name} • ${dateStr}`,
      icon: ClockIcon,
      content: (
        <AdminAttendanceDrawer
          personName={row.student_name || row.name}
          personSubtitle={`Roll: ${row.roll_number || '—'} • ${pSlot.period_name || 'Class Period'}`}
          dateStr={dateStr}
          scheduledStartTime={pSlot.start_time || '08:00'}
          initialStatus={currentStatus || 'PRESENT'}
          initialInTime={row.in_time || pSlot.start_time || '08:00'}
          initialRemarks={row.remarks || ''}
          onClose={closeRightSidebar}
          onSave={async (formData) => {
            closeRightSidebar();

            // Optimistic update
            setMatrixData((prev) => {
              if (!prev || !prev.students_matrix) return prev;
              const updatedMatrix = prev.students_matrix.map((r) => {
                const isMatch =
                  r.student_id === row.student_id &&
                  (periodSlotId ? String(r.period_slot_id) === String(periodSlotId) : true);
                if (!isMatch) return r;
                return {
                  ...r,
                  daily_statuses: { ...r.daily_statuses, [dateStr]: formData.status },
                };
              });
              return { ...prev, students_matrix: updatedMatrix };
            });

            try {
              await bulkMarkStudentAttendance({
                date: dateStr,
                class_id: selectedClassId && selectedClassId !== 'ALL' ? String(selectedClassId) : null,
                group_id: selectedGroupId && selectedGroupId !== 'ALL' ? String(selectedGroupId) : null,
                override_holiday: true,
                records: [
                  {
                    student_id: Number(row.student_id),
                    period_slot_id: periodSlotId && periodSlotId !== 'DEFAULT' && periodSlotId !== 'main' ? String(periodSlotId) : null,
                    status: formData.status,
                    in_time: formData.in_time,
                    remarks: formData.remarks,
                  },
                ],
              });
              showToast(`Attendance updated for ${row.student_name || row.name}`, 'success');

              // Dispatch global event for synchronization
              window.dispatchEvent(new CustomEvent('spr_attendance_updated', {
                detail: { date: dateStr, student_id: row.student_id, period_slot_id: periodSlotId, status: formData.status },
              }));

              loadMatrix();
            } catch (err) {
              console.error('Failed to save admin attendance update:', err);
              showToast('Failed to save attendance record', 'error');
            }
          }}
        />
      ),
    });
  };

  // Click on date header -> Open Day Schedule & Event Details (Strictly Read-Only from Attendance)
  const handleDateHeaderClick = (d) => {
    const dateStr =
      d.date ||
      `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
    const dObj = new Date(dateStr);
    const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

    const allEvents = masterCalendarStore.getEvents(activeTenantId) || [];
    const matchedEvents = allEvents.filter((evt) => {
      if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) return false;
      if (evt.startDate === dateStr && (!evt.endDate || evt.endDate === dateStr)) return true;
      if (evt.startDate && evt.endDate && dateStr >= evt.startDate && dateStr <= evt.endDate) return true;
      if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
        if (!evt.startDate || dateStr >= evt.startDate) {
          if (evt.until === 'DATE' && evt.untilDate && dateStr > evt.untilDate) return false;
          return true;
        }
      }
      return false;
    });

    if (matchedEvents.length === 1) {
      openRightSidebar({
        title: matchedEvents[0].title || "Event Details",
        subtitle: `Date: ${dateStr}`,
        size: "md",
        content: (
          <TimeScheduleDetailDrawer
            event={matchedEvents[0]}
            currentDate={dateStr}
            readOnly={true}
            onClose={closeRightSidebar}
          />
        ),
      });
      return;
    }

    openRightSidebar({
      title: matchedEvents.length > 1 ? "Day Schedule & Events" : "Day Agenda",
      subtitle: `Date: ${dateStr}`,
      size: "md",
      content: (
        <DayAgendaDrawer
          dateStr={dateStr}
          events={matchedEvents}
          readOnly={true}
          onClose={closeRightSidebar}
        />
      ),
    });
  };

  // Export Matrix to CSV
  const handleExportCSV = () => {
    if (!matrixData || !matrixData.students_matrix || matrixData.students_matrix.length === 0) {
      showToast('No attendance data available to export.', 'warning');
      return;
    }

    const headers = [
      'Roll',
      'Student Name',
      'Class',
      'Group',
      'Period Slot',
      ...matrixData.days_header.map((d) => `${d.day} (${d.weekday})`),
      'Present (P)',
      'Late (L)',
      'Absent (A)',
      'Leave (LV)',
      'Attendance Rate %',
    ];

    const rows = matrixData.students_matrix.map((r) => {
      const dayStatuses = matrixData.days_header.map((d) => {
        const fullDateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        return r.daily_statuses[fullDateStr] || r.daily_statuses[d.day] || '—';
      });

      return [
        `"${r.roll_number || ''}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.class_name || ''}"`,
        `"${r.group_name || ''}"`,
        `"${r.period_name || 'General'}"`,
        ...dayStatuses.map((s) => `"${s}"`),
        r.totals.present,
        r.totals.late,
        r.totals.absent,
        r.totals.on_leave,
        `"${r.totals.attendance_rate}%"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Class_Attendance_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance Register CSV exported.', 'success');
  };

  // Print Register
  const handlePrint = () => {
    window.print();
  };

  // Secondary 3-Dot Action Menu Items
  const headerActionMenuItems = [
    {
      label: isFullscreen ? 'Exit Full Screen' : 'Full Screen View',
      icon: isFullscreen ? MinimizeIcon : FullScreenIcon,
      onClick: () => setIsFullscreen((prev) => !prev),
    },
    {
      label: 'Export CSV',
      icon: DownloadIcon,
      onClick: handleExportCSV,
    },
    {
      label: 'Print Register',
      icon: PrintIcon,
      onClick: handlePrint,
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

  const teacherOptions = useMemo(() => [
    { value: '', label: 'All Teachers' },
    ...teachers.map((t) => {
      const teacherName = t.user_name || t.name || t.full_name || t.employee_id || `Teacher #${t.id}`;
      return {
        value: String(t.id),
        label: teacherName,
      };
    }),
  ], [teachers]);

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

  const innerContent = (
    <>
      {/* 1. Normal View Page Header (Hidden when in Full Screen) */}
      {!isFullscreen && !hideHeader && (
        <div className="print:hidden">
          <PageHeader
            icon={MatrixIcon}
            title="Class Attendance"
            subtitle="Monthly attendance matrix and register for classes & groups with automated computations"
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

      {/* 2. Fullscreen Single-Line Top Header Bar (Only Header Title & Attendance Button) */}
      {isFullscreen && (
        <div className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl theme-bg-surface border theme-border flex items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5">
            <MatrixIcon className="w-5 h-5 theme-accent shrink-0" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
              Class Attendance
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

      {/* 3. Combined Header & Filter Card */}
      {!isFullscreen && (
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 print:hidden">
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

          {/* Bottom Row: 4-Column Clean Filters (Class, Group, Teacher, Date Range) */}
          <div className="border-t theme-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
            
            {/* 1. Class Filter */}
            <div>
              <ClassSelect
                label="Select Class"
                value={selectedClassId}
                onChange={setSelectedClassId}
                classes={classes}
                allowAll={true}
                allLabel="All Classes"
                allValue="ALL"
              />
            </div>

            {/* 2. Group Filter */}
            <div>
              <GroupSelect
                label="Select Group"
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                classId={selectedClassId}
                groups={groups}
                allLabel="All Groups (General)"
              />
            </div>

            {/* 3. Teacher Filter */}
            <div>
              <TeacherSelect
                label="Assigned Teacher"
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                teachers={teachers}
                allLabel="All Teachers"
              />
            </div>

            {/* 4. Reusable Date Range Filter */}
            <div>
              <DateRangePicker
                label="Date Range"
                startDate={startDate}
                endDate={endDate}
                minDate={academicBounds.minDate}
                maxDate={academicBounds.maxDate}
                onRangeSelect={handleDateRangeSelect}
                onReset={handleResetDateRange}
                isHijriEnabled={isHijriEnabled}
                placeholder="Full Month View"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Reusable Attendance Matrix Table */}
      <div
        className={
          isFullscreen
            ? "flex-1 overflow-hidden flex flex-col rounded-2xl theme-bg-surface border theme-border shadow-md my-2"
            : "rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden"
        }
      >
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b theme-border text-center">
          <h2 className="text-lg font-bold">Monthly Student Attendance Register</h2>
          <p className="text-xs">
            Period: {gregorianTitle} {isHijriEnabled && `(${hijriTitle})`} | Class:{' '}
            {selectedClassName}
          </p>
        </div>

        {/* Reusable AttendanceTable Component */}
        <AttendanceTable
          matrixData={enrichedMatrixData}
          isEditing={isEditing}
          onToggleCell={handleToggleCellAttendance}
          onAdminEditCell={isAdmin ? handleAdminEditCell : undefined}
          onInspectHistory={(row) => {
            if (!row) return;
            openRightSidebar({
              title: 'Schedule Timeline & Evolution',
              subtitle: `${row.period_name || row.name || 'Period Slot'} • ${row.class_name || selectedClassName || 'Class Routine'}`,
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
          calculationBaselineDate={academicBounds.activeYear?.startDate || academicBounds.minDate || 'Session Start'}
          calculationBaselineLabel="Tracking Since"
          totalCount={enrichedMatrixData?.total_students || 0}
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
