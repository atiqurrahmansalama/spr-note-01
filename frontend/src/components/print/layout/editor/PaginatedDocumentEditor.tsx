/**
 * PaginatedDocumentEditor
 *
 * Authoritative Word-Grade Document Editor for SPR Note DocLab.
 *
 * Core Architectural Invariants:
 * 1. Exactly ONE logical editing host (contentEditable="true") for the entire document.
 * 2. Visual page sheets are derived runtime layout projections only (never independent editing roots).
 * 3. Native browser selection works seamlessly across all pages (Ctrl+A selects entire document).
 * 4. Zero runtime pagination artifacts, spacers, or sheet tags are saved in canonical content.
 * 5. All mutations flow through transactional editor commands.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, PaginationEngineResult } from '../types/paginationTypes';
import { separateDocxStylesAndBody } from '../../docxStyleUtils';
import { EditorSerializer } from './EditorSerializer';
import { EditorHistory } from './EditorHistory';
import { EditorCommands } from './EditorCommands';
import { EditorDomAdapter } from './EditorDomAdapter';
import { EditorPositionMapper } from './EditorPositionMapper';
import { EditorTransaction, LogicalSelection } from './editorTypes';
import { FontLoadingCoordinator } from '../performance/FontLoadingCoordinator';
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
  debugLayout = false,
}) => {
  // Exactly ONE logical editing host
  const editorHostRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

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

  // History Manager (Single-Host Transactional History)
  const historyRef = useRef<EditorHistory>(new EditorHistory(cleanCanonicalBody));

  // Current canonical HTML state
  const [canonicalHtml, setCanonicalHtml] = useState<string>(cleanCanonicalBody);

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

  // Cache previous layout for incremental reflow passes
  const prevLayoutRef = useRef<LayoutDocument | null>(null);

  // Synchronize web font loading to prevent FOUT and subpixel measurement glitches
  useEffect(() => {
    FontLoadingCoordinator.waitForFontsReady().catch(() => {});
  }, [options.fontFamily]);

  // Derived Runtime Layout Calculation (pure layout projection with incremental reflow)
  const paginationResult = useMemo<PaginationEngineResult>(() => {
    const result = PaginationEngine.paginateIncremental(prevLayoutRef.current, canonicalHtml, {
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
    });
    prevLayoutRef.current = result.document;
    return result;
  }, [
    canonicalHtml,
    options.pageSize,
    options.orientation,
    options.margin,
    options.customMarginsMm,
    options.pageProperties,
    options.density,
    options.fontSizePx,
    options.fontFamily,
    options.lineHeight,
    activeStyles,
    debugLayout,
  ]);

  const layoutDoc = paginationResult.document;
  const totalPagesCount = Math.max(1, paginationResult.totalPages || layoutDoc.pages.length || 1);

  // 2. Initial Mount and External Sync (e.g. template selection, undo from top toolbar)
  useEffect(() => {
    if (!editorHostRef.current) return;

    if (!isInternalChangeRef.current) {
      const currentCleanDom = EditorSerializer.sanitize(editorHostRef.current.innerHTML);
      if (currentCleanDom !== cleanCanonicalBody) {
        const savedSel = EditorPositionMapper.captureLogicalSelection(editorHostRef.current);
        editorHostRef.current.innerHTML = cleanCanonicalBody;
        setCanonicalHtml(cleanCanonicalBody);
        historyRef.current.reset(cleanCanonicalBody);
        if (savedSel) {
          EditorPositionMapper.restoreLogicalSelection(editorHostRef.current, savedSel);
        }
      }
    }
    isInternalChangeRef.current = false;
  }, [cleanCanonicalBody]);

  // 3. Centralized Transaction Dispatcher
  const dispatchTransaction = useCallback(
    (tx: EditorTransaction) => {
      isInternalChangeRef.current = true;
      const cleanHtml = EditorSerializer.sanitize(tx.canonicalHtml);
      setCanonicalHtml(cleanHtml);
      historyRef.current.push(tx);

      const finalExportHtml = activeStyles
        ? `<style>${activeStyles}</style>\n${cleanHtml}`
        : cleanHtml;

      onContentChange?.(finalExportHtml);
    },
    [activeStyles, onContentChange]
  );

  // 4. Native Input Handler on Single Host
  const handleInput = useCallback(() => {
    if (!editorHostRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!editorHostRef.current) return;
      const cleanHtml = EditorSerializer.sanitize(editorHostRef.current.innerHTML);
      const doc = EditorSerializer.toCanonicalDocument(cleanHtml);

      dispatchTransaction({
        doc,
        canonicalHtml: cleanHtml,
        origin: 'typing',
        timestamp: Date.now(),
        description: 'Typing input',
      });
    }, 180);
  }, [dispatchTransaction]);

  // 5. Native Keydown Handler (Enter, Ctrl+Enter, Ctrl+Z, Ctrl+Y, Tab)
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

      // Ctrl+Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        const prevHtml = historyRef.current.undo();
        if (prevHtml !== null && editorHostRef.current) {
          editorHostRef.current.innerHTML = prevHtml;
          isInternalChangeRef.current = true;
          setCanonicalHtml(prevHtml);
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
          setCanonicalHtml(nextHtml);
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

  // 6. Global Command Listener (for Formatting Ribbon, Sidebar, and Shortcuts)
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
      {/* Visual Multi-Sheet Page Projections Background / Frames */}
      <div
        className="relative flex flex-col items-center gap-8 print:gap-0 print:block"
        style={{
          width: `${pageGeometry.paperDimensionsPx.width}px`,
          maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
        }}
      >
        {/* Top Page Header Bar */}
        <div
          style={{ width: `${pageGeometry.paperDimensionsPx.width}px` }}
          className="flex items-center justify-between px-2 py-1 mb-1 text-xs theme-text-secondary select-none print:hidden"
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span className="font-bold theme-text-primary font-mono text-[11.5px]">
              {totalPagesCount === 1
                ? `Page 1 of 1 (${options.pageSize || 'A4'} • ${options.orientation || 'PORTRAIT'})`
                : `Document Flow (${totalPagesCount} Pages • ${options.pageSize || 'A4'} • ${options.orientation || 'PORTRAIT'})`}
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

        {/* Single Authoritative Physical Paper Sheet Surface */}
        <div
          className="paper-sheet docx-paper-sheet relative text-left box-border shadow-xl rounded-xs print:shadow-none print:border-none print:w-full print:m-0 print:bg-white"
          data-size={options.pageSize || 'A4'}
          data-orientation={options.orientation || 'PORTRAIT'}
          data-margin={options.margin || 'NORMAL'}
          data-density={options.density || 'NORMAL'}
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
          {/* EXACTLY ONE Continuous contentEditable Editing Host for the Whole Document */}
          <div
            ref={editorHostRef}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            data-doclab-single-host="true"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className="doclab-single-host-editor min-h-[400px] outline-none text-left select-text cursor-text leading-relaxed font-sans"
            style={{
              width: '100%',
              minHeight: '100%',
              boxSizing: 'border-box',
              outline: 'none',
              wordBreak: 'break-word',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const PaginatedDocumentEditor = memo(PaginatedDocumentEditorComponent);
export default PaginatedDocumentEditor;
