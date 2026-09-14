import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../context/ToastContext';
import {
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  CheckCircleIcon,
} from '../ui/Icons';

export interface QRCodeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColorClass?: string;
  publicUrl: string;
  shareText?: string;
  institutionName?: string;
  entityIcon?: React.ComponentType<{ className?: string }>;
  toastSuccessMessage?: string;
  posterTitle?: string;
  posterAccentColor?: string;
  details?: Array<{ label: string; value: React.ReactNode }>;
}

/**
 * Universal Enterprise QR Code Card & Poster Modal Component
 * 
 * Provides a unified dialog for sharing onboarding / admission / verification links
 * with QR Code generation, clipboard copying, WhatsApp direct sharing, and print-ready poster output.
 */
export default function QRCodeCardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeLabel,
  badgeColorClass = 'bg-primary/10 text-primary',
  publicUrl,
  shareText,
  institutionName,
  entityIcon: EntityIcon,
  toastSuccessMessage = 'Link copied to clipboard!',
  posterTitle,
  posterAccentColor = '#2563eb',
  details = [],
}: QRCodeCardModalProps) {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !publicUrl) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    showToast(toastSuccessMessage, 'success');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(shareText || `${title}\n${publicUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocked! Please allow popups to print.', 'error');
      return;
    }

    const posterHtml = printRef.current?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${posterTitle || title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f8fafc;
            }
            .poster-card {
              max-width: 480px;
              width: 100%;
              padding: 32px;
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 24px;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 8px 0 4px; }
            h2 { font-size: 16px; font-weight: 700; color: ${posterAccentColor}; margin: 4px 0 12px; }
            p { font-size: 13px; color: #64748b; margin: 4px 0; }
            .qr-wrapper {
              margin: 24px auto;
              padding: 16px;
              background: #ffffff;
              display: inline-block;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              background: #eff6ff;
              color: ${posterAccentColor};
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .url-text {
              font-family: monospace;
              font-size: 11px;
              color: #475569;
              word-break: break-all;
              padding: 8px;
              background: #f1f5f9;
              border-radius: 8px;
              margin-top: 12px;
            }
            @media print {
              body { background: transparent; }
              .poster-card { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="poster-card">
            ${posterHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg theme-bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b theme-border theme-bg-sub">
          <div className="flex items-center gap-2">
            {EntityIcon && <EntityIcon className="w-5 h-5 text-[var(--accent-main)]" />}
            <h3 className="text-sm font-semibold theme-text-primary">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-center">
          {/* Visual Poster Component (For Print & Screen) */}
          <div
            ref={printRef}
            className="p-6 border theme-border rounded-2xl bg-white dark:bg-slate-900 shadow-xs max-w-sm mx-auto"
          >
            {badgeLabel && (
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-3 ${badgeColorClass}`}>
                {badgeLabel}
              </span>
            )}
            {institutionName && (
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {institutionName}
              </h4>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}

            {/* QR Code Graphic */}
            <div className="my-5 p-3 bg-white border border-slate-200 dark:border-slate-800 rounded-xl inline-block shadow-2xs">
              <QRCodeSVG
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Scan QR code with any smartphone camera to proceed
            </p>

            {/* Additional details */}
            {details.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-left space-y-1">
                {details.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-500">{d.label}:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Copy Direct URL Bar */}
          <div className="flex items-center gap-2 p-2 border theme-border rounded-xl theme-bg-sub max-w-md mx-auto">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 bg-transparent text-xs font-mono theme-text-primary px-2 focus:outline-hidden select-all"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 text-xs font-medium theme-bg-surface hover:theme-bg-sub border theme-border rounded-lg theme-text-primary flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t theme-border theme-bg-sub flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-medium border theme-border rounded-xl theme-bg-surface hover:theme-bg-sub theme-text-primary flex items-center gap-2 shadow-2xs transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            Print Poster
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-2xs transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              Share WhatsApp
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border theme-border rounded-xl theme-bg-surface hover:theme-bg-sub theme-text-primary transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
