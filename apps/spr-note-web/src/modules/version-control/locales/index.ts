import { registerModuleLocales } from '@/i18n';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';
import { ur } from './ur';

registerModuleLocales('version_control', { en, bn, ar, ur });

export { en, bn, ar, ur };
