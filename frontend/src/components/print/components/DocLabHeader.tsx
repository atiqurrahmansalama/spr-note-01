import React from 'react';
import FullscreenButton from '../../ui/FullscreenButton';
import IconButton from '../../ui/IconButton';
import DocLabExportMenu from '../DocLabExportMenu';
import {
  SidebarRightIcon,
  CloseIcon,
} from '../../ui/Icons';
import { PrintOptions, PrintColumn, PrintMetaItem, PrintSummaryMetric } from '../types';

export interface DocLabHeaderProps {
  title: string;
  subtitle?: string;
  totalPages: number;
  pageSize?: string;
  orientation?: string;
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
  showSvg?: boolean;
  enabledFormats?: string[] | null | any;
  onPrint?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onExportTxt?: () => void;
  onExportWord?: () => void;
  onExportPng?: () => void;
  onExportJpg?: () => void;
  onExportSvg?: () => void;
}

/**
 * DocLabHeader
 * Master Top Action Toolbar for DocLab (Universal Print & Document Studio).
 * Houses branding, document metadata badges, Word import, Undo/Redo,
 * Zoom controls, Universal Export menu, Fullscreen toggle, and Sidebar toggler.
 */
export const DocLabHeader: React.FC<DocLabHeaderProps> = ({
  title,
  subtitle,
  totalPages,
  pageSize = 'A4',
  orientation = 'PORTRAIT',
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
  showSvg = true,
  enabledFormats,
  onPrint,
  onExportPDF,
  onExportExcel,
  onExportCsv,
  onExportTxt,
  onExportWord,
  onExportPng,
  onExportJpg,
  onExportSvg,
}) => {
  return (
    <header className="px-4 py-2.5 border-b theme-border theme-bg-surface flex items-center justify-between shrink-0 shadow-xs print-topbar-control print-studio-no-print">
      {/* Left: Branding & Document Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
          DOC
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold theme-text-primary text-base tracking-tight truncate leading-tight">
              DocLab
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

      {/* Center: Live Status / Info */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium theme-bg-sub/80 theme-text-secondary border theme-border">
          <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
          Interactive Artboard
        </span>
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
        <DocLabExportMenu
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
          showSvg={showSvg}
          enabledFormats={enabledFormats}
          onPrint={onPrint}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onExportCsv={onExportCsv}
          onExportTxt={onExportTxt}
          onExportWord={onExportWord}
          onExportPng={onExportPng}
          onExportJpg={onExportJpg}
          onExportSvg={onExportSvg}
        />

        {/* Right Sidebar Toggle Button */}
        <IconButton
          icon={SidebarRightIcon}
          size="md"
          variant={isSidebarOpen ? 'accent-soft' : 'sub'}
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Hide Settings Sidebar (Ctrl + B)' : 'Show Settings Sidebar (Ctrl + B)'}
          ariaLabel="Toggle Settings Sidebar"
        />

        {/* Close Button */}
        <IconButton
          icon={CloseIcon}
          size="md"
          variant="ghost"
          onClick={onClose}
          title="Close DocLab (Esc)"
          ariaLabel="Close DocLab"
          className="ml-1"
        />
      </div>
    </header>
  );
};

export default DocLabHeader;
