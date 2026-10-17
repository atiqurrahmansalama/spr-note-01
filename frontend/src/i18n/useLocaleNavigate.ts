import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { useI18n } from './I18nContext';
import { stripLanguagePrefix } from './routing';
import type { LanguageCode } from './types';

/**
 * Enterprise Reusable Locale-Aware Navigation Hook.
 * Provides safe in-app navigation and instant, jitter-free language switching
 * without disruptive route bounces or unmounting of layout containers.
 */
export function useLocaleNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useI18n();

  const localeNavigate = useCallback(
    (to: string | number, options?: any) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      // Ensure any legacy or stray locale prefix is stripped to match pure SPA routes
      const cleanTo = typeof to === 'string' ? stripLanguagePrefix(to) : to;
      navigate(cleanTo as any, options);
    },
    [navigate]
  );

  const switchLanguage = useCallback(
    (newLang: LanguageCode) => {
      // Seamless in-memory state transition without route bounce or unmounting
      setLanguage(newLang);
    },
    [setLanguage]
  );

  return {
    navigate: localeNavigate,
    switchLanguage,
    rawNavigate: navigate,
  };
}

export default useLocaleNavigate;

