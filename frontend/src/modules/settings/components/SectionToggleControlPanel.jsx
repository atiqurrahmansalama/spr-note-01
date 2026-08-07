import { useState, useEffect } from "react";
import { getSectionConfig, saveSectionConfig } from "../../../config/defaultSectionConfig";
import { useToast } from "../../../context/ToastContext";

export default function SectionToggleControlPanel() {
  const { showToast } = useToast();
  const [config, setConfig] = useState(() => getSectionConfig());

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener("spr_section_config_updated", handleUpdate);
    return () => window.removeEventListener("spr_section_config_updated", handleUpdate);
  }, []);

  const handleToggle = (key) => {
    const updated = {
      ...config,
      [key]: {
        ...config[key],
        enabled: !config[key].enabled,
      },
    };
    setConfig(updated);
    saveSectionConfig(updated);
    showToast(`Section '${config[key].name}' ${updated[key].enabled ? "Enabled" : "Disabled"}`, "info");
  };

  const handleResetDefaults = () => {
    localStorage.removeItem("spr_section_config_v1");
    const defaultConfig = getSectionConfig();
    setConfig(defaultConfig);
    saveSectionConfig(defaultConfig);
    showToast("Reset all sections to default state", "success");
  };

  const categories = Array.from(new Set(Object.values(config).map((item) => item.category || "General")));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 theme-text-primary">
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🎛️</span> Super Admin Section Control Panel
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              Dynamically toggle form sections ON or OFF across the application for different roles and workflows.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {categories.map((category) => {
        const categoryItems = Object.entries(config).filter(([_, item]) => (item.category || "General") === category);

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary px-1">
              {category}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryItems.map(([key, item]) => (
                <div
                  key={key}
                  onClick={() => handleToggle(key)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    item.enabled
                      ? "theme-bg-surface border-[var(--accent-main)]/40 shadow-sm"
                      : "theme-bg-sub border-transparent opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold theme-text-primary">{item.name}</p>
                    <p className="text-[10px] theme-text-secondary font-mono">
                      ID: {key} • {item.enabled ? "Active" : "Hidden"}
                    </p>
                  </div>

                  <div
                    className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                      item.enabled ? "theme-bg-accent justify-end" : "bg-gray-400/30 justify-start"
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
