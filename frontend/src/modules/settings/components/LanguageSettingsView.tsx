import { useI18n, useLocaleNavigate, type LanguageCode } from '@/i18n';
import { GlobeIcon, CheckIcon, LanguagesIcon, SparklesIcon } from '@/components/ui/Icons';

export interface LanguageSettingsViewProps {
  hideHeader?: boolean;
  isEmbedded?: boolean;
}

export default function LanguageSettingsView({
  hideHeader = false,
  isEmbedded = false,
}: LanguageSettingsViewProps) {
  const { language, config, supportedLanguages, t } = useI18n();
  const { switchLanguage } = useLocaleNavigate();

  const handleSelectLanguage = (code: LanguageCode) => {
    switchLanguage(code);
  };

  return (
    <div
      className={`w-full ${
        isEmbedded ? 'max-w-none' : 'max-w-3xl mx-auto'
      } space-y-6 theme-text-primary animate-fade-in text-left rtl:text-right ${
        isEmbedded ? 'py-0 px-0' : 'py-4 px-3 sm:px-6'
      }`}
    >
      {!hideHeader && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
              <GlobeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-primary">
                {t('settings.languageTitle', 'Language & Localization')}
              </h2>
              <p className="text-xs theme-text-secondary">
                {t(
                  'settings.languageSubtitle',
                  'Customize application display language, typography, and layout direction.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Language Selection Grid */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-xs space-y-5">
        <div className="space-y-1 pb-3 border-b theme-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              {t('settings.selectLanguage', 'Select Display Language')}
            </h3>
            <p className="text-xs theme-text-secondary">
              {t('settings.languageSubtitle', 'Choose your preferred language for the system interface.')}
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg theme-bg-sub theme-text-secondary border theme-border">
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
                className={`p-4 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer flex items-start justify-between select-none relative ${
                  isActive
                    ? 'theme-bg-accent-soft border-[var(--accent-main)] shadow-xs ring-1 ring-[var(--accent-main)]'
                    : 'theme-bg-surface theme-border hover:theme-bg-sub/50'
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
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'theme-bg-sub theme-text-secondary border theme-border'
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
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs">
                      <CheckIcon className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 theme-border theme-bg-surface" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Typography & Direction Preview Box */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <SparklesIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-sm font-bold theme-text-primary">
            {t('settings.preview', 'Typography & Layout Preview')}
          </h3>
        </div>

        <div className="p-5 rounded-2xl theme-bg-sub border theme-border space-y-3">
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

          <div className="pt-2 border-t theme-border flex flex-wrap items-center gap-4 text-xs font-mono theme-text-secondary">
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
