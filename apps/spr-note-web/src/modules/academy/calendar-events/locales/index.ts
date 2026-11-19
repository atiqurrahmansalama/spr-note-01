/**
 * SPR Note — Calendar & Events Colocated Module Locales
 * =======================================================
 * Colocated 4-language translations for Calendar, Events, Schedules, and Working Hours.
 * Automatically registered with the central i18n system under 'calendarEvents' and 'calendar'.
 */

import { registerModuleLocales, useTranslation } from '../../../../i18n';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';

export const calendarEventsLocales = {
  en,
  bn,
  ar,
  ur,
};

// Register under namespaces for domain compatibility
registerModuleLocales('calendarEvents', calendarEventsLocales);
registerModuleLocales('calendar', calendarEventsLocales);

export function useCalendarTranslation() {
  return useTranslation('calendarEvents');
}

export default calendarEventsLocales;

