/**
 * RunningFooter
 * Decoupled running document footer component.
 *
 * Placed in the reserved footer zone, rendering runtime page numbering (Page X of Y),
 * timestamp, and system branding without interfering with content flow.
 */

import React from 'react';
import { RuntimeLayoutVariables, HeaderFooterConfig } from './headerFooterTypes';
import { RuntimeVariableResolver } from './RuntimeVariableResolver';

export interface RunningFooterProps {
  variables: RuntimeLayoutVariables;
  config?: HeaderFooterConfig;
  customFooterText?: string;
  className?: string;
}

export const RunningFooter: React.FC<RunningFooterProps> = ({
  variables,
  config = {},
  customFooterText,
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

  const leftText = customFooterText
    ? RuntimeVariableResolver.resolve(customFooterText, variables)
    : `Generated via SPR Note System • ${variables.currentDate}, ${variables.currentTime}`;

  return (
    <footer className={`print-document-footer pt-1.5 border-t-[0.5px] border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500 font-medium print:pt-1 print:text-[9px] ${className}`}>
      <span>{leftText}</span>
      <span className="font-mono font-bold text-slate-700">
        Page {variables.pageNumber} of {variables.totalPages}
      </span>
    </footer>
  );
};

export default RunningFooter;
