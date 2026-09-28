/**
 * PaginatedDocumentEditor
 *
 * Master Word-like Paginated Editor component for SPR Note DocLab.
 *
 * Consumes: Canonical Document → LayoutDocument
 * Renders: Genuine discrete physical paper pages with exact margins,
 * real inter-page gaps, page overflow isolation, and seamless cross-page editing.
 *
 * ARCHITECTURAL INVARIANTS:
 * - Real page sheets, real page content regions, exact margins, real inter-page gaps.
 * - Zero text in inter-page gaps; zero giant overlay covering gaps.
 * - Editing remains document-centric (single canonical source of truth).
 * - Zero saving of runtime pagination fragments in the canonical source document.
 * - Stable mapping: Logical Node ↔ Editor Position ↔ Layout Fragment ↔ Page Position.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageBreakIcon } from '../../../ui/Icons';
import {
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  createManualPageBreakHtml,
} from '../logicalDocument';
import { separateDocxStylesAndBody } from '../../docxStyleUtils';
import { EditorPositionMapper, EditorCaretBookmark } from './EditorPositionMapper';
import { PaginatedEditorBridge } from './PaginatedEditorBridge';
import { EditorTransactionCoordinator, ReflowExecutionContext } from './EditorTransactionCoordinator';

export interface PaginatedDocumentEditorProps {
  /** Initial canonical HTML content or template body */
  htmlContent?: string;
  /** Shared document CSS styles */
  styles?: string;
  /** Whether the document is interactively editable */
  isEditable?: boolean;
  /** Callback fired when canonical document content changes */
  onContentChange?: (updatedCanonicalHtml: string) => void;
  /** Layout document options (pageSize, orientation, margin, density, etc.) */
  options?: LayoutDocumentOptions;
  /** Additional container CSS class */
  className?: string;
  /** Current page index if single-page mode */
  pageIndex?: number;
  /** Total pages count */
  totalPages?: number;
  /** Transparent background mode */
  transparentBackground?: boolean;
  /** Add next page callback */
  onAddNextPage?: () => void;
  /** Debug layout inspector flag */
  debugLayout?: boolean;
}

export const PaginatedDocumentEditorComponent: React.FC<PaginatedDocumentEditorProps> = ({
  htmlContent = '<p><br></p>',
  styles = '',
  isEditable = true,
  onContentChange,
  options = {},
  className = '',
  transparentBackground = false,
  debugLayout = false,
}) => {
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const coordinatorRef = useRef<EditorTransactionCoordinator | null>(null);
  const savedBookmarkRef = useRef<EditorCaretBookmark | null>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const activePageRef = useRef<number>(0);
  const lastRenderedHtmlPerPageRef = useRef<Record<number, string>>({});

  // Undo / Redo History Stack (Canonical HTML snapshots)
  const historyStackRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // 1. Separate styles and clean canonical body
  const { styles: extractedStyles, body: extractedBody } = useMemo(() => {
    return separateDocxStylesAndBody(htmlContent || '');
  }, [htmlContent]);

  const cleanCanonicalBody = useMemo(() => {
    const raw = extractedBody && extractedBody.trim() ? extractedBody : '<p><br></p>';
    return sanitizeLogicalDocumentHtml(raw);
  }, [extractedBody]);

  const activeStyles = useMemo(() => {
    const raw = styles || extractedStyles || '';
    return raw.replace(/<\/?style\b[^>]*>/gi, '').trim();
  }, [styles, extractedStyles]);

  // Local canonical document state
  const [canonicalHtml, setCanonicalHtml] = useState<string>(cleanCanonicalBody);

  // Layout document state
  const computeInitialLayout = useCallback(
    (html: string): LayoutDocument => {
      const effectiveOptions: LayoutDocumentOptions = {
        pageSize: options.pageSize || 'A4',
        orientation: options.orientation || 'PORTRAIT',
        margin: options.margin || 'NORMAL',
        customMarginsMm: options.customMarginsMm,
        pageProperties: options.pageProperties,
        density: options.density || 'NORMAL',
        fontSizePx: options.fontSizePx,
        fontFamily: options.fontFamily,
        lineHeight: options.lineHeight,
        styles: activeStyles,
        debugLayout,
      };
      return PaginationEngine.paginate(html, effectiveOptions).document;
    },
    [options, activeStyles, debugLayout]
  );

  const [layoutDocument, setLayoutDocument] = useState<LayoutDocument>(() =>
    computeInitialLayout(cleanCanonicalBody)
  );

  const currentLayoutRef = useRef<LayoutDocument>(layoutDocument);
  currentLayoutRef.current = layoutDocument;

  // Sync external prop changes (template selection, undo/redo from parent toolbar)
  useEffect(() => {
    if (!isInternalChangeRef.current && cleanCanonicalBody !== canonicalHtml) {
      setCanonicalHtml(cleanCanonicalBody);
      const newLayout = computeInitialLayout(cleanCanonicalBody);
      setLayoutDocument(newLayout);
      if (historyStackRef.current.length === 0) {
        historyStackRef.current = [cleanCanonicalBody];
        historyIndexRef.current = 0;
      }
    }
    isInternalChangeRef.current = false;
  }, [cleanCanonicalBody, computeInitialLayout, canonicalHtml]);

  const effectiveTotalPages = layoutDocument.totalPages || layoutDocument.pages.length || 1;

  // 3. Save Caret Selection Range & Bookmark
  const saveCaretSelection = useCallback(() => {
    if (!isEditable || !pagesContainerRef.current) return;
    const bookmark = EditorPositionMapper.captureCaretBookmark(
      pagesContainerRef.current,
      currentLayoutRef.current
    );
    if (bookmark) {
      savedBookmarkRef.current = bookmark;
      activePageRef.current = bookmark.pageIndex;
    }
  }, [isEditable]);

  // 4. Restore Caret after Re-pagination
  const restoreCaretSelection = useCallback(() => {
    if (!isEditable || !pagesContainerRef.current || !savedBookmarkRef.current) return;
    requestAnimationFrame(() => {
      if (pagesContainerRef.current && savedBookmarkRef.current) {
        EditorPositionMapper.restoreCaretBookmark(
          pagesContainerRef.current,
          savedBookmarkRef.current,
          currentLayoutRef.current
        );
      }
    });
  }, [isEditable]);

  // Push entry to Undo History Stack
  const pushHistory = useCallback((nextHtml: string) => {
    const stack = historyStackRef.current;
    const currIdx = historyIndexRef.current;
    const newStack = stack.slice(0, currIdx + 1);
    newStack.push(nextHtml);
    if (newStack.length > 50) newStack.shift();
    historyStackRef.current = newStack;
    historyIndexRef.current = newStack.length - 1;
  }, []);

  // Controlled Layout Reflow Execution
  const executeControlledReflow = useCallback(
    (ctx: ReflowExecutionContext) => {
      if (!pagesContainerRef.current) return;

      // Capture bookmark before reading/updating DOM
      saveCaretSelection();

      // Assemble continuous canonical HTML from all discrete page DOM roots
      const updatedCanonicalHtml = PaginatedEditorBridge.assembleCanonicalHtmlFromPages(
        pagesContainerRef.current
      );

      const effectiveOptions: LayoutDocumentOptions = {
        pageSize: options.pageSize || 'A4',
        orientation: options.orientation || 'PORTRAIT',
        margin: options.margin || 'NORMAL',
        customMarginsMm: options.customMarginsMm,
        pageProperties: options.pageProperties,
        density: options.density || 'NORMAL',
        fontSizePx: options.fontSizePx,
        fontFamily: options.fontFamily,
        lineHeight: options.lineHeight,
        styles: activeStyles,
        debugLayout,
      };

      // Perform incremental pagination pass
      const result = PaginationEngine.paginateIncremental(
        currentLayoutRef.current,
        updatedCanonicalHtml,
        effectiveOptions
      );

      const nextLayoutDoc = result.document;
      const prevTotalPages = currentLayoutRef.current.totalPages;
      const nextTotalPages = nextLayoutDoc.totalPages;

      // Update state
      setCanonicalHtml(updatedCanonicalHtml);
      setLayoutDocument(nextLayoutDoc);
      currentLayoutRef.current = nextLayoutDoc;

      pushHistory(updatedCanonicalHtml);

      const finalExportHtml = activeStyles
        ? `<style>${activeStyles}</style>\n${updatedCanonicalHtml}`
        : updatedCanonicalHtml;

      onContentChange?.(finalExportHtml);

      // Selective DOM Patching: only update page containers whose content actually changed
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;

      nextLayoutDoc.pages.forEach((page, pIdx) => {
        const pageEl = pagesContainerRef.current?.querySelector<HTMLElement>(
          `[data-page-index="${page.index}"] [contenteditable="true"]`
        );
        if (!pageEl) return;

        const newHtml = page.htmlContent || '<p><br></p>';
        const isCurrentFocus = activeEl && (activeEl === pageEl || pageEl.contains(activeEl));

        // If the element is currently focused and page count did not change, check if DOM content matches
        if (isCurrentFocus && prevTotalPages === nextTotalPages) {
          const currentClean = stripRuntimePaginationSpacers(pageEl.innerHTML).trim();
          const targetClean = stripRuntimePaginationSpacers(newHtml).trim();
          if (currentClean !== targetClean) {
            pageEl.innerHTML = newHtml;
            lastRenderedHtmlPerPageRef.current[pIdx] = newHtml;
          }
        } else {
          if (lastRenderedHtmlPerPageRef.current[pIdx] !== newHtml || pageEl.innerHTML !== newHtml) {
            pageEl.innerHTML = newHtml;
            lastRenderedHtmlPerPageRef.current[pIdx] = newHtml;
          }
        }
      });

      // Restore caret selection smoothly
      restoreCaretSelection();
    },
    [options, activeStyles, debugLayout, saveCaretSelection, pushHistory, onContentChange, restoreCaretSelection]
  );

  // Initialize EditorTransactionCoordinator
  useEffect(() => {
    coordinatorRef.current = new EditorTransactionCoordinator((ctx) => {
      executeControlledReflow(ctx);
    });

    return () => {
      coordinatorRef.current?.dispose();
    };
  }, [executeControlledReflow]);

  // Handle physical geometry / typography option changes immediately
  useEffect(() => {
    if (!isInternalChangeRef.current) {
      coordinatorRef.current?.enqueue({
        type: 'geometry',
      });
    }
  }, [
    options.pageSize,
    options.orientation,
    options.margin,
    options.customMarginsMm,
    options.fontSizePx,
    options.fontFamily,
    options.lineHeight,
    options.density,
    activeStyles,
  ]);

  // Undo / Redo internal handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevHtml = historyStackRef.current[historyIndexRef.current];
      isInternalChangeRef.current = true;
      setCanonicalHtml(prevHtml);
      const newLayout = computeInitialLayout(prevHtml);
      setLayoutDocument(newLayout);
      currentLayoutRef.current = newLayout;
      onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${prevHtml}` : prevHtml);
      restoreCaretSelection();
    }
  }, [activeStyles, computeInitialLayout, onContentChange, restoreCaretSelection]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextHtml = historyStackRef.current[historyIndexRef.current];
      isInternalChangeRef.current = true;
      setCanonicalHtml(nextHtml);
      const newLayout = computeInitialLayout(nextHtml);
      setLayoutDocument(newLayout);
      currentLayoutRef.current = newLayout;
      onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${nextHtml}` : nextHtml);
      restoreCaretSelection();
    }
  }, [activeStyles, computeInitialLayout, onContentChange, restoreCaretSelection]);

  // 5. Track global selection changes
  useEffect(() => {
    if (!isEditable) return;
    const handleSelectionChange = () => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return; // Do not disturb text highlight drags
      saveCaretSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [saveCaretSelection, isEditable]);

  // 6. Interactive Page Input Handler (Typing, Deleting, Inline Changes)
  const handlePageInput = useCallback(
    (pageIndex: number, e: React.FormEvent<HTMLDivElement>) => {
      if (!isEditable || !pagesContainerRef.current) return;
      isInternalChangeRef.current = true;
      saveCaretSelection();

      coordinatorRef.current?.enqueue({
        type: 'micro',
        sourcePageIndex: pageIndex,
      });
    },
    [isEditable, saveCaretSelection]
  );

  // 7. Keyboard Navigation, Shortcuts, and Page Breaks
  const handlePageKeyDown = useCallback(
    (pageIndex: number, e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !pagesContainerRef.current) return;

      // 1. Ctrl+Enter / Cmd+Enter: Insert explicit semantic manual Page Break
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveCaretSelection();
        PaginatedEditorBridge.insertManualPageBreakAtCaret();
        coordinatorRef.current?.enqueue({
          type: 'structural',
          sourcePageIndex: pageIndex,
        });
        return;
      }

      // 2. Regular Enter: Block split / newline (Structural)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        saveCaretSelection();
        coordinatorRef.current?.enqueue({
          type: 'structural',
          sourcePageIndex: pageIndex,
        });
        return;
      }

      // 3. Ctrl+Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 4. Ctrl+Y / Ctrl+Shift+Z: Redo
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 5. Ctrl+A / Cmd+A: Select all content across all pages
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        PaginatedEditorBridge.selectAllDocument(pagesContainerRef.current);
        return;
      }

      // 6. ArrowDown at the bottom line of Page N -> Move to top of Page N+1
      if (e.key === 'ArrowDown' && pageIndex < effectiveTotalPages - 1) {
        const currentTarget = e.currentTarget as HTMLElement;
        if (EditorPositionMapper.isCaretAtPageEnd(currentTarget)) {
          const nextTarget = pagesContainerRef.current.querySelector<HTMLElement>(
            `[data-page-index="${pageIndex + 1}"] [contenteditable="true"]`
          );
          if (nextTarget) {
            e.preventDefault();
            EditorPositionMapper.moveCaretToPageStart(nextTarget);
            return;
          }
        }
      }

      // 7. ArrowUp at the top line of Page N+1 -> Move to bottom of Page N
      if (e.key === 'ArrowUp' && pageIndex > 0) {
        const currentTarget = e.currentTarget as HTMLElement;
        if (EditorPositionMapper.isCaretAtPageStart(currentTarget)) {
          const prevTarget = pagesContainerRef.current.querySelector<HTMLElement>(
            `[data-page-index="${pageIndex - 1}"] [contenteditable="true"]`
          );
          if (prevTarget) {
            e.preventDefault();
            EditorPositionMapper.moveCaretToPageEnd(prevTarget);
            return;
          }
        }
      }

      // 8. Backspace at the start of Page N+1 -> Merge into end of Page N
      if (e.key === 'Backspace' && pageIndex > 0) {
        const currentTarget = e.currentTarget as HTMLElement;
        if (EditorPositionMapper.isCaretAtPageStart(currentTarget)) {
          const prevTarget = pagesContainerRef.current.querySelector<HTMLElement>(
            `[data-page-index="${pageIndex - 1}"] [contenteditable="true"]`
          );
          if (prevTarget) {
            e.preventDefault();
            EditorPositionMapper.moveCaretToPageEnd(prevTarget);
            coordinatorRef.current?.enqueue({
              type: 'structural',
              sourcePageIndex: pageIndex - 1,
            });
            return;
          }
        }
      }

      // 9. Regular Backspace / Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        saveCaretSelection();
        coordinatorRef.current?.enqueue({
          type: 'micro',
          sourcePageIndex: pageIndex,
        });
      }
    },
    [isEditable, saveCaretSelection, handleUndo, handleRedo, effectiveTotalPages]
  );

  // 8. Paste Handling (Structural transaction)
  const handlePagePaste = useCallback(
    (pageIndex: number, e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!isEditable || !pagesContainerRef.current) return;
      saveCaretSelection();
      coordinatorRef.current?.enqueue({
        type: 'structural',
        sourcePageIndex: pageIndex,
      });
    },
    [isEditable, saveCaretSelection]
  );

  // 9. Cut Handling (Structural transaction)
  const handlePageCut = useCallback(
    (pageIndex: number, e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!isEditable || !pagesContainerRef.current) return;
      saveCaretSelection();
      coordinatorRef.current?.enqueue({
        type: 'structural',
        sourcePageIndex: pageIndex,
      });
    },
    [isEditable, saveCaretSelection]
  );

  // 10. Click Handling inside page container
  const handleSheetClick = useCallback(
    (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditable || !pagesContainerRef.current) return;
      const target = e.target as HTMLElement;

      // If clicked inside contentEditable or an interactive element, allow native focus
      if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
        saveCaretSelection();
        return;
      }

      // Clicked in page margins / blank area
      const pageEl = pagesContainerRef.current.querySelector<HTMLElement>(
        `[data-page-index="${pageIndex}"] [contenteditable="true"]`
      );
      if (pageEl) {
        EditorPositionMapper.moveCaretToPageEnd(pageEl);
        saveCaretSelection();
      }
    },
    [isEditable, saveCaretSelection]
  );

  // 11. Listen for global events triggered from formatting toolbar or shortcuts
  useEffect(() => {
    const handleGlobalInsertPageBreak = () => {
      if (!isEditable || !pagesContainerRef.current) return;
      saveCaretSelection();
      PaginatedEditorBridge.insertManualPageBreakAtCaret();
      coordinatorRef.current?.enqueue({
        type: 'structural',
        sourcePageIndex: activePageRef.current,
      });
    };

    const handleGlobalFormatChange = () => {
      if (!isEditable || !pagesContainerRef.current) return;
      saveCaretSelection();
      coordinatorRef.current?.enqueue({
        type: 'style',
        sourcePageIndex: activePageRef.current,
      });
    };

    const handleGlobalTableInsert = () => {
      if (!isEditable || !pagesContainerRef.current) return;
      saveCaretSelection();
      coordinatorRef.current?.enqueue({
        type: 'structural',
        sourcePageIndex: activePageRef.current,
      });
    };

    window.addEventListener('spr_doclab_insert_page_break', handleGlobalInsertPageBreak);
    window.addEventListener('spr_doclab_format_change', handleGlobalFormatChange);
    window.addEventListener('spr_doclab_insert_table', handleGlobalTableInsert);

    return () => {
      window.removeEventListener('spr_doclab_insert_page_break', handleGlobalInsertPageBreak);
      window.removeEventListener('spr_doclab_format_change', handleGlobalFormatChange);
      window.removeEventListener('spr_doclab_insert_table', handleGlobalTableInsert);
    };
  }, [isEditable, saveCaretSelection]);

  return (
    <div
      ref={pagesContainerRef}
      className={`paginated-document-editor doclab-paginated-editor flex flex-col items-center gap-8 print:gap-0 print:block w-full ${className}`}
    >
      {/* Shared Document Styles Injected Once */}
      {activeStyles && (
        <style
          dangerouslySetInnerHTML={{
            __html: activeStyles.replace(/<\/?style\b[^>]*>/gi, ''),
          }}
        />
      )}

      {/* Visual Manual Page Break Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .spr-page-break {
              display: block;
              margin: 16px 0;
              position: relative;
              user-select: none;
              -webkit-user-select: none;
              padding: 6px 0;
              cursor: default;
            }
            .spr-page-break-divider {
              border: none;
              border-top: 1px dashed var(--accent-main, #3b82f6);
              opacity: 0.5;
              margin: 0;
            }
            .spr-page-break-badge {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: var(--bg-elevated, #1e293b);
              padding: 2px 10px;
              font-size: 9.5px;
              font-weight: 700;
              color: var(--text-secondary, #94a3b8);
              border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
              border-radius: 9999px;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              pointer-events: none;
            }
            @media print {
              .spr-page-break {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Discrete Physical Paper Pages */}
      {layoutDocument.pages.map((page: LayoutPage, pageIndex: number) => {
        const marginPadding = `${page.margins.top}px ${page.margins.right}px ${page.margins.bottom}px ${page.margins.left}px`;
        const pageSize = options.pageSize || 'A4';
        const orientation = options.orientation || 'PORTRAIT';
        const marginPreset = options.margin || 'NORMAL';
        const density = options.density || 'NORMAL';
        const colorMode = options.colorMode || 'FULL_COLOR';

        return (
          <div
            key={`paginated_page_${page.index}`}
            id={`docx-live-page-${page.index}`}
            data-page-index={page.index}
            className="relative paper-sheet-wrapper group flex flex-col items-center mb-8 print:mb-0 print:block w-full"
          >
            {/* Screen Page Header Controls */}
            <div
              style={{
                width: `${page.width}px`,
                maxWidth: `${page.width}px`,
              }}
              className="flex items-center justify-between px-2 py-1 mb-1.5 text-xs theme-text-secondary select-none print:hidden"
            >
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full theme-bg-accent" />
                <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                  Page {page.pageNumber} of {effectiveTotalPages} ({pageSize} &bull; {orientation})
                </span>
                <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
                  {Math.round(page.width)} × {Math.round(page.height)}px
                </span>
                {debugLayout && (
                  <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-sm font-mono">
                    Used: {Math.round(page.usedHeight)}px &bull; Rem: {Math.round(page.availableHeight)}px
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pageIndex === 0 && (
                  <span className="text-[11px] theme-text-muted hidden md:inline">
                    Press <kbd className="px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono text-[10px]">Ctrl+Enter</kbd> for new page
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('spr_doclab_insert_page_break'));
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md theme-bg-accent text-white hover:opacity-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 pointer-events-auto"
                  title="Insert a manual page break to create a new physical page (Ctrl + Enter)"
                >
                  <PageBreakIcon className="w-3.5 h-3.5" />
                  <span>+ Add Page</span>
                </button>
              </div>
            </div>

            {/* Real Physical Paper Sheet Container with Exact Dimensions & Margins */}
            <div
              className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-xl select-text"
              data-page-index={page.index}
              data-size={pageSize}
              data-orientation={orientation}
              data-margin={marginPreset}
              data-density={density}
              data-color-mode={colorMode}
              data-page-break="true"
              style={{
                backgroundColor: transparentBackground ? 'transparent' : '#ffffff',
                color: '#0f172a',
                width: `${page.width}px`,
                maxWidth: `${page.width}px`,
                minHeight: `${page.height}px`,
                height: `${page.height}px`,
                maxHeight: `${page.height}px`,
                padding: marginPadding,
                textAlign: 'left',
                boxSizing: 'border-box',
                overflow: 'hidden', // Page overflow isolation!
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
              onClick={(e) => handleSheetClick(pageIndex, e)}
            >
              {/* Real Page Content Region */}
              <div
                id={`page-editable-${page.index}`}
                data-page-index={page.index}
                contentEditable={isEditable}
                suppressContentEditableWarning={true}
                onInput={(e) => handlePageInput(pageIndex, e)}
                onKeyDown={(e) => handlePageKeyDown(pageIndex, e)}
                onPaste={(e) => handlePagePaste(pageIndex, e)}
                onFocus={saveCaretSelection}
                onBlur={saveCaretSelection}
                dangerouslySetInnerHTML={{
                  __html: page.htmlContent || '<p><br></p>',
                }}
                className="docx-page-content-area docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !text-slate-900 w-full h-full text-left focus:outline-none cursor-text select-text"
                style={{
                  backgroundColor: 'transparent',
                  color: '#0f172a',
                  textAlign: 'left',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  minHeight: '100%',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PaginatedDocumentEditor = memo(PaginatedDocumentEditorComponent);
export default PaginatedDocumentEditor;
