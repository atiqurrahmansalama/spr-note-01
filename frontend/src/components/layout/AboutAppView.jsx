import { AboutIcon } from "../ui/Icons";

export default function AboutAppView() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl text-center space-y-3">
        <div className="w-16 h-16 theme-bg-accent-soft rounded-2xl mx-auto flex items-center justify-center theme-accent shrink-0 shadow-inner">
          <AboutIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold theme-text-primary">SPR Note - Hifz Progress Manager</h2>
        <p className="text-xs theme-text-secondary max-w-md mx-auto">
          Enterprise management platform for logging student daily Hifz progress, tracking mistakes, and generating automated reports.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <span className="text-xs font-mono theme-bg-sub px-3 py-1 rounded-full theme-accent">
            Version 1.93.0
          </span>
          <span className="text-xs font-mono theme-bg-sub px-3 py-1 rounded-full text-emerald-400">
            Active License
          </span>
        </div>
      </div>

      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-sm font-semibold theme-text-primary pb-1">
          Core Application Features
        </h3>
        <ul className="text-xs space-y-2.5 theme-text-secondary list-disc pl-5 leading-relaxed">
          <li>Student-based Juz, page, and ayah range input interface.</li>
          <li>Instant plain text report generator optimized for messaging apps.</li>
          <li>High-definition canvas rendering and PDF document exporter.</li>
          <li>Offline-first local storage engine with DRF cloud synchronization.</li>
          <li>Global typography customization and theme preset switcher.</li>
        </ul>
      </div>
    </div>
  );
}
