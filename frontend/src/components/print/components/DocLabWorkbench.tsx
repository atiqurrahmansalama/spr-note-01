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
  getDocxPaperDimensions,
  getDocxPaperPadding,
  splitHtmlIntoPages,
  joinPagesIntoHtml,
} from '../docxTemplateEngine';
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
  const effectiveDocs =
    documents && documents.length > 0
      ? documents
      : batchDocuments && batchDocuments.length > 0
      ? batchDocuments
      : null;

  const docxDimensions = React.useMemo(() => {
    const size = options.pageSize || customDocxTemplate?.pageSize || 'A4';
    const orientation = options.orientation || customDocxTemplate?.orientation || 'PORTRAIT';
    return getDocxPaperDimensions(size, orientation);
  }, [options.pageSize, options.orientation, customDocxTemplate?.pageSize, customDocxTemplate?.orientation]);

  const docxCustomPadding = React.useMemo(() => {
    const pp = customDocxTemplate?.pageProperties || customDocxTemplate?.templateMeta?.pageProperties;
    const margin = options.margin || customDocxTemplate?.margin || 'NORMAL';
    return getDocxPaperPadding(pp, margin);
  }, [customDocxTemplate, options.margin]);

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
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                <span>
                  {isAutoSaving
                    ? 'Saving...'
                    : 'Auto-saved'}
                </span>
              </span>
            )}
          </div>

          {/* Far Right: Mode Switcher Segment */}
          <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap">
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
              /* Single Unified Master Document Canvas in Template Design Mode */
              <div
                id="docx-live-master-canvas"
                className="relative paper-sheet-wrapper group flex flex-col items-center"
              >
                {/* Page Sheet Header Controls (Screen only) */}
                <div
                  style={{ width: docxDimensions.width, maxWidth: docxDimensions.maxWidth }}
                  className="flex items-center justify-between px-2 py-1 mb-1.5 text-xs theme-text-secondary select-none print:hidden"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full theme-bg-accent" />
                    <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                      Document Canvas ({options.pageSize || customDocxTemplate?.pageSize || 'A4'} &bull;{' '}
                      {options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'})
                    </span>
                    <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
                      {Math.max(
                        1,
                        splitHtmlIntoPages(
                          customDocxTemplate?.templateBody ||
                            customDocxTemplate?.body ||
                            customDocxTemplate?.rawHtml ||
                            ''
                        ).length
                      )}{' '}
                      {splitHtmlIntoPages(
                        customDocxTemplate?.templateBody ||
                          customDocxTemplate?.body ||
                          customDocxTemplate?.rawHtml ||
                          ''
                      ).length === 1
                        ? 'Page'
                        : 'Pages'}
                    </span>
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
                      title="Insert a page break to create Page 2 (Ctrl + Enter)"
                    >
                      <PageBreakIcon className="w-3.5 h-3.5" />
                      <span>+ Add Page</span>
                    </button>
                  </div>
                </div>

                <div
                  className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-lg cursor-text select-text"
                  data-size={options.pageSize || customDocxTemplate?.pageSize || 'A4'}
                  data-orientation={options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'}
                  data-margin={options.margin || customDocxTemplate?.margin || 'NORMAL'}
                  data-density={options.density || 'NORMAL'}
                  data-color-mode={options.colorMode || 'FULL_COLOR'}
                  data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed) return;
                      const editable = e.currentTarget.querySelector('[contenteditable="true"]') as HTMLElement | null;
                      if (editable) {
                        editable.focus({ preventScroll: true });
                      }
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    width: docxDimensions.width,
                    maxWidth: docxDimensions.maxWidth,
                    minHeight: docxDimensions.height,
                    padding: docxCustomPadding,
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}
                >
                  <div className="w-full h-full text-left select-text">
                    <DocxLiveRenderer
                      key="docx_live_master_renderer"
                      htmlContent={
                        customDocxTemplate.templateBody ||
                        customDocxTemplate.body ||
                        customDocxTemplate.rawHtml ||
                        ''
                      }
                      styles={docxStyles}
                      isEditable={true}
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
                    style={{ width: docxDimensions.width, maxWidth: docxDimensions.maxWidth }}
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
                      width: docxDimensions.width,
                      maxWidth: docxDimensions.maxWidth,
                      minHeight: docxDimensions.height,
                      height: docxDimensions.height,
                      maxHeight: docxDimensions.height,
                      padding: docxCustomPadding,
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
                width: docxDimensions.width,
                maxWidth: docxDimensions.maxWidth,
                minHeight: docxDimensions.height,
                height: docxDimensions.height,
                maxHeight: docxDimensions.height,
                padding: docxCustomPadding,
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
    </main>
  );
};

export default DocLabWorkbench;
