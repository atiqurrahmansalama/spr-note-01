import React, { useMemo } from "react";
import {
  AppearanceIcon,
  SunIcon,
  MoonIcon,
  FontIcon,
  CheckIcon,
  RefreshIcon,
  SystemModeIcon,
} from "@/components/ui/Icons";
import { useTheme } from "@/context/useTheme";
import { useFont } from "@/context/useFont";
import { THEME_PALETTES, THEME_MODES } from "@/constants/themeConstants";
import { FONT_OPTIONS, FONT_SIZES } from "@/constants/fontConstants";

export interface AppearanceSettingsProps {
  hideHeader?: boolean;
  isEmbedded?: boolean;
}

export default function AppearanceSettings({
  hideHeader = false,
  isEmbedded = false,
}: AppearanceSettingsProps) {
  const { themeId, setThemeId, modeId, setModeId } = useTheme();
  const { fontId, setFontId, fontSizeId, setFontSizeId, activeFont, activeFontSize, fontOptions, fontSizes, resetDefaults } = useFont();

  const palettes = useMemo(() => THEME_PALETTES, []);

  const activeTheme = useMemo(
    () => palettes.find((p) => p.id === themeId) || palettes[0],
    [palettes, themeId]
  );

  const handleResetDefaults = () => {
    setThemeId("slate");
    setModeId("light");
    resetDefaults();
  };

  return (
    <div
      className={`w-full ${
        isEmbedded ? "max-w-none" : "max-w-3xl mx-auto"
      } flex flex-col items-center justify-start ${
        isEmbedded ? "pt-0 pb-12 sm:pb-16 px-0" : "py-4 px-3 sm:px-6 pb-12 sm:pb-16"
      } space-y-6 animate-fade-in theme-text-primary @container min-w-0`}
    >
      {/* 1. Header Card (shown when not embedded) */}
      {!hideHeader && (
        <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-3.5 @sm:gap-4 border-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-2xl theme-accent shrink-0">
              <AppearanceIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm @sm:text-base font-bold theme-text-primary tracking-tight">
                Appearance & Customization
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Personalize application theme presets, light/dark modes, and typography style.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 theme-text-secondary hover:theme-text-primary text-xs font-semibold transition cursor-pointer self-end @sm:self-center border-0"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      )}

      {/* 2. Theme Mode Switcher */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 border-0">
        <div className="space-y-0.5 pb-1 flex items-center justify-between border-0">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">Theme Mode</h3>
            <p className="text-xs theme-text-secondary">
              Select between crisp light mode, sleek dark mode, or automatic device sync.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg theme-bg-app theme-text-secondary capitalize">
            {modeId}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", label: "Light", icon: SunIcon, desc: "Crisp bright interface" },
            { id: "dark", label: "Dark", icon: MoonIcon, desc: "Sleek eye-friendly dark" },
            { id: "system", label: "System", icon: SystemModeIcon, desc: "Syncs with device OS" },
          ].map((m) => {
            const isSelected = modeId === m.id;
            const IconComp = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModeId(m.id)}
                className={`p-4 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 select-none active:scale-98 border-0 relative ${
                  isSelected
                    ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25"
                    : "theme-bg-app hover:theme-bg-elevated/40"
                }`}
              >
                {/* Active check indicator */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                )}

                <div
                  className={`p-2.5 rounded-xl transition ${
                    isSelected ? "theme-bg-accent theme-accent-text shadow-2xs" : "theme-bg-surface/80 theme-text-secondary"
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                </div>
                <div>
                  <span className={`text-xs font-bold block ${isSelected ? "theme-text-primary" : "theme-text-secondary"}`}>
                    {m.label}
                  </span>
                  <span className="text-[10px] theme-text-muted hidden @[440px]:block mt-0.5">
                    {m.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Color Palette Presets */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 border-0">
        <div className="flex items-center justify-between pb-1 border-0">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">Color Palette</h3>
            <p className="text-xs theme-text-secondary">
              Choose the primary accent and surface tone for your workspace.
            </p>
          </div>
          <span className="text-xs font-mono font-bold theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-lg">
            {activeTheme.name}
          </span>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          {palettes.map((p) => {
            const isSelected = p.id === themeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setThemeId(p.id)}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none border-0 ${
                  isSelected
                    ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25"
                    : "theme-bg-app hover:theme-bg-elevated/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Color dot: zero border, zero ring */}
                  <div
                    className="w-5 h-5 rounded-full shrink-0 shadow-xs border-0"
                    style={{
                      backgroundColor: p.accentColor,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block theme-text-primary truncate">{p.name}</span>
                    <span className="text-[10px] theme-text-muted font-mono">{p.category}</span>
                  </div>
                </div>

                {/* Right side: Only the check icon when active (D/L badges completely removed) */}
                <div className="shrink-0 flex items-center justify-center">
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-2xs">
                      <CheckIcon className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Font Family Grid */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 border-0">
        <div className="flex items-center justify-between pb-1 border-0">
          <div className="flex items-center gap-2">
            <FontIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-sm font-bold theme-text-primary">Font Family</h3>
              <p className="text-xs theme-text-secondary">Select application-wide typography styling.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-lg">
            {activeFont.name}
          </span>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          {fontOptions.map((f: any) => {
            const isSelected = f.id === fontId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontId(f.id)}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none border-0 ${
                  isSelected
                    ? "bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25"
                    : "theme-bg-app hover:theme-bg-elevated/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block theme-text-primary">{f.name}</span>
                    <span className="text-[10px] theme-text-secondary">{f.subLabel}</span>
                  </div>
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckIcon className="w-3 h-3" />
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md theme-bg-surface/80 theme-text-muted">
                      {f.category}
                    </span>
                  )}
                </div>

                <div 
                  style={{ fontFamily: f.css }}
                  className={`p-2.5 rounded-xl text-xs truncate leading-relaxed border-0 ${
                    isSelected ? "theme-bg-surface/90 theme-text-primary" : "theme-bg-surface/80 theme-text-secondary"
                  }`}
                >
                  Aa Bb Cc • 1 2 3 • القرآن الكريم
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Typography Scale (5 Font Size Scales) */}
      <div className="w-full theme-bg-surface rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 border-0">
        <div className="flex items-center justify-between pb-1 border-0">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">Typography Scale (Font Size)</h3>
            <p className="text-xs theme-text-secondary">
              Scale text size across the entire application interface.
            </p>
          </div>
          <span className="text-xs font-mono font-bold theme-bg-app px-2.5 py-1 rounded-lg theme-accent">
            {activeFontSize.name} ({activeFontSize.px})
          </span>
        </div>

        {/* 5-Scale Segmented Selector Pills */}
        <div className="grid grid-cols-5 gap-1.5 theme-bg-app p-1.5 rounded-2xl border-0">
          {fontSizes.map((s: any) => {
            const isSelected = s.id === fontSizeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFontSizeId(s.id)}
                className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center select-none border-0 ${
                  isSelected
                    ? "theme-bg-surface theme-text-primary shadow-xs font-bold"
                    : "theme-text-secondary hover:theme-text-primary hover:theme-bg-surface/60 font-medium"
                }`}
                title={`${s.name} (${s.px})`}
              >
                <span className="text-xs leading-tight truncate">{s.name}</span>
                <span className="text-[10px] font-mono theme-text-muted">{s.px}</span>
              </button>
            );
          })}
        </div>

        {/* Slider control */}
        <div className="space-y-3 pt-1">
          <input
            type="range"
            min="0"
            max={fontSizes.length - 1}
            step="1"
            value={Math.max(0, fontSizes.findIndex((s: any) => s.id === fontSizeId))}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              if (fontSizes[idx]) {
                setFontSizeId(fontSizes[idx].id);
              }
            }}
            className="w-full accent-[var(--accent-main)] cursor-pointer h-2 bg-gray-200 dark:bg-gray-700/60 rounded-lg appearance-none border-0"
          />

          {/* Live Preview Text Box */}
          <div className="p-4 rounded-2xl theme-bg-app space-y-1.5 border-0">
            <span className="text-[10px] font-mono uppercase tracking-wider theme-text-muted block">Live Scale Preview</span>
            <p className="theme-text-primary font-medium leading-relaxed">
              The quick brown fox jumps over the lazy dog. 0123456789.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
