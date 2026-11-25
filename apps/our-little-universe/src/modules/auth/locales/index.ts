import { createAppModuleTranslation } from '@repo/ui';
import authEn from './en';
import authBn from './bn';

export const useAuthTranslation = createAppModuleTranslation('auth', {
  en: authEn,
  bn: authBn,
});
