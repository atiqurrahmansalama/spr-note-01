import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import {
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  AcademicCapIcon,
  CheckCircleIcon,
} from '../../../components/ui/Icons';

export default function AdmissionQRCodeCardModal({ isOpen, onClose, tokenData }) {
  const { showToast } = useToast();
  const printRef = useRef(null);

  if (!isOpen || !tokenData) return null;

  const publicUrl = `${window.location.origin}/apply?token=${tokenData.token}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    showToast('Admission link copied to clipboard!', 'success');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Online Admission is now open for ${tokenData.institution_name || 'our institution'}!\nSession: ${tokenData.session_year}\nApply online here: ${publicUrl}`
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
          <title>Admission QR Poster - ${tokenData.title}</title>
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
            h2 { font-size: 16px; font-weight: 700; color: #2563eb; margin: 4px 0 12px; }
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
              color: #1d4ed8;
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
              <AcademicCapIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                Admission QR &amp; Link
              </h3>
              <p className="text-[11px] theme-text-secondary">
                Scan or share to enroll online
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

        {/* Modal Content / Printable Canvas */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col items-center">
          <div
            ref={printRef}
            className="w-full flex flex-col items-center text-center space-y-3"
          >
            <div className="px-3 py-1 rounded-full text-[11px] font-bold theme-bg-accent-soft theme-accent border theme-border">
              Session: {tokenData.session_year}
            </div>

            <div>
              <h4 className="text-base font-extrabold theme-text-primary tracking-tight">
                {tokenData.institution_name || 'Academic Institution'}
              </h4>
              <p className="text-xs font-semibold theme-accent mt-0.5">
                {tokenData.title}
              </p>
              {tokenData.target_class_name && (
                <p className="text-[11px] theme-text-secondary mt-0.5">
                  Target Class: {tokenData.target_class_name}
                </p>
              )}
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm inline-flex items-center justify-center my-2">
              <QRCodeSVG
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
            </div>

            <p className="text-xs theme-text-secondary font-medium">
              Scan with your mobile camera to fill the admission form online.
            </p>

            {/* URL Display */}
            <div className="w-full p-2.5 rounded-xl theme-bg-sub border theme-border text-[11px] font-mono theme-text-secondary break-all select-all">
              {publicUrl}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full mt-5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
            >
              <CopyIcon className="w-4 h-4" />
              <span>Copy Link</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated text-xs font-bold theme-text-primary transition cursor-pointer"
            >
              <ShareIcon className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-sm"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Print / Download QR Poster</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
