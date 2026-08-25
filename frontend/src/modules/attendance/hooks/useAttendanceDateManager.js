import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFullscreen } from '../../../hooks/useFullscreen';
import { calendarSettings, masterCalendarStore } from '../../../utils/localStore';
import { getHijriDateString } from '../../../utils/hijriUtils';
import { EVENT_COLOR_MAP } from '../../../components/calendar/MasterTimeCalendar';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Enterprise Reusable Attendance Date Manager Hook
 * Handles:
 * - Selected year / month / date-range state
 * - Live Master Calendar event enrichment & holiday calculation
 * - Dynamic Gregorian & Hijri title formatting
 * - Hijri toggle listener
 * - Fullscreen mode & Escape key handling
 */
export function useAttendanceDateManager({
  activeTenantId,
  initialYear,
  initialMonth,
  initialStartDate = '',
  initialEndDate = '',
} = {}) {
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const [selectedYear, setSelectedYear] = useState(() => initialYear || todayObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => initialMonth || todayObj.getMonth() + 1);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen();
  const [isHijriEnabled, setIsHijriEnabled] = useState(() => calendarSettings.getHijriEnabled());
  const [calendarEventsVersion, setCalendarEventsVersion] = useState(0);

  // Sync with system-wide calendar settings & live events
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

  // Generate date array for the selected period
  const daysInPeriod = useMemo(() => {
    const days = [];

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const cur = new Date(s);

      while (cur <= e) {
        const dStr = cur.toISOString().split('T')[0];
        days.push({
          date: dStr,
          day: cur.getDate(),
          weekday: WEEKDAY_NAMES[cur.getDay()],
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        const dStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dt = new Date(selectedYear, selectedMonth - 1, d);
        days.push({
          date: dStr,
          day: d,
          weekday: WEEKDAY_NAMES[dt.getDay()],
        });
      }
    }

    return days;
  }, [selectedYear, selectedMonth, startDate, endDate]);

  // Enrich days with Master Calendar Events & Holidays
  const enrichedDaysHeader = useMemo(() => {
    const calendarEvents = masterCalendarStore.getEvents(activeTenantId) || [];

    const getEventColors = (evt) => {
      if (!evt) return EVENT_COLOR_MAP.DEFAULT;
      if (evt.color && EVENT_COLOR_MAP[evt.color]) return EVENT_COLOR_MAP[evt.color];
      return EVENT_COLOR_MAP.DEFAULT;
    };

    return daysInPeriod.map((d) => {
      const dateStr = d.date;
      const dObj = new Date(dateStr);
      const weekdayNum = isNaN(dObj.getDay()) ? 0 : dObj.getDay();

      const matched = calendarEvents.find((evt) => {
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

      const isCalHoliday = Boolean(matched && (matched.category === 'HOLIDAY' || matched.is_holiday));
      const eventColors = matched ? getEventColors(matched) : null;

      return {
        ...d,
        is_holiday: isCalHoliday,
        holiday_title: matched?.title || (isCalHoliday ? 'Holiday' : ''),
        calendar_event: matched,
        event_title: matched?.title,
        event_colors: eventColors,
      };
    });
  }, [daysInPeriod, activeTenantId, calendarEventsVersion]);

  // Gregorian & Hijri Header Strings
  const getHeaderDateDetails = useCallback(() => {
    if (startDate && endDate) {
      const gregorianTitle = `${startDate} to ${endDate}`;
      const hijriTitle = `${getHijriDateString(startDate)} — ${getHijriDateString(endDate)}`;
      return { gregorianTitle, hijriTitle };
    }
    const gregorianTitle = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    const firstDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const hijriTitle = getHijriDateString(firstDayStr);
    return { gregorianTitle, hijriTitle };
  }, [startDate, endDate, selectedYear, selectedMonth]);

  const { gregorianTitle, hijriTitle } = getHeaderDateDetails();

  const handleResetDate = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setSelectedMonth(todayObj.getMonth() + 1);
    setSelectedYear(todayObj.getFullYear());
  }, [todayObj]);

  return {
    todayStr,
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
    isHijriEnabled,
    isFullscreen,
    setIsFullscreen,
    calendarEventsVersion,
    setCalendarEventsVersion,
  };
}

export default useAttendanceDateManager;
