/**
 * Multi-Language & RTL Interfaces
 * SPR Note Ecosystem
 */

export type LanguageCode = 'en' | 'bn' | 'ar' | 'ur';

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir: TextDirection;
  isRTL: boolean;
  script: string;
  fontFamily: string;
  badgeLabel: string;
  numericScript: 'latn' | 'beng' | 'arab';
  defaultPlaceholder?: string;
}

export type LocalizedValue = Partial<Record<LanguageCode, string>> & Record<string, string | undefined>;

export type LocalizedFieldInput = string | LocalizedValue | null | undefined;
