import React from 'react';
import DocLabCanvasViewer from '../DocLabCanvasViewer';
import DocLabDocumentWrapper from '../DocLabDocumentWrapper';
import DocLabTableRenderer from '../DocLabTableRenderer';
import DocxLiveRenderer from '../DocxLiveRenderer';
import DocxFormattingRibbon from '../DocxFormattingRibbon';
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
}) => {
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

  const pendingFocusRef = React.useRef<{ pageIdx: number; position: 'start' | 'end'; retries: number } | null>(null);

  const attemptFocusPage = React.useCallback((pageIdx: number, position: 'start' | 'end' = 'start') => {
    const targetSheet = document.getElementById(`docx-live-page-${pageIdx}`);
    if (targetSheet) {
      const editable = targetSheet.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (editable) {
        editable.focus({ preventScroll: true });
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          const leafNodes = Array.from(
            editable.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
          ) as HTMLElement[];
          const targetEl =
            position === 'start' ? leafNodes[0] || editable : leafNodes[leafNodes.length - 1] || editable;
          
          if (targetEl) {
            range.selectNodeContents(targetEl);
            range.collapse(position === 'start');
          } else {
            range.selectNodeContents(editable);
            range.collapse(position === 'start');
          }
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return true;
      }
    }
    return false;
  }, []);

  const handleFocusPage = React.useCallback(
    (pageIdx: number, position: 'start' | 'end' = 'start') => {
      // 1. Immediate attempt
      if (attemptFocusPage(pageIdx, position)) {
        pendingFocusRef.current = null;
        return;
      }

      // 2. Set pending focus with retry loop
      pendingFocusRef.current = { pageIdx, position, retries: 0 };

      const checkAndFocus = () => {
        if (!pendingFocusRef.current) return;
        const { pageIdx: p, position: pos, retries } = pendingFocusRef.current;
        if (attemptFocusPage(p, pos)) {
          pendingFocusRef.current = null;
          return;
        }
        if (retries < 15) {
          pendingFocusRef.current.retries += 1;
          setTimeout(checkAndFocus, 35);
        } else {
          pendingFocusRef.current = null;
        }
      };

      requestAnimationFrame(checkAndFocus);
    },
    [attemptFocusPage]
  );

  // Trigger focus when mergedDocxPages updates if a focus is pending
  React.useEffect(() => {
    if (pendingFocusRef.current) {
      const { pageIdx, position } = pendingFocusRef.current;
      if (attemptFocusPage(pageIdx, position)) {
        pendingFocusRef.current = null;
      }
    }
  }, [mergedDocxPages, attemptFocusPage]);

  const handleAddPageBelow = React.useCallback(
    (pIdx: number) => {
      if (docxRenderMode === 'template' || customDocxTemplate) {
        const updater = (prev: any) => {
          if (!prev) return null;
          const preservedStyles =
            prev.styles || separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles;
          const currentRawBody = prev.templateBody || prev.body || prev.html || '';
          const currentPages = splitHtmlIntoPages(currentRawBody);
          const updatedPages = [
            ...currentPages.slice(0, pIdx + 1),
            '<p style="font-size: 11pt; color: #334155; line-height: 1.6;"><br></p>',
            ...currentPages.slice(pIdx + 1),
          ];
          const combinedBody = joinPagesIntoHtml(updatedPages);
          return {
            ...prev,
            styles: preservedStyles,
            templateBody: combinedBody,
            body: combinedBody,
            html: preservedStyles ? `${preservedStyles}\n${combinedBody}` : combinedBody,
            rawHtml: preservedStyles ? `${preservedStyles}\n${combinedBody}` : combinedBody,
          };
        };
        if (updateCustomDocxTemplateWithHistory) {
          updateCustomDocxTemplateWithHistory(updater);
        } else {
          setCustomDocxTemplate(updater);
        }
        handleFocusPage(pIdx + 1, 'start');
      }
    },
    [docxRenderMode, customDocxTemplate, updateCustomDocxTemplateWithHistory, setCustomDocxTemplate, handleFocusPage]
  );

  const handleDeletePage = React.useCallback(
    (pIdx: number) => {
      if (docxRenderMode === 'template' || customDocxTemplate) {
        const updater = (prev: any) => {
          if (!prev) return null;
          const preservedStyles =
            prev.styles || separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles;
          const currentRawBody = prev.templateBody || prev.body || prev.html || '';
          const currentPages = splitHtmlIntoPages(currentRawBody);
          if (currentPages.length <= 1) return prev;
          const updatedPages = currentPages.filter((_, idx) => idx !== pIdx);
          const combinedBody = joinPagesIntoHtml(updatedPages);
          return {
            ...prev,
            styles: preservedStyles,
            templateBody: combinedBody,
            body: combinedBody,
            html: preservedStyles ? `${preservedStyles}\n${combinedBody}` : combinedBody,
            rawHtml: preservedStyles ? `${preservedStyles}\n${combinedBody}` : combinedBody,
          };
        };
        if (updateCustomDocxTemplateWithHistory) {
          updateCustomDocxTemplateWithHistory(updater);
        } else {
          setCustomDocxTemplate(updater);
        }
        if (pIdx > 0) {
          handleFocusPage(pIdx - 1, 'end');
        } else {
          handleFocusPage(0, 'start');
        }
      }
    },
    [docxRenderMode, customDocxTemplate, updateCustomDocxTemplateWithHistory, setCustomDocxTemplate, handleFocusPage]
  );

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative universal-print-workbench print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
      {/* Top Template Workbench Toolbar (Visible when Custom Template is active) */}
      {customDocxTemplate && (
        <div className="px-4 py-2 bg-gradient-to-r from-[var(--accent-main)]/10 via-[var(--accent-main)]/5 to-transparent border-b theme-border flex items-center justify-between gap-3 flex-wrap print:hidden select-none z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full theme-bg-accent shadow-2xs" />
            <span className="text-xs font-bold theme-text-primary">
              {customDocxTemplate.name || 'Custom Template'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold theme-bg-accent/15 theme-accent font-mono">
              {docxRenderMode === 'template'
                ? `Template Blueprint • ${mergedDocxPages.length} ${mergedDocxPages.length === 1 ? 'Page' : 'Pages'}`
                : `Batch Document • ${mergedDocxPages.length} ${mergedDocxPages.length === 1 ? 'Page' : 'Pages'}`}
            </span>
          </div>

          {/* Center / Right: Rich Text Formatting Ribbon */}
          <div className="flex items-center gap-3">
            {docxRenderMode === 'template' && (
              <DocxFormattingRibbon onInsertToken={undefined} />
            )}
          </div>
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
            {mergedDocxPages.map((pageHtml, pIdx) => (
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
                      Page {pIdx + 1} of {mergedDocxPages.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddPageBelow(pIdx)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold theme-bg-sub/80 border theme-border hover:theme-bg-surface hover:theme-accent transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                      title="Add a new page below this page"
                    >
                      <span>+ Add Page Below</span>
                    </button>
                    {mergedDocxPages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePage(pIdx)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold theme-bg-sub/80 border theme-border hover:theme-danger transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                        title="Delete this page"
                      >
                        <span>Delete Page</span>
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-lg cursor-text"
                  data-size={options.pageSize || customDocxTemplate?.pageSize || 'A4'}
                  data-orientation={options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'}
                  data-margin={options.margin || customDocxTemplate?.margin || 'NORMAL'}
                  data-density={options.density || 'NORMAL'}
                  data-color-mode={options.colorMode || 'FULL_COLOR'}
                  data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      const editable = e.currentTarget.querySelector('[contenteditable="true"]') as HTMLElement | null;
                      if (editable) {
                        const leafNodes = Array.from(
                          editable.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
                        ) as HTMLElement[];
                        const lastEl =
                          leafNodes[leafNodes.length - 1] || editable.lastElementChild || editable.lastChild;
                        if (lastEl) {
                          const range = document.createRange();
                          range.selectNodeContents(lastEl);
                          range.collapse(false);
                          const sel = window.getSelection();
                          if (sel) {
                            sel.removeAllRanges();
                            sel.addRange(range);
                          }
                        } else {
                          editable.focus({ preventScroll: true });
                        }
                      }
                    }
                  }}
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
                      htmlContent={pageHtml}
                      styles={docxStyles}
                      isEditable={docxRenderMode === 'template'}
                      pageIndex={pIdx}
                      totalPages={mergedDocxPages.length}
                      onAddNextPage={() => handleAddPageBelow(pIdx)}
                      onDeleteCurrentPage={() => handleDeletePage(pIdx)}
                      onNavigatePrevPage={() => handleFocusPage(pIdx - 1, 'end')}
                      onNavigateNextPage={() => handleFocusPage(pIdx + 1, 'start')}
                      onContentChange={(newHtml) => {
                        if (docxRenderMode !== 'template') return;
                        const updater = (prev: any) => {
                          if (!prev) return null;
                          const preservedStyles =
                            prev.styles || separateDocxStylesAndBody(prev.html || prev.rawHtml || '').styles;
                          const currentRawBody = prev.templateBody || prev.body || prev.html || '';
                          const currentPages = splitHtmlIntoPages(currentRawBody);

                          let updatedPages: string[];
                          // Check if newHtml contains a new explicit page break
                          if (newHtml.includes('<!-- spr-page-break -->') || newHtml.includes('spr-page-break')) {
                            const subPages = splitHtmlIntoPages(newHtml);
                            if (subPages.length > 1) {
                              updatedPages = [
                                ...currentPages.slice(0, pIdx),
                                ...subPages,
                                ...currentPages.slice(pIdx + 1),
                              ];
                            } else {
                              updatedPages = [...currentPages];
                              updatedPages[pIdx] = newHtml;
                            }
                          } else {
                            if (currentPages.length > pIdx) {
                              updatedPages = [...currentPages];
                              updatedPages[pIdx] = newHtml;
                            } else {
                              updatedPages = [newHtml];
                            }
                          }

                          const combinedBody = joinPagesIntoHtml(updatedPages);
                          return {
                            ...prev,
                            styles: preservedStyles,
                            templateBody: combinedBody,
                            body: combinedBody,
                            html: preservedStyles ? `${preservedStyles}\n${combinedBody}` : combinedBody,
                            rawHtml: preservedStyles ? `${preservedStyles}\n${combinedBody}` : combinedBody,
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
        )}
      </DocLabCanvasViewer>
    </main>
  );
};

export default DocLabWorkbench;
