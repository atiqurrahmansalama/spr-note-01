import React from "react";
import { useTheme } from "../../context/useTheme";
import { useTranslation } from "../../i18n/useTranslation";
import { SUPPORTED_LANGUAGES } from "../../i18n/constants";
import type { LanguageCode } from "../../i18n/types";
import { AcademicCapIcon, SunIcon, MoonIcon } from "../ui/Icons";

export interface PortalTopUtilityBarProps {
  brandName?: string;
  brandBadge?: string;
  brandIcon?: React.ComponentType<{ className?: string }>;
  rightExtra?: React.ReactNode;
}

/**
 * Shared borderless top utility bar for standalone public & auth portals
 * (/login, /register, /staff-onboard, /online-admission).
 * Provides unified brand identity, 4-language switcher (EN/BN/AR/UR with RTL),
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

  const resolvedBrandName = brandName || t("brandName", "Suffah Hifz LMS");
  const resolvedBrandBadge = brandBadge || t("brandBadge", "Academic Portal");
  const isCurrentlyDark = (effectiveMode || modeId) === "dark";

  const handleToggleTheme = () => {
    const targetScheme = isCurrentlyDark ? "light" : "dark";
    // Return to 'system' when target matches the OS preference so system auto-switching stays intact
    if (systemMode && targetScheme === systemMode) {
      setModeId("system");
    } else {
      setModeId(targetScheme);
    }
  };

  return (
    <header className="relative z-10 w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 py-2 px-1">
      {/* Brand / Institute Identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft border-0 flex items-center justify-center shadow-xs shrink-0">
          <BrandIcon className="w-4 h-4 theme-accent" />
        </div>
        <div className="flex flex-col min-w-0 text-start">
          <span className="text-xs font-bold tracking-tight theme-text-primary truncate max-w-[200px] sm:max-w-[320px]">
            {resolvedBrandName}
          </span>
          <span className="text-[10px] theme-text-secondary truncate max-w-[200px] sm:max-w-[320px]">
            {resolvedBrandBadge}
          </span>
        </div>
      </div>

      {/* Right Utility Cluster: Extra Status, Language Switcher, Light/Dark Toggle */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {rightExtra}

        {/* 4-Language Switcher Pill */}
        <div
          role="group"
          aria-label={t("selectLanguage", "Select language")}
          className="inline-flex items-center theme-bg-surface border-0 rounded-2xl p-1 shadow-xs gap-0.5"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as LanguageCode)}
                aria-pressed={isActive}
                title={lang.name}
                className={`px-2.5 py-1 text-xs rounded-xl font-semibold transition cursor-pointer border-0 ring-0 ${
                  isActive
                    ? "theme-bg-accent theme-accent-text shadow-xs"
                    : "theme-text-secondary hover:theme-text-primary hover:theme-bg-app"
                }`}
              >
                {lang.badgeLabel}
              </button>
            );
          })}
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
            <SunIcon className="w-4 h-4 text-amber-400" />
          ) : (
            <MoonIcon className="w-4 h-4 theme-accent" />
          )}
        </button>
      </div>
    </header>
  );
}

