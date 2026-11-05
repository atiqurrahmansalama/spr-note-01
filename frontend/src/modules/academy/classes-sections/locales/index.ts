/**
 * SPR Note — Classes & Sections Colocated Module Locales
 * =======================================================
 * Colocated 4-language translations for Classes, Sections, and Groups.
 * Automatically registered with the central i18n system under 'classesSections' and 'academy'.
 */

import { registerModuleLocales, useTranslation } from '@/i18n';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';

export const classesSectionsLocales = {
  en,
  bn,
  ar,
  ur,
};

// Register under both namespaces for seamless backward and domain compatibility
registerModuleLocales('classesSections', classesSectionsLocales);
registerModuleLocales('academy', classesSectionsLocales);

export function useClassesSectionsTranslation() {
  return useTranslation('classesSections');
}

export default classesSectionsLocales;

