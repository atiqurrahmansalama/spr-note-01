/**
 * PagedEditorSurface.tsx
 *
 * Dedicated Authoritative Word-Grade Single-Host Paginated Editing Surface.
 *
 * Core Architectural Invariant (SECTION 3):
 * 1. Contains EXACTLY ONE <div contentEditable="true"> root for the entire document.
 * 2. Visual page shells (<div data-runtime-page="0">, <div data-runtime-page="1">...)
 *    are runtime visual containers INSIDE the ONE logical editing host.
 * 3. Individual page shells are NEVER given independent contentEditable="true".
 * 4. Each page shell represents an actual physical paper sheet with real dimensions and 32px gaps.
 * 5. Extraction and serialization unwraps [data-runtime-page] shells to yield pure canonical content.
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
import { EditorTransaction } from './editorTypes';
import { FontLoadingCoordinator } from '../performance/FontLoadingCoordinator';
import { ControlledLayoutPipeline } from '../measurement/ControlledLayoutPipeline';
import { PageBreakIcon } from '../../../ui/Icons';
import { RunningHeader, RunningFooter, RuntimeVariableResolver } from '../chrome';
import { LayoutFragmentRenderer } from '../render/LayoutFragmentRenderer';

export interface PagedEditorSurfaceProps {
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
  /** Debug layout inspector flag */
  debugLayout?: boolean;
}

export const PagedEditorSurfaceComponent: React.FC<PagedEditorSurfaceProps> = ({
  htmlContent = '<p><br></p>',
  styles = '',
  isEditable = true,
  onContentChange,
  options = {},
  className = '',
  debugLayout = false,
}) => {
  // Exactly ONE authoritative logical editing host for the whole document
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

  // Logical Selection preservation across dynamic layout reflows (typing, font size, margins, orientation, page size)
  const pendingLogicalSelectionRef = useRef<any>(null);

  // Synchronize web font loading to prevent FOUT and subpixel measurement glitches
  useEffect(() => {
    FontLoadingCoordinator.waitForFontsReady().catch(() => {});
  }, [options.fontFamily]);

  const rafIdRef = useRef<number | null>(null);

  // Controlled Layout State: Initial pure layout without DOM mutation during render
  const [paginationResult, setPaginationResult] = useState<PaginationEngineResult>(() => {
    return ControlledLayoutPipeline.computePureInitialLayout(cleanCanonicalBody, {
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
  });

  const runLayoutPass = useCallback(async () => {
    // 1. Capture active logical selection before pagination / reconciliation
    if (editorHostRef.current) {
      const activeSel = EditorPositionMapper.captureLogicalSelection(editorHostRef.current);
      if (activeSel) {
        pendingLogicalSelectionRef.current = activeSel;
      }
    }

    const result = await ControlledLayoutPipeline.executeAuthoritativeLayout(
      canonicalHtml,
      {
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
      },
      prevLayoutRef.current
    );

    prevLayoutRef.current = result.document;
    setPaginationResult(result);
  }, [
    canonicalHtml,
    options.pageSize,
    options.orientation,
    options.margin,
    JSON.stringify(options.customMarginsMm),
    JSON.stringify(options.pageProperties),
    options.density,
    options.fontSizePx,
    options.fontFamily,
    options.lineHeight,
    activeStyles,
    debugLayout,
  ]);

  // Controlled Layout Pipeline: Schedule actual browser measurement when DOM/fonts/styles are ready
  useEffect(() => {
    const handle = ControlledLayoutPipeline.scheduleLayoutPass(runLayoutPass);
    return () => {
      handle.cancel();
    };
  }, [runLayoutPass]);

  // Font Readiness & Dynamic Web Font Subscription: guarantees repagination when fonts become ready
  useEffect(() => {
    const unsubscribe = FontLoadingCoordinator.onFontsLoaded(() => {
      ControlledLayoutPipeline.scheduleLayoutPass(runLayoutPass);
    });

    return () => {
      unsubscribe();
    };
  }, [runLayoutPass]);

  // 2. Restore logical selection after layout document changes and DOM renders
  useEffect(() => {
    if (editorHostRef.current && pendingLogicalSelectionRef.current) {
      const restored = EditorPositionMapper.restoreLogicalSelection(
        editorHostRef.current,
        pendingLogicalSelectionRef.current
      );
      if (restored) {
        pendingLogicalSelectionRef.current = null;
      }
    }
  }, [paginationResult]);

  const layoutDoc = paginationResult.document;
  const totalPagesCount = Math.max(1, paginationResult.totalPages || layoutDoc.pages.length || 1);

  // 3. Initial Mount and External Sync
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

  // 4. Centralized Transaction Dispatcher
  const dispatchTransaction = useCallback(
    (tx: EditorTransaction) => {
      isInternalChangeRef.current = true;
      if (tx.selection?.logical) {
        pendingLogicalSelectionRef.current = tx.selection.logical;
      } else if (editorHostRef.current) {
        const activeSel = EditorPositionMapper.captureLogicalSelection(editorHostRef.current);
        if (activeSel) {
          pendingLogicalSelectionRef.current = activeSel;
        }
      }
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

  // 5. Native Keydown Handler (Enter, Ctrl+Enter, Backspace, Delete, Ctrl+Z, Ctrl+Y, Arrows, Tab)
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

      // Enter (normal): Split block or create logical paragraph (Zero fake pagination artifacts)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        const tx = EditorCommands.insertParagraph(editorHostRef.current);
        dispatchTransaction(tx);
        return;
      }

      // Backspace: Boundary-aware deletion and cross-page block merging
      if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey) {
        const range = EditorDomAdapter.getSelectionRange(editorHostRef.current);
        const isStart = EditorDomAdapter.isAtStartOfBlock(editorHostRef.current, range);
        const isCrossBlock = EditorDomAdapter.isCrossBlockSelection(editorHostRef.current, range);

        if (isStart || isCrossBlock) {
          e.preventDefault();
          const tx = EditorCommands.delete(editorHostRef.current, false);
          dispatchTransaction(tx);
          return;
        }
      }

      // Delete: Boundary-aware forward deletion and cross-page block pulling
      if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey) {
        const range = EditorDomAdapter.getSelectionRange(editorHostRef.current);
        const isEnd = EditorDomAdapter.isAtEndOfBlock(editorHostRef.current, range);
        const isCrossBlock = EditorDomAdapter.isCrossBlockSelection(editorHostRef.current, range);

        if (isEnd || isCrossBlock) {
          e.preventDefault();
          const tx = EditorCommands.delete(editorHostRef.current, true);
          dispatchTransaction(tx);
          return;
        }
      }

      // Ctrl+Z: Undo
      if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        const checkpoint = historyRef.current.undoCheckpoint();
        if (checkpoint && editorHostRef.current) {
          editorHostRef.current.innerHTML = checkpoint.html;
          isInternalChangeRef.current = true;
          if (checkpoint.selection) {
            pendingLogicalSelectionRef.current = checkpoint.selection.logical || checkpoint.selection;
          }
          setCanonicalHtml(checkpoint.html);
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${checkpoint.html}` : checkpoint.html);
        }
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if (
        (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key.toLowerCase() === 'y' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        const checkpoint = historyRef.current.redoCheckpoint();
        if (checkpoint && editorHostRef.current) {
          editorHostRef.current.innerHTML = checkpoint.html;
          isInternalChangeRef.current = true;
          if (checkpoint.selection) {
            pendingLogicalSelectionRef.current = checkpoint.selection.logical || checkpoint.selection;
          }
          setCanonicalHtml(checkpoint.html);
          onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${checkpoint.html}` : checkpoint.html);
        }
        return;
      }

      // Arrow navigation across page boundaries
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const dirMap: Record<string, 'left' | 'right' | 'up' | 'down'> = {
          ArrowLeft: 'left',
          ArrowRight: 'right',
          ArrowUp: 'up',
          ArrowDown: 'down',
        };
        const direction = dirMap[e.key];
        const bridged = EditorDomAdapter.navigateBoundary(editorHostRef.current, direction, e.shiftKey, e.ctrlKey || e.metaKey);
        if (bridged) {
          e.preventDefault();
          return;
        }
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

  // 6. Authoritative Clipboard Handlers (Copy, Cut, Paste across page boundaries)
  const handleCopy = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!editorHostRef.current) return;
    const result = EditorDomAdapter.copySelection(editorHostRef.current);
    if (result) {
      e.preventDefault();
      e.clipboardData.setData('text/plain', result.text);
      e.clipboardData.setData('text/html', result.html);
    }
  }, []);

  const handleCut = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;
      const cutResult = EditorCommands.cut(editorHostRef.current);
      if (cutResult) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', cutResult.payload.text);
        e.clipboardData.setData('text/html', cutResult.payload.html);
        dispatchTransaction(cutResult.transaction);
      }
    },
    [isEditable, dispatchTransaction]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!isEditable || !editorHostRef.current) return;
      e.preventDefault();
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      const tx = EditorCommands.paste(editorHostRef.current, { html, text });
      dispatchTransaction(tx);
    },
    [isEditable, dispatchTransaction]
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
        case 'undo': {
          const checkpoint = historyRef.current.undoCheckpoint();
          if (checkpoint && editorHostRef.current) {
            editorHostRef.current.innerHTML = checkpoint.html;
            isInternalChangeRef.current = true;
            if (checkpoint.selection) {
              pendingLogicalSelectionRef.current = checkpoint.selection.logical || checkpoint.selection;
            }
            setCanonicalHtml(checkpoint.html);
            onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${checkpoint.html}` : checkpoint.html);
          }
          break;
        }
        case 'redo': {
          const checkpoint = historyRef.current.redoCheckpoint();
          if (checkpoint && editorHostRef.current) {
            editorHostRef.current.innerHTML = checkpoint.html;
            isInternalChangeRef.current = true;
            if (checkpoint.selection) {
              pendingLogicalSelectionRef.current = checkpoint.selection.logical || checkpoint.selection;
            }
            setCanonicalHtml(checkpoint.html);
            onContentChange?.(activeStyles ? `<style>${activeStyles}</style>\n${checkpoint.html}` : checkpoint.html);
          }
          break;
        }
        case 'insertTableRow': {
          const tx = EditorCommands.insertTableRow(editorHostRef.current, value || cmdOpts?.position || 'below');
          dispatchTransaction(tx);
          break;
        }
        case 'deleteTableRow': {
          const tx = EditorCommands.deleteTableRow(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        case 'insertTableColumn': {
          const tx = EditorCommands.insertTableColumn(editorHostRef.current, value || cmdOpts?.position || 'right');
          dispatchTransaction(tx);
          break;
        }
        case 'deleteTableColumn': {
          const tx = EditorCommands.deleteTableColumn(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        case 'deleteTable': {
          const tx = EditorCommands.deleteTable(editorHostRef.current);
          dispatchTransaction(tx);
          break;
        }
        case 'setImageAlignment': {
          const tx = EditorCommands.setImageAlignment(editorHostRef.current, value || cmdOpts?.alignment || 'left');
          dispatchTransaction(tx);
          break;
        }
        case 'setImageDimensions': {
          const tx = EditorCommands.setImageDimensions(editorHostRef.current, value || cmdOpts?.width, cmdOpts?.height);
          dispatchTransaction(tx);
          break;
        }
        case 'updateToken': {
          const tx = EditorCommands.updateToken(editorHostRef.current, value || cmdOpts?.key, cmdOpts || {});
          dispatchTransaction(tx);
          break;
        }
        case 'deleteToken': {
          const tx = EditorCommands.deleteToken(editorHostRef.current, value || cmdOpts?.key);
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

    const handleSectionBreakEvent = (e: CustomEvent) => {
      if (!isEditable || !editorHostRef.current) return;
      const tx = EditorCommands.insertSectionBreak(editorHostRef.current, e.detail || {});
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
      window.addEventListener('spr_doclab_insert_section_break' as any, handleSectionBreakEvent);
      window.addEventListener('spr_doclab_insert_token' as any, handleTokenInsertEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('spr_doclab_editor_command' as any, handleCommandEvent);
        window.removeEventListener('spr_doclab_insert_page_break' as any, handlePageBreakEvent);
        window.removeEventListener('spr_doclab_insert_section_break' as any, handleSectionBreakEvent);
        window.removeEventListener('spr_doclab_insert_token' as any, handleTokenInsertEvent);
      }
    };
  }, [isEditable, dispatchTransaction]);

  return (
    <div
      className={`paged-editor-surface-container relative flex flex-col items-center select-text ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Top Global Document Flow Control Bar */}
      <div
        style={{ width: `${pageGeometry.paperDimensionsPx.width}px` }}
        className="flex items-center justify-between px-2 py-1 mb-2 text-xs theme-text-secondary select-none print:hidden"
      >
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
          <span className="font-bold theme-text-primary font-mono text-[11.5px]">
            Document Flow ({totalPagesCount} {totalPagesCount === 1 ? 'Page' : 'Pages'} • {options.pageSize || 'A4'} • {options.orientation || 'PORTRAIT'})
          </span>
          <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
            {Math.round(pageGeometry.paperDimensionsPx.width)} × {Math.round(pageGeometry.paperDimensionsPx.height)}px
          </span>
          {debugLayout && (
            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm font-mono">
              Total Pages: {totalPagesCount}
            </span>
          )}
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

      {/* EXACTLY ONE Continuous contentEditable Editing Host Root for the Entire Document */}
      <div
        ref={editorHostRef}
        contentEditable={isEditable}
        suppressContentEditableWarning={true}
        data-doclab-single-host="true"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        className="paged-editor-surface doclab-single-host-editor flex flex-col items-center gap-8 print:gap-0 print:block outline-none text-left select-text cursor-text leading-relaxed font-sans"
        style={{
          width: `${pageGeometry.paperDimensionsPx.width}px`,
          maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* RUNTIME PAGE SHELLS INSIDE THE ONE EDITABLE HOST */}
        {layoutDoc.pages.map((page, pageIndex) => {
          const pageNum = page.pageNumber || pageIndex + 1;
          const pageGeo = page.geometry || pageGeometry;
          const headerCfg = page.headerConfig || options.headerConfig;
          const footerCfg = page.footerConfig || options.footerConfig;
          const pageNumFormat = page.pageNumberFormat || options.pageNumberFormat || 'decimal';

          const runtimeVars = RuntimeVariableResolver.buildVariables(pageIndex, totalPagesCount, {
            documentTitle: options.title || 'Official Document',
            sectionId: page.sectionId,
            sectionIndex: page.sectionIndex,
            sectionTitle: page.sectionTitle,
            sectionPageNumber: page.sectionPageNumber,
            sectionTotalPages: page.sectionTotalPages,
            pageNumberFormat: pageNumFormat,
            isSectionFirstPage: page.isSectionFirstPage,
          });

          return (
            <div
              key={`doclab_runtime_page_shell_${page.index}`}
              id={`docx-live-page-${page.index}`}
              data-doclab-runtime-page="true"
              data-runtime-page={page.index}
              data-page-index={page.index}
              className="doclab-runtime-page-shell paper-sheet docx-paper-sheet relative text-left box-border shadow-xl rounded-xs print:shadow-none print:border-none print:w-full print:m-0 print:bg-white flex flex-col justify-between mb-8 print:mb-0"
              data-size={pageGeo.pageSize || options.pageSize || 'A4'}
              data-orientation={pageGeo.orientation || options.orientation || 'PORTRAIT'}
              data-margin={options.margin || 'NORMAL'}
              data-density={options.density || 'NORMAL'}
              data-section-id={page.sectionId || 'sec_0'}
              data-section-index={page.sectionIndex || 0}
              data-page-break="true"
              onClick={(e) => {
                if (!isEditable || !editorHostRef.current) return;
                const target = e.target as HTMLElement;
                if (
                  target.classList.contains('doclab-runtime-page-shell') ||
                  target.classList.contains('doclab-runtime-page-content') ||
                  target.classList.contains('layout-page-fragments')
                ) {
                  EditorDomAdapter.focusPage(editorHostRef.current, page.index ?? pageIndex, 'end');
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                width: `${pageGeo.paperDimensionsPx.width}px`,
                maxWidth: `${pageGeo.paperDimensionsPx.width}px`,
                minHeight: `${pageGeo.paperDimensionsPx.height}px`,
                height: `${pageGeo.paperDimensionsPx.height}px`,
                maxHeight: `${pageGeo.paperDimensionsPx.height}px`,
                padding: pageGeo.cssMarginString,
                boxSizing: 'border-box',
                textAlign: 'left',
                overflow: 'hidden',
              }}
            >
              {/* Top Page Badge inside Shell */}
              <div
                className="w-full flex items-center justify-between pb-1.5 mb-1 border-b theme-border text-[10.5px] font-mono theme-text-muted select-none print:hidden shrink-0"
                contentEditable={false}
              >
                <div className="flex items-center gap-1.5 font-bold theme-text-primary">
                  <span className="w-1.5 h-1.5 rounded-full theme-bg-accent" />
                  <span>
                    Page {runtimeVars.pageNumberFormatted || pageNum} of {runtimeVars.totalPagesFormatted || totalPagesCount}
                    {page.sectionIndex !== undefined && page.sectionIndex > 0 && (
                      <span className="ml-1 text-[10px] theme-text-muted font-normal">
                        (Sec {page.sectionIndex + 1}: p.{runtimeVars.sectionPageNumberFormatted || page.sectionPageNumber})
                      </span>
                    )}
                  </span>
                </div>
                <span>{Math.round(pageGeo.paperDimensionsPx.width)} × {Math.round(pageGeo.paperDimensionsPx.height)}px</span>
              </div>

              {/* 1. Running Header Zone */}
              {headerCfg && (
                <div className="w-full relative z-10 shrink-0 overflow-hidden" contentEditable={false}>
                  <RunningHeader
                    variables={runtimeVars}
                    config={headerCfg}
                  />
                </div>
              )}

              {/* 2. Printable Flow Content Area for this Page */}
              <div
                className="doclab-runtime-page-content doclab-page-content-slot w-full flex-1 relative z-10 text-left select-text overflow-hidden"
                style={{
                  minHeight: `${page.contentArea.height}px`,
                  maxHeight: `${page.contentArea.height}px`,
                  height: `${page.contentArea.height}px`,
                }}
              >
                {page.fragments && page.fragments.length > 0 ? (
                  <div className="layout-page-fragments flex flex-col w-full text-left select-text">
                    {page.fragments.map((fragment) => (
                      <LayoutFragmentRenderer
                        key={fragment.id}
                        fragment={fragment}
                        styles={activeStyles}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: page.htmlContent || '<p><br></p>',
                    }}
                  />
                )}
              </div>

              {/* 3. Running Footer Zone */}
              {footerCfg && (
                <div className="w-full relative z-10 shrink-0 overflow-hidden" contentEditable={false}>
                  <RunningFooter
                    variables={runtimeVars}
                    config={footerCfg}
                    numeralSystem={options.numeralSystem || (pageNumFormat as any)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PagedEditorSurface = memo(PagedEditorSurfaceComponent);
export default PagedEditorSurface;
