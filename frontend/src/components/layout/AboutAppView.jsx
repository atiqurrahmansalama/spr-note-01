import { APP_INFO } from "../../constants/version";
import { AboutIcon, SleekCheckIcon, CalendarIcon, ClockIcon } from "../ui/Icons";

export default function AboutAppView() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6 select-none">
      
      {/* 🌟 App Header & Branding Card 🌟 */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
        <div className="w-16 h-16 theme-bg-accent-soft rounded-2xl mx-auto flex items-center justify-center theme-accent shrink-0 shadow-inner">
          <AboutIcon className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold theme-text-primary tracking-wide">
            {APP_INFO.fullTitle}
          </h2>
          <p className="text-xs theme-text-secondary max-w-lg mx-auto leading-relaxed">
            {APP_INFO.description}
          </p>
        </div>

        {/* 🕒 Version, Date, Time & Active License Badges (Exactly as requested in screenshot) 🕒 */}
        <div className="pt-2 flex flex-wrap justify-center items-center gap-2.5 text-xs font-mono">
          <span className="theme-bg-sub border theme-border px-3 py-1 rounded-full theme-accent font-bold shadow-sm">
            Version {APP_INFO.version}
          </span>
          <span className="theme-bg-sub border theme-border px-3 py-1 rounded-full theme-text-secondary flex items-center gap-1.5 shadow-sm">
            <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
            {APP_INFO.buildDate}
          </span>
          <span className="theme-bg-sub border theme-border px-3 py-1 rounded-full theme-text-secondary flex items-center gap-1.5 shadow-sm">
            <ClockIcon className="w-3.5 h-3.5 text-emerald-400" />
            {APP_INFO.buildTime}
          </span>
          <span className="theme-bg-sub border theme-border px-3 py-1 rounded-full text-emerald-400 font-semibold shadow-sm">
            Active License
          </span>
        </div>
      </div>

      {/* 🚀 Core Features 🚀 */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-sm font-bold theme-text-primary pb-2 border-b theme-border flex items-center gap-2">
          <SleekCheckIcon className="w-4 h-4 theme-accent" />
          Core Platform Highlights
        </h3>

        <ul className="text-xs space-y-3 theme-text-secondary">
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full theme-bg-accent mt-1.5 shrink-0" />
            <span><strong>Multi-Juz & Page Formatting:</strong> Flexible student Juz, page, and ayah error logging interface.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full theme-bg-accent mt-1.5 shrink-0" />
            <span><strong>Smart History & Undo/Redo:</strong> Instant global undo (`Ctrl+Z`) & redo (`Ctrl+Shift+Z` / `Alt+Ctrl+Z`) support across all report entries.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full theme-bg-accent mt-1.5 shrink-0" />
            <span><strong>Export Options:</strong> Plain text for messaging apps, HD Image export, and PDF document generation.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full theme-bg-accent mt-1.5 shrink-0" />
            <span><strong>Offline-First Synchronization:</strong> Seamless local storage fallback with background database API sync.</span>
          </li>
        </ul>
      </div>

      {/* System Footer */}
      <div className="text-[11px] theme-text-secondary text-center space-y-1">
        <p>© {new Date().getFullYear()} {APP_INFO.author}. All rights reserved.</p>
        <p className="font-mono text-[10px] opacity-70">Build Ref: {APP_INFO.buildTimestamp}</p>
      </div>
    </div>
  );
}
