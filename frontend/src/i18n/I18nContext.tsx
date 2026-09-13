import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  LanguageCode,
  TextDirection,
  LanguageConfig,
  I18nContextType,
  TranslationParams,
} from './types';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_COOKIE_NAME,
  SUPPORTED_LANGUAGES,
  LANGUAGE_MAP,
} from './constants';
import { LOCALES } from './locales';
import { formatLocalizedNumber, formatLocalizedDate } from './formatters';
import { getLanguageFromPath, buildLocalizedPath } from './routing';

const I18nContext = createContext<I18nContextType | null>(null);

function resolveInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  // 1. URL Path Priority (e.g. /bn/..., /ar/...)
  const pathLang = getLanguageFromPath(window.location.pathname);
  if (pathLang && LANGUAGE_MAP[pathLang]) {
    return pathLang;
  }

  // 2. LocalStorage Persistence
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (saved && LANGUAGE_MAP[saved]) return saved;
  } catch {
    // Ignore storage errors
  }

  // 3. Document Cookie
  try {
    const match = document.cookie.match(new RegExp(`(^| )${LANGUAGE_COOKIE_NAME}=([^;]+)`));
    if (match) {
      const cookieVal = match[2] as LanguageCode;
      if (LANGUAGE_MAP[cookieVal]) return cookieVal;
    }
  } catch {
    // Ignore cookie errors
  }

  // 4. Browser Navigator Language
  try {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase() as LanguageCode;
    if (browserLang && LANGUAGE_MAP[browserLang]) return browserLang;
  } catch {
    // Ignore navigator errors
  }

  return DEFAULT_LANGUAGE;
}

export interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(resolveInitialLanguage);

  const config = useMemo(() => LANGUAGE_MAP[language] || LANGUAGE_MAP[DEFAULT_LANGUAGE], [language]);
  const direction: TextDirection = config.dir;
  const isRTL = config.isRTL;

  // Synchronize document attributes and direction whenever language changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    html.setAttribute('lang', language);
    html.setAttribute('dir', direction);

    if (isRTL) {
      html.classList.add('rtl');
      html.classList.remove('ltr');
    } else {
      html.classList.add('ltr');
      html.classList.remove('rtl');
    }

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${language};path=/;max-age=31536000;SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }

    window.dispatchEvent(
      new CustomEvent('spr_language_changed', {
        detail: { language, direction, isRTL },
      })
    );
  }, [language, direction, isRTL]);

  const setLanguage = useCallback((newLang: LanguageCode) => {
    if (LANGUAGE_MAP[newLang]) {
      setLanguageState(newLang);
    }
  }, []);

  /**
   * Universal translation lookup with nested key support and variable interpolation.
   * Example: t('common.save') -> "সংরক্ষণ করুন" or "Save"
   * Example: t('common.showingResults', { count: 5 }) -> "Showing 5 results"
   */
  const t = useCallback(
    (
      key: string,
      defaultTextOrParams?: string | TranslationParams,
      params?: TranslationParams
    ): string => {
      let defaultText = '';
      let interpolatedParams: TranslationParams = {};

      if (typeof defaultTextOrParams === 'string') {
        defaultText = defaultTextOrParams;
        if (params && typeof params === 'object') {
          interpolatedParams = params;
        }
      } else if (defaultTextOrParams && typeof defaultTextOrParams === 'object') {
        interpolatedParams = defaultTextOrParams;
      }

      const keys = key.split('.');

      const getNested = (dict: any): string | null => {
        if (!dict) return null;
        let curr = dict;
        for (const k of keys) {
          if (curr && typeof curr === 'object' && k in curr) {
            curr = curr[k];
          } else {
            return null;
          }
        }
        return typeof curr === 'string' ? curr : null;
      };

      // 1. Try active language dictionary
      let translation = getNested(LOCALES[language]);

      // 2. Fallback to English dictionary if missing in active language
      if (!translation && language !== DEFAULT_LANGUAGE) {
        translation = getNested(LOCALES[DEFAULT_LANGUAGE]);
      }

      // 3. Fallback to provided default text or raw key
      if (!translation) {
        translation = defaultText || keys[keys.length - 1] || key;
      }

      // 4. Interpolate variables (e.g. {name}, {count})
      if (interpolatedParams && Object.keys(interpolatedParams).length > 0) {
        return translation.replace(/\{(\w+)\}/g, (_, varName) => {
          return varName in interpolatedParams ? String(interpolatedParams[varName]) : `{${varName}}`;
        });
      }

      return translation;
    },
    [language]
  );

  const formatNumber = useCallback(
    (num: number | string, options?: Intl.NumberFormatOptions) => {
      return formatLocalizedNumber(num, language, options);
    },
    [language]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      return formatLocalizedDate(date, language, options);
    },
    [language]
  );

  const getLocalizedPath = useCallback(
    (path: string, targetLang?: LanguageCode) => {
      return buildLocalizedPath(path, targetLang || language);
    },
    [language]
  );

  const contextValue: I18nContextType = useMemo(
    () => ({
      language,
      direction,
      isRTL,
      config,
      supportedLanguages: SUPPORTED_LANGUAGES,
      setLanguage,
      t,
      formatNumber,
      formatDate,
      getLocalizedPath,
    }),
    [
      language,
      direction,
      isRTL,
      config,
      setLanguage,
      t,
      formatNumber,
      formatDate,
      getLocalizedPath,
    ]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an <I18nProvider>');
  }
  return context;
}
