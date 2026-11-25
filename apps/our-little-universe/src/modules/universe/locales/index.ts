import { registerAppModuleLocales, useAppI18n } from '@repo/ui';
import en from './en';
import bn from './bn';

registerAppModuleLocales('universe', { en, bn });

export function useUniverseTranslation() {
  return useAppI18n('universe');
}
