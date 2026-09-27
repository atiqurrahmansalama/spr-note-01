/**
 * RunningHeader
 * Decoupled running document header component.
 *
 * Sits in the reserved header zone outside the continuous document flow.
 * Interpolates runtime variables without mutating persistent template storage.
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
  const isFirstPage = variables.pageIndex === 0;

  // Custom Raw HTML Header Template
  if (config.headerHtml) {
    const resolvedHtml = RuntimeVariableResolver.resolve(config.headerHtml, variables);
    return (
      <header
        className={`print-running-header w-full print:block ${className}`}
        dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      />
    );
  }

  // Page 1 Full Branding Header
  if (isFirstPage || config.showSubsequentPageHeaders) {
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

  // Subsequent Pages (Page 2+) Continuation Subheader
  return (
    <header className={`print-running-continuation-header pb-1.5 mb-2 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 font-bold ${className}`}>
      <span className="uppercase tracking-wide text-slate-900">
        {variables.documentTitle} (Continued)
      </span>
      <span className="font-mono text-[11px] text-slate-500 font-medium">
        Page {variables.pageNumber} of {variables.totalPages}
      </span>
    </header>
  );
};

export default RunningHeader;
