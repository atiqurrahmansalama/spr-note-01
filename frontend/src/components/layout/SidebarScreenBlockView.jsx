import { useNavigate } from "react-router-dom";
import { CloseIcon } from "../ui/Icons";
import { useRightSidebar } from "../../context/RightSidebarContext";

export default function SidebarScreenBlockView({ 
  title, 
  category = "Navigation",
  subCategory,
  onClose, 
  onBack,
  children, 
  dockPosition = "left", 
  onToggleDock,
  isDockDisabled = false,
  dockDisabledReason = "Right sidebar dock is disabled while an active action panel is open"
}) {
  const navigate = useNavigate();
  const { isRightSidebarOpen } = useRightSidebar();
  const shouldDisableDock = isDockDisabled || isRightSidebarOpen;

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/report-builder");
    }
  };

  return (
    <div className={`w-full h-full theme-bg-app flex flex-col overflow-hidden animate-fade-in relative z-20 @container min-w-0 ${
      dockPosition === "right" ? "border-l theme-border shadow-2xl" : ""
    }`}>
      {/* Header Bar with Back Button & Breadcrumbs */}
      <div className="theme-bg-surface border-b theme-border px-3 @sm:px-5 py-2 @sm:py-2.5 flex justify-between items-center shrink-0 shadow-md select-none gap-2 h-[48px] @sm:h-[52px]">
        <div className="flex items-center gap-2 @sm:gap-3 min-w-0 flex-1">
          {/* Universal Back Navigation Button */}
          <button
            type="button"
            onClick={handleBackNavigation}
            className="p-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
            title="Go back to previous page"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Module Category & View Title Breadcrumbs */}
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-[10px] @sm:text-[11px] font-mono uppercase tracking-wider theme-text-secondary shrink-0">
              {category} /
            </span>
            {subCategory && (
              <span className="hidden @md:inline-block text-[10px] @sm:text-[11px] font-mono uppercase tracking-wider theme-text-secondary shrink-0">
                {subCategory} /
              </span>
            )}
            <span className="text-xs @sm:text-sm font-bold theme-text-primary truncate">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dock Position Switch Button */}
          {onToggleDock && (
            <button
              type="button"
              onClick={shouldDisableDock ? undefined : onToggleDock}
              disabled={shouldDisableDock}
              className={`hidden md:flex p-1.5 rounded-xl border theme-border transition-colors items-center justify-center ${
                shouldDisableDock
                  ? "opacity-30 cursor-not-allowed theme-text-secondary"
                  : "theme-bg-sub theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated cursor-pointer shadow-xs"
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
            className="p-1.5 rounded-xl border theme-border theme-bg-sub theme-text-secondary hover:theme-danger hover:theme-bg-danger-soft transition-colors cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
            title="Close View"
          >
            <CloseIcon className="w-4 h-4 text-inherit" />
          </button>
        </div>
      </div>

      <div className="sidebar-screen-container flex-1 overflow-y-auto overflow-x-hidden p-1 @sm:p-2 @md:p-3.5 @lg:p-5 w-full min-w-0">
        <div className="w-full max-w-full min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
