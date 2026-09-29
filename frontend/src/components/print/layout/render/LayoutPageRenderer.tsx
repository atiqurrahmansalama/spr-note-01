/**
 * LayoutPageRenderer
 * Master physical visual paper page renderer component.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Strict Layering:
 *    Paper Shell (exact paper dimensions, realistic shadow, margins)
 *      → Page Chrome (WatermarkLayer, RunningHeader, RunningFooter, SignatureBlockRenderer)
 *      → LayoutFragmentRenderer (Pre-computed layout fragments)
 * 2. 100% Read-Only rendering of pre-paginated LayoutPage data.
 * 3. Exact spatial height allocation for contentArea, headerArea, footerArea, and signatureArea.
 * 4. Zero DOM mutations or in-DOM pagination heuristics.
 * 5. Zero dependencies on deprecated DocxLiveRenderer.
 */

import React, { memo } from 'react';
import { LayoutPage } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import {
  RunningHeader,
  RunningFooter,
  WatermarkLayer,
  SignatureBlockRenderer,
  RuntimeVariableResolver,
} from '../chrome';
import { LayoutFragmentRenderer } from './LayoutFragmentRenderer';
import { CanonicalContentRenderer } from './CanonicalContentRenderer';

export interface LayoutPageRendererProps {
  page: LayoutPage;
  totalPages?: number;
  options?: LayoutDocumentOptions;
  styles?: string;
  className?: string;
  children?: React.ReactNode;
}

export const LayoutPageRenderer: React.FC<LayoutPageRendererProps> = memo(({
  page,
  totalPages,
  options = {},
  styles = '',
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

  // Construct runtime variables for this page
  const runtimeVars = RuntimeVariableResolver.buildVariables(page.index, effectiveTotalPages, {
    documentTitle: options.title || 'Official Document',
    documentSubtitle: options.subtitle,
    institutionName: options.institutionName || 'SPR Note Academy',
    institutionAddress: options.institutionAddress,
    sectionId: page.sectionId,
    sectionIndex: page.sectionIndex,
    sectionNumber: page.sectionIndex !== undefined ? page.sectionIndex + 1 : 1,
    sectionTitle: page.sectionTitle,
    sectionPageNumber: page.sectionPageNumber,
    sectionTotalPages: page.sectionTotalPages,
  });

  const watermarkConfig = page.watermarkConfig || options.watermarkConfig;
  const watermarkText = page.watermarkText || options.watermarkText;
  const headerConfig = options.headerConfig;
  const footerConfig = options.footerConfig;
  const signatureConfig = page.signatureConfig || options.signatureConfig;

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
          {page.sectionTitle && (
            <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-sm font-sans">
              {page.sectionTitle} (p. {page.sectionPageNumber}/{page.sectionTotalPages})
            </span>
          )}
          <span className="text-[10px] font-semibold theme-text-muted px-1.5 py-0.5 rounded-sm theme-bg-sub border theme-border font-mono">
            {Math.round(page.width)} × {Math.round(page.height)}px
          </span>
          {options.debugLayout && (
            <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-sm font-mono">
              Used: {Math.round(page.usedHeight)}px &bull; Rem: {Math.round(page.availableHeight)}px
            </span>
          )}
        </div>
      </div>

      {/* Actual Physical Visual Paper Sheet Container */}
      <div
        className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:bg-white relative text-left box-border shadow-xl select-text flex flex-col justify-between"
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
        {/* Background Watermark Layer */}
        {(watermarkConfig || watermarkText) && (
          <WatermarkLayer
            config={watermarkConfig}
            text={watermarkText}
            variables={runtimeVars}
          />
        )}

        {/* 1. Reserved Running Header Zone */}
        {headerConfig && page.headerArea && page.headerArea.height > 0 && (
          <div
            className="w-full relative z-10 shrink-0 overflow-hidden flex flex-col justify-end"
            style={{
              height: `${page.headerArea.height}px`,
              minHeight: `${page.headerArea.height}px`,
            }}
          >
            <RunningHeader
              variables={runtimeVars}
              config={headerConfig}
            />
          </div>
        )}

        {/* 2. Printable Flow Content Area (strictly bounded by contentArea geometry) */}
        <div
          className="w-full flex-1 relative z-10 text-left select-text overflow-hidden"
          style={{
            minHeight: `${page.contentArea.height}px`,
            maxHeight: `${page.contentArea.height}px`,
            height: `${page.contentArea.height}px`,
          }}
        >
          {children ? (
            children
          ) : page.fragments && page.fragments.length > 0 ? (
            <div className="layout-page-fragments flex flex-col w-full text-left select-text">
              {page.fragments.map((fragment) => (
                <LayoutFragmentRenderer
                  key={fragment.id}
                  fragment={fragment}
                  styles={styles}
                />
              ))}
            </div>
          ) : (
            <CanonicalContentRenderer
              content={page.htmlContent || '<p><br></p>'}
              styles={styles}
              pageIndex={page.index}
              totalPages={effectiveTotalPages}
            />
          )}
        </div>

        {/* 3. Reserved Dedicated Signature Zone (on target pages) */}
        {signatureConfig && (page.isLastPage || options.showSignaturesOnAllPages) && page.signatureArea && page.signatureArea.height > 0 && (
          <div
            className="w-full relative z-10 shrink-0 overflow-hidden"
            style={{
              height: `${page.signatureArea.height}px`,
              minHeight: `${page.signatureArea.height}px`,
            }}
          >
            <SignatureBlockRenderer
              config={signatureConfig}
            />
          </div>
        )}

        {/* 4. Reserved Running Footer Zone */}
        {footerConfig && page.footerArea && page.footerArea.height > 0 && (
          <div
            className="w-full relative z-10 shrink-0 overflow-hidden flex flex-col justify-start"
            style={{
              height: `${page.footerArea.height}px`,
              minHeight: `${page.footerArea.height}px`,
            }}
          >
            <RunningFooter
              variables={runtimeVars}
              config={footerConfig}
              numeralSystem={options.numeralSystem}
            />
          </div>
        )}
      </div>
    </div>
  );
});

LayoutPageRenderer.displayName = 'LayoutPageRenderer';

export default LayoutPageRenderer;
