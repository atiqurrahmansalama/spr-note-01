/**
 * PaginatedDocumentEditor
 *
 * Authoritative Single-Host Real Browser Automatic Pagination Document Editor for SPR Note DocLab.
 *
 * Core Principles:
 * 1. Exactly ONE single authoritative editing host (contentEditable="true") for all pages.
 * 2. Visual physical A4/Letter paper cards rendered beneath the continuous editing host.
 * 3. Real DOM measurement algorithm that detects when blocks cross printable page boundaries
 *    and inserts non-canonical runtime page-jump spacers.
 * 4. 100% native browser typing, selection, caret survival, and clipboard flow across all pages.
 * 5. Persistent canonical HTML remains 100% pure and clean of runtime spacers or page shells.
 * 6. Full support for ribbon commands, tokens, headings, lists, tables, images, and undo/redo.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { PageGeometryCalculator, PageGeometry } from '../geometry/PageGeometry';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { separateDocxStylesAndBody } from '../../docxStyleUtils';
import { EditorSerializer } from './EditorSerializer';
import { EditorHistory } from './EditorHistory';
import { EditorCommands } from './EditorCommands';
import { EditorDomAdapter } from './EditorDomAdapter';
import { EditorPositionMapper } from './EditorPositionMapper';
import { EditorTransaction } from './editorTypes';
import { PageBreakIcon } from '../../../ui/Icons';

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

const PAGE_GAP_PX = 32;
const SCREEN_HEADER_HEIGHT_PX = 32;

/**
 * Measures real browser DOM blocks inside the single contentEditable host
 * and places runtime page-jump spacers so content flows onto sequential physical pages.
 */
function repaginateHostDOM(
  host: HTMLElement,
  geometry: PageGeometry
): { totalPages: number } {
  if (!host || typeof window === 'undefined') {
    return { totalPages: 1 };
  }

  const paperHeight = geometry.paperDimensionsPx.height;
  const marginTop = geometry.marginsPx.top;
  const marginBottom = geometry.marginsPx.bottom;
  const availHeight = Math.max(120, paperHeight - marginTop - marginBottom);
  const baseJump = marginBottom + PAGE_GAP_PX + SCREEN_HEADER_HEIGHT_PX + marginTop;

  const children = Array.from(host.children) as HTMLElement[];
  if (children.length === 0) {
    return { totalPages: 1 };
  }

  let currentPage = 1;
  let currentY = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    // If child is a runtime spacer we previously created, skip its height accumulation
    if (child.getAttribute('data-spr-runtime-pagination') === 'true') {
      continue;
    }

    // Check if child is an explicit manual page break (Ctrl+Enter)
    const isManualBreak =
      child.getAttribute('data-manual-break') === 'true' ||
      child.classList.contains('spr-page-break') ||
      child.querySelector?.('[data-manual-break="true"], .spr-page-break') !== null;

    if (isManualBreak) {
      const remainingOnPage = Math.max(0, availHeight - currentY);
      const spacerHeight = remainingOnPage + baseJump;

      // Ensure runtime spacer immediately follows the manual page break if more content exists
      const nextSibling = child.nextElementSibling as HTMLElement | null;
      if (nextSibling && nextSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
        nextSibling.style.height = `${spacerHeight}px`;
      } else if (nextSibling) {
        const spacer = createRuntimeSpacer(spacerHeight);
        child.parentNode?.insertBefore(spacer, nextSibling);
      }

      currentPage += 1;
      currentY = 0;
      continue;
    }

    // Measure actual rendered block height in the real browser DOM
    const rect = child.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(child);
    const mTop = parseFloat(computedStyle.marginTop) || 0;
    const mBottom = parseFloat(computedStyle.marginBottom) || 0;
    const blockHeight = (child.offsetHeight || rect.height || 24) + mTop + mBottom;

    // Check if this block fits on the current page
    const fitsOnCurrentPage = currentY + blockHeight <= availHeight || currentY === 0;

    if (fitsOnCurrentPage) {
      // Block fits on current page.
      // Remove any preceding runtime spacer if it was left from a previous state
      const prevSibling = child.previousElementSibling as HTMLElement | null;
      if (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
        // Only remove if previous block was NOT a manual break
        const prevPrevSibling = prevSibling.previousElementSibling as HTMLElement | null;
        const isPrevManualBreak =
          prevPrevSibling &&
          (prevPrevSibling.getAttribute('data-manual-break') === 'true' ||
            prevPrevSibling.classList.contains('spr-page-break'));
        if (!isPrevManualBreak) {
          prevSibling.remove();
        }
      }
      currentY += blockHeight;
    } else {
      // Block overflows current page! Push it cleanly to the top of the next page.
      const remainingOnPage = Math.max(0, availHeight - currentY);
      const spacerHeight = remainingOnPage + baseJump;

      const prevSibling = child.previousElementSibling as HTMLElement | null;
      if (prevSibling && prevSibling.getAttribute('data-spr-runtime-pagination') === 'true') {
        prevSibling.style.height = `${spacerHeight}px`;
      } else {
        const spacer = createRuntimeSpacer(spacerHeight);
        child.parentNode?.insertBefore(spacer, child);
      }

      currentPage += 1;
      currentY = blockHeight;
    }
  }

  // Remove any trailing spacer at the very end of host
  const lastChild = host.lastElementChild as HTMLElement | null;
  if (lastChild && lastChild.getAttribute('data-spr-runtime-pagination') === 'true') {
    lastChild.remove();
  }

  return { totalPages: Math.max(1, currentPage) };
}

function createRuntimeSpacer(heightPx: number): HTMLElement {
  const spacer = document.createElement('div');
  spacer.setAttribute('data-spr-runtime-pagination', 'true');
  spacer.setAttribute('contenteditable', 'false');
  spacer.className = 'spr-runtime-page-spacer select-none pointer-events-none print:hidden';
  spacer.style.height = `${Math.max(0, heightPx)}px`;
  spacer.style.width = '100%';
  spacer.style.display = 'block';
  spacer.style.userSelect = 'none';
  spacer.style.pointerEvents = 'none';
  spacer.style.margin = '0';
  spacer.style.padding = '0';
  return spacer;
}

export const PaginatedDocumentEditorComponent: React.FC<PaginatedDocumentEditorProps> = ({
  htmlContent = '<p><br></p>',
  styles = '',
  isEditable = true,
  onContentChange,
  options = {},
  className = '',
}) => {
  // Authoritative logical editing host ref
  const editorHostRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);
  const repaginateTimerRef = useRef<any>(null);
  const lastExportedHtmlRef = useRef<string | null>(null);
  const savedSelectionBookmarkRef = useRef<any>(null);

  // Total pages derived from real DOM geometry
  const [totalPagesCount, setTotalPagesCount] = useState<number>(1);

  // 1. Separate styles and clean canonical body
  const { styles: extractedStyles, body: extractedBody } = useMemo(() => {
    return separateDocxStylesAndBody(htmlContent || '');
  }, [htmlContent]);

  const cleanCanonicalBody = useMemo(() => {
    const raw = extractedBody && extractedBody.trim() ? extractedBody : '<p><br></p>';
    return EditorSerializer.sanitize(raw);
  }, [extractedBody]);

  const activeStyles = useMemo(() => {
    const raw = styles || extractedStyles || '';
    return raw.replace(/<\/?style\b[^>]*>/gi, '').trim();
  }, [styles, extractedStyles]);

  // History Manager
  const historyRef = useRef<EditorHistory>(new EditorHistory(cleanCanonicalBody));

  // Page geometry from centralized PageGeometryCalculator
  const pageGeometry = useMemo(() => {
    return PageGeometryCalculator.calculate({
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'PORTRAIT',
      margin: options.margin || 'NORMAL',
      customMarginsMm: options.customMarginsMm,
      pageProperties: options.pageProperties,
      density: options.density || 'NORMAL',
    });
  }, [
    options.pageSize,
    options.orientation,
    options.margin,
    options.customMarginsMm,
    options.pageProperties,
    options.density,
  ]);

  // Save current logical selection bookmark
  const saveSelection = useCallback(() => {
    if (!editorHostRef.current) return;
    try {
      const bookmark = EditorPositionMapper.captureLogicalSelection(editorHostRef.current);
      if (bookmark) {
        savedSelectionBookmarkRef.current = bookmark;
      }
    } catch {
      // ignore
    }
  }, []);

  // Real DOM Pagination trigger
  const runPaginationPass = useCallback(() => {
    if (!editorHostRef.current) return;
    try {
      const res = repaginateHostDOM(editorHostRef.current, pageGeometry);
      setTotalPagesCount(res.totalPages);
    } catch (e) {
      console.warn('Pagination calculation error:', e);
    }
  }, [pageGeometry]);

  const schedulePaginationPass = useCallback(() => {
    if (repaginateTimerRef.current) {
      clearTimeout(repaginateTimerRef.current);
    }
    repaginateTimerRef.current = setTimeout(() => {
      runPaginationPass();
    }, 40);
  }, [runPaginationPass]);

  // Initial mount and external sync
  useEffect(() => {
    if (!editorHostRef.current) return;

    // Do NOT clobber the user's DOM if actively focused and typing
    if (isFocusedRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (lastExportedHtmlRef.current === cleanCanonicalBody) {
      isInternalChangeRef.current = false;
      return;
    }

    if (!isInternalChangeRef.current) {
      const currentCleanDom = EditorSerializer.sanitize(editorHostRef.current.innerHTML);
      if (currentCleanDom !== cleanCanonicalBody) {
        editorHostRef.current.innerHTML = cleanCanonicalBody;
        historyRef.current.reset(cleanCanonicalBody);
        schedulePaginationPass();
      }
    }
    isInternalChangeRef.current = false;
  }, [cleanCanonicalBody, schedulePaginationPass]);

  // Geometry or styles change -> recalculate pagination
  useEffect(() => {
    runPaginationPass();
  }, [runPaginationPass]);

  // Font loading readiness listener
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        runPaginationPass();
      });
    }
  }, [runPaginationPass]);

  // Centralized Transaction Dispatcher
  const dispatchTransaction = useCallback(
    (tx: EditorTransaction) => {
      isInternalChangeRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const cleanHtml = EditorSerializer.sanitize(tx.canonicalHtml);
      historyRef.current.push(tx);
      lastExportedHtmlRef.current = cleanHtml;

      const finalExportHtml = activeStyles
        ? `<style>${activeStyles}</style>\n${cleanHtml}`
        : cleanHtml;

      onContentChange?.(finalExportHtml);
      schedulePaginationPass();
    },
    [activeStyles, onContentChange, schedulePaginationPass]
  );

  // Focus & Blur Handlers
  const handleFocus = useCallback(() => {
    if (!isEditable) return;
    isFocusedRef.current = true;
    saveSelection();
  }, [isEditable, saveSelection]);

  const handleBlur = useCallback(() => {
    if (!isEditable || !editorHostRef.current) return;
    isFocusedRef.current = false;
    saveSelection();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentRaw = editorHostRef.current.innerHTML;
    const cleanHtml = EditorSerializer.sanitize(currentRaw);
    lastExportedHtmlRef.current = cleanHtml;

    const finalExportHtml = activeStyles
      ? `<style>${activeStyles}</style>\n${cleanHtml}`
      : cleanHtml;

    onContentChange?.(finalExportHtml);
    runPaginationPass();
  }, [isEditable, saveSelection, activeStyles, onContentChange, runPaginationPass]);

  // Native Input Handler with Debounced Synchronization
  const handleInput = useCallback(() => {
    if (!isEditable || !editorHostRef.current) return;
    isInternalChangeRef.current = true;
    saveSelection();

    // Trigger immediate micro-pass for fast visual feedback
    schedulePaginationPass();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!editorHostRef.current) return;
      const rawDom = editorHostRef.current.innerHTML;
      const cleanHtml = EditorSerializer.sanitize(rawDom);
      const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

      dispatchTransaction({
        doc,
        canonicalHtml: cleanHtml,
        origin: 'typing',
        timestamp: Date.now(),
        description: 'Typing input',
      });
    }, 150);
  }, [isEditable, saveSelection, schedulePaginationPass, dispatchTransaction]);

  // Native Keydown Handler (Enter, Ctrl+Enter, Ctrl+Z, Ctrl+Y, Tab)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;

      // Ctrl+Enter or Cmd+Enter: Insert explicit manual page break
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Enter (normal): Split block or create logical paragraph
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const tx = EditorCommands.insertParagraph(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Ctrl+Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const prevHtml = historyRef.current.undo();
        if (prevHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = prevHtml;
          isInternalChangeRef.current = true;
          lastExportedHtmlRef.current = prevHtml;
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${prevHtml}` : prevHtml);
          schedulePaginationPass();
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        const nextHtml = historyRef.current.redo();
        if (nextHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = nextHtml;
          isInternalChangeRef.current = true;
          lastExportedHtmlRef.current = nextHtml;
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${nextHtml}` : nextHtml);
          schedulePaginationPass();
        }
        return;
      }

      // Tab key: Indent
      if (e.key === 'Tab') {
        e.preventDefault();
        EditorDomAdapter.insertTextAtSelection(editorHostRef.current, '    ');
        handleInput();
      }
    },
    [isEditable, dispatchTransaction, onContentChange, activeStyles, schedulePaginationPass, handleInput]
  );

  // Paste Handler
  const handlePaste = useCallback(() => {
    saveSelection();
    setTimeout(() => {
      handleInput();
      runPaginationPass();
    }, 10);
  }, [saveSelection, handleInput, runPaginationPass]);

  // Click on empty canvas margin to focus editor at end without collapsing selection
  const handleSheetClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;

      const sel = typeof window !== 'undefined' ? window.getSelection() : null;
      if (sel && !sel.isCollapsed) return;

      const target = e.target as HTMLElement;
      if (target !== editorHostRef.current && editorHostRef.current.contains(target)) {
        saveSelection();
        return;
      }

      // If clicked on empty sheet padding/margin:
      try {
        editorHostRef.current.focus({ preventScroll: true });
        const leafElements = Array.from(
          editorHostRef.current.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
        ) as HTMLElement[];

        if (leafElements.length === 0) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          editorHostRef.current.appendChild(p);
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
          saveSelection();
          return;
        }

        const lastEl = leafElements[leafElements.length - 1];
        const range = document.createRange();
        range.selectNodeContents(lastEl);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
        saveSelection();
      } catch (err) {
        console.warn('Click focus error', err);
      }
    },
    [isEditable, saveSelection]
  );

  // Insert Manual Page Break Handler
  const handleManualPageBreak = useCallback(() => {
    if (!editorHostRef.current) return;
    const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
    dispatchTransaction(tx);
  }, [dispatchTransaction]);

  // Global Command Listener (for Formatting Ribbon, Sidebar, and Shortcuts)
  useEffect(() => {
    const handleCommandEvent = (e: CustomEvent) => {
      if (!isEditable || !editorHostRef.current) return;
      const { command, value, options: cmdOpts } = e.detail || {};

      switch (command) {
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strike':
        case 'code':
        case 'color':
        case 'backgroundColor':
        case 'fontSize':
        case 'fontFamily': {
          const tx = EditorCommands.applyMark(editorHostRef.current, command, value);
          dispatchTransaction(tx);
          break;
        }
        case 'heading': {
          const targetTag = (`h${value || 1}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, targetTag);
          dispatchTransaction(tx);
          break;
        }
        case 'paragraph': {
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, 'p');
          dispatchTransaction(tx);
          break;
        }
        case 'unordered-list':
        case 'bullet-list': {
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, 'ul');
          dispatchTransaction(tx);
          break;
        }
        case 'ordered-list': {
          const tx = EditorCommands.toggleBlockType(editorHostRef.current, 'ol');
          dispatchTransaction(tx);
          break;
        }
        case 'align':
        case 'justifyLeft':
        case 'justifyCenter':
        case 'justifyRight':
        case 'justifyFull': {
          const alignMap: Record<string, any> = {
            justifyLeft: 'left',
            justifyCenter: 'center',
            justifyRight: 'right',
            justifyFull: 'justify',
            left: 'left',
            center: 'center',
            right: 'right',
            justify: 'justify',
          };
          const alignVal = alignMap[command] || alignMap[value] || 'left';
          const tx = EditorCommands.setAlignment(editorHostRef.current, alignVal);
          dispatchTransaction(tx);
          break;
        }
        case 'insertTable': {
          const tx = EditorCommands.insertTable(editorHostRef.current, cmdOpts?.rows || 3, cmdOpts?.cols || 3);
          dispatchTransaction(tx);
          break;
        }
        case 'insertImage': {
          const tx = EditorCommands.insertImage(editorHostRef.current, { src: value, ...cmdOpts });
          dispatchTransaction(tx);
          break;
        }
        case 'insertSvg': {
          const tx = EditorCommands.insertSvg(editorHostRef.current, value);
          dispatchTransaction(tx);
          break;
        }
        case 'insertToken': {
          const tokenPayload =
            typeof value === 'object' && value !== null
              ? value
              : {
                  key: typeof value === 'string' ? value : cmdOpts?.key || '',
                  ...cmdOpts,
                };
          const tx = EditorCommands.insertToken(editorHostRef.current, tokenPayload);
          dispatchTransaction(tx);
          break;
        }
        case 'insertPageBreak': {
          const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        case 'removeFormat': {
          const tx = EditorCommands.removeFormat(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        default:
          break;
      }
    };

    const handlePageBreakEvent = () => {
      if (!isEditable || !editorHostRef.current) return;
      const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
      dispatchTransaction(tx);
    };

    const handleTokenInsertEvent = (e: CustomEvent) => {
      if (!isEditable || !editorHostRef.current) return;
      const key = e.detail?.key || e.detail?.token || '';
      if (key) {
        const tx = EditorCommands.insertToken(editorHostRef.current, key, e.detail?.category);
        dispatchTransaction(tx);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('spr_doclab_editor_command' as any, handleCommandEvent);
      window.addEventListener('spr_doclab_insert_page_break' as any, handlePageBreakEvent);
      window.addEventListener('spr_doclab_insert_token' as any, handleTokenInsertEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('spr_doclab_editor_command' as any, handleCommandEvent);
        window.removeEventListener('spr_doclab_insert_page_break' as any, handlePageBreakEvent);
        window.removeEventListener('spr_doclab_insert_token' as any, handleTokenInsertEvent);
      }
    };
  }, [isEditable, dispatchTransaction]);

  return (
    <div
      className={`paginated-document-editor relative flex flex-col items-center select-text ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Active Document CSS Style Element */}
      {activeStyles && <style dangerouslySetInnerHTML={{ __html: activeStyles }} />}

      {/* Visual Page Break & Pagination Spacer Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .spr-page-break {
              display: block;
              page-break-after: always;
              break-after: page;
              margin: 16px 0;
              position: relative;
              user-select: none;
              -webkit-user-select: none;
              background: #090d16;
              padding: 10px 0;
              min-height: 24px;
              height: 24px;
              box-sizing: border-box;
              border-top: 1.5px solid rgba(0, 0, 0, 0.4);
              border-bottom: 1.5px solid rgba(0, 0, 0, 0.4);
              box-shadow: inset 0 8px 16px -4px rgba(0, 0, 0, 0.75), inset 0 -8px 16px -4px rgba(0, 0, 0, 0.75);
              cursor: default;
            }
            .spr-page-break-divider {
              border: none;
              border-top: 1px dashed rgba(255, 255, 255, 0.2);
              margin: 0;
            }
            .spr-page-break-badge {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: #1e293b;
              padding: 3px 14px;
              font-size: 10px;
              font-weight: 700;
              color: #94a3b8;
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 9999px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
              letter-spacing: 0.06em;
              text-transform: uppercase;
              pointer-events: none;
            }
            .spr-runtime-page-spacer {
              display: block;
              user-select: none;
              -webkit-user-select: none;
              pointer-events: none;
              background: transparent;
            }
            @media print {
              .spr-page-break {
                display: block !important;
                page-break-after: always !important;
                break-after: page !important;
                margin: 0 !important;
                padding: 0 !important;
                height: 0 !important;
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
              }
              .spr-page-break-divider,
              .spr-page-break-badge,
              .spr-runtime-page-spacer {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Main Container Positioning Underlying Physical Sheets and Overlaid Single Host */}
      <div
        className="relative flex flex-col items-center select-text"
        style={{
          width: `${pageGeometry.paperDimensionsPx.width}px`,
          maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
        }}
      >
        {/* 1. Underlying Visual Physical Paper Cards Layer (Sequential A4 Sheets) */}
        <div
          className="absolute inset-0 pointer-events-none flex flex-col items-center select-none"
          style={{
            width: `${pageGeometry.paperDimensionsPx.width}px`,
            zIndex: 0,
          }}
        >
          {Array.from({ length: totalPagesCount }).map((_, pageIdx) => {
            const pageNum = pageIdx + 1;
            const isFirst = pageIdx === 0;

            return (
              <div
                key={`visual_page_sheet_${pageIdx}`}
                id={`docx-visual-sheet-${pageIdx}`}
                className="paper-sheet-wrapper flex flex-col items-center mb-8 print:mb-0"
                style={{
                  width: `${pageGeometry.paperDimensionsPx.width}px`,
                  maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                }}
              >
                {/* Screen-Only Top Physical Page Header Bar */}
                <div
                  style={{
                    width: `${pageGeometry.paperDimensionsPx.width}px`,
                    height: `${SCREEN_HEADER_HEIGHT_PX}px`,
                  }}
                  className="flex items-center justify-between px-2 py-1 text-xs theme-text-secondary select-none print:hidden w-full pointer-events-auto box-border"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
                    <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                      Page {pageNum} of {totalPagesCount} ({options.pageSize || 'A4'} • {options.orientation || 'PORTRAIT'})
                    </span>
                    <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
                      {Math.round(pageGeometry.paperDimensionsPx.width)} × {Math.round(pageGeometry.paperDimensionsPx.height)}px
                    </span>
                  </div>

                  {isFirst && (
                    <button
                      type="button"
                      onClick={handleManualPageBreak}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold theme-bg-elevated theme-text-secondary hover:theme-accent transition-colors border theme-border cursor-pointer shadow-2xs"
                      title="Insert an explicit manual page break at cursor (Ctrl+Enter)"
                    >
                      <PageBreakIcon className="w-3.5 h-3.5" />
                      <span>+ Page Break</span>
                    </button>
                  )}
                </div>

                {/* Physical Paper Sheet White Surface with Shadow */}
                <div
                  className="paper-sheet docx-paper-sheet relative text-left box-border shadow-xl rounded-xs print:shadow-none print:border-none print:w-full print:m-0 print:bg-white"
                  data-size={options.pageSize || 'A4'}
                  data-orientation={options.orientation || 'PORTRAIT'}
                  data-margin={options.margin || 'NORMAL'}
                  data-density={options.density || 'NORMAL'}
                  data-page-index={pageIdx}
                  data-page-break="true"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    width: `${pageGeometry.paperDimensionsPx.width}px`,
                    maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                    height: `${pageGeometry.paperDimensionsPx.height}px`,
                    minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                    maxHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 2. Top-Level Authoritative contentEditable Host */}
        <div
          ref={editorHostRef}
          contentEditable={isEditable}
          suppressContentEditableWarning={true}
          data-doclab-single-host="true"
          onClick={handleSheetClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className="doclab-single-host-editor docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !text-slate-900 w-full text-left focus:outline-none cursor-text select-text relative z-10"
          style={{
            width: `${pageGeometry.paperDimensionsPx.width}px`,
            maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
            marginTop: `${SCREEN_HEADER_HEIGHT_PX}px`,
            paddingTop: `${pageGeometry.marginsPx.top}px`,
            paddingBottom: `${pageGeometry.marginsPx.bottom}px`,
            paddingLeft: `${pageGeometry.marginsPx.left}px`,
            paddingRight: `${pageGeometry.marginsPx.right}px`,
            minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
            boxSizing: 'border-box',
            outline: 'none',
            wordBreak: 'break-word',
            textAlign: 'left',
            backgroundColor: 'transparent',
            color: '#0f172a',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
      </div>
    </div>
  );
};

export const PaginatedDocumentEditor = memo(PaginatedDocumentEditorComponent);
export default PaginatedDocumentEditor;
