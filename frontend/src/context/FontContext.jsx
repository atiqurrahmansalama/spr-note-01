import { useState, useEffect } from "react";
import { FONT_OPTIONS, FONT_SIZES } from "../constants/fontConstants";
import { FontContext } from "./FontContextObject";

export function FontProvider({ children }) {
  const [fontId, setFontId] = useState(() => {
    return localStorage.getItem("spr_app_font_id") || "Outfit";
  });

  const [fontSizeId, setFontSizeId] = useState(() => {
    return localStorage.getItem("spr_app_font_size") || "normal";
  });

  const activeFont = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[2];
  const activeFontSize = FONT_SIZES.find((s) => s.id === fontSizeId) || FONT_SIZES[1];

  useEffect(() => {
    localStorage.setItem("spr_app_font_id", fontId);
    document.documentElement.style.fontFamily = activeFont.css;
    document.body.style.fontFamily = activeFont.css;
  }, [fontId, activeFont]);

  useEffect(() => {
    localStorage.setItem("spr_app_font_size", fontSizeId);
    document.documentElement.style.fontSize = activeFontSize.px;
  }, [fontSizeId, activeFontSize]);

  const resetDefaults = () => {
    setFontId("Outfit");
    setFontSizeId("normal");
  };

  return (
    <FontContext.Provider
      value={{
        fontId,
        setFontId,
        fontSizeId,
        setFontSizeId,
        activeFont,
        activeFontSize,
        fontOptions: FONT_OPTIONS,
        fontSizes: FONT_SIZES,
        resetDefaults,
      }}
    >
      {children}
    </FontContext.Provider>
  );
}
