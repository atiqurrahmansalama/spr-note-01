import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import {
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  TeacherIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '../../../components/ui/Icons';

export default function StaffQRCodeCardModal({ isOpen, onClose, tokenData }) {
  const { showToast } = useToast();
  const printRef = useRef(null);

  if (!isOpen || !tokenData) return null;

  const publicUrl = `${window.location.origin}/staff-onboard?token=${tokenData.token}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    showToast('Staff onboarding invitation link copied to clipboard!', 'success');
  };

  const handleShareWhatsApp = () => {
    const roleText = tokenData.designation ? `as ${tokenData.designation}` : 'as Faculty / Staff';
    const text = encodeURIComponent(
      `Assalamu Alaikum,\nYou are invited to join the staff and faculty of ${tokenData.institution_name || 'our institution'} ${roleText}.\n\nPlease complete your official onboarding here:\n${publicUrl}`
    );
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
          <title>Staff Onboarding QR Poster - ${tokenData.title}</title>
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
            h2 { font-size: 16px; font-weight: 700; color: #4f46e5; margin: 4px 0 12px; }
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
              background: #eef2ff;
              color: #4338ca;
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
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none animate-fade-in">
      <div className="w-full max-w-md theme-bg-surface border theme-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border shrink-0 theme-bg-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0">
              <TeacherIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                Staff Onboarding QR &amp; Link
              </h3>
              <p className="text-[11px] theme-text-secondary">
                Scan or share to invite faculty &amp; personnel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Printable Canvas */}
        <div className="p-6 overflow-y-auto space-y-5 text-center">
          <div ref={printRef} className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold theme-bg-accent-soft theme-accent border theme-border">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{tokenData.designation || 'Staff Recruitment'}</span>
              {tokenData.rank_order && tokenData.rank_order !== 99 && (
                <span className="font-mono text-[10px] opacity-80">(Rank {tokenData.rank_order})</span>
              )}
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-extrabold theme-text-primary">
                {tokenData.institution_name || 'Academic Institution'}
              </h2>
              <p className="text-xs font-bold theme-accent mt-0.5">{tokenData.title}</p>
            </div>

            {/* QR Code */}
            <div className="p-3 bg-white border theme-border rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: '/favicon.ico',
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>

            <p className="text-xs theme-text-secondary">
              Scan this QR code with any smartphone camera to open the official Onboarding &amp; Profile Registration form.
            </p>

            <div className="p-2.5 rounded-xl theme-bg-sub border theme-border font-mono text-[11px] theme-text-secondary break-all select-all">
              {publicUrl}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t theme-border theme-bg-sub flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl border theme-border hover:theme-bg-accent-soft theme-text-primary text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CopyIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Copy Link</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShareIcon className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Print Poster</span>
          </button>
        </div>
      </div>
    </div>
  );
}
