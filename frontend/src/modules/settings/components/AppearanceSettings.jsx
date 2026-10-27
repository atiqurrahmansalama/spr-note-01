import { useState } from "react";
import { 
  AppearanceIcon, 
  SunIcon, 
  MoonIcon, 
  SystemModeIcon,
  FontIcon, 
  CheckIcon, 
  RefreshIcon 
} from "../../../components/ui/Icons";
import { 
  THEME_MODES, 
  THEME_PALETTES 
} from "../../../constants/themeConstants";
import { 
  FONT_OPTIONS, 
  FONT_SIZES 
} from "../../../constants/fontConstants";
import { useTheme } from "../../../context/useTheme";
import { useFont } from "../../../context/useFont";

export default function AppearanceSettings({
  hideHeader = false,
  isEmbedded = false,
  ...props
}) {
  const themeContext = useTheme();
  const fontContext = useFont();

  const themeId = props.themeId ?? themeContext.themeId;
  const setThemeId = props.setThemeId ?? themeContext.setThemeId;
  const modeId = props.modeId ?? themeContext.modeId;
  const setModeId = props.setModeId ?? themeContext.setModeId;
  const fontId = props.fontId ?? fontContext.fontId;
  const setFontId = props.setFontId ?? fontContext.setFontId;
  const fontSizeId = props.fontSizeId ?? fontContext.fontSizeId;
  const setFontSizeId = props.setFontSizeId ?? fontContext.setFontSizeId;

  const [modes] = useState(THEME_MODES);
  const [palettes] = useState(THEME_PALETTES);
  const [fontOptions] = useState(FONT_OPTIONS);
  const [fontSizes] = useState(FONT_SIZES);

  const activeTheme = palettes.find((p) => p.id === themeId) || palettes[0];
  const activeFont = fontOptions.find((f) => f.id === fontId) || fontOptions[0];

  const handleResetDefaults = () => {
    setThemeId("slate");
    setModeId("dark");
    setFontId("Outfit");
    setFontSizeId("normal");
  };

  return (
    <div className={`w-full ${isEmbedded ? "max-w-none" : "max-w-2xl mx-auto"} flex flex-col items-center justify-start ${isEmbedded ? "py-0 px-0" : "py-4 px-3 sm:px-6"} space-y-6 animate-fade-in theme-text-primary @container min-w-0`}>
      
      {/* 1. Header Card (shown when not embedded) */}
      {!hideHeader && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 @sm:p-5 shadow-xl flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-3.5 @sm:gap-4">
          <div className="flex items-center gap-3 @sm:gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <AppearanceIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm @sm:text-base font-bold theme-text-primary tracking-tight">Appearance & Customization</h2>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                Personalize application theme presets, light/dark modes, and typography style.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition cursor-pointer self-end @sm:self-center"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* 2. Theme Mode & Palette Presets Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 @sm:p-5 shadow-xl space-y-5">
        
        {/* Light / Dark / System Mode Switcher */}
        <div className="space-y-3">
          <div className="pb-1">
            <h3 className="text-xs font-bold theme-text-primary">Interface Theme Mode</h3>
            <p className="text-[10px] theme-text-secondary">Switch between crisp light mode, sleek dark mode, or automatic OS system sync</p>
          </div>

          <div className="grid grid-cols-3 gap-2 theme-bg-sub border theme-border p-1.5 rounded-2xl">
            {[
              { id: 'light', label: 'Light', icon: SunIcon, desc: 'Crisp bright' },
              { id: 'dark', label: 'Dark', icon: MoonIcon, desc: 'Sleek dark' },
              { id: 'system', label: 'System', icon: SystemModeIcon, desc: 'Auto OS sync' },
            ].map((m) => {
              const isSelected = modeId === m.id;
              const IconComp = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModeId(m.id)}
                  className={`py-2 px-2.5 rounded-xl text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 select-none active:scale-95 ${
                    isSelected
                      ? 'theme-bg-surface border theme-border theme-text-primary shadow-xs font-bold'
                      : 'border border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated font-medium'
                  }`}
                  title={`${m.label} Mode`}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'theme-bg-accent-soft theme-accent' : 'opacity-70'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-xs">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette Presets */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full theme-bg-accent" />
              <h3 className="text-xs font-bold theme-text-primary">Color Palette Presets</h3>
            </div>
            <span className="text-[11px] font-mono theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-md font-semibold">
              Active: {activeTheme.name}
            </span>
          </div>

          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
            {palettes.map((p) => {
              const isSelected = p.id === themeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setThemeId(p.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-text-primary shadow-sm"
                      : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block theme-text-primary">{p.name}</span>
                      <span className="text-[10px] theme-text-secondary font-mono">{p.category}</span>
                    </div>
                    <div 
                      className="w-3.5 h-3.5 rounded-full shadow-inner shrink-0"
                      style={{ backgroundColor: p.accentColor }}
                    />
                  </div>

                  {/* Theme swatch preview */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className={`flex-1 h-3.5 rounded text-[9px] font-mono flex items-center justify-center ${p.darkPreview}`}>
                      Dark
                    </div>
                    <div className={`flex-1 h-3.5 rounded text-[9px] font-mono flex items-center justify-center ${p.lightPreview}`}>
                      Light
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Font Family Selection Grid */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 @sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <FontIcon className="w-4 h-4 theme-accent" />
            <div>
              <h3 className="text-xs font-bold theme-text-primary">Font Family</h3>
              <p className="text-[10px] theme-text-secondary">Select application-wide typography style</p>
            </div>
          </div>
          <span className="text-[11px] font-mono theme-accent theme-bg-accent-soft px-2.5 py-0.5 rounded-md font-semibold">
            {activeFont.name}
          </span>
        </div>

        <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
          {fontOptions.map((f) => {
            const isSelected = f.id === fontId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontId(f.id)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                  isSelected
                    ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-text-primary shadow-sm"
                    : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block theme-text-primary">{f.name}</span>
                    <span className="text-[10px] theme-text-secondary">{f.subLabel}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded theme-bg-app theme-text-secondary">
                    {f.category}
                  </span>
                </div>

                {/* Font Visual Sample Box */}
                <div 
                  style={{ fontFamily: f.css }}
                  className="theme-bg-app p-2 rounded-lg text-xs truncate leading-relaxed theme-text-secondary"
                >
                  Aa Bb Cc - 1 2 3 - القرآن
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Font Size Scale Selector (Slider Bar) */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-xs font-bold theme-text-primary">Typography Scale (Font Size)</h3>
            <p className="text-[10px] theme-text-secondary">Adjust text size scale using the slider</p>
          </div>
          <span className="text-xs font-mono theme-bg-app border theme-border px-2.5 py-1 rounded-lg theme-accent font-bold">
            {fontSizes.find((s) => s.id === fontSizeId)?.name || "Normal"} ({fontSizes.find((s) => s.id === fontSizeId)?.px || "15px"})
          </span>
        </div>

        <div className="space-y-2 py-2">
          <input
            type="range"
            min="0"
            max={fontSizes.length - 1}
            step="1"
            value={Math.max(0, fontSizes.findIndex((s) => s.id === fontSizeId))}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              if (fontSizes[idx]) {
                setFontSizeId(fontSizes[idx].id);
              }
            }}
            className="w-full accent-[var(--accent-main)] cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
          />

          <div className="flex justify-between text-[11px] font-medium theme-text-secondary px-1">
            {fontSizes.map((s) => (
              <span 
                key={s.id}
                onClick={() => setFontSizeId(s.id)}
                className={`cursor-pointer transition-colors ${s.id === fontSizeId ? "theme-text-primary font-bold" : "hover:theme-text-primary"}`}
              >
                {s.name} ({s.px})
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
