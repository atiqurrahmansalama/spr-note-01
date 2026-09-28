/**
 * SignatureBlockRenderer
 * Enterprise multi-column signature block component for institutional documents.
 *
 * Renders dedicated signature lines (Prepared By, Checked By, Head of Department, Principal)
 * with robust keep-together protection and exact physical styling.
 */

import React from 'react';
import { SignatureBlockConfig, SignatureColumnConfig } from './headerFooterTypes';

export interface SignatureBlockRendererProps {
  config?: SignatureBlockConfig;
  columns?: SignatureColumnConfig[];
  title?: string;
  className?: string;
}

export const DEFAULT_SIGNATURE_COLUMNS: SignatureColumnConfig[] = [
  { id: 'prepared_by', label: 'Prepared By', role: 'Staff / Operator' },
  { id: 'checked_by', label: 'Checked By', role: 'Section Coordinator' },
  { id: 'approved_by', label: 'Approved By', role: 'Principal / Director' },
];

export const SignatureBlockRenderer: React.FC<SignatureBlockRendererProps> = ({
  config,
  columns,
  title,
  className = '',
}) => {
  const activeColumns = columns || (config && config.columns && config.columns.length > 0 ? config.columns : DEFAULT_SIGNATURE_COLUMNS);
  const blockTitle = title || config?.title;
  const lineStyle = config?.lineStyle || 'SOLID';

  const lineClass =
    lineStyle === 'DASHED'
      ? 'border-dashed'
      : lineStyle === 'DOTTED'
      ? 'border-dotted'
      : 'border-solid';

  return (
    <section
      className={`print-signature-block print-avoid-break keep-together mt-8 pt-4 pb-2 w-full text-slate-900 select-text ${className}`}
      data-signature-block="true"
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {blockTitle && (
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-6 text-center border-b border-slate-200 pb-1">
          {blockTitle}
        </h4>
      )}

      <div
        className="grid gap-6 items-end w-full"
        style={{
          gridTemplateColumns: `repeat(${activeColumns.length}, minmax(0, 1fr))`,
        }}
      >
        {activeColumns.map((col) => (
          <div key={col.id} className="flex flex-col items-center text-center">
            {col.signatureImage ? (
              <img
                src={col.signatureImage}
                alt=""
                className="h-10 max-w-[120px] object-contain mb-1 pointer-events-none"
              />
            ) : (
              <div className="h-10 w-full" />
            )}

            {/* Signature Line */}
            <div className={`w-full border-t-2 border-slate-800 ${lineClass} pt-1.5`} />

            {/* Name / Role Label */}
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {col.name || col.label}
            </span>

            {col.role && col.name && (
              <span className="text-[10px] font-medium text-slate-500 leading-normal">
                {col.role}
              </span>
            )}

            {col.dateRequired && (
              <span className="text-[9.5px] font-mono text-slate-400 mt-0.5">
                Date: __________________
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SignatureBlockRenderer;
