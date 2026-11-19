/**
 * SPR Note — Dashboard Colocated Module Locales
 * ===============================================
 * Colocated 4-language translations for Enterprise Role-Driven Dashboards.
 * Automatically registered with the central i18n system under 'dashboard'.
 */

import { registerModuleLocales, useTranslation } from '@/i18n';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';

export const dashboardLocales = {
  en,
  bn,
  ar,
  ur,
};

// Register under 'dashboard' namespace
registerModuleLocales('dashboard', dashboardLocales);

export function useDashboardTranslation() {
  return useTranslation('dashboard');
}

export default dashboardLocales;

