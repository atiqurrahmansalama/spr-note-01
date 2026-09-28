import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutPageRenderer } from './LayoutPageRenderer';
import { VirtualPageViewport, VirtualViewportState } from '../performance/VirtualPageViewport';

export interface LayoutDocumentRendererProps {
  document: LayoutDocument;
  options?: LayoutDocumentOptions;
  styles?: string;
  className?: string;
  enableVirtualization?: boolean;
}

export const LayoutDocumentRenderer: React.FC<LayoutDocumentRendererProps> = ({
  document: layoutDocument,
  options = {},
  styles = '',
  className = '',
  enableVirtualization = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(1000);
  const [isPrinting, setIsPrinting] = useState(false);

  const pages: LayoutPage[] =
    layoutDocument.pages && layoutDocument.pages.length > 0
      ? layoutDocument.pages
      : [
          {
            index: 0,
            pageNumber: 1,
            width: layoutDocument.width || 794,
            height: layoutDocument.height || 1123,
            margins: { top: 48, right: 48, bottom: 48, left: 48 },
            contentArea: { x: 48, y: 48, width: 698, height: 1027 },
            fragments: [],
            htmlContent: '<p><br></p>',
            usedHeight: 0,
            availableHeight: 1027,
            isFirstPage: true,
            isLastPage: true,
          },
        ];

  const totalPages = layoutDocument.totalPages || pages.length;
  const mergedOptions = { ...layoutDocument.options, ...options };
  const effectiveStyles = styles || layoutDocument.options?.styles || '';

  // Track browser print event to disable virtualization during printing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Track parent scrollable viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const findScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let current = node?.parentElement;
      while (current) {
        const overflowY = window.getComputedStyle(current).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return current;
        }
        current = current.parentElement;
      }
      return window;
    };

    const scrollTarget = findScrollParent(containerRef.current);

    const updateScroll = () => {
      if (scrollTarget === window) {
        setScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
        setViewportHeight(window.innerHeight || 1000);
      } else {
        const el = scrollTarget as HTMLElement;
        setScrollTop(el.scrollTop);
        setViewportHeight(el.clientHeight || 1000);
      }
    };

    updateScroll();
    scrollTarget.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, []);

  const pageHeights = useMemo(() => pages.map((p) => p.height || 1123), [pages]);

  const virtualState: VirtualViewportState = useMemo(() => {
    return VirtualPageViewport.calculateVisibleRange(
      scrollTop,
      viewportHeight,
      pageHeights,
      32,
      {
        overscan: 2,
        threshold: 8,
        disabled: !enableVirtualization || isPrinting,
      }
    );
  }, [scrollTop, viewportHeight, pageHeights, enableVirtualization, isPrinting]);

  const renderedSet = useMemo(() => new Set(virtualState.renderedIndices), [virtualState.renderedIndices]);

  return (
    <div
      ref={containerRef}
      className={`layout-document-renderer flex flex-col items-center gap-8 print:gap-0 print:block w-full ${className}`}
    >
      {/* Shared Document Styles injected once */}
      {effectiveStyles && (
        <style
          dangerouslySetInnerHTML={{
            __html: effectiveStyles.replace(/<\/?style\b[^>]*>/gi, ''),
          }}
        />
      )}

      {/* Discrete Visual Paper Pages */}
      {pages.map((page) => {
        const shouldRenderFull = renderedSet.has(page.index);

        if (!shouldRenderFull) {
          // Offscreen distant page placeholder with exact height and width
          return (
            <div
              key={`layout_page_${page.index}`}
              id={`docx-live-page-${page.index}`}
              className="relative paper-sheet-wrapper flex flex-col items-center mb-8 print:mb-0 print:block"
            >
              <div
                className="paper-sheet docx-paper-sheet docx-paper-sheet-placeholder rounded-xs print:hidden relative text-left box-border shadow-xl flex items-center justify-center theme-bg-surface border theme-border"
                style={{
                  width: `${page.width}px`,
                  minHeight: `${page.height}px`,
                  height: `${page.height}px`,
                  maxHeight: `${page.height}px`,
                  backgroundColor: '#ffffff',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold theme-text-muted select-none">
                  <span className="w-2 h-2 rounded-full theme-bg-accent opacity-50" />
                  <span>
                    Page {page.pageNumber} of {totalPages}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <LayoutPageRenderer
            key={`layout_page_${page.index}`}
            page={page}
            totalPages={totalPages}
            options={mergedOptions}
            styles={effectiveStyles}
          />
        );
      })}
    </div>
  );
};

export default LayoutDocumentRenderer;
