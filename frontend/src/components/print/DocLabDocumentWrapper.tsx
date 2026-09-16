import React, { useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { BuildingOfficeIcon } from '../ui/Icons';
import { PrintMetaItem, PrintOptions, PrintSignatureLine } from './types';

export interface DocLabDocumentWrapperProps {
  title?: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  onMetaItemsChange?: ((newMetaItems: PrintMetaItem[]) => void) | null;
  options?: Partial<PrintOptions>;
  onOptionsChange?: ((newOptions: Partial<PrintOptions>) => void) | null;
  isEditable?: boolean;
  children?: React.ReactNode;
  pageIndex?: number;
  totalPages?: number;
  isFirstPage?: boolean;
  isLastPage?: boolean;
  className?: string;
}

/**
 * DocLabDocumentWrapper
 * Master institutional document frame providing automatic branding,
 * header, document metadata grid, watermark, signature block, and print footer.
 */
export const DocLabDocumentWrapper: React.FC<DocLabDocumentWrapperProps> = ({
  title = 'Official Document',
  subtitle = '',
  metaItems = [],
  options = {},
  onOptionsChange = null,
  isEditable = false,
  children,
  pageIndex = 0,
  totalPages = 1,
  isFirstPage = true,
  isLastPage = true,
  className = '',
}) => {
  const { currentInstitution } = useTenant();

  const effectiveIsFirstPage = isFirstPage !== undefined ? isFirstPage : pageIndex === 0;
  const effectiveIsLastPage = isLastPage !== undefined ? isLastPage : pageIndex === totalPages - 1;

  const {
    showHeader = true,
    showLogo = true,
    showTitle = true,
    showTitleLine = false,
    titleLineStyle = 'SOLID',
    showMeta = true,
    showMetaBox = true,
    metaFontSize = 'MD',
    showWatermark = false,
    watermarkText = 'OFFICIAL',
    showSignatures = true,
    signatureLines = [
      { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
      { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
      { id: 'approved', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
    ],
    signatureStyle = 'SOLID',
    showFooter = true,
    customInstitutionName = '',
    customSubtitle = '',
  } = options;

  const activeSignatureLines: PrintSignatureLine[] = useMemo(() => {
    if (!signatureLines || !Array.isArray(signatureLines)) return [];
    return signatureLines.filter((sig: any) => sig && sig.enabled !== false && sig.active !== false);
  }, [signatureLines]);

  const institutionName =
    options.customInstitutionName !== undefined && options.customInstitutionName !== ''
      ? options.customInstitutionName
      : (customInstitutionName || currentInstitution?.name || 'Institution Name');

  const institutionAddress =
    options.customInstitutionAddress !== undefined && options.customInstitutionAddress !== ''
      ? options.customInstitutionAddress
      : (options.customAddress || currentInstitution?.address || currentInstitution?.campus_address || '');

  const resolvedTitle =
    options.customTitle !== undefined && options.customTitle !== ''
      ? options.customTitle
      : title;

  const resolvedSubtitle =
    options.customSubtitle !== undefined && options.customSubtitle !== ''
      ? options.customSubtitle
      : (customSubtitle || subtitle);

  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const printTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      className={`print-document-sheet relative flex flex-col justify-between bg-white text-slate-900 leading-normal print:p-0 print:block print:min-h-0 print:h-auto ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
        color: '#0f172a',
      }}
    >
      {/* Background Watermark (Full Page Overlay) */}
      {showWatermark && watermarkText && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none"
          aria-hidden="true"
        >
          <span
            className="text-slate-900/6 font-black uppercase tracking-[0.25em] text-center transform -rotate-30 whitespace-nowrap select-none"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 6rem)',
              lineHeight: 1,
              color: 'rgba(15, 23, 42, 0.05)',
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Top Document Content Area */}
      <div className="relative z-10 flex-1 space-y-2.5 sm:space-y-3 bg-transparent print:space-y-2 print:block print:flex-none print:h-auto">
        {/* 1. Official Academy Branding Header (Page 1 or All Pages) */}
        {showHeader && (effectiveIsFirstPage || options.showHeaderOnAllPages) && (
          <header className="print-document-header pb-2.5 mb-2.5 sm:pb-3 sm:mb-3 border-b-2 border-slate-900 bg-transparent print:pb-2 print:mb-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {showLogo && (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs border border-slate-800 shrink-0 print:w-10 print:h-10">
                    <BuildingOfficeIcon className="w-6 h-6 print:w-5 print:h-5" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight print:text-base">
                    {institutionName}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium leading-normal print:text-[11px]">
                    {institutionAddress}
                  </p>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* 2. Document Title & Subtitle Header */}
        {showTitle !== false && (effectiveIsFirstPage || options.showTitleOnAllPages) && (resolvedTitle || resolvedSubtitle) && (
          <div
            className={`print-document-title-block text-center flex flex-col items-center justify-center space-y-0.5 mb-2.5 pb-1 sm:mb-3 sm:pb-1.5 print:mb-2 print:pb-1 ${
              showTitleLine
                ? titleLineStyle === 'DOUBLE'
                  ? 'border-b-4 border-double border-slate-900 pb-2'
                  : titleLineStyle === 'DASHED'
                  ? 'border-b border-dashed border-slate-400 pb-1.5'
                  : titleLineStyle === 'DOTTED'
                  ? 'border-b border-dotted border-slate-400 pb-1.5'
                  : 'border-b-2 border-slate-900 pb-1.5'
                : 'pb-1'
            }`}
          >
            {resolvedTitle && (
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 leading-tight print:text-sm">
                {resolvedTitle}
              </h2>
            )}
            {resolvedSubtitle && (
              <p className="text-xs font-semibold text-slate-600 tracking-normal print:text-[11px]">
                {resolvedSubtitle}
              </p>
            )}
          </div>
        )}

        {/* Continuation Subheader on Subsequent Pages */}
        {!effectiveIsFirstPage && !options.showHeaderOnAllPages && !options.showTitleOnAllPages && resolvedTitle && (
          <div className="pb-1.5 mb-2 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 font-bold">
            <span className="uppercase tracking-wide text-slate-900">{resolvedTitle} (Continued)</span>
            <span className="font-mono text-[11px] text-slate-500 font-medium">Page {pageIndex + 1} of {totalPages}</span>
          </div>
        )}

        {/* 3. Structured Metadata Grid Strip */}
        {showMeta && effectiveIsFirstPage && metaItems && metaItems.length > 0 && (() => {
          const resolvedCols =
            options.metaCols ||
            (metaItems.length === 6 || metaItems.length === 3 || metaItems.length === 5
              ? 3
              : metaItems.length === 2
              ? 2
              : metaItems.length === 4
              ? 4
              : 3);
          const gridColsClass =
            resolvedCols === 3
              ? 'grid-cols-3'
              : resolvedCols === 2
              ? 'grid-cols-2'
              : resolvedCols === 5
              ? 'grid-cols-5'
              : resolvedCols === 6
              ? 'grid-cols-6'
              : 'grid-cols-4';

          const gridStyle = options.metaGridTemplate
            ? { gridTemplateColumns: options.metaGridTemplate }
            : undefined;

          return (
            <div
              className={`print-meta-grid grid ${!options.metaGridTemplate ? gridColsClass : ''} gap-x-4 gap-y-2 text-slate-900 mb-3 print:mb-2 print:gap-y-1.5 ${
                showMetaBox !== false
                  ? 'print-meta-grid-boxed py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-xl border border-slate-300/90 bg-slate-50/80 shadow-2xs print:border-slate-300 print:bg-slate-50/70 print:py-1.5 print:px-3'
                  : 'print-meta-grid-plain py-1 px-0 bg-transparent border-none shadow-none'
              }`}
              style={gridStyle}
            >
              {metaItems.map((item, idx) => {
                const resolvedVal =
                  options.customMetaValues && options.customMetaValues[item.label] !== undefined
                    ? options.customMetaValues[item.label]
                    : item.value;

                return (
                  <div
                    key={idx}
                    className={`space-y-0.5 min-w-0 relative group/meta ${item.colSpan ? `col-span-${item.colSpan}` : ''} ${item.className || ''}`}
                    style={item.colSpan ? { gridColumn: `span ${item.colSpan} / span ${item.colSpan}` } : undefined}
                  >
                    <span
                      className={`uppercase tracking-wider text-slate-500 font-bold block ${
                        metaFontSize === 'SM'
                          ? 'text-[8.5px]'
                          : metaFontSize === 'LG'
                          ? 'text-[10.5px]'
                          : 'text-[9.5px]'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`font-extrabold text-slate-900 block break-words whitespace-normal leading-snug ${
                        metaFontSize === 'SM'
                          ? 'text-[11px]'
                          : metaFontSize === 'LG'
                          ? 'text-[14px]'
                          : 'text-[12px]'
                      }`}
                    >
                      {resolvedVal !== undefined && resolvedVal !== null ? resolvedVal : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 4. Primary Printable Document Body */}
        <main className="w-full bg-transparent">{children}</main>
      </div>

      {/* Bottom Area: Signatures and Footer */}
      <div className="print-signature-footer-container relative z-10 pt-3 sm:pt-4 mt-auto space-y-2.5 print-avoid-break print:block print:mt-4 print:pt-2 print:space-y-1.5">
        {/* 5. Official Signatures Block */}
        {showSignatures && effectiveIsLastPage && activeSignatureLines.length > 0 && (
          <div
            className={`grid gap-4 text-center text-xs ${
              activeSignatureLines.length === 1
                ? 'grid-cols-1 justify-items-end'
                : activeSignatureLines.length === 2
                ? 'grid-cols-2 gap-12'
                : activeSignatureLines.length === 3
                ? 'grid-cols-3 gap-6'
                : 'grid-cols-4 gap-4'
            }`}
          >
            {activeSignatureLines.map((sig, idx) => (
              <div
                key={sig.id || idx}
                className={`flex flex-col justify-end items-center ${
                  activeSignatureLines.length === 1 ? 'w-48 ml-auto items-end' : 'w-full'
                }`}
              >
                {/* Physical Signing Space / Stamp Area */}
                <div className="h-6 sm:h-7 flex items-end justify-center pb-0.5 print:h-5">
                  {sig.placeholder && (
                    <span className="text-[8.5px] text-slate-400 uppercase tracking-widest font-mono select-none">
                      {sig.placeholder}
                    </span>
                  )}
                </div>

                {/* Signature Underline */}
                <div
                  className={`w-32 sm:w-36 max-w-full pt-1 space-y-0.5 text-center ${
                    signatureStyle === 'DASHED'
                      ? 'border-t-[0.5px] border-dashed border-slate-700'
                      : signatureStyle === 'DOTTED'
                      ? 'border-t-[0.5px] border-dotted border-slate-700'
                      : 'border-t-[0.5px] border-slate-900'
                  }`}
                >
                  <p
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      if (!onOptionsChange) return;
                      const val = e.currentTarget.textContent?.trim();
                      const updated = (options.signatureLines || signatureLines || []).map((s: any, sIdx: number) =>
                        (s.id === sig.id || sIdx === idx) ? { ...s, label: val } : s
                      );
                      onOptionsChange({ ...options, signatureLines: updated });
                    }}
                    className={`font-bold text-[10.5px] tracking-tight leading-tight text-slate-900 print:text-[10px] ${
                      isEditable
                        ? 'focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-main)]/60 rounded px-1 -mx-1 hover:bg-slate-100/80 cursor-text transition-all'
                        : ''
                    }`}
                  >
                    {sig.label}
                  </p>
                  {sig.sub && (
                    <p
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (!onOptionsChange) return;
                        const val = e.currentTarget.textContent?.trim();
                        const updated = (options.signatureLines || signatureLines || []).map((s: any, sIdx: number) =>
                          (s.id === sig.id || sIdx === idx) ? { ...s, sub: val } : s
                        );
                        onOptionsChange({ ...options, signatureLines: updated });
                      }}
                      className={`text-[9.5px] text-slate-600 font-medium leading-tight print:text-[9px] ${
                        isEditable
                          ? 'focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-main)]/60 rounded px-1 -mx-1 hover:bg-slate-100/80 cursor-text transition-all'
                          : ''
                      }`}
                    >
                      {sig.sub}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Document Footer & Timestamp */}
        {showFooter && (
          <div className="pt-1.5 border-t-[0.5px] border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500 font-medium print:pt-1 print:text-[9px]">
            <span>
              Generated via SPR Note System • {printDate}, {printTime}
            </span>
            <span>
              Page {pageIndex + 1} of {totalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocLabDocumentWrapper;
