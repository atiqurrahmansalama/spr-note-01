import { useCallback } from 'react';
import { useI18n } from './I18nContext';
import type { TranslationNamespace, TranslationParams } from './types';

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

export default useTranslation;
