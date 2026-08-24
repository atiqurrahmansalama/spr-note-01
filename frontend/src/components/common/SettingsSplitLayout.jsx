import React, { useState, useEffect, useRef } from "react";
import PageHeader from "../ui/PageHeader";
import { ChevronRightIcon } from "../ui/Icons";
import CustomInput from "../ui/CustomInput";

/**
 * Enterprise Modern Master-Detail Settings & Developer Tools Layout
 * 
 * Redesigned with clean grouped card lists, squircle icons, right chevron arrows,
 * and high-contrast theme typography matching the enterprise reference design.
 * 
 * Features:
 * - Wide Containers (>= 740px): 2-Column Split View (Left grouped card list + Right settings pane).
 * - Compact Containers (< 740px / Mobile / Wide Drawer): Full-width grouped list -> Full-width Detail View with Back navigation.
 * - Grouped category headers (e.g. Academic Structure, Admissions & Documents, System & Runtime).
 */
export default function SettingsSplitLayout({
  sections = [],
  activeSection,
  onSectionChange,
  title = "Settings",
  subtitle = "",
  headerIcon: HeaderIcon,
  children,
  actions = null,
  searchable = false,
  className = "",
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompactDetail, setShowCompactDetail] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = (entries) => {
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

  // Filter sections by search query if applicable
  const filteredSections = sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      (sec.group && sec.group.toLowerCase().includes(q))
    );
  });

  // Group sections by their `group` field
  const groupedSections = filteredSections.reduce((acc, sec) => {
    const groupName = sec.group || "";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(sec);
    return acc;
  }, {});

  const currentSectionObj = sections.find((s) => s.id === activeSection) || sections[0];

  const handleSelectSection = (secId) => {
    if (onSectionChange) onSectionChange(secId);
    if (isCompact) {
      setShowCompactDetail(true);
    }
  };

  const handleBackToList = () => {
    setShowCompactDetail(false);
  };

  /**
   * Helper to render clean grouped navigation cards matching the reference design
   */
  const renderNavigationGroups = (isMobile = false) => {
    const groupKeys = Object.keys(groupedSections);

    if (groupKeys.length === 0) {
      return (
        <div className="p-6 rounded-2xl border theme-border theme-bg-surface text-center">
          <p className="text-xs theme-text-secondary">No matching settings found</p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {groupKeys.map((groupName) => {
          const items = groupedSections[groupName];
          return (
            <div key={groupName || "default"} className="space-y-1.5">
              {groupName && (
                <div className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary px-1 select-none">
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
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-left transition-colors border-b theme-border last:border-b-0 cursor-pointer group select-none ${
                        isActive
                          ? "theme-bg-accent-soft"
                          : "hover:theme-bg-sub/60"
                      }`}
                    >
                      {/* Left: Theme-Colored Icon + Section Title */}
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {IconComp && (
                          <div className="shrink-0 flex items-center justify-center">
                            <IconComp
                              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors ${
                                isActive
                                  ? "theme-accent"
                                  : "theme-accent/75 group-hover:theme-accent"
                              }`}
                            />
                          </div>
                        )}

                        <div className="min-w-0">
                          <span
                            className={`text-xs sm:text-sm truncate block ${
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
                      <div className="flex items-center gap-2 shrink-0">
                        {sec.tag && (
                          <span className="text-xs theme-text-secondary font-medium">
                            {sec.tag}
                          </span>
                        )}

                        {sec.badge !== undefined && sec.badge !== null && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              isActive
                                ? "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                                : "theme-bg-sub theme-text-secondary border theme-border"
                            }`}
                          >
                            {sec.badge}
                          </span>
                        )}

                        <ChevronRightIcon
                          className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
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
                  onChange={(val) => setSearchQuery(val)}
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
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
            {/* Left Master Navigation List Panel */}
            <div className="w-64 lg:w-72 shrink-0 space-y-4 sticky top-4">
              {searchable && (
                <CustomInput
                  type="search"
                  value={searchQuery}
                  onChange={(val) => setSearchQuery(val)}
                  placeholder="Search..."
                />
              )}

              {renderNavigationGroups(false)}
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
}
