import { createAppModuleTranslation } from '@repo/ui';
import adminEn from './en';
import adminBn from './bn';

export const useAdminTranslation = createAppModuleTranslation('admin', {
  en: adminEn,
  bn: adminBn,
});
