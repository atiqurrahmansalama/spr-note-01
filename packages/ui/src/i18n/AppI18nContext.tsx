import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_MAP,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  formatLocalizedDate,
  formatLocalizedNumber,
  type LanguageCode,
  type LanguageConfig,
  type TextDirection,
} from '@repo/i18n';

export type AppTranslationParams = Record<string, string | number | boolean>;

const MODULE_LOCALES: Record<string, Partial<Record<LanguageCode, Record<string, unknown>>>> = {};

export function registerAppModuleLocales(
  namespace: string,
  locales: Partial<Record<LanguageCode, Record<string, unknown>>>
) {
  MODULE_LOCALES[namespace] = {
    ...MODULE_LOCALES[namespace],
    ...locales,
  };
}

export interface AppI18nContextType {
  language: LanguageCode;
  direction: TextDirection;
  isRTL: boolean;
  config: LanguageConfig;
  supportedLanguages: LanguageConfig[];
  setLanguage: (lang: LanguageCode) => void;
  t: (
    key: string,
    defaultTextOrParams?: string | AppTranslationParams,
    params?: AppTranslationParams
  ) => string;
  formatNumber: (val: number | string) => string;
  formatDate: (val: Date | string | number) => string;
}

function getNestedValue(dict: Record<string, unknown> | undefined, pathKeys: string[]): string | null {
  if (!dict) return null;
  let curr: unknown = dict;
  for (const key of pathKeys) {
    if (curr && typeof curr === 'object' && key in (curr as Record<string, unknown>)) {
      curr = (curr as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  return typeof curr === 'string' ? curr : null;
}

function resolveAppTranslation(
  language: LanguageCode,
  key: string,
  defaultTextOrParams?: string | AppTranslationParams,
  params?: AppTranslationParams
): string {
  let defaultText = '';
  let interpolatedParams: AppTranslationParams = {};

  if (typeof defaultTextOrParams === 'string') {
    defaultText = defaultTextOrParams;
    if (params && typeof params === 'object') {
      interpolatedParams = params;
    }
  } else if (defaultTextOrParams && typeof defaultTextOrParams === 'object') {
    interpolatedParams = defaultTextOrParams;
  }

  const keys = key.split('.');
  const rootNs = keys[0];
  const subKeys = keys.slice(1);

  let translation = getNestedValue(MODULE_LOCALES[rootNs]?.[language], subKeys);
  if (!translation && language !== DEFAULT_LANGUAGE) {
    translation = getNestedValue(MODULE_LOCALES[rootNs]?.[DEFAULT_LANGUAGE], subKeys);
  }
  if (!translation) {
    translation = defaultText || keys[keys.length - 1] || key;
  }

  if (interpolatedParams && Object.keys(interpolatedParams).length > 0) {
    return translation.replace(/\{\{?(\w+)\}?\}/g, (_, varName) =>
      varName in interpolatedParams ? String(interpolatedParams[varName]) : `{${varName}}`
    );
  }

  return translation;
}

const AppI18nContext = createContext<AppI18nContextType | null>(null);

export const AppI18nProvider: React.FC<{
  children: React.ReactNode;
  storageKey?: string;
  allowedLanguages?: LanguageCode[];
}> = ({ children, storageKey = LANGUAGE_STORAGE_KEY, allowedLanguages }) => {
  const allowedSet = useMemo(
    () => (allowedLanguages && allowedLanguages.length > 0 ? new Set(allowedLanguages) : null),
    [allowedLanguages]
  );

  const availableLanguages = useMemo(
    () =>
      allowedSet
        ? SUPPORTED_LANGUAGES.filter((l) => allowedSet.has(l.code))
        : SUPPORTED_LANGUAGES,
    [allowedSet]
  );

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    try {
      const saved = localStorage.getItem(storageKey) as LanguageCode | null;
      if (saved && LANGUAGE_MAP[saved] && (!allowedSet || allowedSet.has(saved))) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_LANGUAGE;
  });

  const config = useMemo(
    () => LANGUAGE_MAP[language] || LANGUAGE_MAP[DEFAULT_LANGUAGE],
    [language]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.setAttribute('lang', language);
    html.setAttribute('dir', config.dir);
    html.classList.toggle('rtl', config.isRTL);
    html.classList.toggle('ltr', !config.isRTL);
    document.body.style.fontFamily = config.fontFamily;
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // ignore
    }
  }, [language, config, storageKey]);

  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      if (LANGUAGE_MAP[lang] && (!allowedSet || allowedSet.has(lang))) {
        setLanguageState(lang);
      }
    },
    [allowedSet]
  );

  const t = useCallback(
    (key: string, defaultTextOrParams?: string | AppTranslationParams, params?: AppTranslationParams) =>
      resolveAppTranslation(language, key, defaultTextOrParams, params),
    [language]
  );

  const formatNumber = useCallback(
    (val: number | string) => formatLocalizedNumber(val, language),
    [language]
  );

  const formatDate = useCallback(
    (val: Date | string | number) => {
      const dateInput = typeof val === 'number' ? new Date(val) : val;
      return formatLocalizedDate(dateInput, language);
    },
    [language]
  );

  const value = useMemo<AppI18nContextType>(
    () => ({
      language,
      direction: config.dir,
      isRTL: config.isRTL,
      config,
      supportedLanguages: availableLanguages,
      setLanguage,
      t,
      formatNumber,
      formatDate,
    }),
    [language, config, availableLanguages, setLanguage, t, formatNumber, formatDate]
  );

  return <AppI18nContext.Provider value={value}>{children}</AppI18nContext.Provider>;
};

export function useAppI18n(namespace?: string): AppI18nContextType {
  const ctx = useContext(AppI18nContext);
  if (!ctx) {
    throw new Error('useAppI18n must be used inside AppI18nProvider');
  }

  return useMemo(() => {
    if (!namespace) return ctx;
    return {
      ...ctx,
      t: (key: string, defaultTextOrParams?: string | AppTranslationParams, params?: AppTranslationParams) => {
        const fullKey = key.startsWith(`${namespace}.`) ? key : `${namespace}.${key}`;
        return ctx.t(fullKey, defaultTextOrParams, params);
      },
    };
  }, [ctx, namespace]);
}

export function createAppModuleTranslation<
  T extends Partial<Record<LanguageCode, Record<string, unknown>>>
>(namespace: string, locales: T) {
  registerAppModuleLocales(namespace, locales);

  return function useScopedModuleTranslation() {
    return useAppI18n(namespace);
  };
}
