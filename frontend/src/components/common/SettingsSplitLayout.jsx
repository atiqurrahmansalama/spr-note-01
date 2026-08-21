import React, { useState, useEffect } from "react";
import PageHeader from "../ui/PageHeader";
import { ChevronIcon, SearchIcon } from "../ui/Icons";

/**
 * Reusable Master-Detail Settings Layout Component
 * 
 * Behavior:
 * - Large Screens (md+): 2-Column Split View (Left list + Right settings pane).
 * - Small Screens (<md): Full-page Master List -> Full-page Detail View with "Back" button.
 * 
 * @param {Array<{id: string, title: string, description?: string, icon?: React.ComponentType, badge?: string|number}>} sections
 * @param {string} activeSection - Current active section id
 * @param {Function} onSectionChange - Callback when switching sections
 * @param {string} title - Page Header Title
 * @param {string} subtitle - Page Header Subtitle
 * @param {React.ComponentType} headerIcon - Icon for the PageHeader
 * @param {React.ReactNode} children - Active section content
 * @param {React.ReactNode} actions - Optional actions in PageHeader
 * @param {boolean} searchable - Show search input in section list
 * @param {string} className - Additional CSS classes
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
  const [searchQuery, setSearchQuery] = useState("");
  // On mobile: false = show full section list, true = show selected section full page
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const filteredSections = sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      (sec.description && sec.description.toLowerCase().includes(q))
    );
  });

  const currentSectionObj = sections.find((s) => s.id === activeSection) || sections[0];

  const handleMobileSelectSection = (secId) => {
    if (onSectionChange) onSectionChange(secId);
    setShowMobileDetail(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToMobileList = () => {
    setShowMobileDetail(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`w-full max-w-7xl mx-auto py-5 sm:py-6 px-4 sm:px-6 space-y-6 font-sans text-left min-h-screen theme-text-primary animate-fade-in select-none ${className}`}>
      
      {/* ─── 1. Desktop Page Header (md+ screens) ─────────────────── */}
      <div className="hidden md:block print:hidden">
        {title && (
          <PageHeader
            icon={HeaderIcon}
            title={title}
            subtitle={subtitle}
            actions={actions}
          />
        )}
      </div>

      {/* ─── 2. Mobile View (< md screens) ────────────────────────── */}
      <div className="block md:hidden print:hidden">
        
        {/* Mobile View State A: Full Page Section List */}
        {!showMobileDetail && (
          <div className="space-y-4 animate-fade-in">
            {/* Mobile Header Overview */}
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

            {/* Mobile List Cards */}
            <div className="space-y-3 pt-1">
              {filteredSections.map((sec) => {
                const IconComp = sec.icon;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleMobileSelectSection(sec.id)}
                    className="w-full p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs active:scale-[0.98] transition-all flex items-center justify-between gap-3 text-left cursor-pointer group hover:theme-bg-sub/60"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {IconComp && (
                        <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 group-hover:scale-105 transition-transform">
                          <IconComp className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold theme-text-primary tracking-tight truncate">
                            {sec.title}
                          </span>
                          {sec.badge !== undefined && sec.badge !== null && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold theme-bg-accent theme-accent-text">
                              {sec.badge}
                            </span>
                          )}
                        </div>
                        {sec.description && (
                          <p className="text-xs theme-text-secondary mt-0.5 line-clamp-2">
                            {sec.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-1 rounded-lg theme-text-secondary group-hover:theme-accent shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile View State B: Full Page Selected Detail View with Back Button */}
        {showMobileDetail && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <button
                type="button"
                onClick={handleBackToMobileList}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub theme-text-primary text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                {currentSectionObj?.icon && (
                  <div className="p-1.5 rounded-lg theme-bg-accent-soft theme-accent shrink-0">
                    <currentSectionObj.icon className="w-3.5 h-3.5" />
                  </div>
                )}
                <span className="text-xs font-bold theme-text-primary">
                  {currentSectionObj?.title}
                </span>
              </div>
            </div>

            {/* Mobile Full Page Detail Content */}
            <div className="w-full">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. Desktop Split-Panel Grid Layout (md+ screens) ──────── */}
      <div className="hidden md:flex flex-row items-start gap-6 w-full">
        
        {/* Left Master Navigation List Panel */}
        <div className="flex flex-col w-72 lg:w-80 shrink-0 rounded-2xl border theme-border theme-bg-surface shadow-xs p-3 space-y-1.5 sticky top-6">
          
          {searchable && (
            <div className="relative mb-2 px-1">
              <SearchIcon className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary placeholder:theme-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
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
                className={`w-full flex items-start gap-3.5 p-3 rounded-xl transition-all text-left cursor-pointer group relative select-none ${
                  isActive
                    ? "theme-bg-accent text-white shadow-md font-semibold"
                    : "theme-bg-surface hover:theme-bg-sub/60 theme-text-primary"
                }`}
              >
                {/* Icon */}
                <div
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "theme-bg-sub theme-text-secondary group-hover:theme-accent group-hover:theme-bg-accent-soft"
                  }`}
                >
                  {IconComp && <IconComp className="w-4 h-4" />}
                </div>

                {/* Title & Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${isActive ? "text-white" : "theme-text-primary"}`}>
                      {sec.title}
                    </span>
                    {sec.badge !== undefined && sec.badge !== null && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          isActive
                            ? "bg-white/25 text-white"
                            : "theme-bg-sub theme-text-secondary border theme-border"
                        }`}
                      >
                        {sec.badge}
                      </span>
                    )}
                  </div>
                  {sec.description && (
                    <p className={`text-[11px] line-clamp-2 mt-0.5 ${isActive ? "text-white/80" : "theme-text-secondary"}`}>
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
  );
}
