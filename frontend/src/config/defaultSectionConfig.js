export const DEFAULT_SECTION_CONFIG = {
  headerDate: { id: "headerDate", name: "Date & Time Header", enabled: true, category: "Header" },
  studentSelect: { id: "studentSelect", name: "Student Selection Input", enabled: true, category: "Student Info" },
  sessionSelect: { id: "sessionSelect", name: "Session Preset Selector", enabled: true, category: "Session Info" },
  juzPageInput: { id: "juzPageInput", name: "Juz & Page Range Input", enabled: true, category: "Quran Progress" },
  mistakeTracker: { id: "mistakeTracker", name: "Mistake Tracker Section", enabled: true, category: "Progress Details" },
  stuckTracker: { id: "stuckTracker", name: "Stuck/Pause Tracker Section", enabled: true, category: "Progress Details" },
  commentSection: { id: "commentSection", name: "Teacher Comment & Saved Presets", enabled: true, category: "Comments" },
  actionButtons: { id: "actionButtons", name: "Save & Generate Report Buttons", enabled: true, category: "Actions" },
};

export const getSectionConfig = () => {
  try {
    const saved = localStorage.getItem("spr_section_config_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SECTION_CONFIG, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SECTION_CONFIG;
};

export const saveSectionConfig = (newConfig) => {
  try {
    localStorage.setItem("spr_section_config_v1", JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent("spr_section_config_updated", { detail: newConfig }));
  } catch (err) {
    console.error("[sectionConfig] Failed to save config:", err);
  }
};
