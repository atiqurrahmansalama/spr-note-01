/**
 * Universal Translation Hook & Fallback Provider
 */

import { LanguageCode } from './types';
import { DEFAULT_LANGUAGE } from './constants';
import { formatLocalizedNumber, formatLocalizedDate } from './formatters';

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
    formatNumber: (val: number | string) => formatLocalizedNumber(val, DEFAULT_LANGUAGE),
    formatDate: (val: string | Date) => formatLocalizedDate(val, DEFAULT_LANGUAGE),
  };
}
