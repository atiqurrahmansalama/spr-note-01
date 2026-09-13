import React, { useState, useRef, useEffect } from 'react';
import { useI18n, type LanguageCode } from '@/i18n';
import { LanguagesIcon, GlobeIcon, CheckIcon } from '@/components/ui/Icons';
import { useLocaleNavigate } from '@/hooks/useLocaleNavigate';

export interface LanguageSelectorDropdownProps {
  className?: string;
  variant?: 'header' | 'standalone' | 'compact';
}

export default function LanguageSelectorDropdown({
  className = '',
  variant = 'header',
}: LanguageSelectorDropdownProps) {
  const { language, config, supportedLanguages } = useI18n();
  const { switchLanguage } = useLocaleNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: LanguageCode) => {
    switchLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Header Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl theme-bg-sub/60 hover:theme-bg-sub border theme-border transition flex items-center gap-1.5 cursor-pointer active:scale-95 text-xs font-semibold theme-text-primary"
        title="Change Application Language"
        aria-label="Change Application Language"
        aria-expanded={isOpen}
      >
        <LanguagesIcon className="w-4 h-4 theme-accent shrink-0" />
        <span className="hidden sm:inline font-mono font-bold text-[11px] theme-accent">
          {config.badgeLabel}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-60 rounded-2xl border theme-border theme-bg-surface shadow-2xl z-50 p-1.5 space-y-1 animate-fade-in">
          <div className="px-3 py-2 border-b theme-border flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
              Display Language
            </span>
            <span className="text-[10px] font-mono theme-text-muted">
              {config.isRTL ? 'RTL Mode' : 'LTR Mode'}
            </span>
          </div>

          <div className="py-1 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
            {supportedLanguages.map((lang) => {
              const isActive = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left rtl:text-right flex items-center justify-between transition cursor-pointer select-none border-0 ${
                    isActive
                      ? 'theme-bg-accent-soft theme-accent font-bold ring-1 ring-[var(--accent-main)]/20'
                      : 'theme-bg-surface theme-text-primary hover:theme-bg-sub'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold leading-none">{lang.nativeName}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider ${
                          lang.isRTL
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'theme-bg-sub theme-text-secondary'
                        }`}
                      >
                        {lang.dir.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] theme-text-secondary block">{lang.name}</span>
                  </div>

                  {isActive && (
                    <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shrink-0">
                      <CheckIcon className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
