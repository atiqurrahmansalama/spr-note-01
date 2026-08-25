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
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';
import CustomSelect from '../../components/ui/CustomSelect';
import { ClassSelect, GroupSelect, TeacherSelect, DateRangePicker } from '../../components/selectors';
import ActionMenu from '../../components/ui/ActionMenu';
import AttendanceMatrixTable, { TakeAttendanceButton } from '../../components/common/AttendanceMatrixTable';
import { useFullscreen } from '../../hooks/useFullscreen';
import { getMonthlyAttendanceMatrix, bulkMarkStudentAttendance } from '../../api/attendance';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { calendarSettings, attendanceFilters, masterCalendarStore, attendanceEventRestrictionsStore } from '../../utils/localStore';
import { getHijriDateString, getCurrentHijriMonthRange } from '../../utils/hijriUtils';
import { getEventColors, DayAgendaDrawer, TimeScheduleDrawerForm } from '../../components/calendar';
import { cycleAttendanceStatus } from '../../constants/attendanceConstants';

export default function ClassAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
} = {}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

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
        const [classRes, staffRes, grpRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/staff/'),
          fetchWithAuth('/api/v1/groups/?page_size=500'),
        ]);

        if (!isMounted) return;

        if (classRes.status === 'fulfilled' && classRes.value.ok) {
          const data = await classRes.value.json();
          const classList = Array.isArray(data) ? data : data.results || [];
          setClasses(classList);

          if (classList.length > 0) {
            const isValid = selectedClassId && classList.some(c => String(c.id) === String(selectedClassId));
            if (!isValid) {
              const matchingSaved = savedFilters.classId && classList.some(c => String(c.id) === String(savedFilters.classId));
              setSelectedClassId(matchingSaved ? String(savedFilters.classId) : String(classList[0].id));
            }
          } else {
            setSelectedClassId('');
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
          if (savedFilters.groupId && grpList.some(g => String(g.id) === String(savedFilters.groupId))) {
            setSelectedGroupId(String(savedFilters.groupId));
          } else if (selectedGroupId && !grpList.some(g => String(g.id) === String(selectedGroupId))) {
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
    window.addEventListener('spr_tenant_changed', handleTenantChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
    };
  }, [activeTenantId]);

  // 2. Fetch Monthly / Range Attendance Matrix
  const loadMatrix = useCallback(async () => {
    if (!metadataLoaded && !propClassId) {
      return;
    }
    if (!selectedClassId && classes.length > 0) {
      return;
    }
    if (!selectedClassId && !propClassId && classes.length === 0) {
      setIsLoading(false);
      return;
    }

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
  }, [metadataLoaded, selectedClassId, selectedGroupId, selectedTeacherId, selectedYear, selectedMonth, startDate, endDate, classes.length, propClassId, showToast]);

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

  // Toggle "Take Attendance" mode & automatically trigger Full Screen / Exit Full Screen
  const handleToggleTakeAttendance = () => {
    setIsEditing((prev) => {
      const next = !prev;
      if (next) {
        setIsFullscreen(true);
        showToast('Attendance marking mode enabled in Full Screen. Click any student cell to mark attendance.', 'info');
      } else {
        setIsFullscreen(false);
        showToast('Attendance marking finished. Exited full screen.', 'success');
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
          return s === 'ALL' || s === 'ATTENDANCE' || s === 'IMP-1' || s === 'CLASS_ATTENDANCE';
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
      let hd_count = 0;
      let lv_count = 0;
      let hol_count = 0;

      const cleanedDailyStatuses = { ...(row.daily_statuses || {}) };

      enrichedDaysHeader.forEach((d) => {
        const isOff = Boolean(d.is_holiday || d.is_disabled);
        if (isOff) {
          hol_count += 1;
          // Clear any previous status for this off day so it's not marked or shown
          if (d.date) cleanedDailyStatuses[d.date] = null;
          if (d.day) cleanedDailyStatuses[d.day] = null;
        } else {
          const st = cleanedDailyStatuses[d.date] || cleanedDailyStatuses[d.day];
          if (st === 'PRESENT') {
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
        }
      });

      const totalRecorded = p_count + l_count + a_count + hd_count + lv_count;
      const effectivePresent = p_count + l_count + hd_count * 0.5;
      const attendanceRate = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 1000) / 10 : 0.0;

      return {
        ...row,
        daily_statuses: cleanedDailyStatuses,
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
      ...matrixData,
      days_header: enrichedDaysHeader,
      students_matrix: enrichedStudentsMatrix,
    };
  }, [matrixData, activeTenantId, selectedYear, selectedMonth, calendarEventsVersion]);

  // Interactive Click to Mark/Toggle Cell Attendance (Excludes Holidays defined in Calendar)
  const handleToggleCellAttendance = async (studentId, dateStr, currentStatus, periodSlotId) => {
    // Strictly disable on holidays defined in event calendar
    const dayHeader = enrichedMatrixData?.days_header?.find(
      (d) => d.date === dateStr || String(d.day) === String(dateStr)
    );
    if (dayHeader?.is_holiday) {
      showToast(`Attendance marking is disabled on ${dayHeader.holiday_title || 'scheduled holidays'}.`, 'warning');
      return;
    }

    // Determine next status in cycle
    const nextStatus = cycleAttendanceStatus(currentStatus);

    // Optimistic Update
    setMatrixData((prev) => {
      if (!prev || !prev.students_matrix) return prev;

      const updatedMatrix = prev.students_matrix.map((row) => {
        const isMatch =
          row.student_id === studentId &&
          (periodSlotId ? String(row.period_slot_id) === String(periodSlotId) : true);
        if (!isMatch) return row;

        const updatedStatuses = { ...row.daily_statuses, [dateStr]: nextStatus };

        // Recalculate totals (Excludes calendar holidays)
        let p_count = 0;
        let l_count = 0;
        let a_count = 0;
        let hd_count = 0;
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
      'Half Day (H)',
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
        r.totals.half_day,
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
            </div>

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
                allowAll={false}
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

        {/* Reusable AttendanceMatrixTable Component */}
        <AttendanceMatrixTable
          matrixData={enrichedMatrixData}
          isEditing={isEditing}
          onToggleCell={handleToggleCellAttendance}
          isHijriEnabled={isHijriEnabled}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onStudentClick={onStudentClick}
          onDateClick={handleDateHeaderClick}
          isLoading={isLoading}
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
