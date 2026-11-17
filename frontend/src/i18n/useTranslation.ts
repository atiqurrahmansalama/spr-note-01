import { useCallback, useMemo } from 'react';
import { useI18n, registerModuleLocales } from './I18nContext';
import type { LanguageCode, TranslationNamespace, TranslationParams } from './types';

const GLOBAL_NAMESPACES = new Set([
  'common',
  'navigation',
  'settings',
  'dashboard',
  'finance',
  'notifications',
  'auth',
  'errors',
]);

/**
 * Reusable Translation Hook with optional namespace scoping.
 * Example:
 *   const { t } = useTranslation('about');
 *   t('architecture.tenantTitle'); // resolves to 'about.architecture.tenantTitle'
 *   t('navigation.dashboard');     // global namespaces pass through cleanly
 */
export function useTranslation(namespace?: TranslationNamespace) {
  const i18n = useI18n();

  const scopedT = useCallback(
    (
      key: string,
      defaultTextOrParams?: string | TranslationParams,
      params?: TranslationParams
    ): string => {
      let fullKey = key;
      if (namespace) {
        const rootKey = key.split('.')[0];
        if (key.startsWith(`${namespace}.`)) {
          fullKey = key;
        } else if (GLOBAL_NAMESPACES.has(rootKey)) {
          fullKey = key;
        } else {
          fullKey = `${namespace}.${key}`;
        }
      }
      return i18n.t(fullKey, defaultTextOrParams, params);
    },
    [i18n.t, namespace]
  );

  return useMemo(
    () => ({
      ...i18n,
      t: scopedT,
    }),
    [i18n, scopedT]
  );
}

/**
 * Enterprise Helper to create a dedicated, colocated module translation hook.
 * Automatically registers the module's localized dictionaries into the i18n registry.
 *
 * Example:
 *   // inside your module:
 *   export const useUserTranslation = createModuleTranslation('userManagement', userManagementLocales);
 */
export function createModuleTranslation<T extends Record<LanguageCode, any>>(
  namespace: string,
  locales: T
) {
  registerModuleLocales(namespace, locales);

  return function useScopedModuleTranslation() {
    return useTranslation(namespace);
  };
}

export default useTranslation;
