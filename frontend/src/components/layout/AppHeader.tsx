import React from "react";
import { useNavigate } from "react-router-dom";
import { SunIcon, MoonIcon, SystemModeIcon, MenuIcon } from "../ui/Icons";
import IconButton from "../ui/IconButton";
import SaveStatusBadge from "../common/SaveStatusBadge";
import { LanguageSelector } from "../../i18n";
import NotificationBellDropdown from "./NotificationBellDropdown";
import { useTheme } from "../../context/useTheme";
import { getBranchDisplayName } from "../../utils/localStore";
import { UpdateBadge } from "../../modules/version-control/components/UpdateBadge";

export interface AppHeaderProps {
  onToggleMenu: () => void;
  user: any;
  avatarChar: string;
  currentInstitution: any;
  activeBranch: any;
  activeYear: any;
  versionControl?: {
    currentVersion: string;
    hasUpdate: boolean;
    isChecking?: boolean;
    onClick?: () => void;
  };
}

/**
 * Global Top Navigation Header Bar
 * Features brand navigation, dynamic institution/branch pill, 3-state theme toggle,
 * multi-language switcher, notification center bell, and user profile avatar.
 */
export default function AppHeader({
  onToggleMenu,
  user,
  avatarChar,
  currentInstitution,
  activeBranch,
  activeYear,
  versionControl,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const themeContext = useTheme();

  return (
    <header className="theme-bg-surface border-b theme-border px-4 py-2.5 flex justify-between items-center z-30 shadow-md shrink-0 relative">
      <div className="flex items-center gap-3 z-10 shrink-0">
        <IconButton
          icon={MenuIcon}
          size="md"
          variant="ghost"
          onClick={onToggleMenu}
          title="Toggle Navigation Menu (Ctrl+M)"
          ariaLabel="Toggle Navigation Menu"
        />
        
        <button 
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 cursor-pointer text-left group"
          title="SPR Note"
        >
          <span className="font-bold theme-text-primary text-lg tracking-wide group-hover:theme-accent transition-colors">
            SPR Note
          </span>
        </button>
      </div>

      {/* Selected Active Institution, Branch & Academic Year in Header Middle - Absolutely Centered to prevent shifting (Hidden on small screens) */}
      {currentInstitution?.name && (
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 justify-center items-center px-4 max-w-[calc(100%-420px)] pointer-events-none text-center">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap min-w-0 max-w-full">
            <span className="text-sm sm:text-base md:text-lg font-bold theme-text-primary truncate tracking-tight">
              {currentInstitution.name}
            </span>
            {(() => {
              const branchName = getBranchDisplayName(activeBranch);
              const instName = currentInstitution?.name || "";
              if (branchName && instName && String(branchName).toLowerCase() !== String(instName).toLowerCase()) {
                return (
                  <>
                    <span className="text-xs theme-text-secondary opacity-40 font-bold select-none">•</span>
                    <span className="text-xs sm:text-sm font-medium theme-text-secondary truncate max-w-[140px] sm:max-w-[240px]">
                      {branchName}
                    </span>
                  </>
                );
              }
              return null;
            })()}
            {activeYear?.name && (
              <>
                <span className="text-xs theme-text-secondary opacity-40 font-bold select-none">•</span>
                <span className="text-xs sm:text-sm font-semibold font-mono theme-accent truncate">
                  {activeYear.name}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 z-10 shrink-0 ml-auto">
        <SaveStatusBadge />

        {/* 3-State Theme Toggle Button: Light -> Dark -> System */}
        <IconButton
          icon={
            themeContext.modeId === "light"
              ? SunIcon
              : themeContext.modeId === "dark"
              ? MoonIcon
              : SystemModeIcon
          }
          size="sm"
          variant="ghost"
          onClick={() => {
            if (themeContext.cycleMode) {
              themeContext.cycleMode();
            } else {
              themeContext.setModeId((prev: string) =>
                prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
              );
            }
          }}
          title={
            themeContext.modeId === "light"
              ? "Theme: Light (Click for Dark Mode)"
              : themeContext.modeId === "dark"
              ? "Theme: Dark (Click for System Theme)"
              : `Theme: System (${themeContext.effectiveMode === "dark" ? "Dark" : "Light"} active - Click for Light Mode)`
          }
          ariaLabel="Toggle Theme Mode (Light / Dark / System)"
          className="theme-accent"
        />

        {/* Multi-Language & RTL Switcher */}
        <LanguageSelector />

        {/* Client Version & Update Status Badge */}
        {versionControl && (
          <UpdateBadge
            currentVersion={versionControl.currentVersion}
            hasUpdate={versionControl.hasUpdate}
            isChecking={versionControl.isChecking}
            onClick={versionControl.onClick}
          />
        )}

        {/* Real-time In-App Notification Bell */}
        <NotificationBellDropdown />

        {/* User Profile Avatar Link */}
        <button 
          type="button"
          onClick={() => navigate("/profile-settings")}
          className="p-0 bg-transparent border-0 cursor-pointer active:scale-95 group focus:outline-none flex items-center justify-center"
          title="Open User Profile Settings"
          aria-label="Open User Profile Settings"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full theme-bg-accent theme-accent-text text-xs font-bold flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                avatarChar
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
          </div>
        </button>
      </div>
    </header>
  );
}
