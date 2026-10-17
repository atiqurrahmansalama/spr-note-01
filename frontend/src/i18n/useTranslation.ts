import { useCallback } from 'react';
import { useI18n, registerModuleLocales } from './I18nContext';
import type { LanguageCode, TranslationNamespace, TranslationParams } from './types';

/**
 * Reusable Translation Hook with optional namespace scoping.
 * Example:
 *   const { t } = useTranslation('common');
 *   t('save'); // equivalent to t('common.save')
 *   t('navigation.dashboard'); // explicit namespace works seamlessly
 */
export function useTranslation(namespace?: TranslationNamespace) {
  const i18n = useI18n();

  const scopedT = useCallback(
    (
      key: string,
      defaultTextOrParams?: string | TranslationParams,
      params?: TranslationParams
    ): string => {
      const fullKey = namespace && !key.includes('.') ? `${namespace}.${key}` : key;
      return i18n.t(fullKey, defaultTextOrParams, params);
    },
    [i18n, namespace]
  );

  return {
    ...i18n,
    t: scopedT,
  };
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
