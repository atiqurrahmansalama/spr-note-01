import { useState, useEffect } from "react";
import { THEME_PALETTES, THEME_MODES } from "../constants/themeConstants";
import { ThemeContext } from "./ThemeContextObject";

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem("spr_app_theme") || "slate";
  });

  const [modeId, setModeId] = useState(() => {
    return localStorage.getItem("spr_app_mode") || "dark";
  });

  const activeTheme = THEME_PALETTES.find((t) => t.id === themeId) || THEME_PALETTES[0];
  const activeMode = THEME_MODES.find((m) => m.id === modeId) || THEME_MODES[0];

  useEffect(() => {
    localStorage.setItem("spr_app_theme", themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    document.body.setAttribute("data-theme", themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem("spr_app_mode", modeId);
    document.documentElement.setAttribute("data-mode", modeId);
    document.body.setAttribute("data-mode", modeId);
  }, [modeId]);

  const resetTheme = () => {
    setThemeId("slate");
    setModeId("dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        setThemeId,
        modeId,
        setModeId,
        activeTheme,
        activeMode,
        palettes: THEME_PALETTES,
        modes: THEME_MODES,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
