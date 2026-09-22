import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from './I18nContext';
import { useLocaleNavigate } from './useLocaleNavigate';
import ActionMenu, { type ActionMenuItem } from '../components/ui/ActionMenu';
import { LanguagesIcon, GlobeIcon, CheckIcon, ChevronRightIcon } from '../components/ui/Icons';

export interface LanguageSelectorProps {
  className?: string;
  align?: 'left' | 'right';
  size?: 'xs' | 'sm' | 'md';
  variant?: 'ghost' | 'surface' | 'sub' | 'default';
}

/**
 * Enterprise Reusable Language Selector Component
 * Encapsulates multi-language switching, RTL detection, and ActionMenu integration.
 */
export default function LanguageSelector({
  className = '',
  align = 'right',
  size = 'sm',
  variant = 'ghost',
}: LanguageSelectorProps) {
  const { language, config, supportedLanguages, t } = useI18n();
  const { switchLanguage } = useLocaleNavigate();
  const navigate = useNavigate();

  const menuItems = useMemo<ActionMenuItem[]>(() => {
    const langItems: ActionMenuItem[] = supportedLanguages.map((lang) => {
      const isActive = lang.code === language;
      return {
        label: lang.nativeName,
        title: `${lang.nativeName} (${lang.name})`,
        icon: isActive ? CheckIcon : GlobeIcon,
        badge: lang.dir.toUpperCase(),
        badgeClassName: isActive
          ? 'theme-accent font-bold opacity-100'
          : lang.isRTL
          ? 'text-amber-600 dark:text-amber-400 font-bold opacity-100'
          : 'theme-text-muted',
        onClick: () => switchLanguage(lang.code),
      };
    });

    return [
      ...langItems,
      { divider: true },
      {
        label: t('settings.languageTitle', 'More Language Settings'),
        icon: ChevronRightIcon,
        onClick: () => navigate('/personalize'),
      },
    ];
  }, [supportedLanguages, language, switchLanguage, navigate, t]);

  return (
    <div className={`inline-block ${className}`}>
      <ActionMenu
        icon={LanguagesIcon}
        label={null}
        variant={variant}
        size={size}
        align={align}
        buttonClassName="theme-accent"
        ariaLabel={t('settings.switchLanguage', 'Change Application Language')}
        header={
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 theme-text-secondary">
              <GlobeIcon className="w-3.5 h-3.5 theme-accent" />
              {t('settings.selectLanguage', 'Display Language')}
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md theme-bg-sub theme-text-muted border theme-border">
              {config.isRTL ? 'RTL' : 'LTR'}
            </span>
          </div>
        }
        items={menuItems}
      />
    </div>
  );
}
