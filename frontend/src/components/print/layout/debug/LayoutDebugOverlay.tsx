/**
 * LayoutDebugOverlay
 * Developer inspection UI panel for internal DocLab Layout Debug Mode.
 *
 * Displays exact page metrics (Physical dimensions, Margins, Content bounds,
 * Used height, Remaining height) and discrete layout fragments (Block ID,
 * Fragment index, Height, Page index) to make pagination bugs fully diagnosable.
 */

import React, { useState } from 'react';
import { LayoutDebugTrace, PageDebugMetrics, PageDebugFragmentInfo } from './layoutDebugTypes';

export interface LayoutDebugOverlayProps {
  debugTrace?: LayoutDebugTrace | null;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const LayoutDebugOverlay: React.FC<LayoutDebugOverlayProps> = ({
  debugTrace,
  isOpen = false,
  onClose,
  className = '',
}) => {
  const [activePageIndex, setActivePageIndex] = useState<number | 'ALL'>('ALL');
  const [filterQuery, setFilterQuery] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDecisionsTrace, setShowDecisionsTrace] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  if (!isOpen || !debugTrace) return null;

  const pageMetricsList: PageDebugMetrics[] = Object.values(debugTrace.pages).sort(
    (a, b) => a.pageIndex - b.pageIndex
  );

  const totalPages = debugTrace.totalPages || pageMetricsList.length || 1;
  const pageIndices = pageMetricsList.map((p) => p.pageIndex);

  // Filter pages according to active tab
  const filteredPages = pageMetricsList.filter((p) => {
    if (activePageIndex !== 'ALL' && p.pageIndex !== activePageIndex) return false;
    return true;
  });

  // Copy debug summary to clipboard
  const handleCopySummary = () => {
    const lines: string[] = [];
    lines.push(`=== DOCLAB LAYOUT DEBUG REPORT ===`);
    lines.push(`Document ID: ${debugTrace.documentId}`);
    lines.push(`Total Pages: ${debugTrace.totalPages}`);
    lines.push(`Calculation Duration: ${debugTrace.totalDurationMs}ms\n`);

    pageMetricsList.forEach((page) => {
      lines.push(`PAGE ${page.pageNumber}`);
      lines.push(`Physical:\n${page.physicalWidthPx} × ${page.physicalHeightPx}\n`);
      lines.push(`Margins:\n${page.margins.top} / ${page.margins.right} / ${page.margins.bottom} / ${page.margins.left}\n`);
      lines.push(`Content:\n${page.contentAreaWidthPx} × ${page.contentAreaHeightPx}\n`);
      lines.push(`Used:\n${page.usedHeightPx}\n`);
      lines.push(`Remaining:\n${page.remainingHeightPx}\n`);
      lines.push(`Fragments (${page.fragments?.length || 0}):`);
      (page.fragments || []).forEach((frag) => {
        lines.push(`  ${frag.name}`);
        if (frag.fragmentIndex !== undefined) {
          lines.push(`  fragment ${frag.fragmentIndex}`);
        }
        lines.push(`  height: ${frag.heightPx}px`);
        lines.push(`  page: ${frag.pageNumber}\n`);
      });
      lines.push(`----------------------------------------\n`);
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    }
  };

  return (
    <aside
      aria-label="Layout Debug Inspector"
      className={`fixed bottom-4 right-4 z-50 flex flex-col font-mono text-xs shadow-2xl rounded-2xl border border-slate-700 bg-slate-900/95 text-slate-100 backdrop-blur-md overflow-hidden transition-all duration-200 print:hidden ${
        isMinimized ? 'w-84 h-12' : 'w-[520px] max-w-[94vw] h-[640px] max-h-[88vh]'
      } ${className}`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {/* 1. Top Header Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-extrabold text-slate-100 uppercase tracking-wider text-[11.5px] truncate">
            Layout Debug Inspector
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10.5px] font-bold border border-indigo-500/30 shrink-0">
            {totalPages} {totalPages === 1 ? 'Page' : 'Pages'} &bull; {debugTrace.totalDurationMs}ms
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all cursor-pointer"
            title="Copy Layout Diagnostic Summary"
          >
            {copiedStatus ? '✓ Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer text-xs"
            title={isMinimized ? 'Expand Inspector' : 'Minimize Inspector'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all cursor-pointer text-xs ml-1"
              title="Close Debug Inspector"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {!isMinimized && (
        <div className="flex flex-col flex-1 min-h-0 bg-slate-950/50">
          {/* 2. Controls Bar: Page Filter Tabs & Search */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2 shrink-0">
            {/* Page Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                type="button"
                onClick={() => setActivePageIndex('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  activePageIndex === 'ALL'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Pages ({totalPages})
              </button>
              {pageIndices.map((pIdx) => (
                <button
                  key={`tab_page_${pIdx}`}
                  type="button"
                  onClick={() => setActivePageIndex(pIdx)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    activePageIndex === pIdx
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Page {pIdx + 1}
                </button>
              ))}
            </div>

            {/* Quick Search and Toggle Trace */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter fragments (e.g. paragraph-12, table)..."
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowDecisionsTrace(!showDecisionsTrace)}
                className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer shrink-0 ${
                  showDecisionsTrace
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Toggle Decision Events Trace"
              >
                Decisions ({debugTrace.allDecisions.length})
              </button>
            </div>
          </div>

          {/* 3. Main Body Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0">
            {filteredPages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No layout data available for the selected view.
              </div>
            ) : (
              filteredPages.map((page) => {
                const usedPercentage = Math.min(
                  100,
                  Math.round((page.usedHeightPx / (page.contentAreaHeightPx || 1)) * 100)
                );

                const fragments = (page.fragments || []).filter((f) => {
                  if (!filterQuery) return true;
                  const q = filterQuery.toLowerCase();
                  return (
                    f.name.toLowerCase().includes(q) ||
                    f.type.toLowerCase().includes(q) ||
                    (f.fragmentLabel && f.fragmentLabel.toLowerCase().includes(q))
                  );
                });

                return (
                  <div
                    key={`debug_page_card_${page.pageIndex}`}
                    className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-900/90 text-left shadow-md space-y-3"
                  >
                    {/* Page Title & Capacity Bar */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-400 text-sm tracking-wider uppercase">
                          PAGE {page.pageNumber}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-semibold">
                          ({page.fragmentsCount} {page.fragmentsCount === 1 ? 'Fragment' : 'Fragments'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10.5px] font-bold ${
                            page.remainingHeightPx < 20
                              ? 'text-red-400'
                              : page.remainingHeightPx < 100
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {usedPercentage}% Used
                        </span>
                      </div>
                    </div>

                    {/* Page Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 text-[11px] leading-relaxed">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold">Physical</div>
                        <div className="font-semibold text-slate-100">
                          {page.physicalWidthPx} × {page.physicalHeightPx}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold">Margins</div>
                        <div className="font-semibold text-slate-100">
                          {page.margins.top} / {page.margins.right} / {page.margins.bottom} / {page.margins.left}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold">Content</div>
                        <div className="font-semibold text-slate-100">
                          {page.contentAreaWidthPx} × {page.contentAreaHeightPx}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold">Used</div>
                        <div className="font-bold text-amber-300">
                          {page.usedHeightPx}px
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold">Remaining</div>
                        <div
                          className={`font-bold ${
                            page.remainingHeightPx < 20
                              ? 'text-red-400'
                              : page.remainingHeightPx < 100
                              ? 'text-amber-300'
                              : 'text-emerald-400'
                          }`}
                        >
                          {page.remainingHeightPx}px
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wide font-bold">Capacity</div>
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usedPercentage > 95
                                ? 'bg-red-500'
                                : usedPercentage > 80
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${usedPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fragments Breakdown */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>For each fragment:</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {fragments.length} displayed
                        </span>
                      </div>

                      {fragments.length === 0 ? (
                        <div className="p-2 text-center text-slate-500 text-[11px] bg-slate-950/40 rounded">
                          No matching fragments on this page.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {fragments.map((frag, fIdx) => (
                            <div
                              key={`frag_${frag.id}_${fIdx}`}
                              className={`p-2.5 rounded-lg border text-[11.5px] transition-all flex flex-col gap-1 ${
                                frag.fragmentIndex !== undefined
                                  ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white tracking-wide">
                                  {frag.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {frag.fragmentIndex !== undefined && (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-purple-500/30 text-purple-300 border border-purple-500/40">
                                      fragment {frag.fragmentIndex}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                    {frag.type}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] pt-0.5">
                                <div>
                                  <span>height: </span>
                                  <span className="font-bold text-slate-100">{frag.heightPx}px</span>
                                </div>
                                <div>
                                  <span>page: </span>
                                  <span className="font-bold text-blue-400">{frag.pageNumber}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* 4. Optional Decisions Trace Stream */}
            {showDecisionsTrace && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <span className="font-bold text-amber-300 text-xs uppercase tracking-wider">
                    Layout Decisions Trace ({debugTrace.allDecisions.length})
                  </span>
                  <span className="text-[10.5px] text-amber-400/80">Low-Level Events</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {debugTrace.allDecisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-bold text-blue-400">Page {decision.pageNumber}</span>
                        <span className="text-[10px] font-bold uppercase text-amber-400">
                          {decision.decision}
                        </span>
                      </div>
                      <div className="text-slate-400 break-all">{decision.blockId}</div>
                      <div className="flex justify-between text-[10.5px] text-slate-400">
                        <span>Measured: {decision.measuredHeightPx}px</span>
                        <span>Available: {decision.availableHeightPx}px</span>
                        <span>Break: {decision.breakType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default LayoutDebugOverlay;
