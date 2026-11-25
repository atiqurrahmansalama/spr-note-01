import { registerAppModuleLocales, useAppI18n } from '@repo/ui';
import en from './en';
import bn from './bn';

registerAppModuleLocales('story', { en, bn });

export function useStoryTranslation() {
  return useAppI18n('story');
}
