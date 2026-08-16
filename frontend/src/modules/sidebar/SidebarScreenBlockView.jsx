import { CloseIcon } from "../../components/ui/Icons";
import { useRightSidebar } from "../../context/RightSidebarContext";

export default function SidebarScreenBlockView({ 
  title, 
  onClose, 
  children, 
  dockPosition = "left", 
  onToggleDock,
  isDockDisabled = false,
  dockDisabledReason = "Right sidebar dock is disabled while an active action panel is open"
}) {
  const { isRightSidebarOpen } = useRightSidebar();
  const shouldDisableDock = isDockDisabled || isRightSidebarOpen;

  return (
    <div className={`w-full h-full theme-bg-app flex flex-col overflow-hidden animate-fade-in relative z-20 @container ${
      dockPosition === "right" ? "border-l theme-border shadow-2xl" : ""
    }`}>
      <div className="theme-bg-surface border-b theme-border px-3.5 sm:px-6 py-3 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-wider theme-text-secondary shrink-0">
            Navigation /
          </span>
          <span className="text-xs sm:text-sm font-bold theme-text-primary truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Dock Position Switch Button */}
          {onToggleDock && (
            <button
              type="button"
              onClick={shouldDisableDock ? undefined : onToggleDock}
              disabled={shouldDisableDock}
              className={`hidden md:flex p-1.5 rounded-lg transition-colors items-center justify-center ${
                shouldDisableDock
                  ? "opacity-30 cursor-not-allowed theme-text-secondary"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-sub cursor-pointer"
              }`}
              title={
                shouldDisableDock
                  ? dockDisabledReason
                  : dockPosition === "right"
                  ? "Dock Panel to Left Main Area"
                  : "Dock Panel to Right Sidebar"
              }
            >
              {dockPosition === "right" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center justify-center"
            title="Close View"
          >
            <CloseIcon className="w-4 h-4 text-inherit" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex justify-center items-start">
        {children}
      </div>
    </div>
  );

}

