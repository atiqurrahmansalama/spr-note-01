/**
 * SPR Note — Academic Years Colocated Module Locales
 * ====================================================
 * Colocated 4-language translations for the Academic Years module.
 * Automatically registered with the central i18n system under 'academicYears' and 'academy'.
 */

import { registerModuleLocales, useTranslation } from '@/i18n';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';

export const academicYearsLocales = {
  en,
  bn,
  ar,
  ur,
};

// Register under both namespaces for seamless backward and domain compatibility
registerModuleLocales('academicYears', academicYearsLocales);
registerModuleLocales('academy', academicYearsLocales);

export function useAcademicYearsTranslation() {
  return useTranslation('academicYears');
}

export default academicYearsLocales;
