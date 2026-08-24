import React from "react";

export default function RouteLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-6 animate-fade-in">
      <div className="flex flex-col items-center gap-3.5 p-6 rounded-3xl border theme-border theme-bg-surface shadow-lg max-w-sm w-full">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-[var(--accent-main)] border-r-[var(--accent-main)] animate-spin" />
          <div className="absolute w-6 h-6 rounded-full theme-bg-accent-soft" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-xs font-bold theme-text-primary tracking-wide">
            Loading Module...
          </div>
          <div className="text-[11px] theme-text-secondary">
            Please wait while resources are being loaded
          </div>
        </div>
      </div>
    </div>
  );
}
