import React, { useState } from 'react';
import DocLabCanvasViewer from '../DocLabCanvasViewer';
import DocLabDocumentWrapper from '../DocLabDocumentWrapper';
import DocLabTableRenderer from '../DocLabTableRenderer';
import DocxLiveRenderer from '../DocxLiveRenderer';
import DocxFormattingRibbon from '../DocxFormattingRibbon';
import { DocLabSaveModal } from './sidebar';
import { SparklesIcon, PageBreakIcon } from '@/components/ui/Icons';
import {
  separateDocxStylesAndBody,
} from '../docxTemplateEngine';
import {
  PageGeometryCalculator,
  PaginationEngine,
  LayoutDebugOverlay,
  LayoutPageRenderer,
  LayoutDocumentRenderer,
} from '../layout';
import {
  PrintOptions,
  PrintColumn,
  PrintMetaItem,
  PrintSummaryMetric,
  PrintPaginationResult,
  PrintBatchDocument,
} from '../types';

export interface DocLabWorkbenchProps {
  options: PrintOptions;
  updateOptionsWithHistory: (nextValOrUpdater: any) => void;
  title: string;
  subtitle?: string;
  liveMetaItems: PrintMetaItem[];
  handleMetaItemsChange: (newMetaItems: PrintMetaItem[]) => void;
  liveColumns: PrintColumn[];
  visibleColumnKeys: string[];
  isColumnMandatory?: ((column: any) => boolean) | null;
  isColumnRequired?: ((column: any) => boolean) | null;
  requiredColumnKeys?: (string | number)[] | null;
  visibleRowKeys: string[];
  isRowMandatory?: ((row: any, idx: number) => boolean) | null;
  isRowRequired?: ((row: any, idx: number) => boolean) | null;
  requiredRowKeys?: (string | number)[] | null;
  getRowIdentifier: (row: any, idx: number) => string;
  liveSummaryMetrics: PrintSummaryMetric[];
  footerRow?: any;
  footerRows?: any[];
  documents?: PrintBatchDocument[];
  batchDocuments?: PrintBatchDocument[];
  paginationResult: PrintPaginationResult;
  customDocxTemplate: any;
  setCustomDocxTemplate: React.Dispatch<React.SetStateAction<any>>;
  updateCustomDocxTemplateWithHistory?: (updater: any) => void;
  docxStyles: string;
  mergedDocxPages: string[];
  docxRenderMode: 'template' | 'sample' | 'all';
  setDocxRenderMode: (mode: 'template' | 'sample' | 'all') => void;
  liveData: Array<Record<string, any>>;
  customSheets?: boolean;
  children?: React.ReactNode;
  zoomLevel: number;
  setZoomLevel: (z: number | ((prev: number) => number)) => void;
  pointerMode: 'hand' | 'select';
  setPointerMode: (mode: 'hand' | 'select') => void;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  handleCellChange: (rowIndex: number, colKey: string, newValue: any) => void;
  handleRowDelete: (rowIndex: number) => void;
  handleRowInsert: (rowIndex: number, position?: 'above' | 'below') => void;
  handleRowMove: (fromIndex: number, toIndex: number) => void;
  handleColumnHeaderChange: (colKey: string, newHeader: string) => void;
  onSaveCurrentTemplate?: (name: string, docType: 'template' | 'generated') => void;
  autoSaveStatus?: string;
  autoSaveLastSavedAt?: string | null;
  isAutoSaving?: boolean;
}

/**
 * DocLabWorkbench
 * Interactive live paper canvas rendering multi-page table grids,
 * custom sheets, or editable Word (.docx) documents with rich formatting.
 */
export const DocLabWorkbench: React.FC<DocLabWorkbenchProps> = ({
  options,
  updateOptionsWithHistory,
  title,
  subtitle,
  liveMetaItems,
  handleMetaItemsChange,
  liveColumns,
  visibleColumnKeys,
  isColumnMandatory,
  isColumnRequired,
  requiredColumnKeys,
  visibleRowKeys,
  isRowMandatory,
  isRowRequired,
  requiredRowKeys,
  getRowIdentifier,
  liveSummaryMetrics,
  footerRow,
  footerRows = [],
  documents,
  batchDocuments,
  paginationResult,
  customDocxTemplate,
  setCustomDocxTemplate,
  updateCustomDocxTemplateWithHistory,
  docxStyles,
  mergedDocxPages,
  docxRenderMode,
  setDocxRenderMode,
  liveData,
  customSheets,
  children,
  zoomLevel,
  setZoomLevel,
  pointerMode,
  setPointerMode,
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  handleCellChange,
  handleRowDelete,
  handleRowInsert,
  handleRowMove,
  handleColumnHeaderChange,
  onSaveCurrentTemplate,
  autoSaveStatus,
  autoSaveLastSavedAt,
  isAutoSaving = false,
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDebugOverlayOpen, setIsDebugOverlayOpen] = useState(false);
  const effectiveDocs =
    documents && documents.length > 0
      ? documents
      : batchDocuments && batchDocuments.length > 0
      ? batchDocuments
      : null;

  // Derive dynamic page geometry from centralized PageGeometryCalculator
  const pageGeometry = React.useMemo(() => {
    return PageGeometryCalculator.calculate({
      pageSize: options.pageSize || customDocxTemplate?.pageSize || 'A4',
      orientation: options.orientation || customDocxTemplate?.orientation || 'PORTRAIT',
      margin: options.margin || customDocxTemplate?.margin || 'NORMAL',
      customMarginsMm: options.customMarginsMm,
      pageProperties: customDocxTemplate?.pageProperties || customDocxTemplate?.templateMeta?.pageProperties,
    });
  }, [
    options.pageSize,
    options.orientation,
    options.margin,
    options.customMarginsMm,
    customDocxTemplate,
  ]);

  // Dynamically compute runtime layout pagination result without mutating content
  const computedLayout = React.useMemo(() => {
    if (!customDocxTemplate) return null;
    const content =
      customDocxTemplate.templateBody ||
      customDocxTemplate.body ||
      customDocxTemplate.rawHtml ||
      '';

    return PaginationEngine.paginate(content, {
      pageSize: options.pageSize || customDocxTemplate?.pageSize || 'A4',
      orientation: options.orientation || customDocxTemplate?.orientation || 'PORTRAIT',
      margin: options.margin || customDocxTemplate?.margin || 'NORMAL',
      density: options.density,
      styles: docxStyles,
      debugLayout: true,
    });
  }, [
    customDocxTemplate,
    options.pageSize,
    options.orientation,
    options.margin,
    options.density,
    docxStyles,
  ]);

  const liveTotalPagesCount = computedLayout ? Math.max(1, computedLayout.totalPages) : 1;

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative universal-print-workbench print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
      {/* 1. Top Template Workbench Sub-Header (Visible when Custom Template is active) */}
      {customDocxTemplate && (
        <div className="px-4 py-2 bg-gradient-to-r from-[var(--accent-main)]/10 via-[var(--accent-main)]/5 to-transparent flex items-center justify-between gap-3 flex-wrap print:hidden select-none z-20">
          {/* Left: Template Name & Auto-save Badge */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="w-2 h-2 rounded-full theme-bg-accent shadow-2xs shrink-0" />
            <span className="text-xs font-bold theme-text-primary truncate max-w-[200px] sm:max-w-[320px]" title={customDocxTemplate.name || 'Custom Template'}>
              {customDocxTemplate.name || 'Custom Template'}
            </span>
            {docxRenderMode === 'template' && (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                  <span>
                    {isAutoSaving
                      ? 'Saving...'
                      : 'Auto-saved'}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs shrink-0">
                  <span>{liveTotalPagesCount} {liveTotalPagesCount === 1 ? 'Page' : 'Pages'}</span>
                </span>
              </>
            )}
          </div>

          {/* Far Right: Mode Switcher Segment */}
          <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap">
            {/* Developer Layout Debug Inspector Button */}
            <button
              type="button"
              onClick={() => setIsDebugOverlayOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isDebugOverlayOpen
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40 shadow-2xs font-bold'
                  : 'theme-bg-elevated theme-text-secondary hover:theme-text-primary border-slate-700/40'
              }`}
              title="Toggle Layout Debug Mode Inspector (Developer Tool)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="font-mono text-[10.5px]">Debug Layout</span>
            </button>

            {/* Mode Switcher Segment (Template Design vs Generate N Document(s)) */}
            <div className="flex items-center p-0.5 rounded-lg theme-bg-elevated border theme-border shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setDocxRenderMode('template')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  docxRenderMode === 'template'
                    ? 'theme-bg-accent-soft theme-accent shadow-2xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/50'
                }`}
                title="Edit and customize template design"
              >
                <span>Template Design</span>
              </button>

              <button
                type="button"
                onClick={() => setDocxRenderMode('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  docxRenderMode === 'all'
                    ? 'theme-bg-accent text-white shadow-xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/50'
                }`}
                title="Generate all populated batch documents with live records"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>
                  {(liveData?.length || documents?.length || batchDocuments?.length || 0) > 0
                    ? `Generate ${(liveData?.length || documents?.length || batchDocuments?.length || 0)} ${(liveData?.length || documents?.length || batchDocuments?.length || 0) === 1 ? 'Document' : 'Documents'}`
                    : 'Generate Documents'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dedicated Rich Text Formatting Ribbon Strip (Above Canvas) */}
      {customDocxTemplate && docxRenderMode === 'template' && (
        <div className="px-4 py-1.5 flex items-center justify-start sm:justify-center overflow-x-auto print:hidden select-none z-15 scrollbar-none">
          <DocxFormattingRibbon onInsertToken={undefined} />
        </div>
      )}

      <DocLabCanvasViewer
        pageSize={options.pageSize}
        orientation={options.orientation}
        margin={options.margin}
        density={options.density}
        colorMode={options.colorMode}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        pointerMode={pointerMode}
        onPointerModeChange={setPointerMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      >
        {/* 1. Custom Word (.docx) Template Mode */}
        {customDocxTemplate ? (
          <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
            {/* Single shared style block injected once for the entire batch */}
            {docxStyles && (
              <style
                dangerouslySetInnerHTML={{
                  __html: docxStyles.replace(/<\/?style\b[^>]*>/gi, ''),
                }}
              />
            )}
            {docxRenderMode === 'template' ? (
              /* Continuous Unified Document Editor in Template Design Mode */
              <div
                id="docx-live-template-container"
                className="relative paper-sheet-wrapper group flex flex-col items-center mb-8 print:mb-0 print:block"
              >
                {/* Screen-only Physical Page Header Controls */}
                <div
                  style={{
                    width: `${pageGeometry.paperDimensionsPx.width}px`,
                    maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                  }}
                  className="flex items-center justify-between px-2 py-1 mb-1.5 text-xs theme-text-secondary select-none print:hidden"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full theme-bg-accent" />
                    <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                      {liveTotalPagesCount === 1
                        ? 'Page 1 of 1'
                        : `Page 1–${liveTotalPagesCount} of ${liveTotalPagesCount}`} ({options.pageSize || customDocxTemplate?.pageSize || 'A4'} &bull; {options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'})
                    </span>
                    <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
                      {Math.round(pageGeometry.paperDimensionsPx.width)} × {Math.round(pageGeometry.paperDimensionsPx.height)}px / page
                    </span>
                    {isDebugOverlayOpen && (
                      <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-sm font-mono">
                        Used: {Math.round(computedLayout?.pages?.[0]?.usedHeight || 0)}px &bull; Pages: {liveTotalPagesCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] theme-text-muted hidden md:inline">
                      Press <kbd className="px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono text-[10px]">Ctrl+Enter</kbd> for new page
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('spr_doclab_insert_page_break'));
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md theme-bg-accent text-white hover:opacity-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      title="Insert a manual page break to create a new physical page (Ctrl + Enter)"
                    >
                      <PageBreakIcon className="w-3.5 h-3.5" />
                      <span>+ Add Page</span>
                    </button>
                  </div>
                </div>

                {/* Actual Physical Visual Paper Sheet Container (Expands continuously for N pages) */}
                <div
                  className="paper-sheet docx-paper-sheet docx-continuous-paper rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-xl cursor-text select-text transition-all duration-150"
                  data-size={options.pageSize || customDocxTemplate?.pageSize || 'A4'}
                  data-orientation={options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'}
                  data-margin={options.margin || customDocxTemplate?.margin || 'NORMAL'}
                  data-density={options.density || 'NORMAL'}
                  data-color-mode={options.colorMode || 'FULL_COLOR'}
                  data-page-break="true"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    width: `${pageGeometry.paperDimensionsPx.width}px`,
                    maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                    minHeight: `${liveTotalPagesCount * pageGeometry.paperDimensionsPx.height}px`,
                    height: 'auto',
                    maxHeight: 'none',
                    padding: pageGeometry.cssMarginString,
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    overflow: 'visible',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    position: 'relative',
                  }}
                >
                  {/* Dynamic Visual Page Boundary Overlays for Multi-Page Projection */}
                  {liveTotalPagesCount > 1 && (
                    <div className="absolute inset-0 pointer-events-none select-none print:hidden z-10" aria-hidden="true">
                      {Array.from({ length: liveTotalPagesCount - 1 }, (_, i) => i + 1).map((pageNum) => (
                        <div
                          key={`page_boundary_guide_${pageNum}`}
                          style={{
                            top: `${pageNum * pageGeometry.paperDimensionsPx.height}px`,
                            left: 0,
                            right: 0,
                          }}
                          className="absolute flex items-center justify-between border-t-2 border-dashed border-blue-400/40 px-3 py-0.5 transform -translate-y-1/2"
                        >
                          <span className="bg-slate-800/90 text-white text-[9.5px] font-mono px-2 py-0.5 rounded-full shadow-xs border border-white/20">
                            Page {pageNum} &uarr; | &darr; Page {pageNum + 1}
                          </span>
                          <span className="text-[9px] text-blue-500/80 font-mono bg-blue-50/90 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-sm">
                            {Math.round(pageNum * pageGeometry.paperDimensionsPx.height)}px
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Single Unified Continuous Content Editor */}
                  <div className="w-full h-full text-left select-text relative z-0">
                    <DocxLiveRenderer
                      key="docx_live_unified_editor"
                      htmlContent={
                        customDocxTemplate.templateBody ||
                        customDocxTemplate.body ||
                        customDocxTemplate.rawHtml ||
                        '<p><br></p>'
                      }
                      styles={docxStyles}
                      isEditable={true}
                      totalPages={liveTotalPagesCount}
                      onContentChange={(newHtml) => {
                        const { styles: incomingStyles, body: incomingBody } = separateDocxStylesAndBody(newHtml);
                        const cleanNewHtml = incomingBody || newHtml;

                        const updater = (prev: any) => {
                          if (!prev) return null;
                          const preservedStyles =
                            incomingStyles ||
                            prev.styles ||
                            separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles ||
                            '';

                          return {
                            ...prev,
                            styles: preservedStyles,
                            templateBody: cleanNewHtml,
                            body: cleanNewHtml,
                            html: preservedStyles ? `${preservedStyles}\n${cleanNewHtml}` : cleanNewHtml,
                            rawHtml: preservedStyles ? `${preservedStyles}\n${cleanNewHtml}` : cleanNewHtml,
                          };
                        };

                        if (updateCustomDocxTemplateWithHistory) {
                          updateCustomDocxTemplateWithHistory(updater);
                        } else {
                          setCustomDocxTemplate(updater);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Discrete Multi-Record Sheets in Batch Generation Mode ('all' or 'sample') */
              mergedDocxPages.map((pageHtml, pIdx) => (
                <div
                  key={`docx_page_${pIdx}`}
                  id={`docx-live-page-${pIdx}`}
                  className="relative paper-sheet-wrapper group flex flex-col items-center"
                >
                  {/* Page Sheet Header Controls (Screen only) */}
                  <div
                    style={{ width: `${pageGeometry.paperDimensionsPx.width}px`, maxWidth: `${pageGeometry.paperDimensionsPx.width}px` }}
                    className="flex items-center justify-between px-2 py-1 mb-1.5 text-xs theme-text-secondary select-none print:hidden"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <span className="w-2 h-2 rounded-full theme-bg-accent" />
                      <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                        Document {pIdx + 1} of {mergedDocxPages.length}
                      </span>
                    </div>
                  </div>

                  <div
                    className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-lg cursor-text select-text"
                    data-size={options.pageSize || customDocxTemplate?.pageSize || 'A4'}
                    data-orientation={options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'}
                    data-margin={options.margin || customDocxTemplate?.margin || 'NORMAL'}
                    data-density={options.density || 'NORMAL'}
                    data-color-mode={options.colorMode || 'FULL_COLOR'}
                    data-page-break="true"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      width: `${pageGeometry.paperDimensionsPx.width}px`,
                      maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                      minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                      height: `${pageGeometry.paperDimensionsPx.height}px`,
                      maxHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                      padding: pageGeometry.cssMarginString,
                      textAlign: 'left',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                    }}
                  >
                    <div className="w-full h-full text-left select-text">
                      <DocxLiveRenderer
                        key={`docx_batch_renderer_${pIdx}`}
                        htmlContent={pageHtml}
                        styles={docxStyles}
                        isEditable={false}
                        pageIndex={pIdx}
                        totalPages={mergedDocxPages.length}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : effectiveDocs ? (
          <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
            {effectiveDocs.map((doc, docIdx) => {
              const docMeta = doc.metaItems || liveMetaItems;
              const docCols = doc.columns || liveColumns;
              const docData = doc.data || [];
              const docFooterRows = doc.footerRows || (docIdx === effectiveDocs.length - 1 ? footerRows : []);
              const docFooterRow = doc.footerRow || (docIdx === effectiveDocs.length - 1 ? footerRow : null);
              const docMetrics =
                doc.summaryMetrics ||
                (docIdx === effectiveDocs.length - 1 && options.showSummary !== false ? liveSummaryMetrics : []);

              return (
                <div key={doc.id || docIdx} className="relative paper-sheet-wrapper group">
                  <div
                    className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                    data-size={options.pageSize || 'A4'}
                    data-orientation={options.orientation || 'PORTRAIT'}
                    data-margin={options.margin || 'NORMAL'}
                    data-density={options.density || 'NORMAL'}
                    data-color-mode={options.colorMode || 'FULL_COLOR'}
                    data-page-break="true"
                  >
                    <DocLabDocumentWrapper
                      title={doc.title || title}
                      subtitle={doc.subtitle || subtitle}
                      metaItems={docMeta}
                      onMetaItemsChange={docIdx === 0 ? handleMetaItemsChange : undefined}
                      options={options}
                      onOptionsChange={updateOptionsWithHistory}
                      pageIndex={docIdx}
                      totalPages={effectiveDocs.length}
                      isFirstPage={docIdx === 0}
                      isLastPage={docIdx === effectiveDocs.length - 1}
                    >
                      {doc.content ? (
                        doc.content
                      ) : (
                        <DocLabTableRenderer
                          columns={docCols}
                          data={docData}
                          visibleColumnKeys={visibleColumnKeys}
                          isColumnMandatory={isColumnMandatory}
                          isColumnRequired={isColumnRequired}
                          requiredColumnKeys={requiredColumnKeys}
                          visibleRowKeys={visibleRowKeys}
                          isRowMandatory={isRowMandatory}
                          isRowRequired={isRowRequired}
                          requiredRowKeys={requiredRowKeys}
                          getRowKey={getRowIdentifier}
                          summaryMetrics={docMetrics}
                          density={options.density}
                          footerRow={docFooterRow}
                          footerRows={docFooterRows}
                        />
                      )}
                    </DocLabDocumentWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        ) : customSheets ? (
          children
        ) : children ? (
          <div className="relative paper-sheet-wrapper group">
            <div
              className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
              data-size={options.pageSize || 'A4'}
              data-orientation={options.orientation || 'PORTRAIT'}
              data-margin={options.margin || 'NORMAL'}
              data-density={options.density || 'NORMAL'}
              data-color-mode={options.colorMode || 'FULL_COLOR'}
              data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
            >
              <DocLabDocumentWrapper
                title={title}
                subtitle={subtitle}
                metaItems={liveMetaItems}
                onMetaItemsChange={handleMetaItemsChange}
                options={options}
                onOptionsChange={updateOptionsWithHistory}
                pageIndex={0}
                totalPages={1}
                isFirstPage={true}
                isLastPage={true}
              >
                {children}
              </DocLabDocumentWrapper>
            </div>
          </div>
        ) : liveColumns && liveColumns.length > 0 ? (
          paginationResult.pages.map((page, pIdx) => (
            <div key={pIdx} className="relative paper-sheet-wrapper group">
              <div
                className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                data-size={options.pageSize || 'A4'}
                data-orientation={options.orientation || 'PORTRAIT'}
                data-margin={options.margin || 'NORMAL'}
                data-density={options.density || 'NORMAL'}
                data-color-mode={options.colorMode || 'FULL_COLOR'}
                data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
              >
                <DocLabDocumentWrapper
                  title={title}
                  subtitle={subtitle}
                  metaItems={liveMetaItems}
                  onMetaItemsChange={handleMetaItemsChange}
                  options={options}
                  onOptionsChange={updateOptionsWithHistory}
                  pageIndex={pIdx}
                  totalPages={paginationResult.totalPages}
                  isFirstPage={page.isFirstPage}
                  isLastPage={page.isLastPage}
                >
                  <DocLabTableRenderer
                    columns={liveColumns}
                    data={page.rows}
                    visibleColumnKeys={visibleColumnKeys}
                    isColumnMandatory={isColumnMandatory}
                    isColumnRequired={isColumnRequired}
                    requiredColumnKeys={requiredColumnKeys}
                    visibleRowKeys={visibleRowKeys}
                    isRowMandatory={isRowMandatory}
                    isRowRequired={isRowRequired}
                    requiredRowKeys={requiredRowKeys}
                    getRowKey={getRowIdentifier}
                    extraBlankRows={page.extraBlanks}
                    summaryMetrics={page.isLastPage && options.showSummary !== false ? liveSummaryMetrics : []}
                    density={options.density}
                    footerRow={page.isLastPage ? footerRow : null}
                    footerRows={page.isLastPage ? footerRows : []}
                    startIndex={page.startIndex}
                  />
                </DocLabDocumentWrapper>
              </div>
            </div>
          ))
        ) : (
          <div className="relative paper-sheet-wrapper group flex flex-col items-center">
            <div
              className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-lg cursor-text"
              data-size={options.pageSize || 'A4'}
              data-orientation={options.orientation || 'PORTRAIT'}
              data-margin={options.margin || 'NORMAL'}
              data-density={options.density || 'NORMAL'}
              data-color-mode={options.colorMode || 'FULL_COLOR'}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                width: `${pageGeometry.paperDimensionsPx.width}px`,
                maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                height: `${pageGeometry.paperDimensionsPx.height}px`,
                maxHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                padding: pageGeometry.cssMarginString,
                textAlign: 'left',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div className="w-full h-full text-left">
                <DocxLiveRenderer
                  htmlContent="<p style='font-size: 11pt; color: #334155; line-height: 1.6;'><br></p>"
                  styles=""
                  isEditable={true}
                  pageIndex={0}
                  totalPages={1}
                />
              </div>
            </div>
          </div>
        )}
      </DocLabCanvasViewer>
      {/* Save Canvas As Template Modal */}
      {isSaveModalOpen && onSaveCurrentTemplate && (
        <DocLabSaveModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={onSaveCurrentTemplate}
          totalRecordsCount={liveData?.length || 0}
        />
      )}
      {/* Developer Internal Layout Debug Overlay */}
      <LayoutDebugOverlay
        debugTrace={computedLayout?.debugTrace}
        isOpen={isDebugOverlayOpen}
        onClose={() => setIsDebugOverlayOpen(false)}
      />
    </main>
  );
};
export default DocLabWorkbench;

