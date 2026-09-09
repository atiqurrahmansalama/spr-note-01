import React, { useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { BuildingOfficeIcon } from '../ui/Icons';

/**
 * PrintDocumentWrapper
 * Master institutional document frame providing automatic branding,
 * header, document metadata grid, watermark, signature block, and print footer.
 */
export default function PrintDocumentWrapper({
  title = 'Official Document',
  subtitle = '',
  metaItems = [], // [{ label: 'Class', value: 'Class 10' }, { label: 'Subject', value: 'Arabic' }]
  options = {},
  children,
  pageIndex = 0,
  totalPages = 1,
  className = '',
}) {
  const { currentInstitution } = useTenant();

  const {
    showHeader = true,
    showLogo = true,
    showMeta = true,
    showWatermark = false,
    watermarkText = 'OFFICIAL',
    showSignatures = true,
    signatureLines = [
      { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
      { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
      { id: 'approved', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
    ],
    signatureStyle = 'SOLID', // 'SOLID' | 'DASHED' | 'DOTTED'
    showFooter = true,
    customInstitutionName = '',
    customSubtitle = '',
  } = options;

  const activeSignatureLines = useMemo(() => {
    if (!signatureLines || !Array.isArray(signatureLines)) return [];
    return signatureLines.filter((sig) => sig && sig.enabled !== false && sig.active !== false);
  }, [signatureLines]);

  const institutionName =
    options.customInstitutionName !== undefined && options.customInstitutionName !== ''
      ? options.customInstitutionName
      : (customInstitutionName || currentInstitution?.name || 'SPR Note Academy');

  const institutionAddress =
    options.customInstitutionAddress !== undefined && options.customInstitutionAddress !== ''
      ? options.customInstitutionAddress
      : (options.customAddress || currentInstitution?.address || currentInstitution?.campus_address || 'Central Campus & Academic Affairs');

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
      className={`print-document-sheet relative flex flex-col justify-between bg-white text-slate-900 leading-normal print:p-0 ${className}`}
      style={{
        width: '100%',
        minHeight: '100%',
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
      <div className="relative z-10 flex-1 space-y-3.5 bg-transparent">
        {/* 1. Official Academy Branding Header */}
        {showHeader && (
          <header className="print-document-header pb-4 mb-4 border-b-2 border-slate-900 bg-transparent">
            {/* Top Row: Institution Logo & Academy Name Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {showLogo && (
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs border border-slate-800 shrink-0">
                    <BuildingOfficeIcon className="w-7 h-7" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                    {institutionName}
                  </h1>
                  <p className="text-xs sm:text-[12.5px] text-slate-600 font-medium leading-normal">
                    {institutionAddress}
                  </p>
                </div>
              </div>

              {/* Right Side: Official Record Badge & Date */}
              <div className="text-right space-y-1 shrink-0 self-start">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-slate-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Official Record
                </span>
                <div className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono font-medium pr-0.5">
                  {printDate}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* 2. Document Title & Subtitle Header (Centered with Generous Spacing) */}
        {(resolvedTitle || resolvedSubtitle) && (
          <div className="print-document-title-block text-center flex flex-col items-center justify-center space-y-1 pb-2 mb-4">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 leading-tight">
              {resolvedTitle}
            </h2>
            {resolvedSubtitle && (
              <p className="text-xs sm:text-sm font-semibold text-slate-600 tracking-normal">
                {resolvedSubtitle}
              </p>
            )}
          </div>
        )}

        {/* 2. Structured Metadata Grid Strip */}
        {showMeta && metaItems && metaItems.length > 0 && (
          <div className="print-meta-grid grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-900">
            {metaItems.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                  {item.label}
                </span>
                <span className="font-bold text-[11px] text-slate-900 truncate block">
                  {item.value || '-'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 3. Primary Printable Document Body */}
        <main className="w-full bg-transparent">{children}</main>
      </div>

      {/* Bottom Area: Signatures and Footer */}
      <div className="print-signature-footer-container relative z-10 pt-10 mt-auto space-y-4 print-avoid-break print:mt-auto print:pt-6">
        {/* 4. Official Signatures Block (Bottom Anchored) */}
        {showSignatures && activeSignatureLines.length > 0 && (
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
                <div className="h-10 sm:h-12 flex items-end justify-center pb-1">
                  {sig.placeholder && (
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono select-none">
                      {sig.placeholder}
                    </span>
                  )}
                </div>

                {/* Signature Underline (0.5px border, reduced width) */}
                <div
                  className={`w-36 sm:w-40 max-w-full pt-1.5 space-y-0.5 text-center ${
                    signatureStyle === 'DASHED'
                      ? 'border-t-[0.5px] border-dashed border-slate-700'
                      : signatureStyle === 'DOTTED'
                      ? 'border-t-[0.5px] border-dotted border-slate-700'
                      : 'border-t-[0.5px] border-slate-900'
                  }`}
                >
                  <p className="font-bold text-[11px] tracking-tight leading-tight text-slate-900">
                    {sig.label}
                  </p>
                  {sig.sub && (
                    <p className="text-[10px] text-slate-600 font-medium leading-tight">
                      {sig.sub}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. Document Footer & Timestamp */}
        {showFooter && (
          <div className="pt-2 border-t-[0.5px] border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-medium">
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
}
