/**
 * RunningHeader
 * Decoupled running document header component.
 *
 * Sits in the reserved header zone outside the continuous document flow.
 * Interpolates runtime variables without mutating persistent template storage.
 * Supports:
 * - Full Institutional branding header on Page 1 (or all pages)
 * - Different first-page header variation (per-section or per-document)
 * - Compact running continuation subheader on Pages 2+
 * - Custom running header text with token interpolation (Page X of Y, Roman, Bengali, Arabic)
 * - Section-aware header title display
 */

import React from 'react';
import { BuildingOfficeIcon } from '@/components/ui/Icons';
import { RuntimeLayoutVariables, HeaderFooterConfig } from './headerFooterTypes';
import { RuntimeVariableResolver } from './RuntimeVariableResolver';

export interface RunningHeaderProps {
  variables: RuntimeLayoutVariables;
  config?: HeaderFooterConfig;
  showLogo?: boolean;
  showTitleLine?: boolean;
  titleLineStyle?: string;
  className?: string;
}

export const RunningHeader: React.FC<RunningHeaderProps> = ({
  variables,
  config = {},
  showLogo = true,
  showTitleLine = false,
  titleLineStyle = 'SOLID',
  className = '',
}) => {
  const isDocFirstPage = variables.pageIndex === 0;
  const isSectionFirst = variables.isSectionFirstPage ?? (variables.sectionPageNumber === 1);
  const isTargetFirstPage = config.differentFirstPage ? (isDocFirstPage || isSectionFirst) : isDocFirstPage;

  // 1. Different First Page: Custom First Page Header HTML
  if (config.differentFirstPage && isTargetFirstPage) {
    if (config.firstPageHeaderHtml !== undefined) {
      if (!config.firstPageHeaderHtml.trim()) {
        return null; // Empty first page header
      }
      const resolvedFirstHtml = RuntimeVariableResolver.resolve(config.firstPageHeaderHtml, variables);
      return (
        <header
          className={`print-running-header print-first-page-header w-full print:block ${className}`}
          dangerouslySetInnerHTML={{ __html: resolvedFirstHtml }}
        />
      );
    }

    if (config.firstPageRunningHeaderText) {
      const resolvedText = RuntimeVariableResolver.resolve(config.firstPageRunningHeaderText, variables);
      return (
        <header className={`print-running-continuation-header pb-1.5 mb-2 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 font-bold ${className}`}>
          <span className="uppercase tracking-wide text-slate-800">
            {resolvedText}
          </span>
          <span className="font-mono text-[11px] text-slate-500 font-medium">
            Page {variables.pageNumberFormatted || variables.pageNumber} of {variables.totalPagesFormatted || variables.totalPages}
          </span>
        </header>
      );
    }
  }

  // 2. Custom Raw HTML Header Template
  if (config.headerHtml) {
    const resolvedHtml = RuntimeVariableResolver.resolve(config.headerHtml, variables);
    return (
      <header
        className={`print-running-header w-full print:block ${className}`}
        dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      />
    );
  }

  // 3. Custom Running Header Text Pattern (e.g. "{{document.title}} • {{institution.name}}")
  if (config.runningHeaderText && (!isTargetFirstPage || !config.showFirstPageHeader)) {
    const resolvedText = RuntimeVariableResolver.resolve(config.runningHeaderText, variables);
    return (
      <header className={`print-running-continuation-header pb-1.5 mb-2 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 font-bold ${className}`}>
        <span className="uppercase tracking-wide text-slate-800">
          {resolvedText}
        </span>
        <span className="font-mono text-[11px] text-slate-500 font-medium">
          Page {variables.pageNumberFormatted || variables.pageNumber} of {variables.totalPagesFormatted || variables.totalPages}
        </span>
      </header>
    );
  }

  // 4. Page 1 Full Branding Header
  if (isDocFirstPage || config.showSubsequentPageHeaders) {
    return (
      <header className={`print-document-header pb-2 mb-2 border-b-2 border-slate-900 bg-transparent print:pb-2 print:mb-2 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showLogo && (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs border border-slate-800 shrink-0 print:w-10 print:h-10">
                <BuildingOfficeIcon className="w-6 h-6 print:w-5 print:h-5" />
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight print:text-base">
                {variables.institutionName}
              </h1>
              {variables.institutionAddress && (
                <p className="text-xs text-slate-600 font-medium leading-normal print:text-[11px]">
                  {variables.institutionAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        {variables.documentTitle && (
          <div
            className={`print-document-title-block text-center flex flex-col items-center justify-center space-y-0.5 mt-2 pb-1 ${
              showTitleLine
                ? titleLineStyle === 'DOUBLE'
                  ? 'border-b-4 border-double border-slate-900 pb-2'
                  : 'border-b-2 border-slate-900 pb-1.5'
                : 'pb-0.5'
            }`}
          >
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 leading-tight print:text-sm">
              {variables.documentTitle}
            </h2>
            {variables.documentSubtitle && (
              <p className="text-xs font-semibold text-slate-600 tracking-normal print:text-[11px]">
                {variables.documentSubtitle}
              </p>
            )}
          </div>
        )}
      </header>
    );
  }

  // 5. Subsequent Pages (Page 2+) Continuation Subheader
  const sectionPart = variables.sectionTitle ? ` • ${variables.sectionTitle}` : '';
  return (
    <header className={`print-running-continuation-header pb-1.5 mb-2 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 font-bold ${className}`}>
      <span className="uppercase tracking-wide text-slate-900">
        {variables.documentTitle}{sectionPart} (Continued)
      </span>
      <span className="font-mono text-[11px] text-slate-500 font-medium">
        Page {variables.pageNumberFormatted || variables.pageNumber} of {variables.totalPagesFormatted || variables.totalPages}
      </span>
    </header>
  );
};

export default RunningHeader;
