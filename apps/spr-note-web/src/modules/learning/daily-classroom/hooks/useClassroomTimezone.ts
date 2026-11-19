import { useState, useEffect } from 'react';
import { classroomSettings, calendarSettings } from '@/stores';
import { getSystemTimezone } from '@/constants/calendarConstants';

export interface ClassroomTimezoneContext {
  isTimezoneEnabled: boolean;
  effectiveTimezone: string;
  classroomTz: string;
  appTz: string;
  timezoneLink: string;
}

/**
 * Universal Unified Timezone Hook for the Daily Classroom Module.
 * Synchronized with the centralized settings at /admin-tools?tab=classroom-config.
 */
export function useClassroomTimezone(): ClassroomTimezoneContext {
  const [isTimezoneEnabled, setIsTimezoneEnabled] = useState<boolean>(() => {
    try {
      return classroomSettings?.getTimezoneEnabled?.() ?? true;
    } catch {
      return true;
    }
  });

  const [classroomTz, setClassroomTz] = useState<string>(() => {
    try {
      return classroomSettings?.getTimezone?.() ?? 'APP_DEFAULT';
    } catch {
      return 'APP_DEFAULT';
    }
  });

  const [appTz, setAppTz] = useState<string>(() => {
    try {
      return calendarSettings?.getTimezone?.() ?? (typeof getSystemTimezone === 'function' ? getSystemTimezone() : 'UTC');
    } catch {
      return 'UTC';
    }
  });

  useEffect(() => {
    const handleClassroomUpdate = (e: any) => {
      if (e?.detail?.timezoneEnabled !== undefined) {
        setIsTimezoneEnabled(e.detail.timezoneEnabled);
      } else {
        setIsTimezoneEnabled(classroomSettings?.getTimezoneEnabled?.() ?? true);
      }
      if (e?.detail?.timezone !== undefined) {
        setClassroomTz(e.detail.timezone);
      } else {
        setClassroomTz(classroomSettings?.getTimezone?.() ?? 'APP_DEFAULT');
      }
    };

    const handleCalendarUpdate = (e: any) => {
      if (e?.detail?.timezone !== undefined) {
        setAppTz(e.detail.timezone);
      } else {
        setAppTz(calendarSettings?.getTimezone?.() ?? 'UTC');
      }
    };

    window.addEventListener('spr_classroom_settings_updated', handleClassroomUpdate);
    window.addEventListener('spr_calendar_settings_updated', handleCalendarUpdate);
    window.addEventListener('spr_date_time_updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('spr_classroom_settings_updated', handleClassroomUpdate);
      window.removeEventListener('spr_calendar_settings_updated', handleCalendarUpdate);
      window.removeEventListener('spr_date_time_updated', handleCalendarUpdate);
    };
  }, []);

  const effectiveTimezone = classroomTz && classroomTz !== 'APP_DEFAULT' ? classroomTz : appTz || 'UTC';

  return {
    isTimezoneEnabled,
    effectiveTimezone,
    classroomTz,
    appTz,
    timezoneLink: '/admin-tools?tab=classroom-config',
  };
}

export default useClassroomTimezone;

