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
  SavedMessagesIcon,
  SectionControlIcon
} from "../../components/ui/Icons";

export default function SidebarContainer({ 
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
    { id: "Dashboard", name: "Dashboard", Icon: DashboardIcon },
    { id: "Student Reports", name: "Student Reports", Icon: SavedMessagesIcon },
    { id: "Section Control", name: "Section Control", Icon: SectionControlIcon },
    { id: "Appearance", name: "Appearance", Icon: AppearanceIcon },
    { 
      id: "Settings", 
      name: "Settings", 
      Icon: SettingsIcon, 
      hasSub: true,
      subItems: [
        { id: "Section Control", name: "Section Control", Icon: SectionControlIcon },
        { id: "Date & Time", name: "Date & Time", Icon: CalendarIcon },
        { id: "Copy Report Settings", name: "Copy Report Settings", Icon: CopyIcon },
        { id: "Language", name: "Language", Icon: GlobeIcon },
      ]
    },
    { id: "Data & Backup", name: "Data & Backup", Icon: CloudIcon },
    { id: "Groups & Students", name: "Groups & Students", Icon: GroupsIcon },
    { id: "Sessions & Comments", name: "Sessions & Comments", Icon: SessionsIcon },
    { id: "Shortcuts", name: "Shortcuts", Icon: ShortcutsIcon },
    { id: "App Guide", name: "App Guide", Icon: AppGuideIcon },
    { id: "About", name: "About", Icon: AboutIcon },
  ];

  const handleSelectTab = (tabName) => {
    setActiveTab(tabName);
    if (sidebarMode === "overlay" && isOpen) {
      onClose();
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
      {isOverlay && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          ${isOverlay ? "fixed top-0 left-0 z-50 shadow-2xl h-full" : "relative z-20 h-full"}
          ${isCollapsed ? "w-20 sm:w-20" : "w-72 sm:w-72"}
          theme-bg-surface theme-text-secondary shrink-0 flex flex-col justify-between transition-all duration-200 ease-out select-none
        `}
      >
        <nav 
          className={`flex-1 overflow-y-auto ${isCollapsed ? "px-3 py-6 space-y-4" : "px-4 py-6 space-y-2"} text-sm font-medium`}
          style={{ scrollbarGutter: "stable" }}
        >
          {displayMenuItems.map((item) => {
            const isParentActive = activeTab === item.name;
            const ItemIcon = item.Icon;
            const isSubOpen = openSubMenus[item.id] || false;

            if (item.hasSub) {
              const isAnySubActive = item.subItems.some((sub) => sub.name === activeTab);

              return (
                <div key={item.id} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSubMenu(item.id)}
                    title={item.name}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                      isParentActive || isAnySubActive
                        ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                        : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ItemIcon className={`w-4.5 h-4.5 shrink-0 ${isParentActive || isAnySubActive ? "theme-accent" : "opacity-80"}`} />
                      {!isCollapsed && <span className="truncate text-[13px] font-medium tracking-wide leading-normal">{item.name}</span>}
                    </div>

                    {!isCollapsed && (
                      <ChevronIcon 
                        isOpen={isSubOpen} 
                        className="w-3.5 h-3.5 theme-text-secondary shrink-0 opacity-60" 
                      />
                    )}
                  </button>

                  {(isSubOpen || isCollapsed) && (
                    <div className={
                      isCollapsed 
                        ? "space-y-2 pt-1 flex flex-col items-center" 
                        : "pl-5 space-y-1.5 pt-1"
                    }>
                      {item.subItems.map((sub) => {
                        const isSubActive = activeTab === sub.name;
                        const SubIcon = sub.Icon;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectTab(sub.name)}
                            title={sub.name}
                            className={`w-full flex items-center gap-3.5 relative ${isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                              isSubActive
                                ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                                : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                            }`}
                          >
                            <SubIcon className={`w-4.5 h-4.5 shrink-0 ${isSubActive ? "theme-accent" : "opacity-80"}`} />
                            {!isCollapsed && (
                              <span className="truncate text-[13px] font-medium tracking-wide leading-normal">{sub.name}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = activeTab === item.name;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.name)}
                title={item.name}
                className={`w-full flex items-center ${isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"} rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? "theme-bg-elevated theme-text-primary font-semibold shadow-sm"
                    : "hover:theme-bg-sub theme-text-secondary hover:theme-text-primary"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <ItemIcon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "theme-accent" : "opacity-80"}`} />
                  {!isCollapsed && <span className="truncate text-[13px] font-medium tracking-wide leading-normal">{item.name}</span>}
                </div>
              </button>
            );
          })}
        </nav>

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
