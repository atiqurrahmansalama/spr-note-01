import { useState } from "react";
import UserProfileCard from "./UserProfileCard";
import { sidebarSettings } from "../../utils/localStore";
import { 
  DashboardIcon, 
  AppearanceIcon, 
  SettingsIcon, 
  GroupsIcon, 
  SessionsIcon, 
  ShortcutsIcon, 
  AppGuideIcon, 
  AboutIcon,
  ChevronIcon,
  CalendarIcon,
  CopyIcon,
  CloudIcon,
  GlobeIcon
} from "../ui/Icons";

export default function Sidebar({ 
  isOpen, 
  onClose, 
  activeTab,
  setActiveTab,
  sidebarMode = "inline",
  setSidebarMode,
  isProfileOpen,
  setIsProfileOpen 
}) {
  const [openSubMenus, setOpenSubMenus] = useState({
    Settings: true,
    Groups: false,
    Sessions: false,
  });

  const toggleSubMenu = (menuName) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const menuItems = [
    { 
      id: "Dashboard", 
      name: "Dashboard", 
      Icon: DashboardIcon 
    },
    { 
      id: "Appearance", 
      name: "Appearance", 
      Icon: AppearanceIcon 
    },
    { 
      id: "Settings", 
      name: "Settings", 
      Icon: SettingsIcon, 
      hasSub: true,
      subItems: [
        { id: "Date & Time", name: "Date & Time", Icon: CalendarIcon },
        { id: "Copy Report Settings", name: "Copy Report Settings", Icon: CopyIcon },
        { id: "Language", name: "Language", Icon: GlobeIcon },
      ]
    },
    { 
      id: "Data & Backup", 
      name: "Data & Backup", 
      Icon: CloudIcon 
    },
    { 
      id: "Groups & Students", 
      name: "Groups & Students", 
      Icon: GroupsIcon 
    },
    { 
      id: "Sessions & Comments", 
      name: "Sessions & Comments", 
      Icon: SessionsIcon 
    },
    { 
      id: "Shortcuts", 
      name: "Shortcuts", 
      Icon: ShortcutsIcon 
    },
    { 
      id: "App Guide", 
      name: "App Guide", 
      Icon: AppGuideIcon 
    },
    { 
      id: "About", 
      name: "About", 
      Icon: AboutIcon 
    },
  ];

  const handleSelectTab = (tabName) => {
    setActiveTab(tabName);
    if (sidebarMode === "overlay" && isOpen) {
      onClose(); // Close overlay drawer on selection
    }
  };

  if (!isOpen) return null;

  const isCollapsed = sidebarMode === "collapsed";
  const isOverlay = sidebarMode === "overlay";

  const isMobileScreen = typeof window !== "undefined" && window.innerWidth < 768;

  const displayMenuItems = menuItems.filter((item) => {
    if (isMobileScreen && item.id === "Shortcuts") return false;
    return true;
  });

  return (
    <>
      {/* Screen Blocking Backdrop (Overlay Mode ONLY) */}
      {isOverlay && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          ${isOverlay ? "fixed top-0 left-0 z-50 shadow-2xl h-full" : "relative z-20 h-full shadow-none"}
          ${isCollapsed ? "w-16 sm:w-16" : "w-72 sm:w-72"}
          theme-bg-surface theme-text-secondary border-r theme-border shrink-0 flex flex-col justify-between transition-all duration-200 ease-out select-none
        `}
      >
        {/* Clean Sidebar Header */}
        <div className="p-3 border-b theme-border theme-bg-sub flex items-center justify-between shrink-0 select-none">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="font-bold theme-text-primary text-xs tracking-wide">
                Navigation
              </span>
              <span className="text-[10px] theme-text-secondary font-mono theme-bg-elevated px-1.5 py-0.5 rounded border theme-border">
                v1.93.0
              </span>
            </div>
          )}
          <button 
            type="button"
            onClick={onClose}
            className="theme-text-secondary hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ml-auto"
            title="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu List */}
        <nav 
          className={`flex-1 overflow-y-auto ${isCollapsed ? "p-1.5 space-y-2" : "p-3 space-y-1.5"} text-xs font-medium`}
          style={{ scrollbarGutter: "stable" }}
        >
          {displayMenuItems.map((item) => {
            const isParentActive = activeTab === item.name;
            const ItemIcon = item.Icon;
            const isSubOpen = openSubMenus[item.id] || false;

            if (item.hasSub) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) {
                        handleSelectTab(item.subItems[0].name);
                      } else {
                        toggleSubMenu(item.id);
                      }
                    }}
                    title={item.name}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2.5"} rounded-xl transition-colors cursor-pointer select-none ${
                      isParentActive
                        ? "theme-bg-elevated theme-text-primary font-semibold border theme-border"
                        : "hover:theme-bg-sub theme-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg theme-bg-sub border theme-border flex items-center justify-center theme-text-secondary shrink-0">
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      {!isCollapsed && <span className="truncate text-xs font-semibold">{item.name}</span>}
                    </div>

                    {!isCollapsed && (
                      <ChevronIcon 
                        isOpen={isSubOpen} 
                        className="w-3.5 h-3.5 theme-text-secondary shrink-0" 
                      />
                    )}
                  </button>

                  {/* Sub-items List (Only when NOT collapsed) */}
                  {!isCollapsed && isSubOpen && (
                    <div className="pl-4 space-y-1 pt-0.5 transition-all">
                      {item.subItems.map((sub) => {
                        const isSubActive = activeTab === sub.name;
                        const SubIcon = sub.Icon;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectTab(sub.name)}
                            className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer select-none ${
                              isSubActive
                                ? "theme-bg-elevated theme-text-primary font-bold border theme-border shadow-sm"
                                : "hover:theme-bg-sub theme-text-secondary"
                            }`}
                          >
                            {isSubActive && (
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 theme-bg-accent rounded-r-full shadow-sm" />
                            )}

                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isSubActive 
                                ? "theme-bg-sub theme-text-primary border theme-border" 
                                : "theme-bg-sub theme-text-secondary"
                            }`}>
                              <SubIcon className="w-3.5 h-3.5" />
                            </div>

                            <span className="truncate text-xs">{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            {/* Standalone Item */}
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.name)}
                title={item.name}
                className={`w-full relative flex items-center ${isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2.5"} rounded-xl transition-colors cursor-pointer select-none ${
                  isActive
                    ? "theme-bg-elevated theme-text-primary font-bold border theme-border shadow-sm"
                    : "hover:theme-bg-sub theme-text-secondary"
                }`}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 theme-bg-accent rounded-r-full shadow-sm" />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive 
                      ? "theme-bg-accent-soft theme-accent" 
                      : "theme-bg-sub theme-text-secondary"
                  }`}>
                    <ItemIcon className="w-3.5 h-3.5" />
                  </div>
                  {!isCollapsed && <span className="truncate text-xs font-semibold">{item.name}</span>}
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Profile Card */}
        {!isCollapsed && (
          <UserProfileCard
            isProfileOpen={isProfileOpen}
            setIsProfileOpen={setIsProfileOpen}
          />
        )}
      </aside>
    </>
  );
}