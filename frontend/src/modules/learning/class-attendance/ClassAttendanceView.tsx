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
} from '@/components/ui/Icons';
import PageHeader from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/layout';
import CustomSelect from '@/components/ui/CustomSelect';
import { ClassSelect, GroupSelect, TeacherSelect, DateRangePicker } from '@/components/selectors';
import ActionMenu from '@/components/ui/ActionMenu';
import AttendanceTable, { TakeAttendanceButton, AttendanceDateStepper } from '@/components/common/AttendanceTable';
import AdminAttendanceDrawer from '@/components/common/AdminAttendanceDrawer';
import { useFullscreen } from '@/hooks/useFullscreen';
import { getMonthlyAttendanceMatrix, bulkMarkStudentAttendance } from '@/api/attendance';
import { fetchWithAuth } from '@/utils/authService';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import { useRightSidebar } from '@/context/RightSidebarContext';
import { useAcademicSession } from '@/context/AcademicSessionContext';
import {
  calendarSettings,
  attendanceFilters,
  masterCalendarStore,
  attendanceEventRestrictionsStore,
  attendanceTimingPolicyStore,
  academicYearsStore,
  periodCategoriesStore,
} from '@/utils/localStore';
import { getHijriDateString, getCurrentHijriMonthRange } from '@/utils/hijriUtils';
import { getEventColors, DayAgendaDrawer, TimeScheduleDrawerForm, TimeScheduleDetailDrawer } from '@/components/calendar';
import {
  getAttendanceCellTimingState,
  cycleStatusWithinAllowed,
  calculateLateDelayMinutes,
} from '@/utils/attendanceTimingEngine';
import ScheduleTimelineDrawer from '@/components/common/ScheduleTimelineDrawer';
import type { ClassAttendanceViewProps, DayPeriodItem, AttendanceStudentItem } from './types';

export default function ClassAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
}: ClassAttendanceViewProps) {
  const { showToast } = useToast();
  const { activeTenantId, isMultiTenantAdmin } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();
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
  const [periodSlots, setPeriodSlots] = useState<any[]>([]);

  useEffect(() => {
    attendanceTimingPolicyStore.fetchRemotePolicy(activeTenantId).then((res) => {
      if (res) setTimingPolicy(res);
    });

    const handlePolicyUpdate = (e: any) => {
      setTimingPolicy(e.detail || attendanceTimingPolicyStore.getPolicy(activeTenantId));
    };

    window.addEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    return () => {
      window.removeEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    };
  }, [activeTenantId]);

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
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const savedFilters = useMemo(() => {
    return attendanceFilters.getMonthlyFilters(activeTenantId) || {};
  }, [activeTenantId]);

  // Class, Group & Teacher State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => String(propClassId || savedFilters.classId || ''));
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => String(propGroupId || savedFilters.groupId || ''));
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => String(savedFilters.teacherId || ''));

  // Year & Month for standard month navigation
  const [selectedYear, setSelectedYear] = useState<number>(() => Number(savedFilters.year) || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => Number(savedFilters.month) || (new Date().getMonth() + 1));

  // Custom Date Range State
  const [startDate, setStartDate] = useState<string>(() => {
    if (savedFilters.hasExplicitDateChoice) return savedFilters.startDate || '';
    if (isSmallScreen) return todayStr;
    return savedFilters.startDate || '';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    if (savedFilters.hasExplicitDateChoice) return savedFilters.endDate || '';
    if (isSmallScreen) return todayStr;
    return savedFilters.endDate || '';
  });

  // Interactive Attendance Marking Mode
  const [isEditing, setIsEditing] = useState(false);

  // Full Screen Mode
  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen();

  // Hijri Setting State
  const [isHijriEnabled, setIsHijriEnabled] = useState<boolean>(() => calendarSettings.getHijriEnabled());

  // Matrix Data & Loading
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

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
          const trackedSlots = slotList.filter((s: any) =>
            periodCategoriesStore.isAttendanceTrackedForSlot(activeTenantId, s)
          );
          setPeriodSlots(trackedSlots);
        }

        if (classRes.status === 'fulfilled' && classRes.value.ok) {
          const data = await classRes.value.json();
          const classList = Array.isArray(data) ? data : data.results || [];
          setClasses(classList);

          if (classList.length > 0) {
            const isValid = selectedClassId && (selectedClassId === 'ALL' || classList.some((c: any) => String(c.id) === String(selectedClassId)));
            if (!isValid) {
              const matchingSaved = savedFilters.classId && (savedFilters.classId === 'ALL' || classList.some((c: any) => String(c.id) === String(savedFilters.classId)));
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
          if (savedFilters.groupId && (savedFilters.groupId === 'ALL' || grpList.some((g: any) => String(g.id) === String(savedFilters.groupId)))) {
            setSelectedGroupId(String(savedFilters.groupId));
          } else if (selectedGroupId && selectedGroupId !== 'ALL' && !grpList.some((g: any) => String(g.id) === String(selectedGroupId))) {
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
      const params: any = {
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

  const getStepLabels = () => {
    if (!startDate || !endDate) {
      return { prev: 'Prev Month', next: 'Next Month' };
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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

      if (!isAdmin && academicBounds.minDate) {
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
        const targetMonthEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayOfTargetMonth).padStart(2, '0')}`;
        if (targetMonthEnd < academicBounds.minDate) {
          showToast(`Navigation before active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted.`, 'warning');
          return;
        }
      }

      setSelectedMonth(targetMonth);
      setSelectedYear(targetYear);
      return;
    }

    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    s.setDate(s.getDate() - dayCount);
    e.setDate(e.getDate() - dayCount);
    const newStart = s.toISOString().split('T')[0];
    const newEnd = e.toISOString().split('T')[0];

    if (!isAdmin && academicBounds.minDate && newEnd < academicBounds.minDate) {
      showToast(`Navigation before active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted.`, 'warning');
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

      if (!isAdmin && academicBounds.maxDate) {
        const targetMonthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        if (targetMonthStart > academicBounds.maxDate) {
          showToast(`Navigation beyond active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted.`, 'warning');
          return;
        }
      }

      setSelectedMonth(targetMonth);
      setSelectedYear(targetYear);
      return;
    }

    const s = new Date(startDate);
    const e = new Date(endDate);
    const dayCount = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    s.setDate(s.getDate() + dayCount);
    e.setDate(e.getDate() + dayCount);
    const newStart = s.toISOString().split('T')[0];
    const newEnd = e.toISOString().split('T')[0];

    if (!isAdmin && academicBounds.maxDate && newStart > academicBounds.maxDate) {
      showToast(`Navigation beyond active Academic Year (${academicBounds.activeYear?.name || 'Active Year'}) is restricted.`, 'warning');
      return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleDateRangeSelect = (start: string, end: string) => {
    let safeStart = start;
    let safeEnd = end;

    if (!isAdmin) {
      if (academicBounds.minDate && safeStart && safeStart < academicBounds.minDate) {
        safeStart = academicBounds.minDate;
      }
      if (academicBounds.maxDate && safeEnd && safeEnd > academicBounds.maxDate) {
        safeEnd = academicBounds.maxDate;
      }
    }

    setStartDate(safeStart || '');
    setEndDate(safeEnd || '');
  };

  const handleResetDate = () => {
    setStartDate('');
    setEndDate('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
  };

  const daysInPeriod: DayPeriodItem[] = useMemo(() => {
    const days: DayPeriodItem[] = [];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const cur = new Date(s);

      while (cur <= e) {
        const dStr = cur.toISOString().split('T')[0];
        const isBeforeAcademicYear = academicBounds.minDate && dStr < academicBounds.minDate;
        const isAfterAcademicYear = academicBounds.maxDate && dStr > academicBounds.maxDate;

        if (!isBeforeAcademicYear && !isAfterAcademicYear) {
          days.push({
            date: dStr,
            day: cur.getDate(),
            weekday: weekdayNames[cur.getDay()],
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        const dStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dt = new Date(selectedYear, selectedMonth - 1, d);

        const isBeforeAcademicYear = academicBounds.minDate && dStr < academicBounds.minDate;
        const isAfterAcademicYear = academicBounds.maxDate && dStr > academicBounds.maxDate;

        if (!isBeforeAcademicYear && !isAfterAcademicYear) {
          days.push({
            date: dStr,
            day: d,
            weekday: weekdayNames[dt.getDay()],
          });
        }
      }
    }

    return days;
  }, [selectedYear, selectedMonth, startDate, endDate, academicBounds.minDate, academicBounds.maxDate]);

  const enrichedDaysHeader: DayPeriodItem[] = useMemo(() => {
    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];

    return daysInPeriod.map((d) => {
      const dateStr = d.date;
      const dObj = new Date(dateStr);
      const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

      const matchedEvents = calendarEvents.filter((evt: any) => {
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

      matchedEvents.sort((a: any, b: any) => {
        const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
        const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
        return rankA - rankB;
      });

      const matched = matchedEvents[0] || null;
      const isAttendanceDisabled = Boolean(
        matched && attendanceEventRestrictionsStore.isAttendanceDisabledForEvent(activeTenantId, matched)
      );
      const isCalHoliday = Boolean(
        matched && ((matched as any).category === 'HOLIDAY' || (matched as any).is_holiday || isAttendanceDisabled)
      );
      const eventColors = matched ? getEventColors(matched, activeTenantId) : null;

      return {
        ...d,
        is_holiday: isCalHoliday,
        is_disabled: isAttendanceDisabled,
        holiday_title: matched?.title || (isCalHoliday ? 'Holiday' : ''),
        calendar_event: matched,
        event_title: matched?.title,
        event_color: (matched as any)?.color,
        event_colors: eventColors,
      };
    });
  }, [daysInPeriod, activeTenantId, calendarEventsVersion]);

  // Gregorian & Hijri Header Strings
  const getHeaderDateDetails = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    if (startDate && endDate) {
      const isSingleDay = startDate === endDate;
      const hijriRange = calendarSettings.getHijriMonthRange(selectedYear, selectedMonth);
      const isFullHijri = Boolean(hijriRange && startDate === hijriRange.start && endDate === hijriRange.end);

      const gregorianTitle = isSingleDay ? startDate : `${startDate} to ${endDate}`;
      const hijriTitle = isSingleDay
        ? getHijriDateString(startDate)
        : `${getHijriDateString(startDate)} — ${getHijriDateString(endDate)}`;

      return { gregorianTitle, hijriTitle, isSingleDay, isFullHijriMonth: isFullHijri };
    }
    const gregorianTitle = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    const firstDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const hijriTitle = getHijriDateString(firstDayStr);
    return { gregorianTitle, hijriTitle, isSingleDay: false, isFullHijriMonth: false };
  };

  const { gregorianTitle, hijriTitle, isSingleDay, isFullHijriMonth } = getHeaderDateDetails();

  // Cell status toggling / bulk updating
  const handleCellClick = async (studentId: string | number, date: string, currentStatus?: string) => {
    if (!isEditing) return;

    const dayMeta = enrichedDaysHeader.find((d) => d.date === date);
    if (dayMeta?.is_disabled) {
      showToast(`Attendance is disabled for ${date} (${dayMeta.holiday_title || 'Restricted Event'}).`, 'warning');
      return;
    }

    const nextStatus = cycleStatusWithinAllowed(currentStatus, timingPolicy);

    // Optimistic UI Update
    setMatrixData((prev: any) => {
      if (!prev || !prev.students) return prev;
      const updatedStudents = prev.students.map((st: any) => {
        if (String(st.id) === String(studentId)) {
          return {
            ...st,
            records: {
              ...st.records,
              [date]: {
                status: nextStatus,
                date,
              },
            },
          };
        }
        return st;
      });
      return { ...prev, students: updatedStudents };
    });

    try {
      await bulkMarkStudentAttendance({
        date,
        records: [{ student_id: studentId, status: nextStatus }],
      });
    } catch (err) {
      console.error('Failed to mark student attendance:', err);
      showToast('Failed to save attendance change', 'error');
      loadMatrix();
    }
  };

  return (
    <PageContainer isEmbedded={hideHeader} className="space-y-4">
      {/* 1. Header Toolbar */}
      {!hideHeader && (
        <PageHeader
          title="Class Attendance"
          subtitle={
            isHijriEnabled
              ? `${hijriTitle} (${gregorianTitle})`
              : `${gregorianTitle}`
          }
          icon={MatrixIcon}
        >
          <div className="flex items-center gap-2">
            <TakeAttendanceButton
              title="Take / Edit Attendance"
              isEditing={isEditing}
              onToggle={() => setIsEditing((v) => !v)}
            />
            <ActionMenu
              actions={[
                {
                  label: isFullscreen ? 'Exit Full Screen' : 'Full Screen',
                  icon: isFullscreen ? MinimizeIcon : FullScreenIcon,
                  onClick: toggleFullscreen,
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
              ]}
            />
          </div>
        </PageHeader>
      )}

      {/* 2. Stepper & Filter Controls */}
      <div className="theme-bg-surface p-4 rounded-xl border theme-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <AttendanceDateStepper
            stepLabels={stepLabels}
            isAtMinBound={isAtMinBound}
            isAtMaxBound={isAtMaxBound}
            isToday={isCurrentPeriodToday}
            onStepBackward={handleStepBackward}
            onStepForward={handleStepForward}
            onToday={handleGoToToday}
          />

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              minDate={academicBounds.minDate}
              maxDate={academicBounds.maxDate}
              onRangeSelect={handleDateRangeSelect}
              onReset={handleResetDate}
              isHijriEnabled={isHijriEnabled}
              placeholder="Select Date Range"
            />
          </div>
        </div>

        {/* Dynamic Class & Group Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t theme-border">
          <ClassSelect
            classes={classes}
            value={selectedClassId}
            onChange={setSelectedClassId}
            includeAllOption={true}
            allLabel="All Classes"
          />
          <GroupSelect
            groups={groups}
            classId={selectedClassId}
            value={selectedGroupId}
            onChange={setSelectedGroupId}
            includeAllOption={true}
            allLabel="All Sections / Groups"
          />
          <TeacherSelect
            teachers={teachers}
            value={selectedTeacherId}
            onChange={setSelectedTeacherId}
            includeAllOption={true}
            allLabel="All Teachers"
          />
        </div>
      </div>

      {/* 3. Monthly / Period Attendance Table */}
      <div className="theme-bg-surface rounded-xl border theme-border shadow-sm overflow-hidden">
        <AttendanceTable
          matrixData={matrixData}
          daysHeader={enrichedDaysHeader}
          rows={matrixData?.students_matrix || matrixData?.students || []}
          isLoading={isLoading}
          isEditing={isEditing}
          onToggleCell={handleCellClick}
          onStudentClick={onStudentClick}
          isHijriEnabled={isHijriEnabled}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </PageContainer>
  );
}
