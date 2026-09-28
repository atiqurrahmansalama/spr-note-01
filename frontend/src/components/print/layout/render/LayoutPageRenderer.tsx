/**
 * LayoutPageRenderer
 * Dedicated enterprise physical visual paper page renderer component.
 *
 * Renders an actual, discrete physical paper sheet container with:
 * - Exact physical width & height (e.g. 794px × 1123px for A4 portrait)
 * - Exact margin padding insets
 * - Realistic box shadow, background, and rounded corners
 * - Clean screen header indicator (Page X of Y, Dimensions, Section info)
 * - Watermark layer overlay
 * - Running Header & Running Footer chrome
 * - Dedicated Signature Block zone on final page
 * - Safe fragment / children rendering with zero DOM mutation
 */

import React from 'react';
import { LayoutPage } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import {
  RunningHeader,
  RunningFooter,
  WatermarkLayer,
  SignatureBlockRenderer,
  RuntimeVariableResolver,
} from '../chrome';
import DocxLiveRenderer from '../../DocxLiveRenderer';

export interface LayoutPageRendererProps {
  page: LayoutPage;
  totalPages?: number;
  options?: LayoutDocumentOptions;
  styles?: string;
  className?: string;
  children?: React.ReactNode;
}

export const LayoutPageRenderer: React.FC<LayoutPageRendererProps> = ({
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
    sectionNumber: (page.sectionIndex !== undefined ? page.sectionIndex + 1 : 1),
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
        className="paper-sheet docx-paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative text-left box-border shadow-xl select-text flex flex-col justify-between"
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

        {/* Running Header Zone */}
        {headerConfig && (
          <div className="w-full relative z-10 shrink-0">
            <RunningHeader
              variables={runtimeVars}
              config={headerConfig}
            />
          </div>
        )}

        {/* Printable Flow Content Area */}
        <div className="w-full flex-1 relative z-10 text-left select-text overflow-hidden">
          {children ? (
            children
          ) : (
            <DocxLiveRenderer
              key={`docx_read_only_page_${page.index}`}
              htmlContent={page.htmlContent || '<p><br></p>'}
              styles={styles}
              isEditable={false}
              pageIndex={page.index}
              totalPages={effectiveTotalPages}
            />
          )}

          {/* Signature Block (if placed inside flow on target page) */}
          {signatureConfig && (page.isLastPage || options.showSignaturesOnAllPages) && (
            <SignatureBlockRenderer
              config={signatureConfig}
            />
          )}
        </div>

        {/* Running Footer Zone */}
        {footerConfig && (
          <div className="w-full relative z-10 shrink-0">
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
};

export default LayoutPageRenderer;
