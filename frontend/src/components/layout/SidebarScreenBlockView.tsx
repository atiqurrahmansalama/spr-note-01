import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CloseIcon,
  ArrowLeftIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "../ui/Icons";
import IconButton from "../ui/IconButton";
import { useRightSidebar } from "../../context/RightSidebarContext";

export interface SidebarScreenBlockViewProps {
  title?: React.ReactNode;
  category?: string;
  subCategory?: string;
  onClose?: () => void;
  onBack?: () => void;
  children?: React.ReactNode;
  dockPosition?: "left" | "right";
  onToggleDock?: () => void;
  isDockDisabled?: boolean;
  dockDisabledReason?: string;
}

/**
 * Enterprise Center / Dockable View Container
 * Renders consistent header navigation, breadcrumbs, dock toggle, and soft-hover close button.
 */
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
}: SidebarScreenBlockViewProps) {
  const navigate = useNavigate();
  const { isRightSidebarOpen } = useRightSidebar();
  const shouldDisableDock = isDockDisabled || isRightSidebarOpen;

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className={`w-full h-full theme-bg-app flex flex-col overflow-hidden animate-fade-in relative z-20 @container min-w-0 ${
      dockPosition === "right" ? "border-l theme-border shadow-2xl" : ""
    }`}>
      {/* Header Bar with Back Button & Breadcrumbs */}
      <div className="theme-bg-surface border-b theme-border px-3 @sm:px-5 py-2 @sm:py-2.5 flex justify-between items-center shrink-0 shadow-md gap-2 h-[48px] @sm:h-[52px]">
        <div className="flex items-center gap-2 @sm:gap-3 min-w-0 flex-1">
          {/* Universal Back Navigation Icon Button */}
          <IconButton
            icon={ArrowLeftIcon}
            size="sm"
            variant="ghost"
            onClick={handleBackNavigation}
            title="Go back to previous page"
            ariaLabel="Go back to previous page"
          />

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
            <div className="hidden md:block">
              <IconButton
                icon={dockPosition === "right" ? ChevronDoubleLeftIcon : ChevronDoubleRightIcon}
                size="sm"
                variant="ghost"
                disabled={shouldDisableDock}
                onClick={shouldDisableDock ? undefined : onToggleDock}
                title={
                  shouldDisableDock
                    ? dockDisabledReason
                    : dockPosition === "right"
                    ? "Dock Panel to Left Main Area"
                    : "Dock Panel to Right Sidebar"
                }
                ariaLabel="Toggle Panel Dock Position"
              />
            </div>
          )}

          {/* Close Button with subtle, light red hover */}
          {onClose && (
            <IconButton
              icon={CloseIcon}
              size="sm"
              variant="ghost"
              onClick={onClose}
              title="Close View"
              ariaLabel="Close View"
              className="hover:!text-rose-400 dark:hover:!text-rose-400/90 hover:!bg-rose-500/[0.08] active:!bg-rose-500/[0.14]"
            />
          )}
        </div>
      </div>

      <div className="sidebar-screen-container flex-1 overflow-y-auto overflow-x-hidden p-1 @sm:p-2 @md:p-3.5 @lg:p-5 w-full min-w-0 flex flex-col no-scrollbar">
        <div className="w-full max-w-full min-w-0 h-full flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
