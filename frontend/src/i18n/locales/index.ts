import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';
import type { LanguageCode, TranslationDictionary } from '../types';

export const LOCALES: Record<LanguageCode, TranslationDictionary> = {
  en,
  bn,
  ar,
  ur,
};
