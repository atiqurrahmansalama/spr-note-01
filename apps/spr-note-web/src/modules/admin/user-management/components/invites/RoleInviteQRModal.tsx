import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../../../../../components/ui/Modal';
import {
  DownloadIcon,
  CopyIcon,
  ShareIcon,
  QrCodeIcon,
} from '../../../../../components/ui/Icons';
import { useToast } from '../../../../../context/ToastContext';
import { RoleInviteRecord } from '../../types';
import { useUserTranslation } from '../../hooks/useUserTranslation';

export interface RoleInviteQRModalProps {
  invite: RoleInviteRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoleInviteQRModal: React.FC<RoleInviteQRModalProps> = ({
  invite,
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const { t } = useUserTranslation();
  const qrRef = useRef<HTMLDivElement>(null);

  if (!invite) return null;

  const joinUrl = `${window.location.origin}/join?token=${invite.token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    showToast(t('invites.copiedToast', 'Join link copied to clipboard!'), 'success');
  };

  const downloadQR = (format: 'png' | 'svg' = 'png') => {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;

    const svgString = new XMLSerializer().serializeToString(svgEl);

    if (format === 'svg') {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = svgUrl;
      link.download = `invite_${invite.title.replace(/\s+/g, '_')}_qr.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(svgUrl);
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = 512;
        canvas.height = 512;
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 512, 512);
          ctx.drawImage(img, 24, 24, 464, 464);
        }
        URL.revokeObjectURL(svgUrl);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `invite_${invite.title.replace(/\s+/g, '_')}_qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = svgUrl;
    }
  };

  const handleShare = async () => {
    const shareText = `You are invited to join "${invite.title}".\nRole: ${invite.target_role_name}\nDirect link: ${joinUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: invite.title,
          text: shareText,
          url: joinUrl,
        });
        showToast(t('invites.shareSuccess', 'Shared successfully!'), 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    copyLink();
    downloadQR('png');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('invites.qrModalTitle', 'Role Onboarding QR Card')}
      size="md"
    >
      <div className="space-y-6 text-center p-2">
        {/* QR Card Container */}
        <div className="p-6 rounded-3xl theme-bg-sub border theme-border flex flex-col items-center space-y-4 shadow-inner max-w-sm mx-auto">
          <div className="space-y-1">
            <h3 className="font-bold text-base theme-text-primary">{invite.title}</h3>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold theme-bg-surface theme-text-primary border theme-border">
              {invite.target_role_name} ({invite.target_role_code})
            </span>
          </div>

          <div
            ref={qrRef}
            className="p-4 bg-white rounded-2xl shadow-md border border-neutral-200 inline-block"
          >
            <QRCodeSVG
              id="invite-qr-svg"
              value={joinUrl}
              size={220}
              level="H"
              includeMargin={false}
            />
          </div>

          <p className="text-xs theme-text-secondary leading-relaxed">
            {t(
              'invites.qrScanHelp',
              'Scan this QR code with any mobile camera to instantly open the onboarding registration page.'
            )}
          </p>
        </div>

        {/* Direct Link Bar */}
        <div className="flex items-center gap-2 p-2 rounded-xl theme-bg-sub border theme-border text-xs font-mono">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="flex-1 bg-transparent px-2 theme-text-secondary outline-none truncate"
          />
          <button
            type="button"
            onClick={copyLink}
            className="px-3 py-1.5 rounded-lg theme-bg-surface hover:theme-bg-elevated theme-text-primary border theme-border font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            <span>{t('invites.copyLink', 'Copy Link')}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => downloadQR('png')}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border transition-colors flex items-center gap-2 cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>{t('invites.downloadPng', 'Download PNG')}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadQR('svg')}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border transition-colors flex items-center gap-2 cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>{t('invites.downloadSvg', 'Download SVG')}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ShareIcon className="w-4 h-4" />
            <span>{t('invites.shareInvite', 'Share Invite')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleInviteQRModal;
