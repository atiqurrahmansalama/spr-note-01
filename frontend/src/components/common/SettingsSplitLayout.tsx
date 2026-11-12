import React, { useState, useEffect, useRef, useMemo } from "react";
import PageHeader from "../ui/PageHeader";
import { ChevronRightIcon } from "../ui/Icons";
import CustomInput from "../ui/CustomInput";

export interface SettingsSectionItem {
  id: string;
  group?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tag?: string;
  badge?: string | number;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
  [key: string]: any;
}

export interface SettingsSplitLayoutProps {
  sections?: SettingsSectionItem[];
  activeSection?: string | null;
  onSectionChange?: (sectionId: string | null) => void;
  onBackToMenu?: () => void;
  title?: string;
  subtitle?: string;
  headerIcon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  searchable?: boolean;
  className?: string;
}

/**
 * Enterprise Modern Master-Detail Settings & Developer Tools Layout
 * 
 * Features:
 * - Wide Containers (>= 740px): 2-Column Split View (Left grouped card list with separate, hidden-scrollbar scrolling + Right content pane).
 * - Compact Containers (< 740px / Mobile / Wide Drawer): Full-width grouped list -> Full-width Detail View with Back navigation.
 * - Grouped category headers (e.g. Academic Structure, Admissions & Documents, System & Runtime).
 * - Independent scrollable left navigation menu with hidden scrollbar cross-browser.
 */
export const SettingsSplitLayout: React.FC<SettingsSplitLayoutProps> = ({
  sections = [],
  activeSection = null,
  onSectionChange,
  onBackToMenu,
  title = "Settings",
  subtitle = "",
  headerIcon: HeaderIcon,
  children,
  actions = null,
  searchable = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCompactDetailLocal, setShowCompactDetailLocal] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompact = containerWidth < 740;

  // On compact/mobile (<740px): show detail view if activeSection is explicitly provided or locally toggled
  const showCompactDetail = isCompact && (Boolean(activeSection) || showCompactDetailLocal);

  // Filter sections by search query if applicable
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        (sec.group && sec.group.toLowerCase().includes(q))
    );
  }, [sections, searchQuery]);

  // Group sections by their `group` field
  const groupedSections = useMemo(() => {
    return filteredSections.reduce<Record<string, SettingsSectionItem[]>>((acc, sec) => {
      const groupName = sec.group || "";
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(sec);
      return acc;
    }, {});
  }, [filteredSections]);

  const currentSectionObj = useMemo(() => {
    return (
      sections.find((s) => s.id === (activeSection || sections[0]?.id)) ||
      sections[0]
    );
  }, [sections, activeSection]);

  const handleSelectSection = (secId: string) => {
    setShowCompactDetailLocal(true);
    if (onSectionChange) onSectionChange(secId);
  };

  const handleBackToList = () => {
    setShowCompactDetailLocal(false);
    if (onBackToMenu) {
      onBackToMenu();
    } else if (onSectionChange) {
      onSectionChange(null);
    }
  };

  /**
   * Helper to render clean grouped navigation cards matching the reference design
   */
  const renderNavigationGroups = (_isMobile = false) => {
    const groupKeys = Object.keys(groupedSections);

    if (groupKeys.length === 0) {
      return (
        <div className="p-6 rounded-3xl theme-bg-surface shadow-xs border-0 text-center">
          <p className="text-xs theme-text-secondary">No matching settings found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groupKeys.map((groupName) => {
          const items = groupedSections[groupName];
          return (
            <div key={groupName || "default"} className="space-y-1.5">
              {groupName && (
                <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary px-2 select-none">
                  {groupName}
                </div>
              )}

              <div className="rounded-3xl theme-bg-surface shadow-xs p-1.5 space-y-1 border-0">
                {items.map((sec) => {
                  const isActive = sec.id === activeSection;
                  const IconComp = sec.icon;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSection(sec.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all cursor-pointer group select-none border-0 ${
                        isActive
                          ? "theme-bg-accent-soft theme-accent font-bold shadow-2xs"
                          : "hover:theme-bg-elevated/60 theme-text-secondary hover:theme-text-primary"
                      }`}
                    >
                      {/* Left: Theme-Colored Icon + Section Title */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {IconComp && (
                          <div className="shrink-0 flex items-center justify-center">
                            <IconComp
                              className={`w-4 h-4 transition-colors ${
                                isActive
                                  ? "theme-accent"
                                  : "theme-accent/75 group-hover:theme-accent"
                              }`}
                            />
                          </div>
                        )}

                        <div className="min-w-0">
                          <span
                            className={`text-xs truncate block ${
                              isActive
                                ? "theme-accent font-bold"
                                : "theme-text-primary font-medium group-hover:theme-text-primary"
                            }`}
                          >
                            {sec.title}
                          </span>
                        </div>
                      </div>

                      {/* Right: Optional tag/value & Chevron Right Arrow */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sec.tag && (
                          <span className="text-[11px] theme-text-secondary font-medium">
                            {sec.tag}
                          </span>
                        )}

                        {sec.badge !== undefined && sec.badge !== null && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                              isActive
                                ? "theme-bg-accent-soft theme-accent"
                                : "theme-bg-elevated/70 theme-text-secondary"
                            }`}
                          >
                            {sec.badge}
                          </span>
                        )}

                        <ChevronRightIcon
                          className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                            isActive
                              ? "theme-accent"
                              : "theme-text-secondary group-hover:theme-text-primary"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-7xl mx-auto py-3 sm:py-5 px-3 sm:px-6 space-y-5 font-sans text-left theme-text-primary animate-fade-in select-none min-w-0 ${
        isCompact ? "pb-16" : "h-full min-h-0 flex flex-col"
      } ${className}`}
    >
      {/* ─── 1. Compact Container Mode (< 740px width or mobile) ──────── */}
      {isCompact ? (
        <div className="w-full space-y-4">
          {!showCompactDetail ? (
            /* State A: Full Width Grouped Section List */
            <div className="space-y-4 animate-fade-in">
              {title && (
                <PageHeader
                  icon={HeaderIcon}
                  title={title}
                  subtitle={subtitle}
                  actions={actions}
                />
              )}

              {searchable && (
                <CustomInput
                  type="search"
                  value={searchQuery}
                  onChange={(val: any) => setSearchQuery(val)}
                  placeholder="Search settings..."
                />
              )}

              {renderNavigationGroups(true)}
            </div>
          ) : (
            /* State B: Full Width Detail View */
            <div className="w-full min-w-0 animate-fade-in">
              {children}
            </div>
          )}
        </div>
      ) : (
        /* ─── 2. Wide Split-Panel Layout (>= 740px width) ─────────────── */
        <div className="w-full flex-1 min-h-0 flex flex-col space-y-5">
          {title && (
            <div className="shrink-0">
              <PageHeader
                icon={HeaderIcon}
                title={title}
                subtitle={subtitle}
                actions={actions}
              />
            </div>
          )}

          <div className="flex flex-row items-stretch gap-5 lg:gap-6 w-full min-w-0 flex-1 min-h-0">
            {/* Left Master Navigation List Panel (Independent Full-Height Scroll) */}
            <div className="w-64 lg:w-72 xl:w-80 shrink-0 h-full min-h-0 flex flex-col">
              {searchable && (
                <div className="pb-3 shrink-0">
                  <CustomInput
                    type="search"
                    value={searchQuery}
                    onChange={(val: any) => setSearchQuery(val)}
                    placeholder="Search settings..."
                  />
                </div>
              )}

              {/* Independently scrollable menu container without visible scrollbar */}
              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 pb-10 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:bg-transparent"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {renderNavigationGroups(false)}
              </div>
            </div>

            {/* Right Detail Configuration Content Area (Independent Scroll) */}
            <div className="flex-1 min-w-0 w-full h-full min-h-0 overflow-y-auto overscroll-contain pb-16 pr-0.5 animate-fade-in">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsSplitLayout;
