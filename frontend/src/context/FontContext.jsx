import { useState, useEffect } from "react";
import { FONT_OPTIONS, FONT_SIZES } from "../constants/fontConstants";
import { FontContext } from "./FontContextObject";
import { appearanceSettings as appStore } from "../utils/localStore";

export function FontProvider({ children }) {
  const [fontId, setFontId] = useState(() => appStore.getFontId());
  const [fontSizeId, setFontSizeId] = useState(() => appStore.getFontSize());

  const activeFont = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[2];
  const activeFontSize = FONT_SIZES.find((s) => s.id === fontSizeId) || FONT_SIZES[1];

  useEffect(() => {
    appStore.saveFontId(fontId);
    document.documentElement.style.fontFamily = activeFont.css;
    document.body.style.fontFamily = activeFont.css;
  }, [fontId, activeFont]);

  useEffect(() => {
    appStore.saveFontSize(fontSizeId);
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
