import React, { useRef, memo, useCallback, useEffect, useMemo } from 'react';
import { separateDocxStylesAndBody } from './docxStyleUtils';

export interface DocxLiveRendererProps {
  htmlContent: string;
  styles?: string;
  isEditable?: boolean;
  onContentChange?: (updatedHtml: string) => void;
  className?: string;
  pageIndex?: number;
  totalPages?: number;
  onAddNextPage?: () => void;
  onDeleteCurrentPage?: () => void;
  onNavigatePrevPage?: () => void;
  onNavigateNextPage?: () => void;
}

interface CaretBookmark {
  offset: number;
  nodePath: number[];
  leafOffset: number;
  tagName?: string;
}

const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
const TEXT_NODE_TYPE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;

/**
 * Calculates absolute character offset and DOM hierarchy path of active caret
 */
function getCaretBookmark(root: HTMLElement): CaretBookmark | null {
  if (typeof window === 'undefined' || !root) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer) && root !== range.commonAncestorContainer) {
    return null;
  }

  // 1. Calculate text offset
  let offset = 0;
  try {
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(root);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    offset = preCaretRange.toString().length;
  } catch (e) {
    offset = 0;
  }

  // 2. Trace DOM index path from root down to startContainer
  const nodePath: number[] = [];
  let curr: Node | null = range.startContainer;
  while (curr && curr !== root) {
    const parent: Node | null = curr.parentNode;
    if (!parent) break;
    const idx = Array.prototype.indexOf.call(parent.childNodes, curr);
    nodePath.unshift(idx);
    curr = parent;
  }

  const leafOffset = range.startOffset;
  const tagName =
    range.startContainer.nodeType === ELEMENT_NODE_TYPE
      ? (range.startContainer as HTMLElement).tagName
      : range.startContainer.parentElement?.tagName;

  return { offset, nodePath, leafOffset, tagName };
}

/**
 * Accurately restores caret to specific DOM bookmark or character offset inside root.
 * Guarantees zero-jumping to the top of the page on fallbacks.
 */
function restoreCaretBookmark(root: HTMLElement, bookmark: CaretBookmark | null): void {
  if (typeof window === 'undefined' || !root || !bookmark) return;
  const sel = window.getSelection();
  if (!sel) return;

  // Attempt 1: Restore via exact DOM node path
  if (bookmark.nodePath && bookmark.nodePath.length > 0) {
    let targetNode: Node | null = root;
    for (const idx of bookmark.nodePath) {
      if (targetNode && targetNode.childNodes && targetNode.childNodes[idx]) {
        targetNode = targetNode.childNodes[idx];
      } else {
        targetNode = null;
        break;
      }
    }

    if (targetNode) {
      try {
        const range = document.createRange();
        if ((targetNode as any).nodeType === TEXT_NODE_TYPE) {
          const maxLen = targetNode.textContent?.length || 0;
          range.setStart(targetNode, Math.min(bookmark.leafOffset, maxLen));
        } else {
          const childCount = targetNode.childNodes.length;
          range.setStart(targetNode, Math.min(bookmark.leafOffset, childCount));
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      } catch (err) {
        // Fallback to offset traversal
      }
    }
  }

  // Attempt 2: Restore via character offset traversal
  const offset = bookmark.offset;
  if (offset > 0) {
    let currentOffset = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;
    let found = false;

    function traverse(node: Node) {
      if (found) return;
      if ((node as any).nodeType === TEXT_NODE_TYPE) {
        const textLen = node.textContent?.length || 0;
        if (currentOffset + textLen >= offset) {
          targetNode = node;
          targetOffset = Math.max(0, Math.min(offset - currentOffset, textLen));
          found = true;
          return;
        }
        currentOffset += textLen;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (found) return;
        }
      }
    }

    traverse(root);

    if (targetNode) {
      try {
        const range = document.createRange();
        if ((targetNode as any).nodeType === TEXT_NODE_TYPE) {
          range.setStart(targetNode, targetOffset);
        } else {
          range.selectNodeContents(targetNode);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      } catch (err) {
        // Fallback to safe end placement
      }
    }
  }

  // Safe fallback: NEVER place at offset 0 (top) unless document is completely empty
  try {
    const leafNodes = Array.from(
      root.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
    ) as HTMLElement[];
    const targetEl = leafNodes[leafNodes.length - 1] || root.lastElementChild || root;
    const range = document.createRange();
    range.selectNodeContents(targetEl);
    range.collapse(false); // ALWAYS collapse to the end
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    console.warn('Safe caret fallback error', err);
  }
}

/**
 * Enterprise Unified Docx Live Document & Template Renderer
 *
 * Single Source of Truth for rendering imported Word documents,
 * custom template HTML, and interactive canvas sheets with 100% native editing.
 *
 * - In Preview Mode (isEditable=false): Synchronously mounts clean HTML and CSS with 100% OpenXML fidelity.
 * - In Studio Mode (isEditable=true): Provides rich in-place contentEditable editing, natural multi-page flow,
 *   Ctrl+A select all across all pages, Ctrl+Enter page breaks, and zero jumping.
 */
function DocxLiveRendererComponent({
  htmlContent,
  styles = '',
  isEditable = true,
  onContentChange,
  className = '',
}: DocxLiveRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);
  const savedBookmarkRef = useRef<CaretBookmark | null>(null);

  // Separate styles and body from htmlContent
  const { styles: extractedStyles, body: cleanBody } = useMemo(() => {
    return separateDocxStylesAndBody(htmlContent || '');
  }, [htmlContent]);

  const activeStyles = useMemo(() => {
    const raw = styles || extractedStyles || '';
    return raw.replace(/<\/?style\b[^>]*>/gi, '').trim();
  }, [styles, extractedStyles]);

  const isInternalChangeRef = useRef<boolean>(false);

  // Save current caret selection range and bookmark
  const saveSelection = useCallback(() => {
    if (!isEditable || !containerRef.current) return;
    const bookmark = getCaretBookmark(containerRef.current);
    if (bookmark) {
      savedBookmarkRef.current = bookmark;
    }
  }, [isEditable]);

  const isInitializedRef = useRef<boolean>(false);
  const lastKnownHtmlRef = useRef<string>('');

  // Initial DOM population and external synchronization (Undo/Redo, Template Switching, Ribbon clicks)
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial mount initialization
    if (!isInitializedRef.current) {
      containerRef.current.innerHTML = cleanBody || '';
      lastKnownHtmlRef.current = cleanBody || '';
      isInitializedRef.current = true;
      return;
    }

    if (!isEditable) {
      containerRef.current.innerHTML = cleanBody || '';
      lastKnownHtmlRef.current = cleanBody || '';
      return;
    }

    // While user is actively typing inside this container, don't overwrite if the body matches what was typed
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastKnownHtmlRef.current = cleanBody || '';
      return;
    }

    const isCurrentActive =
      typeof document !== 'undefined' &&
      (document.activeElement === containerRef.current ||
        containerRef.current.contains(document.activeElement));

    // External change: update DOM if different
    if (containerRef.current.innerHTML !== cleanBody && lastKnownHtmlRef.current !== cleanBody) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const targetBookmark = savedBookmarkRef.current;
      containerRef.current.innerHTML = cleanBody || '';
      lastKnownHtmlRef.current = cleanBody || '';

      if (isCurrentActive && targetBookmark) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            restoreCaretBookmark(containerRef.current, targetBookmark);
          }
        });
      }
    }
  }, [cleanBody, isEditable]);

  // Track global selection changes to continuously preserve caret position
  useEffect(() => {
    if (!isEditable) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }
    const handleSelectionChange = () => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      // If user is currently dragging / highlighting a text selection, do not interfere
      if (sel && !sel.isCollapsed) return;
      saveSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [saveSelection, isEditable]);

  // Cleanup pending debounce timer on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Note: Automatic DOM overflow pagination has been migrated to DocumentLayoutEngine & PaginationEngine.
  // The contentEditable DOM remains a continuous logical document, preventing ghost/stale breaks
  // and corruption upon text deletion or margin/font changes.
  // Manual page breaks (via Ctrl+Enter / toolbar) remain explicit semantic elements.


  const handleBlur = useCallback(() => {
    if (!isEditable) return;
    saveSelection();
    isFocusedRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (!onContentChange || !containerRef.current) return;
    const currentHtml = containerRef.current.innerHTML;
    lastKnownHtmlRef.current = currentHtml;
    const finalExportHtml = activeStyles ? `<style>${activeStyles}</style>\n${currentHtml}` : currentHtml;
    onContentChange(finalExportHtml);
  }, [onContentChange, saveSelection, activeStyles, isEditable]);

  const handleFocus = useCallback(() => {
    if (!isEditable) return;
    isFocusedRef.current = true;
    saveSelection();
  }, [saveSelection, isEditable]);

  const handleInput = useCallback(() => {
    if (!isEditable || !containerRef.current) return;
    isInternalChangeRef.current = true;
    saveSelection();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      const currentHtml = containerRef.current.innerHTML;
      lastKnownHtmlRef.current = currentHtml;
      const finalExportHtml = activeStyles ? `<style>${activeStyles}</style>\n${currentHtml}` : currentHtml;
      onContentChange?.(finalExportHtml);
    }, 280);
  }, [onContentChange, saveSelection, activeStyles, isEditable]);

  // Paste handling: clean HTML and emit update without destructive in-DOM splitting
  const handlePaste = useCallback(() => {
    if (!isEditable || !containerRef.current) return;
    setTimeout(() => {
      if (!containerRef.current) return;
      saveSelection();
      handleInput();
    }, 40);
  }, [isEditable, saveSelection, handleInput]);

  // Keyboard navigation, shortcuts, and page break insertion
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !containerRef.current) return;

      // 1. Ctrl+Enter / Cmd+Enter: Insert explicit semantic manual Page Break
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        try {
          const pageBreakHtml =
            '<div class="spr-page-break" data-manual-break="true" contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span></div><p><br></p>';
          document.execCommand('insertHTML', false, pageBreakHtml);
          handleInput();
        } catch (err) {
          console.warn('Manual page break insertion error', err);
        }
        return;
      }

      // Standard Enter, Backspace, Arrow keys: 100% native browser handling without jumping!
    },
    [isEditable, handleInput]
  );

  // Handle clicking anywhere on empty margin space of document to place the cursor at the bottom
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditable || !containerRef.current) return;

      // If user is selecting/highlighting text with mouse drag, NEVER collapse it
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      const target = e.target as HTMLElement;

      // If clicked inside an existing text node, paragraph, or table cell, native selection handles it
      if (target !== containerRef.current && containerRef.current.contains(target)) {
        saveSelection();
        return;
      }

      // If clicked directly on empty margin of containerRef:
      try {
        const leafElements = Array.from(
          containerRef.current.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
        ) as HTMLElement[];

        if (leafElements.length === 0) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          containerRef.current.appendChild(p);
          p.focus({ preventScroll: true });
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
          saveSelection();
          return;
        }

        // Place caret at the end of last content block
        const lastEl = leafElements[leafElements.length - 1];
        containerRef.current.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(lastEl);
        range.collapse(false);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        saveSelection();
      } catch (err) {
        console.warn('Click focus error', err);
      }
    },
    [isEditable, saveSelection]
  );

  // Listen for global insert page break events triggered from ribbons or workbench toolbars
  useEffect(() => {
    const handleInsertPageBreakEvent = () => {
      if (!isEditable || !containerRef.current) return;
      containerRef.current.focus({ preventScroll: true });

      const pageBreakHtml =
        '<div class="spr-page-break" data-manual-break="true" contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span></div><p><br></p>';

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && containerRef.current.contains(sel.anchorNode)) {
        try {
          document.execCommand('insertHTML', false, pageBreakHtml);
        } catch (e) {
          // fallback
        }
      } else {
        const dummy = document.createElement('div');
        dummy.innerHTML = pageBreakHtml;
        while (dummy.firstChild) {
          containerRef.current.appendChild(dummy.firstChild);
        }
        const lastP = containerRef.current.querySelector('p:last-of-type');
        if (lastP) {
          const range = document.createRange();
          range.selectNodeContents(lastP);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
      handleInput();
    };

    window.addEventListener('spr_doclab_insert_page_break', handleInsertPageBreakEvent);
    return () => {
      window.removeEventListener('spr_doclab_insert_page_break', handleInsertPageBreakEvent);
    };
  }, [isEditable, handleInput]);

  return (
    <div className="relative group/docx-renderer w-full h-full flex flex-col cursor-text select-text">
      {/* Active Document CSS Style Element */}
      {activeStyles && <style dangerouslySetInnerHTML={{ __html: activeStyles }} />}

      {/* Visual Manual Page Break Styles (Discrete Sheet Mode) */}
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

      {/* Main Document Paper Body */}
      {isEditable ? (
        <div
          ref={containerRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onClick={handleContainerClick}
          className={`docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !bg-white !text-slate-900 w-full h-full text-left focus:outline-none cursor-text focus:ring-1 focus:ring-blue-500/20 rounded-xs select-text ${className}`}
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            textAlign: 'left',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
      ) : (
        <div
          ref={containerRef}
          className={`docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !bg-white !text-slate-900 w-full h-full text-left select-text ${className}`}
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            textAlign: 'left',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
      )}
    </div>
  );
}

const DocxLiveRenderer = memo(DocxLiveRendererComponent);
export { DocxLiveRenderer };
export default DocxLiveRenderer;
