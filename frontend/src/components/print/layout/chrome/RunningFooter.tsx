/**
 * RunningFooter
 * Decoupled running document footer component.
 *
 * Placed in the reserved footer zone, rendering runtime page numbering (Page X of Y, পৃষ্ঠা ৩ / ১২, Roman, Arabic),
 * timestamp, section info, and system branding without interfering with content flow.
 * Supports different-first-page footer variation and per-section numbering rules.
 */

import React from 'react';
import { RuntimeLayoutVariables, HeaderFooterConfig } from './headerFooterTypes';
import { RuntimeVariableResolver } from './RuntimeVariableResolver';

export interface RunningFooterProps {
  variables: RuntimeLayoutVariables;
  config?: HeaderFooterConfig;
  customFooterText?: string;
  numeralSystem?: 'latin' | 'bengali' | 'arabic' | 'roman-upper' | 'roman-lower';
  className?: string;
}

export const RunningFooter: React.FC<RunningFooterProps> = ({
  variables,
  config = {},
  customFooterText,
  numeralSystem,
  className = '',
}) => {
  const isDocFirstPage = variables.pageIndex === 0;
  const isSectionFirst = variables.isSectionFirstPage ?? (variables.sectionPageNumber === 1);
  const isTargetFirstPage = config.differentFirstPage ? (isDocFirstPage || isSectionFirst) : isDocFirstPage;

  // 1. Different First Page: Custom First Page Footer HTML
  if (config.differentFirstPage && isTargetFirstPage) {
    if (config.firstPageFooterHtml !== undefined) {
      if (!config.firstPageFooterHtml.trim()) {
        return null; // Empty first page footer
      }
      const resolvedFirstHtml = RuntimeVariableResolver.resolve(config.firstPageFooterHtml, variables);
      return (
        <footer
          className={`print-running-footer print-first-page-footer w-full print:block ${className}`}
          dangerouslySetInnerHTML={{ __html: resolvedFirstHtml }}
        />
      );
    }

    if (config.firstPageRunningFooterText) {
      const leftText = RuntimeVariableResolver.resolve(config.firstPageRunningFooterText, variables);
      return (
        <footer className={`print-document-footer pt-1.5 border-t-[0.5px] border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500 font-medium print:pt-1 print:text-[9px] ${className}`}>
          <span>{leftText}</span>
        </footer>
      );
    }
  }

  // 2. Custom Raw HTML Footer Template
  if (config.footerHtml) {
    const resolvedHtml = RuntimeVariableResolver.resolve(config.footerHtml, variables);
    return (
      <footer
        className={`print-running-footer w-full print:block ${className}`}
        dangerouslySetInnerHTML={{ __html: resolvedHtml }}
      />
    );
  }

  // 3. Custom Running Footer Text Pattern
  const textPattern = config.runningFooterText || customFooterText;
  const leftText = textPattern
    ? RuntimeVariableResolver.resolve(textPattern, variables)
    : `${variables.institutionName} • Generated on ${variables.currentDate}, ${variables.currentTime}`;

  // Formatted page number based on numeral system / pageNumberFormat
  const activeNumeralSystem = numeralSystem || config.numeralSystem || (variables.pageNumberFormat as any) || 'latin';

  let pageNumberDisplay = `Page ${variables.pageNumber} of ${variables.totalPages}`;

  if (activeNumeralSystem === 'roman-upper' || variables.pageNumberFormat === 'roman-upper') {
    const p = variables.pageNumberRomanUpper || RuntimeVariableResolver.toRomanNumerals(variables.pageNumber, true);
    const tot = variables.totalPagesRomanUpper || RuntimeVariableResolver.toRomanNumerals(variables.totalPages, true);
    pageNumberDisplay = `Page ${p} of ${tot}`;
  } else if (activeNumeralSystem === 'roman-lower' || variables.pageNumberFormat === 'roman-lower') {
    const p = variables.pageNumberRomanLower || RuntimeVariableResolver.toRomanNumerals(variables.pageNumber, false);
    const tot = variables.totalPagesRomanLower || RuntimeVariableResolver.toRomanNumerals(variables.totalPages, false);
    pageNumberDisplay = `Page ${p} of ${tot}`;
  } else if (activeNumeralSystem === 'bengali' || variables.pageNumberFormat === 'bengali') {
    const p = variables.pageNumberBengali || RuntimeVariableResolver.toBengaliNumerals(variables.pageNumber);
    const tot = variables.totalPagesBengali || RuntimeVariableResolver.toBengaliNumerals(variables.totalPages);
    pageNumberDisplay = `পৃষ্ঠা ${p} / ${tot}`;
  } else if (activeNumeralSystem === 'arabic' || variables.pageNumberFormat === 'arabic') {
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
