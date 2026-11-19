import React from "react";
import { QRCodeSVG } from "qrcode.react";

export interface QrCodeBadgeProps {
  reportId?: string;
  verificationUrl?: string;
  value?: string;
  size?: number;
  showLabel?: boolean;
  [key: string]: any;
}

export default function QrCodeBadge({
  reportId,
  verificationUrl,
  value,
  size = 96,
  showLabel = true,
}: QrCodeBadgeProps) {
  const targetUrl =
    value ||
    verificationUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/verify-report/${reportId || "DEMO-1001"}`
      : `/verify-report/${reportId || "DEMO-1001"}`);

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 shadow-sm space-y-1">
      <QRCodeSVG
        value={targetUrl}
        size={size}
        level="M"
        includeMargin={true}
        bgColor="#FFFFFF"
        fgColor="#0F172A"
      />
      {showLabel && (
        <div className="text-[10px] font-medium text-slate-500 tracking-wider uppercase text-center">
          Scan to Verify Authenticity
        </div>
      )}
    </div>
  );
}
