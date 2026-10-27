import { useState, useEffect, useMemo, useCallback } from "react";
import { THEME_PALETTES, THEME_MODES } from "../constants/themeConstants";
import { ThemeContext } from "./ThemeContextObject";
import { appearanceSettings as appStore } from "../utils/localStore";

// Helper to determine system/OS dark mode preference
function getSystemThemePreference() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => appStore.getTheme());
  const [modeId, setModeId] = useState(() => appStore.getMode()); // 'light' | 'dark' | 'system'
  const [systemMode, setSystemMode] = useState(getSystemThemePreference);

  // Listen to OS system color scheme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemMode(e.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const activeTheme = THEME_PALETTES.find((t) => t.id === themeId) || THEME_PALETTES[0];
  const activeMode = THEME_MODES.find((m) => m.id === modeId) || THEME_MODES[0];

  // Resolved effective mode ('dark' or 'light')
  const effectiveMode = modeId === "system" ? systemMode : (modeId === "light" ? "light" : "dark");

  useEffect(() => {
    appStore.saveTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    document.body.setAttribute("data-theme", themeId);
  }, [themeId]);

  useEffect(() => {
    appStore.saveMode(modeId);
    document.documentElement.setAttribute("data-mode", effectiveMode);
    document.body.setAttribute("data-mode", effectiveMode);
    document.documentElement.setAttribute("data-mode-preference", modeId);
    document.body.setAttribute("data-mode-preference", modeId);
  }, [modeId, effectiveMode]);

  const cycleMode = useCallback(() => {
    setModeId((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  const resetTheme = useCallback(() => {
    setThemeId("slate");
    setModeId("dark");
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      modeId,
      setModeId,
      cycleMode,
      effectiveMode,
      systemMode,
      activeTheme,
      activeMode,
      palettes: THEME_PALETTES,
      modes: THEME_MODES,
      resetTheme,
    }),
    [themeId, modeId, cycleMode, effectiveMode, systemMode, activeTheme, activeMode, resetTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
