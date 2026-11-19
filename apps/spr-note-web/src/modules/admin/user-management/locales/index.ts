import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';
import type { LanguageCode } from '../../../../i18n/types';

export const userManagementLocales: Record<LanguageCode, typeof en> = {
  en,
  bn,
  ar,
  ur,
};

export { en, bn, ar, ur };
export default userManagementLocales;
