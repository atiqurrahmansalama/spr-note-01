import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface UseAppKeyboardShortcutsProps {
  themeContext: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isProfileOpen: boolean;
  setIsProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Universal Keyboard Shortcuts Hook for SPR Note
 * Handles quick navigation, theme cycling, search autofocus, and modal dismissals.
 */
export function useAppKeyboardShortcuts({
  themeContext,
  isSidebarOpen,
  setIsSidebarOpen,
  isProfileOpen,
  setIsProfileOpen,
}: UseAppKeyboardShortcutsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = (e.key || "").toLowerCase();

      // Alt+L or Ctrl+Shift+L: 3-State Theme Toggle (Light -> Dark -> System)
      if ((e.altKey || (isCmdOrCtrl && e.shiftKey)) && key === "l") {
        e.preventDefault();
        if (themeContext?.cycleMode) {
          themeContext.cycleMode();
        } else if (themeContext?.setModeId) {
          themeContext.setModeId((prev: string) =>
            prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
          );
        }
        return;
      }

      // Alt+T or Ctrl+Shift+T: Color Palette Cycle
      if ((e.altKey || (isCmdOrCtrl && e.shiftKey)) && key === "t") {
        e.preventDefault();
        if (themeContext?.palettes && themeContext?.setThemeId) {
          const palettes = themeContext.palettes;
          const currentIdx = palettes.findIndex((p: any) => p.id === themeContext.themeId);
          const nextPalette = palettes[(currentIdx + 1) % palettes.length];
          themeContext.setThemeId(nextPalette.id);
        }
        return;
      }

      // Ctrl+S: Report Action or Home
      if (isCmdOrCtrl && !e.shiftKey && key === "s") {
        e.preventDefault();
        const makeReportBtn = document.querySelector<HTMLButtonElement>('button[data-shortcut="make-report"]');
        if (makeReportBtn) {
          makeReportBtn.click();
        } else {
          navigate("/");
        }
        return;
      }

      // Ctrl+M: Toggle Navigation Sidebar
      if (isCmdOrCtrl && !e.shiftKey && key === "m") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      // Ctrl+K: Global Search Focus
      if (isCmdOrCtrl && !e.shiftKey && key === "k") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[type="text"], input[placeholder*="Search"], input[placeholder*="student"]'
        );
        if (input) input.focus();
        return;
      }

      // Quick Module Navigation Shortcuts
      if (isCmdOrCtrl && e.shiftKey) {
        if (key === "d") { e.preventDefault(); navigate("/"); }
        else if (key === "a") { e.preventDefault(); navigate("/appearance"); }
        else if (key === "g") { e.preventDefault(); navigate("/groups-students"); }
        else if (key === "s") { e.preventDefault(); navigate("/sessions-comments"); }
        else if (key === "b") { e.preventDefault(); navigate("/data-backup"); }
        else if (key === "k") { e.preventDefault(); navigate("/shortcuts"); }
        else if (key === "r") { e.preventDefault(); navigate("/studies/progress-reports/records"); }
      }

      // ESC: Close popovers, sidebars, or return to dashboard
      if (e.key === "Escape") {
        if (isProfileOpen) {
          setIsProfileOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (location.pathname !== "/" && location.pathname !== "/dashboard") {
          navigate("/dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, isSidebarOpen, isProfileOpen, themeContext, navigate, setIsSidebarOpen, setIsProfileOpen]);
}
