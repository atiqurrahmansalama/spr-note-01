import React from "react";
import { GlobeIcon, CheckIcon } from "../../../components/ui/Icons";

export default function LanguageSettingsView({
  hideHeader = false,
  isEmbedded = false,
}) {
  return (
    <div className={`w-full ${isEmbedded ? "max-w-none" : "max-w-2xl mx-auto"} space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start ${isEmbedded ? "py-0 px-0" : "py-4 px-3 sm:px-6"}`}>
      
      {!hideHeader && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
              <GlobeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-primary">Language Settings</h2>
              <p className="text-xs theme-text-secondary">
                Interface language localization preferences.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="space-y-1 pb-2 border-b theme-border">
          <h3 className="text-sm font-bold theme-text-primary">Interface Language</h3>
          <p className="text-xs theme-text-secondary">Standard institutional display language.</p>
        </div>

        <div className="p-4 theme-bg-sub rounded-2xl flex items-center justify-between shadow-xs border theme-border">
          <div className="space-y-0.5">
            <div className="text-sm font-bold theme-text-primary">English (United States)</div>
            <div className="text-xs theme-text-secondary">Default primary application language</div>
          </div>
          <span className="text-xs font-mono theme-bg-accent-soft theme-accent px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold">
            <CheckIcon className="w-3.5 h-3.5" />
            <span>Active Default</span>
          </span>
        </div>
      </div>
    </div>
  );
}
