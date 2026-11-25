import { createAppModuleTranslation } from '@repo/ui';
import recipientEn from './en';
import recipientBn from './bn';

export const useRecipientTranslation = createAppModuleTranslation('recipient', {
  en: recipientEn,
  bn: recipientBn,
});
