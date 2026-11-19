import React from 'react';
import { useTranslation, type LanguageCode } from '@/i18n';
import { CheckIcon, GlobeIcon, SparklesIcon } from '@/components/ui/Icons';
import type { NumeralSystem } from '@/i18n/types';

export interface LanguageSettingsViewProps {
  hideHeader?: boolean;
  isEmbedded?: boolean;
}

export default function LanguageSettingsView({
  hideHeader = false,
  isEmbedded = false,
}: LanguageSettingsViewProps) {
  const { language, setLanguage, config, supportedLanguages, t, numeralSystem, setNumeralSystem, formatNumber } =
    useTranslation('common');

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
  };

  return (
    <div
      className={`w-full ${
        isEmbedded ? 'max-w-none' : 'max-w-3xl mx-auto'
      } flex flex-col space-y-6 animate-fade-in theme-text-primary ${
        isEmbedded ? 'pt-0 pb-12 sm:pb-16 px-0' : 'py-4 px-3 sm:px-6 pb-12 sm:pb-16'
      }`}
    >
      {/* 0. Top Header Banner (when not embedded) */}
      {!hideHeader && (
        <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4 border-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-2xl theme-accent shrink-0">
              <GlobeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary tracking-tight">
                {t('settings.languageHeader', 'Language & Regional Localization')}
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                {t(
                  'settings.languageDesc',
                  'Configure application display language, bidirectional layout (RTL/LTR), and localized numeral systems.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Language Cards Grid */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 border-0">
        <div className="space-y-1 pb-1 flex items-center justify-between border-0">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              {t('settings.selectLanguage', 'Select Display Language')}
            </h3>
            <p className="text-xs theme-text-secondary">
              {t('settings.languageSubtitle', 'Choose your preferred language for the system interface.')}
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg theme-bg-app theme-text-secondary">
            {config.isRTL ? 'RTL Direction' : 'LTR Direction'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {supportedLanguages.map((lang) => {
            const isActive = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`p-4 rounded-2xl text-left rtl:text-right transition-all cursor-pointer flex items-start justify-between select-none relative border-0 ${
                  isActive
                    ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 shadow-xs'
                    : 'theme-bg-app hover:theme-bg-elevated/40'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black leading-none theme-text-primary">
                      {lang.nativeName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                        lang.isRTL
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'theme-bg-surface/80 theme-text-secondary'
                      }`}
                    >
                      {lang.dir.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs font-medium theme-text-secondary">{lang.name}</div>

                  <div className="text-[11px] font-mono theme-text-muted">
                    Script: {lang.script}
                  </div>
                </div>

                <div className="shrink-0 ml-3 rtl:ml-0 rtl:mr-3 mt-1">
                  {isActive && (
                    <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs">
                      <CheckIcon className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Numeral Formatting System Selection */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 border-0">
        <div className="space-y-1 pb-1 flex items-center justify-between border-0">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              {t('settings.numeralSystem', 'Numeral System')}
            </h3>
            <p className="text-xs theme-text-secondary">
              {t(
                'settings.numeralSystemSubtitle',
                'Choose how numbers, amounts, and dates are displayed across all tables, reports, and inputs.'
              )}
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg theme-bg-app theme-text-secondary">
            Sample: {formatNumber(2026)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Option 1: Standard International (Latin) */}
          <button
            type="button"
            onClick={() => setNumeralSystem('LATIN')}
            className={`p-4 rounded-2xl text-left rtl:text-right transition-all cursor-pointer flex items-start justify-between select-none relative border-0 ${
              numeralSystem === 'LATIN'
                ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 shadow-xs'
                : 'theme-bg-app hover:theme-bg-elevated/40'
            }`}
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold theme-text-primary">
                  Standard International (Latin)
                </span>
              </div>
              <p className="text-xs theme-text-secondary">
                Standard Western numerals used globally across finance and systems.
              </p>
              <div className="text-xs font-mono font-bold pt-1 theme-accent">
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9
              </div>
            </div>

            <div className="shrink-0 ml-3 rtl:ml-0 rtl:mr-3 mt-1">
              {numeralSystem === 'LATIN' && (
                <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs">
                  <CheckIcon className="w-3 h-3" />
                </div>
              )}
            </div>
          </button>

          {/* Option 2: Localized Native Script */}
          <button
            type="button"
            onClick={() => setNumeralSystem('LOCALIZED')}
            className={`p-4 rounded-2xl text-left rtl:text-right transition-all cursor-pointer flex items-start justify-between select-none relative border-0 ${
              numeralSystem === 'LOCALIZED'
                ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25 shadow-xs'
                : 'theme-bg-app hover:theme-bg-elevated/40'
            }`}
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold theme-text-primary">
                  Native Localized Script
                </span>
              </div>
              <p className="text-xs theme-text-secondary">
                Culturally native numerals matching active language ({config.name} — {config.numericScript}).
              </p>
              <div className="text-xs font-mono font-bold pt-1 theme-accent">
                {language === 'bn' ? '০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯' : language === 'ar' || language === 'ur' ? '٠, ١, ٢, ٣, ٤, ٥, ٦, ٧, ٨, ٩' : '0, 1, 2, 3, 4, 5, 6, 7, 8, 9'}
              </div>
            </div>

            <div className="shrink-0 ml-3 rtl:ml-0 rtl:mr-3 mt-1">
              {numeralSystem === 'LOCALIZED' && (
                <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs">
                  <CheckIcon className="w-3 h-3" />
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 3. Live Typography & Direction Preview Box */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 border-0">
        <div className="flex items-center gap-2 pb-1 border-0">
          <SparklesIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-sm font-bold theme-text-primary">
            {t('settings.preview', 'Typography & Layout Preview')}
          </h3>
        </div>

        <div className="p-5 rounded-2xl theme-bg-app space-y-3 border-0">
          <div className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
            {config.name} ({config.nativeName}) — {config.dir.toUpperCase()}
          </div>
          <p
            className="text-base font-semibold theme-text-primary leading-relaxed"
            style={{ fontFamily: config.fontFamily }}
          >
            {t(
              'settings.previewText',
              'SPR Note empowers modern institutional management with intelligent automation.'
            )}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono theme-text-secondary">
            <span>
              <b>Direction:</b> {config.isRTL ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
            </span>
            <span>
              <b>Numerals:</b> {config.numericScript}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
