/**
 * RunningFooter
 * Decoupled running document footer component.
 *
 * Placed in the reserved footer zone, rendering runtime page numbering (Page X of Y, পৃষ্ঠা ৩ / ১২),
 * timestamp, section info, and system branding without interfering with content flow.
 */

import React from 'react';
import { RuntimeLayoutVariables, HeaderFooterConfig } from './headerFooterTypes';
import { RuntimeVariableResolver } from './RuntimeVariableResolver';

export interface RunningFooterProps {
  variables: RuntimeLayoutVariables;
  config?: HeaderFooterConfig;
  customFooterText?: string;
  numeralSystem?: 'latin' | 'bengali' | 'arabic';
  className?: string;
}

export const RunningFooter: React.FC<RunningFooterProps> = ({
  variables,
  config = {},
  customFooterText,
  numeralSystem = 'latin',
  className = '',
}) => {
  // Custom Raw HTML Footer Template
  if (config.footerHtml) {
    const resolvedHtml = RuntimeVariableResolver.resolve(config.footerHtml, variables);
    return (
      <footer
        className={`print-running-footer w-full print:block ${className}`}
        dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      />
    );
  }

  // Custom Running Footer Text Pattern
  const textPattern = config.runningFooterText || customFooterText;
  const leftText = textPattern
    ? RuntimeVariableResolver.resolve(textPattern, variables)
    : `${variables.institutionName} • Generated on ${variables.currentDate}, ${variables.currentTime}`;

  // Formatted page number based on numeral system
  let pageNumberDisplay = `Page ${variables.pageNumber} of ${variables.totalPages}`;
  if (numeralSystem === 'bengali' || variables.pageNumberBengali) {
    const p = variables.pageNumberBengali || RuntimeVariableResolver.toBengaliNumerals(variables.pageNumber);
    const tot = variables.totalPagesBengali || RuntimeVariableResolver.toBengaliNumerals(variables.totalPages);
    pageNumberDisplay = `পৃষ্ঠা ${p} / ${tot}`;
  } else if (numeralSystem === 'arabic' || variables.pageNumberArabic) {
    const p = variables.pageNumberArabic || RuntimeVariableResolver.toArabicNumerals(variables.pageNumber);
    const tot = variables.totalPagesArabic || RuntimeVariableResolver.toArabicNumerals(variables.totalPages);
    pageNumberDisplay = `صفحة ${p} من ${tot}`;
  }

  return (
    <footer className={`print-document-footer pt-1.5 border-t-[0.5px] border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500 font-medium print:pt-1 print:text-[9px] ${className}`}>
      <span>{leftText}</span>
      <span className="font-mono font-bold text-slate-700">
        {pageNumberDisplay}
      </span>
    </footer>
  );
};

export default RunningFooter;
