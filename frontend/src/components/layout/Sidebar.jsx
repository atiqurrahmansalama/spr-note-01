import { useState } from "react";
import UserProfileCard from "./UserProfileCard";
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
  GlobeIcon,
  UsersIcon,
  FolderIcon,
  ClockIcon,
  ChatIcon
} from "../ui/Icons";

export default function Sidebar({ 
  isOpen, 
  onClose, 
  activeTab,
  setActiveTab,
  isProfileOpen,
  setIsProfileOpen 
}) {
  const [openSubMenus, setOpenSubMenus] = useState({
    Settings: true, // Default expanded like sample image 2
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
    if (isOpen) {
      onClose(); // Close mobile drawer on selection
    }
  };

  return (
    <>
      {/* Mobile Overlay Layer */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Responsive Sidebar Wrapper */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-50 h-full w-72 theme-bg-surface theme-text-secondary border-r theme-border 
          shrink-0 flex flex-col justify-between shadow-2xl lg:shadow-none transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b theme-border theme-bg-sub flex justify-between items-center lg:hidden shrink-0">
          <span className="font-bold theme-text-primary text-sm">Navigation</span>
          <button 
            type="button"
            onClick={onClose}
            className="theme-text-secondary hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu List (Fixed overflow to prevent layout shift) */}
        <nav 
          className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs font-medium"
          style={{ scrollbarGutter: "stable" }}
        >
          {menuItems.map((item) => {
            const isParentActive = activeTab === item.name;
            const ItemIcon = item.Icon;
            const isSubOpen = openSubMenus[item.id] || false;

            if (item.hasSub) {
              return (
                <div key={item.id} className="space-y-1">
                  {/* Parent Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleSubMenu(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer select-none ${
                      isParentActive
                        ? "theme-bg-elevated theme-text-primary font-semibold border theme-border"
                        : "hover:theme-bg-sub theme-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg theme-bg-sub border theme-border flex items-center justify-center theme-text-secondary shrink-0">
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate text-xs font-semibold">{item.name}</span>
                    </div>

                    <ChevronIcon 
                      isOpen={isSubOpen} 
                      className="w-3.5 h-3.5 theme-text-secondary shrink-0" 
                    />
                  </button>

                  {/* Sub-items List (Matches Sample Image 2) */}
                  {isSubOpen && (
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
                            {/* Left Active Indicator Bar (Matches Sample Image 2) */}
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
                className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer select-none ${
                  isActive
                    ? "theme-bg-elevated theme-text-primary font-bold border theme-border shadow-sm"
                    : "hover:theme-bg-sub theme-text-secondary"
                }`}
              >
                {/* Left Active Indicator Bar */}
                {isActive && (
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
                  <span className="truncate text-xs font-semibold">{item.name}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Minimal Clean Profile Card */}
        <UserProfileCard
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />
      </aside>
    </>
  );
}