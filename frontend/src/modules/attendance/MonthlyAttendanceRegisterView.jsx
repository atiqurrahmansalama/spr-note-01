import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { useRightSidebar } from '../../context/RightSidebarContext';
import { calendarSettings, attendanceFilters, masterCalendarStore } from '../../utils/localStore';
import { getHijriDateString } from '../../utils/hijriUtils';
import { getEventColors } from '../../components/common/MasterTimeCalendar';
import DayAgendaDrawer from '../../components/common/DayAgendaDrawer';
import TimeScheduleDrawerForm from '../../components/common/TimeScheduleDrawerForm';

export default function MonthlyAttendanceRegisterView({
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hijri Setting State
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());

  // Matrix Data & Loading
  const [matrixData, setMatrixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
      window.removeEventListener('spr_calendar_events_updated', handleCalendarUpdate);
    };
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
          const grpList = Array.isArray(data) ? data : data.results || [];
          setGroups(grpList);
          if (savedFilters.groupId && grpList.some(g => String(g.id) === String(savedFilters.groupId))) {
            setSelectedGroupId(String(savedFilters.groupId));
          } else if (!grpList.some(g => String(g.id) === String(selectedGroupId))) {
            setSelectedGroupId('');
          }
        }
      } catch (err) {
        console.warn('Error fetching groups:', err);
      }
    };

    fetchGroups();
  }, [selectedClassId]);

  // 3. Fetch Monthly / Range Attendance Matrix
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
  }, [selectedClassId, selectedGroupId, selectedTeacherId, selectedYear, selectedMonth, startDate, endDate, classes.length, propClassId, showToast]);

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

  // Toggle "Take Attendance" mode & automatically trigger Full Screen
  const handleToggleTakeAttendance = () => {
    setIsEditing((prev) => {
      const next = !prev;
      if (next) {
        setIsFullscreen(true);
        showToast('Attendance marking mode enabled in Full Screen. Click any student cell to mark attendance.', 'info');
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

  // Merge Master Calendar Events & Holidays impacting Attendance with API matrixData
  const enrichedMatrixData = useMemo(() => {
    if (!matrixData || !matrixData.days_header) return matrixData;

    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];

    const hasAttendanceImpact = (evt) => {
      if (!evt) return false;
      if (!evt.impacts) return true; // Default if not specified
      const impacts = Array.isArray(evt.impacts)
        ? evt.impacts
        : (typeof evt.impacts === 'string' ? evt.impacts.split(',').map((s) => s.trim()) : []);
      if (impacts.length === 0) return true;
      return impacts.some((imp) => {
        const s = String(imp).toUpperCase();
        return s === 'ALL' || s === 'ATTENDANCE' || s === 'IMP-1' || s === 'CLASS_ATTENDANCE';
      });
    };

    const findMatchingAttendanceEvent = (dateStr, weekdayNum) => {
      for (const evt of calendarEvents) {
        if (!hasAttendanceImpact(evt)) continue;
        if (Array.isArray(evt.exceptions) && evt.exceptions.includes(dateStr)) continue;

        // 1. Single date match
        if (evt.startDate === dateStr && (!evt.endDate || evt.endDate === dateStr)) {
          return evt;
        }
        // 2. Date range match
        if (evt.startDate && evt.endDate && dateStr >= evt.startDate && dateStr <= evt.endDate) {
          return evt;
        }
        // 3. Recurring match (e.g. weekly events / off-days)
        if (evt.repeats && Array.isArray(evt.repeatDays) && evt.repeatDays.includes(weekdayNum)) {
          if (!evt.startDate || dateStr >= evt.startDate) {
            if (evt.until === 'DATE' && evt.untilDate && dateStr > evt.untilDate) {
              continue;
            }
            return evt;
          }
        }
      }
      return null;
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
      const isHoliday = Boolean(isCalHoliday);
      const holidayTitle = isCalHoliday ? (matchedEvt.title || 'Institutional Holiday') : '';

      return {
        ...d,
        date: dateStr,
        is_holiday: isHoliday,
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

      enrichedDaysHeader.forEach((d) => {
        const isOff = Boolean(d.is_holiday);
        const st = row.daily_statuses[d.date] || row.daily_statuses[d.day];

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

  // Click on date header -> Open Day Agenda & Task Worklist in Right Sidebar
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

    const handleEditEvent = (evt) => {
      openRightSidebar({
        title: "Edit Schedule / Task",
        subtitle: dateStr,
        size: "md",
        content: (
          <TimeScheduleDrawerForm
            event={evt}
            initialDate={dateStr}
            onSave={(saved) => {
              masterCalendarStore.updateEvent(activeTenantId, saved.id, saved);
              showToast("Schedule updated successfully!", "success");
              closeRightSidebar();
            }}
            onCancel={closeRightSidebar}
          />
        ),
      });
    };

    const handleAddEvent = (targetDate) => {
      openRightSidebar({
        title: "Add Day Schedule / Task",
        subtitle: targetDate || dateStr,
        size: "md",
        content: (
          <TimeScheduleDrawerForm
            initialDate={targetDate || dateStr}
            defaultCategory="ACADEMIC_EVENT"
            onSave={(saved) => {
              masterCalendarStore.addEvent(activeTenantId, saved);
              showToast("Event created successfully!", "success");
              closeRightSidebar();
            }}
            onCancel={closeRightSidebar}
          />
        ),
      });
    };

    const handleDeleteEvent = (evtOrId, options = {}) => {
      const id = typeof evtOrId === "object" ? evtOrId.id : evtOrId;
      const opts = typeof evtOrId === "object" ? evtOrId : options;
      masterCalendarStore.deleteEvent(activeTenantId, id, opts);
      showToast("Schedule deleted successfully!", "info");
      closeRightSidebar();
    };

    openRightSidebar({
      title: matchedEvents.length === 1 ? (matchedEvents[0].title || "Event Details") : "Day Agenda & Worklist",
      subtitle: `Date: ${dateStr}`,
      size: "md",
      content: (
        <DayAgendaDrawer
          dateStr={dateStr}
          events={matchedEvents}
          onClose={closeRightSidebar}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onAddEvent={handleAddEvent}
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
      icon: isFullscreen ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 4v6m0 0H4m6 0L3 3m10 7h6m-6 0V4m0 6l7-7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      ),
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
      {/* 1. Normal View Page Header (Hidden when in Full Screen) */}
      {!isFullscreen && !hideHeader && (
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

      {/* 2. Fullscreen Single-Line Top Header Bar (Only Header Title & Attendance Button) */}
      {isFullscreen && (
        <div className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl theme-bg-surface border theme-border flex items-center justify-between gap-3 shadow-xs print:hidden">
          {/* Left: Only Header Title */}
          <div className="flex items-center gap-2.5">
            <MatrixIcon className="w-5 h-5 theme-accent shrink-0" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
              Class Attendance
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
                  <AttendanceIcon className="w-4 h-4" />
                  <span>Take Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Unified Combined Header & Filter Card (Shown only when NOT in fullscreen) */}
      {!isFullscreen && (
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface border theme-border shadow-xs space-y-4 print:hidden">
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
          <div className="border-t theme-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
            
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
          tableContainerClass={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}
        />

        {/* Legend Ribbon & Bottom Controls */}
        <div className="p-3 sm:p-3.5 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3 text-[11px] theme-text-secondary shrink-0">
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

          <div className="flex items-center gap-3.5">
            <div className="font-mono font-medium">
              Total Students: <strong className="theme-text-primary">{enrichedMatrixData?.total_students || 0}</strong>
            </div>

            {/* Bottom-Right Full Screen / Minimize Button */}
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
