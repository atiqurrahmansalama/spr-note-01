import React, { useState, useEffect, useRef } from "react";
import PageHeader from "../ui/PageHeader";
import DataTable from "../ui/DataTable";
import { ChevronIcon, SearchIcon } from "../ui/Icons";

/**
 * Reusable Master-Detail Settings Layout Component
 * 
 * Behavior:
 * - Wide Containers (>= 740px): 2-Column Split View (Left list powered by compact DataTable + Right settings pane).
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
    return sec.title.toLowerCase().includes(q);
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
            /* State A: Full Width Section List via DataTable */
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
                    className="w-full text-sm pl-10 pr-3.5 py-2 rounded-2xl border theme-border theme-bg-surface theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
                  />
                </div>
              )}

              <div className="rounded-2xl border theme-border theme-bg-surface shadow-xs overflow-hidden">
                <DataTable
                  hideHeader={true}
                  compact={true}
                  cellPaddingClass="py-2.5 px-3.5"
                  data={filteredSections}
                  keyExtractor={(sec) => sec.id}
                  onRowClick={(sec) => handleSelectSection(sec.id)}
                  wrapperClassName="border-0 rounded-none shadow-none theme-bg-surface"
                  tableClassName="w-full"
                  rowClassName={(sec) =>
                    sec.id === activeSection
                      ? "theme-bg-accent-soft font-semibold"
                      : "hover:theme-bg-sub/60"
                  }
                  columns={[
                    {
                      key: "section",
                      header: "Section",
                      render: (sec) => {
                        const IconComp = sec.icon;
                        const isActive = sec.id === activeSection;

                        return (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isActive
                                    ? "theme-bg-accent theme-accent-text"
                                    : "theme-bg-sub theme-text-secondary"
                                }`}
                              >
                                {IconComp && <IconComp className="w-3.5 h-3.5" />}
                              </div>
                              <span
                                className={`text-xs truncate ${
                                  isActive ? "theme-accent font-bold" : "theme-text-primary font-medium"
                                }`}
                              >
                                {sec.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
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
                              <ChevronIcon className="w-4 h-4 theme-text-secondary" />
                            </div>
                          </div>
                        );
                      },
                    },
                  ]}
                />
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
            {/* Left Master Navigation List Panel powered by Compact DataTable */}
            <div className="flex flex-col w-56 lg:w-64 shrink-0 rounded-2xl border theme-border theme-bg-surface shadow-xs p-1.5 sticky top-4 overflow-hidden">
              {searchable && (
                <div className="relative mb-1.5 px-1">
                  <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full text-xs pl-7.5 pr-2.5 py-1.5 rounded-xl border theme-border theme-bg-sub theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
                  />
                </div>
              )}

              <DataTable
                hideHeader={true}
                compact={true}
                cellPaddingClass="py-2 px-2.5"
                data={filteredSections}
                keyExtractor={(sec) => sec.id}
                onRowClick={(sec) => onSectionChange(sec.id)}
                wrapperClassName="border-0 rounded-none shadow-none theme-bg-surface"
                tableClassName="w-full"
                rowClassName={(sec) =>
                  sec.id === activeSection
                    ? "theme-bg-accent-soft font-semibold rounded-xl"
                    : "hover:theme-bg-sub/60 rounded-xl"
                }
                columns={[
                  {
                    key: "section",
                    header: "Section",
                    render: (sec) => {
                      const isActive = sec.id === activeSection;
                      const IconComp = sec.icon;

                      return (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                  ? "theme-bg-accent theme-accent-text"
                                  : "theme-bg-sub theme-text-secondary"
                              }`}
                            >
                              {IconComp && <IconComp className="w-3.5 h-3.5" />}
                            </div>
                            <span
                              className={`text-xs truncate ${
                                isActive ? "theme-accent font-bold" : "theme-text-primary font-medium"
                              }`}
                            >
                              {sec.title}
                            </span>
                          </div>

                          {sec.badge !== undefined && sec.badge !== null && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                                isActive
                                  ? "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                                  : "theme-bg-sub theme-text-secondary border theme-border"
                              }`}
                            >
                              {sec.badge}
                            </span>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
              />
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
