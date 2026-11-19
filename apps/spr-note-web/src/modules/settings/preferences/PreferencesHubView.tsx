import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import SettingsSplitLayout, { SettingsSectionItem } from "@/components/common/SettingsSplitLayout";
import { AppearanceSettings } from "./appearance";
import { CalendarSettings } from "./date-time";
import { LanguageSettingsView } from "./language";
import {
  AppearanceIcon,
  CalendarIcon,
  GlobeIcon,
} from "@/components/ui/Icons";
import type { PreferencesSectionId } from "./types";

const SECTIONS: SettingsSectionItem[] = [
  {
    id: "appearance",
    title: "Appearance",
    description: "Themes, dark/light modes, color palettes, font family & typography scale",
    icon: AppearanceIcon,
  },
  {
    id: "datetime",
    title: "Date & Time",
    description: "Timezone offsets, date formats, first day of week & Hijri calendar",
    icon: CalendarIcon,
  },
  {
    id: "language",
    title: "Language",
    description: "System interface language, RTL/LTR direction & numeral formatting",
    icon: GlobeIcon,
  },
];

export default function PreferencesHubView() {
  const { sectionId: pathSectionId } = useParams<{ sectionId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const basePath = location.pathname.startsWith("/personalize") ? "/personalize" : "/preferences";

  // Determine active section from route path or query parameter
  const resolveSection = (): PreferencesSectionId => {
    if (pathSectionId && SECTIONS.some((s) => s.id === pathSectionId)) {
      return pathSectionId as PreferencesSectionId;
    }
    if (location.pathname === "/appearance") return "appearance";
    if (location.pathname === "/date-time") return "datetime";
    if (location.pathname === "/language") return "language";

    const querySec = searchParams.get("section") || searchParams.get("tab");
    if (querySec && SECTIONS.some((s) => s.id === querySec)) {
      return querySec as PreferencesSectionId;
    }
    return "appearance";
  };

  const [activeSection, setActiveSection] = useState<string>(resolveSection);

  useEffect(() => {
    const nextSection = resolveSection();
    if (nextSection !== activeSection) {
      setActiveSection(nextSection);
    }
  }, [location.pathname, pathSectionId, searchParams]);

  const handleSectionChange = (sectionId: string | null) => {
    setActiveSection(sectionId);
    if (!sectionId) {
      navigate(basePath, { replace: true });
    } else {
      navigate(`${basePath}?section=${sectionId}`, { replace: true });
    }
  };

  const handleBackToMenu = () => {
    setActiveSection(null);
    navigate(basePath, { replace: true });
  };

  const currentRenderSection = activeSection || "appearance";

  return (
    <SettingsSplitLayout
      title=""
      subtitle=""
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      onBackToMenu={handleBackToMenu}
    >
      <div className="w-full min-w-0 pb-12 sm:pb-16">
        {currentRenderSection === "appearance" && <AppearanceSettings isEmbedded hideHeader />}
        {currentRenderSection === "datetime" && <CalendarSettings isEmbedded hideHeader />}
        {currentRenderSection === "language" && <LanguageSettingsView isEmbedded hideHeader />}
      </div>
    </SettingsSplitLayout>
  );
}

