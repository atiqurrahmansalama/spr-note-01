import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFullscreen } from '../../../hooks/useFullscreen';
import {
  calendarSettings,
  masterCalendarStore,
  attendanceEventRestrictionsStore,
  academicYearsStore,
} from '../../../utils/localStore';
import { getHijriDateString } from '../../../utils/hijriUtils';
import { getEventColors, EVENT_COLOR_MAP } from '../../../components/calendar/MasterTimeCalendar';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Checks whether an event impacts a specific attendance module.
 */
export function isEventImpactedForModule(evt, moduleType = 'ALL') {
  if (!evt) return false;
  if (!moduleType || moduleType === 'ALL') return true;

  const rawImpacts = evt.impacts || evt.systemImpacts || evt.system_impacts || [];
  if (!Array.isArray(rawImpacts) || rawImpacts.length === 0) return true;

  const normImpacts = rawImpacts.map((i) => String(i).toUpperCase().replace(/[^A-Z0-9_]/g, '_'));
  if (normImpacts.includes('ALL') || normImpacts.includes('ALL_INTEGRATIONS')) return true;

  const target = String(moduleType).toUpperCase();
  if (target === 'CLASS' || target === 'CLASS_ATTENDANCE') {
    return (
      normImpacts.includes('CLASS_ATTENDANCE') ||
      normImpacts.includes('CLASS') ||
      normImpacts.includes('ATTENDANCE')
    );
  }
  if (target === 'RESIDENTIAL' || target === 'RESIDENTIAL_ATTENDANCE') {
    return (
      normImpacts.includes('RESIDENTIAL_ATTENDANCE') ||
      normImpacts.includes('RESIDENTIAL') ||
      normImpacts.includes('ATTENDANCE')
    );
  }
  if (target === 'TEACHER' || target === 'TEACHER_CLASS' || target === 'TEACHER_ATTENDANCE') {
    return (
      normImpacts.includes('TEACHER_ATTENDANCE') ||
      normImpacts.includes('TEACHER_CLASS') ||
      normImpacts.includes('TEACHER') ||
      normImpacts.includes('CLASS_ATTENDANCE') ||
      normImpacts.includes('ATTENDANCE')
    );
  }
  if (target === 'STAFF' || target === 'STAFF_ATTENDANCE' || target === 'STAFF_DAILY') {
    return (
      normImpacts.includes('STAFF_ATTENDANCE') ||
      normImpacts.includes('STAFF') ||
      normImpacts.includes('ATTENDANCE')
    );
  }

  return normImpacts.includes(target);
}

/**
 * Enterprise Reusable Attendance Date Manager Hook
 * Handles:
 * - Active Academic Year Date Guards (prevents navigation/selection before/after academic year)
 * - Selected year / month / date-range state
 * - Live Master Calendar event enrichment & holiday calculation scoped by moduleType
 * - Dynamic Gregorian & Hijri title formatting
 * - Hijri toggle listener
 * - Fullscreen mode & Escape key handling
 */
export function useAttendanceDateManager({
  activeTenantId,
  moduleType = 'ALL',
  isAdmin = false,
  initialYear,
  initialMonth,
  initialStartDate = '',
  initialEndDate = '',
} = {}) {
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const [academicYearsVersion, setAcademicYearsVersion] = useState(0);

  // Retrieve Academic Year bounds
  const academicBounds = useMemo(() => {
    return academicYearsStore.getDateBounds(activeTenantId);
  }, [activeTenantId, academicYearsVersion]);

  const minDate = academicBounds.minDate || '';
  const maxDate = academicBounds.maxDate || '';
  const activeAcademicYear = academicBounds.activeYear || null;

  const isDateInAcademicYear = useCallback(
    (dStr) => {
      if (isAdmin) return true;
      if (!dStr) return true;
      if (minDate && dStr < minDate) return false;
      if (maxDate && dStr > maxDate) return false;
      return true;
    },
    [isAdmin, minDate, maxDate]
  );

  // Initial clamped year & month within academic boundaries
  const resolvedInitialYear = useMemo(() => {
    if (initialYear) return initialYear;
    if (activeAcademicYear?.startDate) {
      const ayStartYear = parseInt(activeAcademicYear.startDate.split('-')[0], 10);
      const ayEndYear = parseInt((activeAcademicYear.endDate || activeAcademicYear.startDate).split('-')[0], 10);
      const curY = todayObj.getFullYear();
      if (curY < ayStartYear) return ayStartYear;
      if (curY > ayEndYear) return ayEndYear;
      return curY;
    }
    return todayObj.getFullYear();
  }, [initialYear, activeAcademicYear, todayObj]);

  const resolvedInitialMonth = useMemo(() => {
    if (initialMonth) return initialMonth;
    if (activeAcademicYear?.startDate) {
      const [ayStartY, ayStartM] = activeAcademicYear.startDate.split('-').map(Number);
      const [ayEndY, ayEndM] = (activeAcademicYear.endDate || activeAcademicYear.startDate).split('-').map(Number);
      const curY = todayObj.getFullYear();
      const curM = todayObj.getMonth() + 1;

      if (curY === ayStartY && curM < ayStartM) return ayStartM;
      if (curY === ayEndY && curM > ayEndM) return ayEndM;
      return curM;
    }
    return todayObj.getMonth() + 1;
  }, [initialMonth, activeAcademicYear, todayObj]);

  const [selectedYear, setSelectedYear] = useState(resolvedInitialYear);
  const [selectedMonth, setSelectedMonth] = useState(resolvedInitialMonth);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen();
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());
  const [calendarEventsVersion, setCalendarEventsVersion] = useState(0);

  // Sync with system-wide calendar settings & live events & academic years
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setIsHijriEnabled(calendarSettings.getHijriEnabled());
    };
    const handleCalendarUpdate = () => {
      setCalendarEventsVersion((v) => v + 1);
    };
    const handleAcademicYearsUpdate = () => {
      setAcademicYearsVersion((v) => v + 1);
    };

    window.addEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
    window.addEventListener('spr_calendar_events_updated', handleCalendarUpdate);
    window.addEventListener('spr_attendance_event_restrictions_updated', handleCalendarUpdate);
    window.addEventListener('spr_academic_years_updated', handleAcademicYearsUpdate);
    window.addEventListener('spr_tenant_changed', handleAcademicYearsUpdate);

    return () => {
      window.removeEventListener('spr_calendar_settings_updated', handleSettingsUpdate);
      window.removeEventListener('spr_calendar_events_updated', handleCalendarUpdate);
      window.removeEventListener('spr_attendance_event_restrictions_updated', handleCalendarUpdate);
      window.removeEventListener('spr_academic_years_updated', handleAcademicYearsUpdate);
      window.removeEventListener('spr_tenant_changed', handleAcademicYearsUpdate);
    };
  }, []);

  // Generate date array for the selected period strictly guarded by academic year boundaries
  const daysInPeriod = useMemo(() => {
    const days = [];

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const cur = new Date(s);

      while (cur <= e) {
        const dStr = cur.toISOString().split('T')[0];
        // Enforce Academic Year bounds
        const isBeforeAcademicYear = minDate && dStr < minDate;
        const isAfterAcademicYear = maxDate && dStr > maxDate;

        if (!isBeforeAcademicYear && !isAfterAcademicYear) {
          days.push({
            date: dStr,
            day: cur.getDate(),
            weekday: WEEKDAY_NAMES[cur.getDay()],
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        const dStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dt = new Date(selectedYear, selectedMonth - 1, d);

        const isBeforeAcademicYear = minDate && dStr < minDate;
        const isAfterAcademicYear = maxDate && dStr > maxDate;

        if (!isBeforeAcademicYear && !isAfterAcademicYear) {
          days.push({
            date: dStr,
            day: d,
            weekday: WEEKDAY_NAMES[dt.getDay()],
          });
        }
      }
    }

    return days;
  }, [selectedYear, selectedMonth, startDate, endDate, minDate, maxDate]);

  // Enrich days with Master Calendar Events & Holidays scoped to moduleType
  const enrichedDaysHeader = useMemo(() => {
    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];

    return daysInPeriod.map((d) => {
      const dateStr = d.date;
      const dObj = new Date(dateStr);
      const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

      const matchedEvents = calendarEvents.filter((evt) => {
        if (!isEventImpactedForModule(evt, moduleType)) return false;
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

      matchedEvents.sort((a, b) => {
        const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
        const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
        return rankA - rankB;
      });

      const matched = matchedEvents[0] || null;

      const isAttendanceDisabled = Boolean(
        matched && attendanceEventRestrictionsStore.isAttendanceDisabledForEvent(activeTenantId, matched)
      );
      const isCalHoliday = Boolean(
        matched && (matched.category === 'HOLIDAY' || matched.is_holiday || isAttendanceDisabled)
      );
      const eventColors = matched ? getEventColors(matched, activeTenantId) : null;

      return {
        ...d,
        is_holiday: isCalHoliday,
        is_disabled: isAttendanceDisabled,
        holiday_title: matched?.title || (isCalHoliday ? 'Holiday' : ''),
        calendar_event: matched,
        event_title: matched?.title,
        event_color: matched?.color,
        event_colors: eventColors,
      };
    });
  }, [daysInPeriod, activeTenantId, calendarEventsVersion, moduleType]);

  // Gregorian & Hijri Header Strings
  const getHeaderDateDetails = useCallback(() => {
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
    const gregorianTitle = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    const firstDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const hijriTitle = getHijriDateString(firstDayStr);
    return { gregorianTitle, hijriTitle, isSingleDay: false, isFullHijriMonth: false };
  }, [startDate, endDate, selectedYear, selectedMonth]);

  const { gregorianTitle, hijriTitle, isSingleDay, isFullHijriMonth } = getHeaderDateDetails();

  const handleResetDate = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setSelectedMonth(resolvedInitialMonth);
    setSelectedYear(resolvedInitialYear);
  }, [resolvedInitialMonth, resolvedInitialYear]);

  const handleGoToToday = useCallback(() => {
    const curY = todayObj.getFullYear();
    const curM = todayObj.getMonth() + 1;
    setSelectedYear(curY);
    setSelectedMonth(curM);
    setStartDate('');
    setEndDate('');
  }, [todayObj]);

  const isCurrentPeriodToday = useMemo(() => {
    if (startDate && endDate) {
      return todayStr >= startDate && todayStr <= endDate;
    }
    return selectedYear === todayObj.getFullYear() && selectedMonth === (todayObj.getMonth() + 1);
  }, [startDate, endDate, selectedYear, selectedMonth, todayStr, todayObj]);

  // Stepper Labels & Adaptive Shifting
  const stepLabels = useMemo(() => {
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
  }, [startDate, endDate]);

  const isAtMinBound = useMemo(() => {
    if (isAdmin || !minDate) return false;
    if (startDate) {
      return startDate <= minDate;
    }
    const currentMonthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const currentMonthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    return currentMonthStart <= minDate || currentMonthEnd <= minDate;
  }, [isAdmin, minDate, startDate, selectedYear, selectedMonth]);

  const isAtMaxBound = useMemo(() => {
    if (isAdmin || !maxDate) return false;
    if (endDate) {
      return endDate >= maxDate;
    }
    const currentMonthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const maxMonthPrefix = maxDate.slice(0, 7);
    return currentMonthStart >= `${maxMonthPrefix}-01`;
  }, [isAdmin, maxDate, endDate, selectedYear, selectedMonth]);

  const handleStepBackward = useCallback(() => {
    if (!startDate || !endDate) {
      let targetMonth = selectedMonth;
      let targetYear = selectedYear;
      if (selectedMonth === 1) {
        targetMonth = 12;
        targetYear = selectedYear - 1;
      } else {
        targetMonth = selectedMonth - 1;
      }

      if (!isAdmin && minDate) {
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
        const targetMonthEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayOfTargetMonth).padStart(2, '0')}`;
        if (targetMonthEnd < minDate) {
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

    if (!isAdmin && minDate && newEnd < minDate) {
      return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  }, [startDate, endDate, selectedMonth, selectedYear, isAdmin, minDate]);

  const handleStepForward = useCallback(() => {
    if (!startDate || !endDate) {
      let targetMonth = selectedMonth;
      let targetYear = selectedYear;
      if (selectedMonth === 12) {
        targetMonth = 1;
        targetYear = selectedYear + 1;
      } else {
        targetMonth = selectedMonth + 1;
      }

      if (!isAdmin && maxDate) {
        const targetMonthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        if (targetMonthStart > maxDate) {
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

    if (!isAdmin && maxDate && newStart > maxDate) {
      return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  }, [startDate, endDate, selectedMonth, selectedYear, isAdmin, maxDate]);

  return {
    todayStr,
    minDate,
    maxDate,
    activeAcademicYear,
    isDateInAcademicYear,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleResetDate,
    daysInPeriod,
    enrichedDaysHeader,
    gregorianTitle,
    hijriTitle,
    isSingleDay,
    isFullHijriMonth,
    isHijriEnabled,
    isFullscreen,
    setIsFullscreen,
    calendarEventsVersion,
    setCalendarEventsVersion,
    stepLabels,
    isAtMinBound,
    isAtMaxBound,
    handleStepBackward,
    handleStepForward,
    handleGoToToday,
    isCurrentPeriodToday,
  };
}

export default useAttendanceDateManager;
