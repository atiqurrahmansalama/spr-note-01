import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/useTheme";
import { useTranslation } from "../../i18n/useTranslation";
import { SUPPORTED_LANGUAGES } from "../../i18n/constants";
import type { LanguageCode } from "../../i18n/types";
import {
  AcademicCapIcon,
  SunIcon,
  MoonIcon,
  LanguagesIcon,
  CheckIcon,
  ChevronIcon,
} from "../ui/Icons";

export interface PortalTopUtilityBarProps {
  brandName?: string;
  brandBadge?: string;
  brandIcon?: React.ComponentType<{ className?: string }>;
  rightExtra?: React.ReactNode;
}

/**
 * Shared borderless top utility bar for standalone public & auth portals
 * (/login, /register, /staff-onboard, /online-admission).
 * Provides unified brand identity, dropdown language selector (EN/BN/AR/UR with RTL),
 * and accessible Light/Dark color-scheme switching.
 */
export default function PortalTopUtilityBar({
  brandName,
  brandBadge,
  brandIcon: BrandIcon = AcademicCapIcon,
  rightExtra,
}: PortalTopUtilityBarProps): React.JSX.Element {
  const { modeId, setModeId, effectiveMode, systemMode } = useTheme();
  const { t, language, setLanguage } = useTranslation("auth");

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const resolvedBrandName = brandName || t("brandName", "Suffah Hifz LMS");
  const resolvedBrandBadge = brandBadge || t("brandBadge", "Academic Portal");
  const isCurrentlyDark = (effectiveMode || modeId) === "dark";

  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLangMenuOpen(false);
      }
    }
    if (isLangMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLangMenuOpen]);

  const handleToggleTheme = () => {
    const targetScheme = isCurrentlyDark ? "light" : "dark";
    if (systemMode && targetScheme === systemMode) {
      setModeId("system");
    } else {
      setModeId(targetScheme);
    }
  };

  return (
    <header className="relative z-50 w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 py-2 px-1">
      {/* Brand / Institute Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl theme-bg-surface border-0 flex items-center justify-center shadow-xs shrink-0">
          <BrandIcon className="w-5 h-5 theme-text-secondary" />
        </div>
        <div className="flex flex-col min-w-0 text-start">
          <span className="text-base sm:text-lg md:text-xl font-black tracking-tight theme-text-primary truncate max-w-[280px] sm:max-w-[540px]">
            {resolvedBrandName}
          </span>
          <span className="text-xs font-semibold theme-text-secondary truncate max-w-[280px] sm:max-w-[540px]">
            {resolvedBrandBadge}
          </span>
        </div>
      </div>

      {/* Right Utility Cluster: Extra Status, Language Dropdown, Light/Dark Toggle */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {rightExtra}

        {/* Language Dropdown Selector */}
        <div ref={langMenuRef} className="relative inline-block text-start">
          <button
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            aria-haspopup="true"
            aria-expanded={isLangMenuOpen}
            title={t("selectLanguage", "Select Language")}
            className="h-9 px-3 rounded-2xl theme-bg-surface hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition-all flex items-center gap-2 shadow-xs border-0 ring-0 cursor-pointer select-none"
          >
            <LanguagesIcon className="w-4 h-4 theme-text-secondary shrink-0" />
            <span className="font-bold">{activeLangObj?.badgeLabel || language.toUpperCase()}</span>
            <ChevronIcon
              isOpen={isLangMenuOpen}
              className="w-3 h-3 theme-text-secondary shrink-0 transition-transform duration-200"
            />
          </button>

          {isLangMenuOpen && (
            <div
              role="menu"
              className="absolute end-0 mt-1.5 w-48 rounded-2xl theme-bg-surface shadow-xl p-1.5 z-[100] border-0 ring-0 animate-in fade-in zoom-in-95 duration-150"
            >
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer border-0 ring-0 ${
                      isActive
                        ? "theme-bg-accent/15 theme-accent font-bold"
                        : "theme-text-primary hover:theme-bg-app"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md theme-bg-sub/60 theme-text-secondary">
                        {lang.badgeLabel}
                      </span>
                      <span>{lang.name}</span>
                    </div>
                    {isActive && <CheckIcon className="w-4 h-4 theme-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Light / Dark Mode Switch */}
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-pressed={isCurrentlyDark}
          aria-label={
            isCurrentlyDark
              ? t("switchToLightMode", "Switch to Light Mode")
              : t("switchToDarkMode", "Switch to Dark Mode")
          }
          title={
            isCurrentlyDark
              ? t("switchToLightMode", "Switch to Light Mode")
              : t("switchToDarkMode", "Switch to Dark Mode")
          }
          className="p-2.5 rounded-2xl theme-bg-surface border-0 ring-0 hover:theme-bg-elevated/50 theme-text-secondary hover:theme-text-primary transition shadow-xs cursor-pointer"
        >
          {isCurrentlyDark ? (
            <SunIcon className="w-4 h-4 theme-text-secondary" />
          ) : (
            <MoonIcon className="w-4 h-4 theme-text-secondary" />
          )}
        </button>
      </div>
    </header>
  );
}

