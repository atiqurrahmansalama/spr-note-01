import React, { useRef, memo, useCallback, useEffect, useMemo } from 'react';
import { separateDocxStylesAndBody } from './docxTemplateEngine';

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
    range.startContainer.nodeType === Node.ELEMENT_NODE
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
        if (targetNode.nodeType === Node.TEXT_NODE) {
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
      if (node.nodeType === Node.TEXT_NODE) {
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
        if (targetNode.nodeType === Node.TEXT_NODE) {
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

  /**
   * Splits a single overflowing paragraph at the exact text boundary crossing page bottom
   */
  const splitParagraphAtHeight = useCallback(
    (pEl: HTMLElement, maxBottom: number): HTMLElement | null => {
      if (typeof document === 'undefined' || !pEl) return null;

      const textNodes: Node[] = [];
      function collectText(n: Node) {
        if (n.nodeType === Node.TEXT_NODE) textNodes.push(n);
        else n.childNodes.forEach(collectText);
      }
      collectText(pEl);
      if (textNodes.length === 0) return null;

      const range = document.createRange();
      let splitNode: Node | null = null;
      let splitOffset = -1;

      for (const tNode of textNodes) {
        const len = tNode.textContent?.length || 0;
        if (len === 0) continue;
        for (let o = 0; o < len; o += 6) {
          try {
            range.setStart(tNode, o);
            range.setEnd(tNode, Math.min(o + 1, len));
            const rects = range.getClientRects();
            if (rects.length > 0 && rects[0].bottom > maxBottom) {
              splitNode = tNode;
              splitOffset = o;
              break;
            }
          } catch (e) {
            // ignore range errors
          }
        }
        if (splitNode) break;
      }

      if (splitNode && splitOffset > 0) {
        const content = splitNode.textContent || '';
        const lastSpace = content.lastIndexOf(' ', splitOffset);
        const safeOffset = lastSpace > 10 ? lastSpace : splitOffset;

        try {
          const postRange = document.createRange();
          postRange.setStart(splitNode, safeOffset);
          postRange.setEnd(pEl, pEl.childNodes.length);
          const postFrag = postRange.extractContents();

          const p2 = document.createElement(pEl.tagName.toLowerCase());
          Array.from(pEl.attributes).forEach((attr) => {
            p2.setAttribute(attr.name, attr.value);
          });
          p2.appendChild(postFrag);
          return p2;
        } catch (err) {
          console.warn('splitParagraphAtHeight error', err);
        }
      }

      return null;
    },
    []
  );

  /**
   * Automatically paginates content across discrete visual paper pages by inserting
   * page-breaks directly into the unified DOM stream when height exceeds printable limits.
   */
  const autoPaginateOverflowInDom = useCallback(
    (root: HTMLElement, pageHeightPx: number = 930): boolean => {
      if (typeof document === 'undefined' || !root || !root.isConnected) return false;

      const children = Array.from(root.children) as HTMLElement[];
      if (children.length === 0) return false;

      const rootRect = root.getBoundingClientRect();
      let currentPageTop = rootRect.top;
      let modified = false;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.classList.contains('spr-page-break')) {
          const breakRect = child.getBoundingClientRect();
          currentPageTop = breakRect.bottom;
          continue;
        }

        const childRect = child.getBoundingClientRect();
        const currentHeightFromPageTop = childRect.bottom - currentPageTop;

        if (currentHeightFromPageTop > pageHeightPx) {
          const prevSibling = child.previousElementSibling as HTMLElement | null;
          if (prevSibling && prevSibling.classList.contains('spr-page-break')) {
            continue;
          }

          const maxBottom = currentPageTop + pageHeightPx;
          const tag = child.tagName.toLowerCase();

          // In-paragraph split
          if (
            (tag === 'p' || tag === 'div' || tag.startsWith('h')) &&
            (child.textContent?.length || 0) > 80
          ) {
            const p2 = splitParagraphAtHeight(child, maxBottom);
            if (p2) {
              const pageBreak = document.createElement('div');
              pageBreak.className = 'spr-page-break';
              pageBreak.contentEditable = 'false';
              pageBreak.style.pageBreakAfter = 'always';
              pageBreak.style.breakAfter = 'page';
              pageBreak.innerHTML =
                '<hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span>';

              if (child.nextSibling) {
                root.insertBefore(pageBreak, child.nextSibling);
                root.insertBefore(p2, pageBreak.nextSibling);
              } else {
                root.appendChild(pageBreak);
                root.appendChild(p2);
              }

              modified = true;
              currentPageTop = pageBreak.getBoundingClientRect().bottom;
              continue;
            }
          }

          // Block-level boundary split
          if (i > 0) {
            const pageBreak = document.createElement('div');
            pageBreak.className = 'spr-page-break';
            pageBreak.contentEditable = 'false';
            pageBreak.style.pageBreakAfter = 'always';
            pageBreak.style.breakAfter = 'page';
            pageBreak.innerHTML =
              '<hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span>';

            root.insertBefore(pageBreak, child);
            modified = true;
            currentPageTop = pageBreak.getBoundingClientRect().bottom;
          }
        }
      }

      return modified;
    },
    [splitParagraphAtHeight]
  );

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

      // Auto-paginate overflow into discrete visual sheets
      const hasSplit = autoPaginateOverflowInDom(containerRef.current);
      if (hasSplit && savedBookmarkRef.current) {
        restoreCaretBookmark(containerRef.current, savedBookmarkRef.current);
      }

      const currentHtml = containerRef.current.innerHTML;
      lastKnownHtmlRef.current = currentHtml;
      const finalExportHtml = activeStyles ? `<style>${activeStyles}</style>\n${currentHtml}` : currentHtml;
      onContentChange?.(finalExportHtml);
    }, 280);
  }, [onContentChange, saveSelection, activeStyles, isEditable, autoPaginateOverflowInDom]);

  // Paste handling: clean HTML, check overflow, and trigger automatic pagination
  const handlePaste = useCallback(() => {
    if (!isEditable || !containerRef.current) return;
    setTimeout(() => {
      if (!containerRef.current) return;
      saveSelection();
      const hasSplit = autoPaginateOverflowInDom(containerRef.current);
      if (hasSplit && savedBookmarkRef.current) {
        restoreCaretBookmark(containerRef.current, savedBookmarkRef.current);
      }
      handleInput();
    }, 40);
  }, [isEditable, autoPaginateOverflowInDom, saveSelection, handleInput]);

  // Keyboard navigation, shortcuts, and page break insertion
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !containerRef.current) return;

      // 1. Ctrl+Enter / Cmd+Enter: Insert explicit visual Page Break (Standard Word / Google Docs shortcut)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        try {
          const pageBreakHtml =
            '<div class="spr-page-break" contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span></div><p><br></p>';
          document.execCommand('insertHTML', false, pageBreakHtml);
          handleInput();
        } catch (err) {
          console.warn('Page break insertion error', err);
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
        '<div class="spr-page-break" contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span></div><p><br></p>';

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
export default DocxLiveRenderer;
