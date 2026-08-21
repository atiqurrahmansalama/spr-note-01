import React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import SettingsSplitLayout from "../../components/common/SettingsSplitLayout";
import AppearanceSettings from "./components/AppearanceSettings";
import CalendarSettings from "./components/CalendarSettings";
import LanguageSettingsView from "./components/LanguageSettingsView";
import {
  AppearanceIcon,
  CalendarIcon,
  GlobeIcon,
} from "../../components/ui/Icons";

const SECTIONS = [
  {
    id: "appearance",
    title: "Appearance",
    description: "Themes, dark/light modes, palettes & typography",
    icon: AppearanceIcon,
  },
  {
    id: "datetime",
    title: "Date & Time",
    description: "Timezone offsets, date formats & calendar standards",
    icon: CalendarIcon,
  },
  {
    id: "language",
    title: "Language",
    description: "Interface language & localization preferences",
    icon: GlobeIcon,
  },
];

export default function PersonalizeSettingsHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Determine active section from query param or route pathname
  const rawSection = searchParams.get("section") || searchParams.get("tab");
  let fallbackSection = "appearance";
  if (location.pathname === "/date-time") fallbackSection = "datetime";
  if (location.pathname === "/language") fallbackSection = "language";

  const validIds = ["appearance", "datetime", "language"];
  const activeSection = validIds.includes(rawSection) ? rawSection : fallbackSection;

  const handleSectionChange = (sectionId) => {
    setSearchParams({ section: sectionId });
  };

  return (
    <SettingsSplitLayout
      title="Personalize"
      subtitle="Customize workspace color themes, typography, regional date/time formats, and localization standards."
      headerIcon={AppearanceIcon}
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      <div className="w-full">
        {activeSection === "appearance" && <AppearanceSettings isEmbedded hideHeader />}
        {activeSection === "datetime" && <CalendarSettings isEmbedded hideHeader />}
        {activeSection === "language" && <LanguageSettingsView isEmbedded hideHeader />}
      </div>
    </SettingsSplitLayout>
  );
}
