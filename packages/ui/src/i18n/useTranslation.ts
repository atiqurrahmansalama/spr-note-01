/**
 * Safe translation hook for @repo/ui components
 */

import { LanguageCode } from './types';
import { DEFAULT_LANGUAGE } from './constants';

export interface UseTranslationResult {
  language: LanguageCode;
  t: (key: string, defaultText?: string) => string;
  isRTL: boolean;
  formatNumber: (val: number | string) => string;
  formatDate: (val: string | Date) => string;
}

export function useTranslation(_namespace?: string): UseTranslationResult {
  return {
    language: DEFAULT_LANGUAGE,
    t: (_key: string, defaultText?: string) => defaultText || _key,
    isRTL: false,
    formatNumber: (val: number | string) => String(val),
    formatDate: (val: string | Date) => (val instanceof Date ? val.toLocaleDateString() : String(val)),
  };
}
