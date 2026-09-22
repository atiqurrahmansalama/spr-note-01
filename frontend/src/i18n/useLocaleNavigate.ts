import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { useI18n } from './I18nContext';
import { buildLocalizedPath, getLanguageFromPath } from './routing';
import type { LanguageCode } from './types';

/**
 * Reusable Locale-Aware Navigation Hook.
 * Wraps react-router's useNavigate to automatically preserve or update
 * the active language prefix.
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

      // If to is a path starting with /, preserve current language prefix if currently on a prefixed path
      const currentPrefix = getLanguageFromPath(location.pathname);
      if (currentPrefix) {
        const localizedTo = buildLocalizedPath(to, currentPrefix, true);
        navigate(localizedTo, options);
      } else {
        navigate(to, options);
      }
    },
    [navigate, location.pathname]
  );

  const switchLanguage = useCallback(
    (newLang: LanguageCode) => {
      setLanguage(newLang);
      const newPath = buildLocalizedPath(location.pathname + location.search, newLang);
      navigate(newPath, { replace: true });
    },
    [location.pathname, location.search, navigate, setLanguage]
  );

  return {
    navigate: localeNavigate,
    switchLanguage,
    rawNavigate: navigate,
  };
}

export default useLocaleNavigate;
