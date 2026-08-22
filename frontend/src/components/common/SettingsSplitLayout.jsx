import React, { useState, useEffect, useRef } from "react";
import PageHeader from "../ui/PageHeader";
import { ChevronIcon, SearchIcon } from "../ui/Icons";

/**
 * Reusable Master-Detail Settings Layout Component
 * 
 * Behavior:
 * - Wide Containers (>= 740px): 2-Column Split View (Left list + Right settings pane).
 * - Compact Containers (< 740px / Mobile / Wide Right Drawer): Full-page Master List -> Full-page Detail View with "Back" button.
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
  // On compact view: false = show section list, true = show selected section detail
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

  const filteredSections = sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      (sec.description && sec.description.toLowerCase().includes(q))
    );
  });

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

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-5 font-sans text-left min-h-screen theme-text-primary animate-fade-in select-none min-w-0 ${className}`}
    >
      {/* ─── 1. Compact Container Mode (< 740px width or mobile) ──────── */}
      {isCompact ? (
        <div className="w-full space-y-4">
          {!showCompactDetail ? (
            /* State A: Full Width Section List */
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
                <div className="relative">
                  <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search settings..."
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-2xl border theme-border theme-bg-surface theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
                  />
                </div>
              )}

              <div className="rounded-2xl border theme-border theme-bg-surface divide-y theme-divide shadow-xs overflow-hidden">
                {filteredSections.map((sec) => {
                  const IconComp = sec.icon;
                  const isActive = sec.id === activeSection;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSection(sec.id)}
                      className={`w-full flex items-center justify-between p-3.5 transition-colors text-left cursor-pointer group active:opacity-80 ${
                        isActive ? "theme-bg-sub/80" : "hover:theme-bg-sub/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl theme-bg-sub theme-text-secondary group-hover:theme-accent group-hover:theme-bg-accent-soft shrink-0 transition-colors">
                          {IconComp && <IconComp className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold theme-text-primary truncate">
                              {sec.title}
                            </span>
                            {sec.badge !== undefined && sec.badge !== null && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold theme-bg-sub theme-text-secondary border theme-border">
                                {sec.badge}
                              </span>
                            )}
                          </div>
                          {sec.description && (
                            <p className="text-[11px] theme-text-secondary line-clamp-1 mt-0.5">
                              {sec.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronIcon className="w-4 h-4 theme-text-secondary shrink-0 group-hover:theme-text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
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
            <div className="flex flex-col w-60 lg:w-72 shrink-0 rounded-2xl border theme-border theme-bg-surface shadow-xs p-2.5 space-y-1.5 sticky top-4">
              {searchable && (
                <div className="relative mb-2 px-1">
                  <SearchIcon className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border theme-border theme-bg-sub theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
                  />
                </div>
              )}

              {filteredSections.map((sec) => {
                const isActive = sec.id === activeSection;
                const IconComp = sec.icon;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => onSectionChange(sec.id)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer group relative select-none ${
                      isActive
                        ? "theme-bg-accent theme-accent-text shadow-md font-semibold"
                        : "theme-bg-surface hover:theme-bg-sub/60 theme-text-primary"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isActive
                          ? "bg-white/20 theme-accent-text"
                          : "theme-bg-sub theme-text-secondary group-hover:theme-accent group-hover:theme-bg-accent-soft"
                      }`}
                    >
                      {IconComp && <IconComp className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isActive ? "theme-accent-text" : "theme-text-primary"}`}>
                          {sec.title}
                        </span>
                        {sec.badge !== undefined && sec.badge !== null && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                              isActive
                                ? "bg-white/25 theme-accent-text"
                                : "theme-bg-sub theme-text-secondary border theme-border"
                            }`}
                          >
                            {sec.badge}
                          </span>
                        )}
                      </div>
                      {sec.description && (
                        <p className={`text-[11px] line-clamp-1 mt-0.5 ${isActive ? "opacity-85" : "theme-text-secondary"}`}>
                          {sec.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
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
