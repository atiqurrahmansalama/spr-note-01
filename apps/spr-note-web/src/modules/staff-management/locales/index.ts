/**
 * SPR Note — Staff Management Colocated Module Locales
 * ====================================================
 * Colocated 4-language translations for Staff Roster, Staff Onboarding, and Duties.
 * Automatically registered with the central i18n system under 'staffManagement' and 'staff'.
 */

import { registerModuleLocales, useTranslation } from '../../../i18n';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';

export const staffManagementLocales = {
  en,
  bn,
  ar,
  ur,
};

// Register under namespaces for domain compatibility
registerModuleLocales('staffManagement', staffManagementLocales);
registerModuleLocales('staff', staffManagementLocales);

export function useStaffTranslation() {
  return useTranslation('staffManagement');
}

export default staffManagementLocales;

