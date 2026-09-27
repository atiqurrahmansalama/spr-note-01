/**
 * LayoutPageRenderer
 * Dedicated enterprise physical visual paper page renderer component.
 *
 * Renders an actual, discrete physical paper sheet container with:
 * - Exact physical width & height (e.g. 794px × 1123px for A4 portrait)
 * - Exact margin padding insets
 * - Realistic box shadow, background, and rounded corners
 * - Clean screen header indicator (Page X of Y, Dimensions, Add Page)
 * - Safe fragment / children rendering with zero DOM mutation
 */

import React from 'react';
import { LayoutPage } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { PageBreakIcon } from '../../../ui/Icons';
import DocxLiveRenderer from '../../DocxLiveRenderer';

export interface LayoutPageRendererProps {
  page: LayoutPage;
  totalPages?: number;
  options?: LayoutDocumentOptions;
  styles?: string;
  isEditable?: boolean;
  onContentChange?: (newHtml: string) => void;
  onAddPageBreak?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const LayoutPageRenderer: React.FC<LayoutPageRendererProps> = ({
  page,
  totalPages,
  options = {},
  styles = '',
  isEditable = false,
  onContentChange,
  onAddPageBreak,
  className = '',
  children,
}) => {
  const effectiveTotalPages = totalPages || page.pageNumber || 1;
  const pageSize = options.pageSize || 'A4';
  const orientation = options.orientation || 'PORTRAIT';
  const marginPreset = options.margin || 'NORMAL';
  const density = options.density || 'NORMAL';
  const colorMode = options.colorMode || 'FULL_COLOR';

  const marginPadding = `${page.margins.top}px ${page.margins.right}px ${page.margins.bottom}px ${page.margins.left}px`;

  return (
    <div
      id={`docx-live-page-${page.index}`}
      className={`relative paper-sheet-wrapper group flex flex-col items-center mb-8 print:mb-0 print:block ${className}`}
    >
      {/* Screen-only Physical Page Header Controls */}
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
          {options.debugLayout && (
            <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-sm font-mono">
              Used: {Math.round(page.usedHeight)}px &bull; Rem: {Math.round(page.availableHeight)}px
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {page.index === 0 && (
            <span className="text-[11px] theme-text-muted hidden md:inline">
              Press <kbd className="px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono text-[10px]">Ctrl+Enter</kbd> for new page
            </span>
          )}
          {isEditable && (
            <button
              type="button"
              onClick={() => {
                if (onAddPageBreak) {
                  onAddPageBreak();
                } else if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('spr_doclab_insert_page_break'));
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-md theme-bg-accent text-white hover:opacity-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              title="Insert a manual page break to create a new physical page (Ctrl + Enter)"
            >
              <PageBreakIcon className="w-3.5 h-3.5" />
              <span>+ Add Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Actual Physical Visual Paper Sheet Container */}
      <div
        className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-xl cursor-text select-text"
        data-size={pageSize}
        data-orientation={orientation}
        data-margin={marginPreset}
        data-density={density}
        data-color-mode={colorMode}
        data-page-break="true"
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          width: `${page.width}px`,
          maxWidth: `${page.width}px`,
          minHeight: `${page.height}px`,
          height: `${page.height}px`,
          maxHeight: `${page.height}px`,
          padding: marginPadding,
          textAlign: 'left',
          boxSizing: 'border-box',
          overflow: 'hidden',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      >
        <div className="w-full h-full text-left select-text">
          {children ? (
            children
          ) : (
            <DocxLiveRenderer
              key={`docx_live_page_renderer_${page.index}`}
              htmlContent={page.htmlContent || '<p><br></p>'}
              styles={styles}
              isEditable={isEditable}
              pageIndex={page.index}
              totalPages={effectiveTotalPages}
              onContentChange={onContentChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutPageRenderer;
