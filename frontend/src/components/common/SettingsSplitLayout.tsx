import React, { useState, useEffect, useRef, useMemo } from "react";
import PageHeader from "../ui/PageHeader";
import { ChevronRightIcon, ChevronLeftIcon } from "../ui/Icons";
import CustomInput from "../ui/CustomInput";

export interface SettingsSectionItem {
  id: string;
  group?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tag?: string;
  badge?: string | number;
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
        <div className="p-6 rounded-2xl border theme-border theme-bg-surface text-center">
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
                <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary px-1 select-none">
                  {groupName}
                </div>
              )}

              <div className="rounded-2xl border theme-border theme-bg-surface shadow-xs overflow-hidden">
                {items.map((sec) => {
                  const isActive = sec.id === activeSection;
                  const IconComp = sec.icon;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSection(sec.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b theme-border last:border-b-0 cursor-pointer group select-none ${
                        isActive
                          ? "theme-bg-accent-soft"
                          : "hover:theme-bg-sub/60"
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
                                ? "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                                : "theme-bg-sub theme-text-secondary border theme-border"
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
      className={`w-full max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-5 font-sans text-left min-h-screen theme-text-primary animate-fade-in select-none min-w-0 ${className}`}
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
            /* State B: Full Width Detail View with Back Button */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between gap-3 pb-3 border-b theme-border">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex items-center gap-1.5 text-xs font-bold theme-accent hover:underline cursor-pointer"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Back to Menu</span>
                </button>

                {currentSectionObj && (
                  <span className="text-xs font-bold theme-text-primary truncate">
                    {currentSectionObj.title}
                  </span>
                )}
              </div>

              <div className="w-full min-w-0">
                {children}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── 2. Wide Split-Panel Layout (>= 740px width) ─────────────── */
        <div className="w-full space-y-6">
          {title && (
            <PageHeader
              icon={HeaderIcon}
              title={title}
              subtitle={subtitle}
              actions={actions}
            />
          )}

          <div className="flex flex-row items-start gap-5 lg:gap-6 w-full min-w-0">
            {/* Left Master Navigation List Panel (Separate Independent Scroll with Hidden Scrollbar) */}
            <div className="w-64 lg:w-72 xl:w-80 shrink-0 sticky top-20 flex flex-col max-h-[calc(100vh-6.5rem)]">
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
                className="flex-1 overflow-y-auto pr-1 pb-6 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:bg-transparent"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {renderNavigationGroups(false)}
              </div>
            </div>

            {/* Right Detail Configuration Content Area */}
            <div className="flex-1 min-w-0 w-full animate-fade-in">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsSplitLayout;
