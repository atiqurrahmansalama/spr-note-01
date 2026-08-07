import AppearanceSettings from "./components/AppearanceSettings";
import CalendarSettings from "./components/CalendarSettings";
import CopyReportSettingsView from "./components/CopyReportSettingsView";
import DataBackupView from "./components/DataBackupView";
import LanguageSettingsView from "./components/LanguageSettingsView";
import SectionToggleControlPanel from "./components/SectionToggleControlPanel";
import ShortcutsGuide from "./components/ShortcutsGuide";
import AppGuideView from "./components/AppGuideView";
import AboutAppView from "./components/AboutAppView";

export default function SettingsModule({ activeTab = "Settings" }) {
  switch (activeTab) {
    case "Appearance":
      return <AppearanceSettings />;
    case "Date & Time":
      return <CalendarSettings />;
    case "Copy Report Settings":
      return <CopyReportSettingsView />;
    case "Language":
      return <LanguageSettingsView />;
    case "Data & Backup":
      return <DataBackupView />;
    case "Section Control":
      return <SectionToggleControlPanel />;
    case "Shortcuts":
      return <ShortcutsGuide />;
    case "App Guide":
      return <AppGuideView />;
    case "About":
      return <AboutAppView />;
    default:
      return (
        <div className="space-y-6">
          <SectionToggleControlPanel />
        </div>
      );
  }
}
