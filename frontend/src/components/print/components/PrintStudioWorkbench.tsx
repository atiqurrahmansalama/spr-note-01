import React from 'react';
import PrintCanvasViewer from '../PrintCanvasViewer';
import PrintDocumentWrapper from '../PrintDocumentWrapper';
import PrintTableRenderer from '../PrintTableRenderer';
import DocxLiveRenderer from '../DocxLiveRenderer';
import DocxFormattingRibbon from '../DocxFormattingRibbon';
import { SparklesIcon } from '../../ui/Icons';
import { separateDocxStylesAndBody } from '../docxTemplateEngine';
import {
  PrintOptions,
  PrintColumn,
  PrintMetaItem,
  PrintSummaryMetric,
  PrintPaginationResult,
  PrintBatchDocument,
} from '../types';

interface PrintStudioWorkbenchProps {
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
}

/**
 * PrintStudioWorkbench
 * Interactive live paper canvas rendering multi-page table grids,
 * custom sheets, or editable Word (.docx) documents with rich formatting.
 */
export const PrintStudioWorkbench: React.FC<PrintStudioWorkbenchProps> = ({
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
}) => {
  const effectiveDocs =
    documents && documents.length > 0
      ? documents
      : batchDocuments && batchDocuments.length > 0
      ? batchDocuments
      : null;

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative universal-print-workbench print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
      {/* Top Template Workbench Generation Banner (Visible when Custom Template is active) */}
      {customDocxTemplate && (
        <div className="px-4 py-2 bg-gradient-to-r from-[var(--accent-main)]/10 via-[var(--accent-main)]/5 to-transparent border-b theme-border flex items-center justify-between gap-3 flex-wrap print:hidden select-none z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span className="text-xs font-bold theme-text-primary">
              {customDocxTemplate.name || 'Custom Template'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold theme-bg-accent/15 theme-accent font-mono">
              {docxRenderMode === 'template'
                ? 'Template (Keys) • 1 Page'
                : `Generated File • ${mergedDocxPages.length} Pages`}
            </span>
          </div>

          {/* Center: Rich Text Formatting Ribbon (Outside paper canvas, taking 0 printable space) */}
          {docxRenderMode === 'template' && (
            <DocxFormattingRibbon
              onCommand={() => {
                const container = document.querySelector('.docx-live-container');
                if (container && container.innerHTML) {
                  const newHtml = container.innerHTML;
                  setCustomDocxTemplate((prev: any) => {
                    if (!prev) return null;
                    const preservedStyles =
                      prev.styles || separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles;
                    return {
                      ...prev,
                      styles: preservedStyles,
                      body: newHtml,
                      html: preservedStyles ? `${preservedStyles}\n${newHtml}` : newHtml,
                      rawHtml: preservedStyles ? `${preservedStyles}\n${newHtml}` : newHtml,
                    };
                  });
                }
              }}
            />
          )}

          {/* Mode Selector & Batch Generator Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-xl theme-bg-sub border theme-border shadow-2xs">
              <button
                type="button"
                onClick={() => setDocxRenderMode('template')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  docxRenderMode === 'template'
                    ? 'theme-bg-accent-soft theme-accent shadow-2xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
                title="Show and edit template with placeholder keys (1 Page)"
              >
                Template (Keys)
              </button>

              {Array.isArray(liveData) && liveData.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDocxRenderMode('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    docxRenderMode === 'all'
                      ? 'theme-bg-accent theme-accent-text shadow-xs font-bold'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                  title={`Generate and preview batch document for all ${liveData.length} records`}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>Generate All Records</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                    {liveData.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <PrintCanvasViewer
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
              <div
                dangerouslySetInnerHTML={{ __html: docxStyles }}
                className="hidden"
              />
            )}
            {mergedDocxPages.map((pageHtml, pIdx) => (
              <div key={`docx_page_${pIdx}`} className="relative paper-sheet-wrapper group">
                <div
                  className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                  data-size={options.pageSize || 'A4'}
                  data-orientation={options.orientation || 'PORTRAIT'}
                  data-margin={options.margin || 'NORMAL'}
                  data-density={options.density || 'NORMAL'}
                  data-color-mode={options.colorMode || 'FULL_COLOR'}
                  data-page-break="true"
                >
                  <div className="w-full h-full">
                    <DocxLiveRenderer
                      htmlContent={pageHtml}
                      isEditable={true}
                      onContentChange={(newHtml) => {
                        setCustomDocxTemplate((prev: any) => {
                          if (!prev) return null;
                          const preservedStyles =
                            prev.styles || separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles;
                          return {
                            ...prev,
                            styles: preservedStyles,
                            body: newHtml,
                            html: preservedStyles ? `${preservedStyles}\n${newHtml}` : newHtml,
                            rawHtml: preservedStyles ? `${preservedStyles}\n${newHtml}` : newHtml,
                          };
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
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
                    <PrintDocumentWrapper
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
                        <PrintTableRenderer
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
                    </PrintDocumentWrapper>
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
              <PrintDocumentWrapper
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
              </PrintDocumentWrapper>
            </div>
          </div>
        ) : (
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
                <PrintDocumentWrapper
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
                  <PrintTableRenderer
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
                </PrintDocumentWrapper>
              </div>
            </div>
          ))
        )}
      </PrintCanvasViewer>
    </main>
  );
};
