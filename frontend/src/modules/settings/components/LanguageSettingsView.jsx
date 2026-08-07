import { GlobeIcon, CheckIcon } from "../../../components/ui/Icons";

export default function LanguageSettingsView() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
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

      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="p-4 theme-bg-sub rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <div className="text-xs font-bold theme-text-primary">English (United States)</div>
            <div className="text-[11px] theme-text-secondary">Default primary application language</div>
          </div>
          <span className="text-xs font-mono theme-bg-accent-soft theme-accent px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold">
            <CheckIcon className="w-3.5 h-3.5" />
            <span>Active Default</span>
          </span>
        </div>
      </div>
    </div>
  );
}
