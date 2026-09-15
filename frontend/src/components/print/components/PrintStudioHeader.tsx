import React from 'react';
import FullscreenButton from '../../ui/FullscreenButton';
import PrintExportMenu from '../PrintExportMenu';
import {
  ZoomInIcon,
  ZoomOutIcon,
  SidebarRightIcon,
  UndoIcon,
  RedoIcon,
  CloseIcon,
  FileIcon,
} from '../../ui/Icons';
import { PrintOptions, PrintColumn, PrintMetaItem, PrintSummaryMetric } from '../types';

interface PrintStudioHeaderProps {
  title: string;
  subtitle?: string;
  totalPages: number;
  pageSize?: string;
  orientation?: string;
  onOpenDocxModal: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onClose: () => void;
  // Export Props
  options: PrintOptions;
  liveMetaItems: PrintMetaItem[];
  liveSummaryMetrics: PrintSummaryMetric[];
  liveColumns: PrintColumn[];
  visibleColumnKeys: string[];
  extraBlankRows: number;
  liveData: Array<Record<string, any>>;
  showPrint?: boolean;
  showPDF?: boolean;
  showExcel?: boolean;
  showTxt?: boolean;
  showWord?: boolean;
  showImages?: boolean;
  showPng?: boolean;
  showJpg?: boolean;
  enabledFormats?: Record<string, boolean>;
  onPrint?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onExportTxt?: () => void;
  onExportWord?: () => void;
  onExportPng?: () => void;
  onExportJpg?: () => void;
}

/**
 * PrintStudioHeader
 * Master Top Action Toolbar for Universal Print Studio.
 * Houses branding, document metadata badges, Word import, Undo/Redo,
 * Zoom controls, Universal Export menu, Fullscreen toggle, and Sidebar toggler.
 */
export const PrintStudioHeader: React.FC<PrintStudioHeaderProps> = ({
  title,
  subtitle,
  totalPages,
  pageSize = 'A4',
  orientation = 'PORTRAIT',
  onOpenDocxModal,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen,
  toggleFullscreen,
  isSidebarOpen,
  onToggleSidebar,
  onClose,
  options,
  liveMetaItems,
  liveSummaryMetrics,
  liveColumns,
  visibleColumnKeys,
  extraBlankRows,
  liveData,
  showPrint,
  showPDF,
  showExcel,
  showTxt,
  showWord,
  showImages,
  showPng,
  showJpg,
  enabledFormats,
  onPrint,
  onExportPDF,
  onExportExcel,
  onExportCsv,
  onExportTxt,
  onExportWord,
  onExportPng,
  onExportJpg,
}) => {
  return (
    <header className="px-4 py-2.5 border-b theme-border theme-bg-surface flex items-center justify-between shrink-0 shadow-xs print-topbar-control print-studio-no-print">
      {/* Left: Branding & Document Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
          SPR
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold theme-text-primary text-base tracking-tight truncate leading-tight">
              Print Studio
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold theme-bg-sub theme-text-secondary border theme-border uppercase">
              {totalPages > 1 ? `${totalPages} Pages • ` : ''}
              {pageSize} • {orientation}
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold theme-bg-accent/10 theme-accent border border-[var(--accent-main)]/20">
              Live Canvas • Click to Edit
            </span>
          </div>
          <p className="text-xs theme-text-secondary truncate leading-tight">
            {title} {subtitle ? `— ${subtitle}` : ''}
          </p>
        </div>
      </div>

      {/* Center: Interactive Undo/Redo, Zoom Controller, and Word (.docx) Ingestion */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Import Word Template Action */}
        <button
          type="button"
          onClick={onOpenDocxModal}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl theme-bg-sub/80 border theme-border theme-text-primary hover:theme-accent hover:border-[var(--accent-main)]/50 transition-all cursor-pointer shadow-2xs text-xs font-bold"
          title="Import Microsoft Word (.docx) Document or Template"
        >
          <FileIcon className="w-3.5 h-3.5 theme-accent" />
          <span>Import Word (.docx)</span>
        </button>

        {/* Undo / Redo Actions */}
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-2xl theme-bg-sub/80 border theme-border shadow-2xl">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo print setting change (Ctrl+Z)"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              canUndo
                ? 'theme-text-primary hover:theme-accent hover:theme-bg-elevated'
                : 'theme-text-muted/40 opacity-40 cursor-not-allowed'
            }`}
          >
            <UndoIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo print setting change (Ctrl+Y / Ctrl+Shift+Z)"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              canRedo
                ? 'theme-text-primary hover:theme-accent hover:theme-bg-elevated'
                : 'theme-text-muted/40 opacity-40 cursor-not-allowed'
            }`}
          >
            <RedoIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl theme-bg-sub/80 border theme-border shadow-2xs">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <ZoomOutIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className="px-2 py-0.5 text-xs font-mono font-bold theme-text-primary hover:theme-accent transition-colors cursor-pointer"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <ZoomInIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Actions (Export Dropdown Menu, Fullscreen, Sidebar Toggle, Close) */}
      <div className="flex items-center gap-2">
        <FullscreenButton
          isFullscreen={isFullscreen}
          onToggle={toggleFullscreen}
          size="sm"
          className="hidden md:inline-flex"
        />

        {/* Master Universal Export Button & Dropdown Menu */}
        <PrintExportMenu
          title={title}
          subtitle={subtitle}
          metaItems={liveMetaItems}
          summaryMetrics={liveSummaryMetrics}
          options={options}
          columns={liveColumns}
          visibleColumnKeys={visibleColumnKeys}
          extraBlankRows={extraBlankRows}
          data={liveData}
          showPrint={showPrint}
          showPDF={showPDF}
          showExcel={showExcel}
          showTxt={showTxt}
          showWord={showWord}
          showImages={showImages}
          showPng={showPng}
          showJpg={showJpg}
          enabledFormats={enabledFormats}
          onPrint={onPrint}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onExportCsv={onExportCsv}
          onExportTxt={onExportTxt}
          onExportWord={onExportWord}
          onExportPng={onExportPng}
          onExportJpg={onExportJpg}
          pageSize={options.pageSize}
          orientation={options.orientation}
          margin={options.margin}
        />

        {/* Right Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
            isSidebarOpen
              ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 shadow-xs'
              : 'theme-bg-sub theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
          }`}
          title={isSidebarOpen ? 'Hide Settings Sidebar (Ctrl + B)' : 'Show Settings Sidebar (Ctrl + B)'}
          aria-label="Toggle Settings Sidebar"
        >
          <SidebarRightIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close Print Studio (Esc)"
          className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center justify-center text-sm font-bold ml-1"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
