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
  const tagName = range.startContainer.nodeType === Node.ELEMENT_NODE
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

  // Safe fallback: NEVER place at offset 0 (top) unless document is completely empty!
  try {
    const leafNodes = Array.from(root.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')) as HTMLElement[];
    const targetEl = leafNodes[leafNodes.length - 1] || root.lastElementChild || root;
    const range = document.createRange();
    range.selectNodeContents(targetEl);
    range.collapse(false); // ALWAYS place at the end
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    console.warn('Safe caret fallback error', err);
  }
}

/**
 * Accurately determines if the active caret is at the end of the container content.
 */
function isCaretAtEndOfContainer(container: HTMLElement): boolean {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.endContainer) && container !== range.endContainer) return false;

  const leafElements = Array.from(
    container.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
  ) as HTMLElement[];

  const lastEl = leafElements[leafElements.length - 1] || container.lastElementChild || container;
  if (!lastEl) return true;

  if (lastEl.contains(range.endContainer) || lastEl === range.endContainer) {
    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      const text = range.endContainer.textContent || '';
      return range.endOffset >= text.length;
    }
    return range.endOffset >= range.endContainer.childNodes.length;
  }

  try {
    const endRange = document.createRange();
    endRange.selectNodeContents(container);
    endRange.setStart(range.endContainer, range.endOffset);
    return endRange.toString().trim().length === 0;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if the content has filled the printable height or reached the bottom boundary.
 */
function isPageAtBottomBoundary(container: HTMLElement): boolean {
  if (!container) return false;
  // Check if content scrollHeight exceeds clientHeight
  if (container.scrollHeight > container.clientHeight + 4) {
    return true;
  }

  // Check physical position of last element vs container bottom
  const containerRect = container.getBoundingClientRect();
  const leafElements = Array.from(
    container.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li, table')
  ) as HTMLElement[];
  const lastEl = leafElements[leafElements.length - 1] || container.lastElementChild;
  if (lastEl) {
    const lastRect = lastEl.getBoundingClientRect();
    if (lastRect.bottom >= containerRect.bottom - 45) {
      return true;
    }
  }

  return false;
}

/**
 * Enterprise Docx Live Document & Template Renderer
 * 
 * Unified Single Source of Truth for rendering imported Word document structure,
 * custom template HTML, or blank canvas sheets across Modal Preview and Studio Workbench.
 * 
 * - In Preview Mode (isEditable=false): Synchronously mounts clean HTML and CSS with 100% OpenXML fidelity.
 * - In Studio Mode (isEditable=true): Provides rich in-place contentEditable editing, live caret tracking,
 *   seamless page-to-page keyboard transitions, and smart downward page continuation.
 */
function DocxLiveRendererComponent({
  htmlContent,
  styles = '',
  isEditable = true,
  onContentChange,
  className = '',
  pageIndex = 0,
  totalPages = 1,
  onAddNextPage,
  onDeleteCurrentPage,
  onNavigatePrevPage,
  onNavigateNextPage,
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

  const lastBodyRef = useRef<string>(cleanBody);
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

  // Initial DOM population and external synchronization (Undo/Redo, Template Switching)
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

    // While user is actively focused and typing inside this container, NEVER overwrite innerHTML!
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastKnownHtmlRef.current = cleanBody || '';
      return;
    }

    const isCurrentActive =
      typeof document !== 'undefined' &&
      (document.activeElement === containerRef.current ||
        containerRef.current.contains(document.activeElement));

    if (isCurrentActive) {
      // User is actively focused in this editor; keep DOM intact
      lastKnownHtmlRef.current = cleanBody || '';
      return;
    }

    // External change (e.g. Undo, Redo, Template Switch): update DOM if different
    if (containerRef.current.innerHTML !== cleanBody) {
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
    if (!isEditable) return;
    const handleSelectionChange = () => {
      saveSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [saveSelection, isEditable]);

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
    const currentHtml = containerRef.current.innerHTML;
    lastKnownHtmlRef.current = currentHtml;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const finalExportHtml = activeStyles ? `<style>${activeStyles}</style>\n${currentHtml}` : currentHtml;
      onContentChange?.(finalExportHtml);
    }, 180);
  }, [onContentChange, saveSelection, activeStyles, isEditable]);

  // Keyboard navigation and Enter at the bottom of the page
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditable || !containerRef.current) return;
      const container = containerRef.current;

      // 1. Enter Key at the bottom of the page (or when page is full):
      if (e.key === 'Enter' && !e.shiftKey) {
        const atEnd = isCaretAtEndOfContainer(container);
        const atBottom = isPageAtBottomBoundary(container);

        // If at the end of the page and page is at the bottom boundary:
        if (atEnd && atBottom) {
          e.preventDefault();
          if (pageIndex < totalPages - 1) {
            onNavigateNextPage?.();
          } else {
            onAddNextPage?.();
          }
          return;
        }
      }

      // 2. Down Arrow at the very last position:
      if (e.key === 'ArrowDown') {
        const atEnd = isCaretAtEndOfContainer(container);
        if (atEnd && pageIndex < totalPages - 1) {
          e.preventDefault();
          onNavigateNextPage?.();
          return;
        }
      }

      // 3. Up Arrow at the very first position:
      if (e.key === 'ArrowUp') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const leafElements = Array.from(
            container.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
          );
          const firstEl = leafElements[0] || container.firstElementChild || container;
          if (
            (firstEl.contains(range.startContainer) || firstEl === range.startContainer) &&
            range.startOffset === 0
          ) {
            if (pageIndex > 0) {
              e.preventDefault();
              onNavigatePrevPage?.();
              return;
            }
          }
        }
      }

      // 4. Backspace on an empty page (pageIndex > 0):
      if (e.key === 'Backspace') {
        const text = container.textContent?.trim() || '';
        if (text === '' && pageIndex > 0) {
          e.preventDefault();
          onDeleteCurrentPage?.();
          onNavigatePrevPage?.();
          return;
        }
      }
    },
    [isEditable, pageIndex, totalPages, onAddNextPage, onDeleteCurrentPage, onNavigateNextPage, onNavigatePrevPage]
  );

  // Handle clicking anywhere on empty margin space of document to place the cursor at the bottom
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditable || !containerRef.current) return;

      const target = e.target as HTMLElement;

      // If clicked inside an existing text node, paragraph, or table cell, browser native selection handles it
      if (target !== containerRef.current && containerRef.current.contains(target)) {
        saveSelection();
        return;
      }

      // If clicked directly on the empty background/margin of containerRef:
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
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
          saveSelection();
          return;
        }

        // Place caret at the END of the last content block (never jump to start/top!)
        const lastEl = leafElements[leafElements.length - 1];
        containerRef.current.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(lastEl);
        range.collapse(false); // ALWAYS COLLAPSE TO END
        const sel = window.getSelection();
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

  return (
    <div className="relative group/docx-renderer w-full h-full flex flex-col cursor-text">
      {/* Active Document CSS Style Element (Interpreted natively by Browser) */}
      {activeStyles && (
        <style dangerouslySetInnerHTML={{ __html: activeStyles }} />
      )}

      {/* Main Document Paper Body */}
      {isEditable ? (
        <div
          ref={containerRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onClick={handleContainerClick}
          className={`docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !bg-white !text-slate-900 w-full h-full text-left focus:outline-none cursor-text focus:ring-1 focus:ring-blue-500/20 rounded-xs ${className}`}
          style={{ backgroundColor: '#ffffff', color: '#0f172a', textAlign: 'left' }}
        />
      ) : (
        <div
          ref={containerRef}
          className={`docx-preview-content docx-parsed-body docx-live-container font-sans text-xs sm:text-sm leading-relaxed !bg-white !text-slate-900 w-full h-full text-left select-text ${className}`}
          style={{ backgroundColor: '#ffffff', color: '#0f172a', textAlign: 'left' }}
        />
      )}
    </div>
  );
}

const DocxLiveRenderer = memo(DocxLiveRendererComponent);
export default DocxLiveRenderer;


