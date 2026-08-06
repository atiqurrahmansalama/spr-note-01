import { useState, useEffect } from "react";
import { APP_INFO } from "../../constants/version";
import { getVersionTrackerInfo } from "../../utils/versionTracker";
import { AboutIcon, ClockIcon } from "../ui/Icons";

export default function AboutAppView() {
  const [versionInfo, setVersionInfo] = useState(() => getVersionTrackerInfo());

  useEffect(() => {
    const handleVersionUpdate = (e) => {
      if (e.detail) {
        setVersionInfo(e.detail);
      } else {
        setVersionInfo(getVersionTrackerInfo());
      }
    };
    window.addEventListener("spr_version_updated", handleVersionUpdate);
    window.addEventListener("spr_report_saved", handleVersionUpdate);
    return () => {
      window.removeEventListener("spr_version_updated", handleVersionUpdate);
      window.removeEventListener("spr_report_saved", handleVersionUpdate);
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-6 px-4 select-none">
      
      {/* Sleek App Branding Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-xl text-center space-y-4 relative overflow-hidden">
        <div className="w-14 h-14 theme-bg-accent-soft rounded-2xl mx-auto flex items-center justify-center theme-accent shrink-0 shadow-inner">
          <AboutIcon className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold theme-text-primary tracking-wide">
            {APP_INFO.fullTitle}
          </h2>
          <p className="text-xs theme-text-secondary max-w-sm mx-auto leading-relaxed">
            {APP_INFO.description}
          </p>
        </div>

        {/* Dynamic Auto-Version & Last Change Tracker Badges */}
        <div className="pt-3 flex flex-wrap justify-center items-center gap-2 text-xs font-mono">
          <span className="theme-bg-sub border theme-border px-3.5 py-1 rounded-full theme-accent font-bold shadow-sm">
            Version {versionInfo.version}
          </span>
          <span className="theme-bg-sub border theme-border px-3.5 py-1 rounded-full theme-text-secondary flex items-center gap-1.5 shadow-sm">
            <ClockIcon className="w-3.5 h-3.5 text-emerald-400" />
            Last Update: {versionInfo.lastChangeTime} ({versionInfo.lastChangeDate})
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[11px] theme-text-secondary text-center">
        <p>© {new Date().getFullYear()} {APP_INFO.author}. All rights reserved.</p>
      </div>
    </div>
  );
}

