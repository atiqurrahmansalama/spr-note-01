/**
 * LayoutDocumentRenderer
 * Dedicated multi-page document orchestrator component.
 *
 * Consumes a computed LayoutDocument and maps each LayoutPage into an actual
 * physical visual LayoutPageRenderer with shared styles and clean gap separation.
 */

import React from 'react';
import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutPageRenderer } from './LayoutPageRenderer';

export interface LayoutDocumentRendererProps {
  document: LayoutDocument;
  options?: LayoutDocumentOptions;
  styles?: string;
  isEditable?: boolean;
  onPageContentChange?: (pageIndex: number, updatedHtml: string) => void;
  onAddPageBreak?: () => void;
  className?: string;
}

export const LayoutDocumentRenderer: React.FC<LayoutDocumentRendererProps> = ({
  document,
  options = {},
  styles = '',
  isEditable = false,
  onPageContentChange,
  onAddPageBreak,
  className = '',
}) => {
  const pages: LayoutPage[] =
    document.pages && document.pages.length > 0
      ? document.pages
      : [
          {
            index: 0,
            pageNumber: 1,
            width: document.width || 794,
            height: document.height || 1123,
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

  const totalPages = document.totalPages || pages.length;
  const mergedOptions = { ...document.options, ...options };
  const effectiveStyles = styles || document.options?.styles || '';

  return (
    <div
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
      {pages.map((page) => (
        <LayoutPageRenderer
          key={`layout_page_${page.index}`}
          page={page}
          totalPages={totalPages}
          options={mergedOptions}
          styles={effectiveStyles}
          isEditable={isEditable}
          onContentChange={(newHtml) => {
            if (onPageContentChange) {
              onPageContentChange(page.index, newHtml);
            }
          }}
          onAddPageBreak={onAddPageBreak}
        />
      ))}
    </div>
  );
};

export default LayoutDocumentRenderer;
