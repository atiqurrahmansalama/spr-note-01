/**
 * Mode D: Batch Generated Multi-Record Document View
 * Renders discrete visual page sheets for live record packages.
 */

import React from 'react';
import { PageGeometry } from '../../layout/geometry/PageGeometry';
import { CanonicalContentRenderer } from '../../layout/render/CanonicalContentRenderer';
import { PrintOptions } from '../../types';

export interface BatchPageItem {
  docIndex: number;
  pageNumber: number;
  htmlContent: string;
  totalDocPages: number;
}

export interface ModeDBatchGeneratedViewProps {
  docxLayoutPages?: BatchPageItem[];
  mergedDocxPages?: string[];
  pageGeometry: PageGeometry;
  options: PrintOptions;
  customDocxTemplate?: any;
  docxStyles: string;
}

export const ModeDBatchGeneratedView: React.FC<ModeDBatchGeneratedViewProps> = ({
  docxLayoutPages,
  mergedDocxPages = [],
  pageGeometry,
  options,
  customDocxTemplate,
  docxStyles,
}) => {
  const pagesToRender: BatchPageItem[] =
    docxLayoutPages && docxLayoutPages.length > 0
      ? docxLayoutPages
      : mergedDocxPages.map((html, idx) => ({
          docIndex: idx,
          pageNumber: 1,
          htmlContent: html,
          totalDocPages: 1,
        }));

  const totalDistinctDocs = Math.max(1, new Set(pagesToRender.map((p) => p.docIndex)).size);

  return (
    <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
      {docxStyles && (
        <style
          dangerouslySetInnerHTML={{
            __html: docxStyles.replace(/<\/?style\b[^>]*>/gi, ''),
          }}
        />
      )}
      {pagesToRender.map((pageItem, pIdx) => {
        const isMultiPageDoc = pageItem.totalDocPages > 1;
        const sheetLabel = isMultiPageDoc
          ? `Record ${pageItem.docIndex + 1} of ${totalDistinctDocs} — Page ${pageItem.pageNumber} of ${pageItem.totalDocPages}`
          : totalDistinctDocs > 1
          ? `Document ${pageItem.docIndex + 1} of ${totalDistinctDocs}`
          : `Page ${pIdx + 1} of ${pagesToRender.length}`;

        return (
          <div
            key={`docx_layout_page_${pIdx}`}
            id={`docx-live-page-${pIdx}`}
            className="relative paper-sheet-wrapper group flex flex-col items-center"
          >
            {/* Screen Header Control Bar */}
            <div
              style={{
                width: `${pageGeometry.paperDimensionsPx.width}px`,
                maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
              }}
              className="flex items-center justify-between px-2 py-1 mb-1.5 text-xs theme-text-secondary select-none print:hidden"
            >
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full theme-bg-accent" />
                <span className="font-bold theme-text-primary font-mono text-[11.5px]">
                  {sheetLabel}
                </span>
              </div>
            </div>

            {/* Discrete Physical Paper Sheet */}
            <div
              className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:bg-white relative text-left box-border shadow-lg cursor-text select-text"
              data-size={options.pageSize || customDocxTemplate?.pageSize || 'A4'}
              data-orientation={options.orientation || customDocxTemplate?.orientation || 'PORTRAIT'}
              data-margin={options.margin || customDocxTemplate?.margin || 'NORMAL'}
              data-density={options.density || 'NORMAL'}
              data-color-mode={options.colorMode || 'FULL_COLOR'}
              data-page-break="true"
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                width: `${pageGeometry.paperDimensionsPx.width}px`,
                maxWidth: `${pageGeometry.paperDimensionsPx.width}px`,
                minHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                height: `${pageGeometry.paperDimensionsPx.height}px`,
                maxHeight: `${pageGeometry.paperDimensionsPx.height}px`,
                padding: pageGeometry.cssMarginString,
                textAlign: 'left',
                boxSizing: 'border-box',
                overflow: 'hidden',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              <div className="w-full h-full text-left select-text">
                <CanonicalContentRenderer
                  key={`docx_batch_renderer_${pIdx}`}
                  content={pageItem.htmlContent}
                  styles={docxStyles}
                  pageIndex={pIdx}
                  totalPages={pagesToRender.length}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
