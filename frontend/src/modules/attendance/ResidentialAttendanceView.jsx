import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshIcon,
  CalendarIcon,
  TimerIcon,
  PrintIcon,
  DownloadIcon,
  FilledCheckCircleIcon,
  FilledXCircleIcon,
  AttendanceIcon,
} from '../../components/ui/Icons';
import PageHeader from '../../components/ui/PageHeader';
import ActionMenu from '../../components/ui/ActionMenu';
import CustomSelect from '../../components/ui/CustomSelect';
import DateRangePicker from '../../components/common/DateRangePicker';
import CheckpointForm from './CheckpointForm';
import { fetchWithAuth } from '../../utils/authService';
import { getMonthlyAttendanceMatrix } from '../../api/attendance';
import {
  calendarSettings,
  attendanceFilters,
  masterCalendarStore,
} from '../../utils/localStore';
import { getHijriDateString, getCurrentHijriMonthRange } from '../../utils/hijriUtils';
import { getEventColors } from '../../components/common/MasterTimeCalendar';
import DayAgendaDrawer from '../../components/common/DayAgendaDrawer';
import TimeScheduleDrawerForm from '../../components/common/TimeScheduleDrawerForm';
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

export default function ResidentialAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
} = {}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openRightSidebar, closeRightSidebar, openDrawer } = useRightSidebar();

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  // Checkpoint-specific Attendance Records: { [`${studentId}_${checkpointId}_${dateStr}`]: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' }
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
        const [clsRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
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
      } catch (err) {
        console.error('Failed to load classes for residential attendance:', err);
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
          : `/api/v1/groups/?page_size=500`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const data = await res.json();
          setGroups(Array.isArray(data) ? data : data.results || []);
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
    setIsEditing((prev) => {
      const next = !prev;
      if (next) {
        setIsFullscreen(true);
        showToast('Attendance marking mode enabled in Full Screen. Click any student cell to mark checkpoint attendance.', 'info');
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
          return s === 'ALL' || s === 'ATTENDANCE' || s === 'RESIDENTIAL_ATTENDANCE';
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

  // Toggle Cell Checkpoint Attendance (Always allowed, never blocked)
  const handleToggleCell = (studentId, dateStr, currentStatus, checkpointId) => {
    const nextStatus =
      !currentStatus || currentStatus === 'PRESENT'
        ? 'ABSENT'
        : currentStatus === 'ABSENT'
        ? 'LATE'
        : currentStatus === 'LATE'
        ? 'HALF_DAY'
        : currentStatus === 'HALF_DAY'
        ? 'ON_LEAVE'
        : currentStatus === 'ON_LEAVE'
        ? null
        : 'PRESENT';

    const recordKey = `${studentId}_${checkpointId}_${dateStr}`;
    const newRecords = { ...residentialRecords, [recordKey]: nextStatus };
    setResidentialRecords(newRecords);

    try {
      localStorage.setItem(`spr_res_records_${activeTenantId || 'default'}`, JSON.stringify(newRecords));
    } catch {}
  };

  // Active checkpoints to show
  const activeCheckpoints = useMemo(() => {
    if (selectedCheckpointId === 'ALL') {
      return checkpoints;
    }
    const found = checkpoints.filter((c) => String(c.id) === String(selectedCheckpointId));
    return found.length > 0 ? found : checkpoints;
  }, [checkpoints, selectedCheckpointId]);

  // Unique Students from matrix
  const uniqueStudents = useMemo(() => {
    if (!enrichedMatrixData?.students_matrix) return [];
    return enrichedMatrixData.students_matrix;
  }, [enrichedMatrixData]);

  // Compute student totals across active checkpoints
  const computeStudentTotals = useCallback((studentId) => {
    let p = 0, l = 0, a = 0, hd = 0, lv = 0;
    if (!enrichedMatrixData?.days_header) {
      return { present: 0, late: 0, absent: 0, half_day: 0, on_leave: 0, total_recorded: 0, attendance_rate: 100 };
    }

    enrichedMatrixData.days_header.forEach((d) => {
      const dateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      activeCheckpoints.forEach((chk) => {
        const key = `${studentId}_${chk.id}_${dateStr}`;
        const st = residentialRecords[key];
        if (st === 'PRESENT') p += 1;
        else if (st === 'LATE') l += 1;
        else if (st === 'ABSENT') a += 1;
        else if (st === 'HALF_DAY') hd += 1;
        else if (st === 'ON_LEAVE') lv += 1;
      });
    });

    const total = p + l + a + hd + lv;
    const effective = p + l + hd * 0.5;
    const rate = total > 0 ? Math.round((effective / total) * 1000) / 10 : 100.0;
    return { present: p, late: l, absent: a, half_day: hd, on_leave: lv, total_recorded: total, attendance_rate: rate };
  }, [enrichedMatrixData, activeCheckpoints, selectedYear, selectedMonth, residentialRecords]);

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
      'Half Day',
      'Leave',
      'Rate %',
    ];

    const rows = [];
    uniqueStudents.forEach((student) => {
      activeCheckpoints.forEach((chk) => {
        const dayStatuses = matrixData.days_header.map((d) => {
          const fullDateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
          const recordKey = `${student.student_id}_${chk.id}_${fullDateStr}`;
          return residentialRecords[recordKey] || '—';
        });

        const totals = computeStudentTotals(student.student_id);

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
          totals.half_day,
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

  const content = (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] theme-bg-app p-3 sm:p-4 flex flex-col justify-between overflow-hidden shadow-2xl animate-fade-in select-none w-screen h-screen"
          : "p-4 md:p-6 space-y-6 max-w-[1720px] w-full mx-auto min-h-screen theme-text-primary animate-fade-in select-none"
      }
    >
      {/* 1. Page Header (Hidden when in Full Screen) */}
      {!isFullscreen && !hideHeader && (
        <div className="print:hidden">
          <PageHeader
            icon={TimerIcon}
            title="Residential Attendance"
            subtitle="Time & Checkpoint roll-call attendance register for boarding/dormitory students"
            actions={
              <div className="flex items-center gap-2">
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
                  <span>Done</span>
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

          {/* Bottom Row: 4 Filters with Standard Project Labels (Matching Class Attendance) */}
          <div className="border-t theme-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
            <div>
              <CustomSelect
                label="Select Class"
                options={classOptions}
                value={selectedClassId}
                onChange={(val) => {
                  setSelectedClassId(val);
                  setSelectedGroupId('');
                }}
                placeholder="Select Class..."
                searchable={false}
              />
            </div>

            <div>
              <CustomSelect
                label="Select Group"
                options={groups.length > 0 ? groupOptions : [{ value: '', label: 'All Groups (General)' }]}
                value={selectedGroupId}
                onChange={(val) => setSelectedGroupId(val)}
                placeholder="All Groups"
                searchable={false}
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
        {isLoading ? (
          <div className="p-16 text-center text-xs theme-text-secondary flex flex-col items-center justify-center gap-3">
            <RefreshIcon className="w-6 h-6 animate-spin theme-accent" />
            <span>Generating residential attendance register...</span>
          </div>
        ) : !enrichedMatrixData || uniqueStudents.length === 0 ? (
          <div className="p-16 text-center text-xs theme-text-secondary">
            No students found for this class and residential selection.
          </div>
        ) : (
          <div ref={tableScrollRef} className={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}>
            <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
              {/* Sticky Headers (Exact Match with Class Attendance) */}
              <thead className="sticky top-0 z-30 theme-bg-sub select-none">
                <tr className="text-center font-bold">
                  {/* Sticky Roll No */}
                  <th className="py-2.5 px-0.5 sm:px-1 w-[36px] min-w-[36px] max-w-[36px] sm:w-[42px] sm:min-w-[42px] sm:max-w-[42px] sticky left-0 z-40 theme-bg-sub border-r border-b theme-border text-xs text-center">
                    Roll
                  </th>

                  {/* Sticky Student Name */}
                  <th className="py-2.5 px-2 sm:px-2.5 w-[110px] min-w-[110px] max-w-[110px] sm:w-[140px] sm:min-w-[140px] sm:max-w-[140px] left-[36px] sm:left-[42px] sticky z-40 theme-bg-sub border-r border-b theme-border text-left text-xs shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]">
                    Student Name
                  </th>

                  {/* Dedicated Time & Checkpoint Header */}
                  <th className="py-2.5 px-1.5 sm:px-2 w-[100px] min-w-[100px] max-w-[100px] sm:w-[130px] sm:min-w-[130px] sm:max-w-[130px] border-r border-b theme-border text-left text-xs">
                    <div className="flex items-center gap-1">
                      <TimerIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                      <span className="truncate">Time &amp; Checkpoint</span>
                    </div>
                  </th>

                  {/* Dynamic Date Headers with 3 Lines (Day -> Hijri -> Weekday) & Event Color Priority */}
                  {enrichedMatrixData.days_header.map((d) => {
                    const fullDateStr =
                      d.date ||
                      `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                    const hijriDayNumber = isHijriEnabled
                      ? getHijriDateString(fullDateStr).split(' ')[0]
                      : null;

                    const isHoliday = Boolean(d.is_holiday);
                    const hasEvent = Boolean(d.event_colors);
                    const eventTitle = d.event_title || d.calendar_event?.title || d.holiday_title;

                    return (
                      <th
                        key={d.date || d.day}
                        onClick={() => handleOpenDayAgenda(fullDateStr)}
                        className={`py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] font-mono border-r border-b theme-border transition-colors cursor-pointer hover:brightness-95 select-none ${
                          hasEvent
                            ? `${d.event_colors.bg} ${d.event_colors.text} font-bold`
                            : isHoliday
                            ? 'theme-bg-accent-soft theme-accent font-bold'
                            : ''
                        }`}
                        title={
                          eventTitle
                            ? `${eventTitle} [${fullDateStr}] - Click to view schedule & events`
                            : `${d.weekday} - ${fullDateStr}${hijriDayNumber ? ` (Hijri: ${hijriDayNumber})` : ''} - Click to view day agenda`
                        }
                      >
                        <div className="flex flex-col items-center justify-between min-h-[50px] sm:min-h-[56px] py-0.5">
                          {/* Top Group: Gregorian & Hijri Dates */}
                          <div className="space-y-0.5 flex flex-col items-center">
                            <div className={`font-bold text-xs sm:text-sm tracking-tight leading-none ${hasEvent ? d.event_colors.text : 'theme-text-primary'}`}>
                              {d.day}
                            </div>

                            {isHijriEnabled && hijriDayNumber && (
                              <div className="text-[9px] sm:text-[10px] font-mono theme-accent font-semibold leading-none pt-0.5">
                                {hijriDayNumber}
                              </div>
                            )}

                            {hasEvent && (
                              <span className={`w-1 h-1 rounded-full mt-0.5 shrink-0 ${d.event_colors.dot}`} />
                            )}
                          </div>

                          {/* Bottom: Weekday Name with clear spacing and subtle separator line */}
                          <div className="text-[8px] sm:text-[9px] font-semibold uppercase opacity-60 leading-none mt-1.5 sm:mt-2 pt-1 border-t theme-border w-full text-center">
                            {d.weekday.slice(0, 2)}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Summary Metric Headers (Matching Class Attendance) */}
                  <th className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold text-emerald-600 dark:text-emerald-400 border-l border-b theme-border text-xs" title="Present">P</th>
                  <th className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold text-amber-600 dark:text-amber-400 border-l border-b theme-border text-xs" title="Late">L</th>
                  <th className="py-2 sm:py-2.5 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-bold text-rose-500 dark:text-rose-400 border-l border-b theme-border text-xs" title="Absent">A</th>
                  <th className="py-2 sm:py-2.5 px-1 w-[46px] min-w-[46px] max-w-[46px] sm:w-[54px] sm:min-w-[54px] sm:max-w-[54px] text-center font-bold text-xs border-l border-r border-b theme-border" title="Attendance Rate %">Rate %</th>
                </tr>
              </thead>

              {/* Student Rows Iterated Across Checkpoints */}
              <tbody className="divide-y theme-border font-sans">
                {uniqueStudents.map((student) => {
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
                            <div className="font-bold text-xs theme-text-primary truncate max-w-[95px] sm:max-w-[125px]" title={student.name}>
                              {student.name}
                            </div>
                            <div className="text-[10px] theme-text-secondary truncate max-w-[95px] sm:max-w-[125px] mt-0.5">
                              {student.group_name || student.class_name}
                            </div>
                          </td>
                        )}

                        {/* Dedicated Time & Checkpoint Column */}
                        <td className="py-2 px-1.5 sm:px-2 border-r border-b theme-border w-[100px] min-w-[100px] max-w-[100px] sm:w-[130px] sm:min-w-[130px] sm:max-w-[130px]">
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-xs theme-accent truncate">
                              {chk.time || '--:--'}
                            </span>
                          </div>
                          <div className="text-[10px] theme-text-secondary font-medium truncate max-w-[90px] sm:max-w-[120px] mt-0.5" title={chk.name}>
                            {chk.name}
                          </div>
                        </td>

                        {/* Day Status Cells with Exact Class Attendance Colors & Micro-animations */}
                        {enrichedMatrixData.days_header.map((d) => {
                          const dateStr =
                            d.date ||
                            `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                          const recordKey = `${student.student_id}_${chk.id}_${dateStr}`;
                          const status = residentialRecords[recordKey];
                          const canEditCell = isEditing;

                          return (
                            <td
                              key={d.date || d.day}
                              onClick={() => {
                                if (canEditCell) {
                                  handleToggleCell(student.student_id, dateStr, status, chk.id);
                                }
                              }}
                              className={`py-2 px-0.5 sm:px-1 w-[32px] min-w-[32px] max-w-[32px] sm:w-[38px] sm:min-w-[38px] sm:max-w-[38px] text-center font-mono text-[10px] border-r border-b theme-border transition-colors ${
                                d.event_colors
                                  ? `${d.event_colors.bg} ${d.event_colors.text}`
                                  : d.is_holiday
                                  ? 'theme-bg-accent-soft/30'
                                  : ''
                              } ${
                                canEditCell
                                  ? 'cursor-pointer select-none hover:brightness-95'
                                  : 'cursor-default'
                              }`}
                              title={
                                isEditing
                                  ? `${dateStr} [${chk.name}]: ${status || 'Unrecorded'} (Click to toggle status)`
                                  : `${dateStr} [${chk.name}]: ${status || 'Unrecorded'}`
                              }
                            >
                              {status === 'PRESENT' ? (
                                <FilledCheckCircleIcon className="w-4 h-4 text-emerald-600/80 dark:text-emerald-400/85 hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs" />
                              ) : status === 'ABSENT' ? (
                                <FilledXCircleIcon className="w-4 h-4 text-[var(--danger-main)] hover:scale-125 active:scale-95 transition-transform inline-block drop-shadow-xs" />
                              ) : status === 'LATE' ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/10 text-amber-600/85 dark:text-amber-400/85 font-bold text-[10px] hover:scale-125 active:scale-95 transition-transform">
                                  L
                                </span>
                              ) : status === 'HALF_DAY' ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500/10 text-sky-600/85 dark:text-sky-400/85 font-bold text-[10px]">
                                  H
                                </span>
                              ) : status === 'ON_LEAVE' ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-500/10 text-purple-600/85 dark:text-purple-400/85 font-bold text-[10px]">
                                  LV
                                </span>
                              ) : canEditCell ? (
                                <span className="inline-block w-3.5 h-3.5 rounded-md border border-dashed theme-border hover:border-[var(--accent-main)] hover:theme-bg-accent-soft transition-all opacity-70 hover:opacity-100" title="Click to mark Present"></span>
                              ) : (
                                <span className="opacity-35 font-mono text-xs select-none theme-text-secondary">—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Metrics (Matching Class Attendance) */}
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

        {/* Legend Ribbon & Bottom Controls (Matching Class Attendance) */}
        <div className="p-3 sm:p-3.5 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3 text-[11px] theme-text-secondary shrink-0">
          <div className="flex items-center gap-3.5 flex-wrap font-mono">
            <span className="flex items-center gap-1.5">
              <FilledCheckCircleIcon className="w-3.5 h-3.5 text-emerald-600/85" /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <FilledXCircleIcon className="w-3.5 h-3.5 text-[var(--danger-main)]" /> Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500/10 text-amber-600/85 dark:text-amber-400/85 font-bold flex items-center justify-center text-[9px]">L</span> Late
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-500/10 text-sky-600/85 dark:text-sky-400/85 font-bold flex items-center justify-center text-[9px]">H</span> Half Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-500/10 text-purple-600/85 dark:text-purple-400/85 font-bold flex items-center justify-center text-[9px]">LV</span> Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="opacity-35 font-mono text-xs">—</span> Unmarked
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
