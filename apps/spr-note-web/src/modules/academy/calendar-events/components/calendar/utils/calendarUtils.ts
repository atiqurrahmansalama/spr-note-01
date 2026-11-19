import type { CalendarEvent } from '../../../types';
import { EVENT_COLOR_MAP, resolveCanonicalEventColor, type EventColorStyle } from '../../../constants/eventColors';
import { calendarEventTypesStore, calendarEventKindsStore } from '../../../../../../utils/localStore';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAY_NAMES_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const WEEKDAY_NAMES_FULL = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = String(parts[1] || '00').padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

/**
 * Resolves the precise display label for any calendar event or schedule.
 * Looks up custom types configured in Developer Tools as well as built-in categories.
 */
export function getEventDisplayType(evt?: CalendarEvent | null, tenantId?: string): string {
  if (!evt) return 'Event';
  if (evt.category === 'WORKING_HOURS' || evt.type === 'WORKING_HOURS') {
    return 'Working Hours';
  }

  const explicitType = evt.type || evt.event_type || evt.kind;

  let matchedEventType: any = null;
  if (typeof window !== 'undefined') {
    try {
      const types = calendarEventTypesStore.getEventTypes(tenantId);
      matchedEventType = types.find(
        (t: any) => t.id === evt.eventTypeId || t.name === evt.title || t.code === evt.code
      );
    } catch {}
  }

  const rawType = explicitType || matchedEventType?.type || (evt.category !== 'ACADEMIC_EVENT' ? evt.category : null);

  const kindsMap: Record<string, string> = {
    HOLIDAY: 'Holiday',
    EXAM: 'Exam',
    WORKING_HOURS: 'Working Hours',
    ACADEMIC: 'Academic',
    MEETING: 'Meeting',
    ACTIVITY: 'Sports & Cultural',
    GENERAL: 'General',
  };

  if (rawType && kindsMap[String(rawType).toUpperCase()]) {
    return kindsMap[String(rawType).toUpperCase()];
  }

  if (matchedEventType?.name && matchedEventType.type && kindsMap[String(matchedEventType.type).toUpperCase()]) {
    return kindsMap[String(matchedEventType.type).toUpperCase()];
  }

  if (evt.category && evt.category !== 'ACADEMIC_EVENT' && kindsMap[String(evt.category).toUpperCase()]) {
    return kindsMap[String(evt.category).toUpperCase()];
  }

  return 'Academic Event';
}

const eventColorsCache = new Map<string, EventColorStyle>();

export function getEventColors(evt?: CalendarEvent | null, tenantId?: string): EventColorStyle {
  if (!evt) {
    return EVENT_COLOR_MAP.eucalyptus;
  }
  const cacheKey = `${tenantId || 'def'}_${evt.id || evt.title || ''}_${evt.color || ''}_${evt.category || ''}_${evt.type || ''}`;
  if (eventColorsCache.has(cacheKey)) {
    return eventColorsCache.get(cacheKey)!;
  }

  const isWorkingHours = evt?.category === 'WORKING_HOURS' || evt?.type === 'WORKING_HOURS';

  if (evt?.color) {
    const canonicalColor = resolveCanonicalEventColor(evt.color, '');
    const base = EVENT_COLOR_MAP[canonicalColor] || EVENT_COLOR_MAP[evt.color];
    if (base) {
      const res: EventColorStyle = isWorkingHours ? { ...base, text: 'theme-text-primary' } : base;
      eventColorsCache.set(cacheKey, res);
      return res;
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const types = calendarEventTypesStore.getEventTypes(tenantId);
      const matchedType = types.find(
        (t: any) => t.id === evt?.eventTypeId || t.name === evt?.title || t.code === evt?.code
      );
      const rawType = matchedType?.type || evt?.type || evt?.event_type || evt?.kind || evt?.category;
      if (rawType) {
        const kinds = calendarEventKindsStore.getKinds(tenantId);
        const matchedKind = kinds.find(
          (k: any) => k.value === rawType || k.id === rawType || String(k.value).toUpperCase() === String(rawType).toUpperCase()
        );
        if (matchedKind?.color) {
          const canonicalColor = resolveCanonicalEventColor(matchedKind.color);
          const base = EVENT_COLOR_MAP[canonicalColor] || EVENT_COLOR_MAP[matchedKind.color];
          if (base) {
            const res: EventColorStyle = isWorkingHours ? { ...base, text: 'theme-text-primary' } : base;
            eventColorsCache.set(cacheKey, res);
            return res;
          }
        }
      }
    } catch {}
  }

  if (isWorkingHours) {
    const res: EventColorStyle = {
      ...EVENT_COLOR_MAP.blueberry,
      text: 'theme-text-primary',
    };
    eventColorsCache.set(cacheKey, res);
    return res;
  }

  const displayType = getEventDisplayType(evt, tenantId);
  let fallback = EVENT_COLOR_MAP.eucalyptus;
  if (displayType === 'Holiday') fallback = EVENT_COLOR_MAP.radicchio;
  else if (displayType === 'Exam') fallback = EVENT_COLOR_MAP.flamingo;
  else if (displayType === 'Meeting') fallback = EVENT_COLOR_MAP.peacock;
  else if (displayType === 'Sports & Cultural') fallback = EVENT_COLOR_MAP.amethyst;
  else if (displayType === 'Academic') fallback = EVENT_COLOR_MAP.eucalyptus;

  eventColorsCache.set(cacheKey, fallback);
  return fallback;
}

export function calendarEventComparator(a: CalendarEvent, b: CalendarEvent): number {
  const isMultiA = a.startDate && a.endDate && a.startDate !== a.endDate ? 1 : 0;
  const isMultiB = b.startDate && b.endDate && b.startDate !== b.endDate ? 1 : 0;
  if (isMultiA !== isMultiB) return isMultiB - isMultiA;

  const rankA = a.priorityRank !== undefined && a.priorityRank !== null ? Number(a.priorityRank) : (a.rank !== undefined ? Number(a.rank) : 999);
  const rankB = b.priorityRank !== undefined && b.priorityRank !== null ? Number(b.priorityRank) : (b.rank !== undefined ? Number(b.rank) : 999);
  if (rankA !== rankB) return rankA - rankB;

  if (a.startDate !== b.startDate) return (a.startDate || '').localeCompare(b.startDate || '');
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
  return (a.title || '').localeCompare(b.title || '');
}

export function isEventOnDate(e: CalendarEvent, dateStr: string, weekday: number): boolean {
  if (Array.isArray(e.exceptions) && e.exceptions.includes(dateStr)) {
    return false;
  }
  if (e.startDate === dateStr) return true;
  if (e.startDate && e.endDate && dateStr >= e.startDate && dateStr <= e.endDate) {
    return true;
  }
  if (e.repeats && Array.isArray(e.repeatDays) && e.repeatDays.includes(weekday)) {
    if (!e.startDate || dateStr >= e.startDate) {
      if (e.until === 'DATE' && e.untilDate && dateStr > e.untilDate) {
        return false;
      }
      return true;
    }
  }
  return false;
}
