/**
 * PaginatedDocumentEditor
 *
 * Authoritative Single-Host Continuous Document Editor for SPR Note DocLab.
 *
 * Core Principles:
 * 1. Exactly ONE single authoritative editing host (contentEditable="true").
 * 2. Visual continuous paper sheet simulation canvas sized according to PageGeometry.
 * 3. 100% native browser typing, selection, caret stability, and clipboard flow.
 * 4. Zero fragment splitting, zero synthetic projection layers, zero height clipping.
 * 5. Full support for ribbon commands, tokens, headings, lists, tables, images, and undo/redo.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
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
  const lastExportedHtmlRef = useRef<string | null>(null);
  const savedSelectionBookmarkRef = useRef<any>(null);

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

  // Restore saved selection bookmark
  const restoreSelection = useCallback(() => {
    if (!editorHostRef.current || !savedSelectionBookmarkRef.current) return;
    try {
      EditorPositionMapper.restoreLogicalSelection(editorHostRef.current, savedSelectionBookmarkRef.current);
    } catch {
      // ignore
    }
  }, []);

  // Sync external HTML changes to DOM host
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
      }
    }
    isInternalChangeRef.current = false;
  }, [cleanCanonicalBody]);

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
    },
    [activeStyles, onContentChange]
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
  }, [isEditable, saveSelection, activeStyles, onContentChange]);

  // Native Input Handler with Debounced Synchronization
  const handleInput = useCallback(() => {
    if (!isEditable || !editorHostRef.current) return;
    isInternalChangeRef.current = true;
    saveSelection();

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
  }, [isEditable, saveSelection, dispatchTransaction]);

  // Native Keydown Handler (Enter, Ctrl+Enter, Ctrl+Z, Ctrl+Y, Tab)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;

      // Ctrl+Enter or Cmd+Enter: Insert explicit manual page break
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Enter (normal): Split block or create logical paragraph
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        const tx = EditorCommands.insertParagraph(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Ctrl+Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        const prevHtml = historyRef.current.undo();
        if (prevHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = prevHtml;
          isInternalChangeRef.current = true;
          lastExportedHtmlRef.current = prevHtml;
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${prevHtml}` : prevHtml);
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        const nextHtml = historyRef.current.redo();
        if (nextHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = nextHtml;
          isInternalChangeRef.current = true;
          lastExportedHtmlRef.current = nextHtml;
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${nextHtml}` : nextHtml);
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
    [isEditable, dispatchTransaction, onContentChange, activeStyles, handleInput]
  );

  // Paste Handler
  const handlePaste = useCallback(() => {
    saveSelection();
    setTimeout(() => {
      handleInput();
    }, 10);
  }, [saveSelection, handleInput]);

  // Click on empty canvas margin to focus editor at end
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

      {/* Visual Page Break Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .spr-page-break {
              display: block;
              page-break-after: always;
              break-after: page;
              margin: 40px -42px 40px -42px;
              position: relative;
              user-select: none;
              -webkit-user-select: none;
              background: #090d16;
              padding: 20px 0;
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
              .spr-page-break-badge {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Physical Paper Sheet Canvas */}
      <div
        className="paper-sheet-wrapper flex flex-col items-center group relative mb-8 print:mb-0 print:block"
        style={{
          width: `${pageGeometry.paperDimensionsPx.width}px`,
          maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
        }}
      >
        {/* Screen-Only Top Physical Page Header Bar */}
        <div
          style={{ width: `${pageGeometry.paperDimensionsPx.width}px` }}
          className="flex items-center justify-between px-2 py-1 mb-1 text-xs theme-text-secondary select-none print:hidden w-full"
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span className="font-bold theme-text-primary font-mono text-[11.5px]">
              Document Canvas ({options.pageSize || 'A4'} • {options.orientation || 'PORTRAIT'})
            </span>
            <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
              {Math.round(pageGeometry.paperDimensionsPx.width)} × {Math.round(pageGeometry.paperDimensionsPx.height)}px
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (editorHostRef.current) {
                const tx = EditorCommands.insertManualPageBreak(editorHostRef.current);
                dispatchTransaction(tx);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold theme-bg-elevated theme-text-secondary hover:theme-accent transition-colors border theme-border cursor-pointer shadow-2xs"
            title="Insert an explicit manual page break at cursor (Ctrl+Enter)"
          >
            <PageBreakIcon className="w-3.5 h-3.5" />
            <span>+ Page Break</span>
          </button>
        </div>

        {/* Physical Paper Sheet Surface */}
        <div
          onClick={handleSheetClick}
          className="paper-sheet docx-paper-sheet relative text-left box-border shadow-xl rounded-xs print:shadow-none print:border-none print:w-full print:m-0 print:bg-white flex flex-col cursor-text select-text"
          data-size={options.pageSize || 'A4'}
          data-orientation={options.orientation || 'PORTRAIT'}
          data-margin={options.margin || 'NORMAL'}
          data-density={options.density || 'NORMAL'}
          data-page-break="true"
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            width: `${pageGeometry.paperDimensionsPx.width}px`,
            maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
            minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
            padding: pageGeometry.cssMarginString,
            boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          {/* The Authoritative Single contentEditable Host */}
          <div
            ref={editorHostRef}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            data-doclab-single-host="true"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onInput={handleInput}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            className="doclab-single-host-editor docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !bg-white !text-slate-900 w-full min-h-[500px] outline-none text-left select-text cursor-text focus:outline-none"
            style={{
              width: '100%',
              minHeight: '100%',
              boxSizing: 'border-box',
              outline: 'none',
              wordBreak: 'break-word',
              textAlign: 'left',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const PaginatedDocumentEditor = memo(PaginatedDocumentEditorComponent);
export default PaginatedDocumentEditor;
