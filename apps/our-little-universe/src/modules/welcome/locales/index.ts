import { createAppModuleTranslation } from '@repo/ui';
import welcomeEn from './en';
import welcomeBn from './bn';

export const useWelcomeTranslation = createAppModuleTranslation('welcome', {
  en: welcomeEn,
  bn: welcomeBn,
});
