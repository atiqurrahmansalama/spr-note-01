import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { auth as authStore } from '../../../utils/localStore';
import {
  RefreshIcon,
  CheckIcon,
  AlertCircleIcon,
  QrCodeIcon,
  SmartphoneIcon,
  ClockIcon,
} from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';
import EmptyState from '../../../components/ui/EmptyState';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { useTranslation } from '../../../i18n';

interface QRSyncDrawerProps {
  onClose: () => void;
}

export const QRSyncDrawer: React.FC<QRSyncDrawerProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const [status, setStatus] = useState<'loading' | 'pending' | 'authorized' | 'expired'>('loading');
  const [authorizedUser, setAuthorizedUser] = useState<any>(null);

  const timerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  const cleanupTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const checkTicketStatus = useCallback(
    async (id: string) => {
      try {
        const res = await fetchWithAuth(`/api/v1/auth/qr/status/${id}/`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'authorized') {
            cleanupTimers();
            setStatus('authorized');
            setAuthorizedUser(data.user);

            if (data.tokens) {
              authStore.saveTokens(data.tokens);
              if (data.user) authStore.saveUser(data.user);
              showToast(t('loginAuthorizedSuccess', 'Session authorized successfully!'), 'success');
              window.dispatchEvent(new CustomEvent('spr_auth_updated'));
              setTimeout(() => {
                onClose();
                window.location.reload();
              }, 1200);
            }
          } else if (data.status === 'expired') {
            cleanupTimers();
            setStatus('expired');
          }
        }
      } catch {
        // Continue polling silently
      }
    },
    [cleanupTimers, onClose, showToast, t]
  );

  const generateTicket = useCallback(async () => {
    cleanupTimers();
    setStatus('loading');
    setTimeLeft(180);
    setAuthorizedUser(null);

    try {
      const res = await fetchWithAuth('/api/v1/auth/qr/generate/', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTicketId(data.ticket_id);
        setStatus('pending');

        // Countdown Timer
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              cleanupTimers();
              setStatus('expired');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Status Polling
        pollRef.current = setInterval(() => {
          checkTicketStatus(data.ticket_id);
        }, 2000);
      } else {
        setStatus('expired');
        showToast(t('qrGenerateFailed', 'Failed to generate sync ticket.'), 'error');
      }
    } catch {
      setStatus('expired');
    }
  }, [cleanupTimers, checkTicketStatus, showToast, t]);

  useEffect(() => {
    generateTicket();
    return () => cleanupTimers();
  }, [generateTicket, cleanupTimers]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const qrPayload = JSON.stringify({
    type: 'SPR_QR_AUTH',
    ticket_id: ticketId,
    endpoint: window.location.origin,
  });

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        {/* Streamlined Section Header */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b theme-border text-left">
          <div className="p-2 rounded-xl theme-bg-accent-soft shrink-0 flex items-center justify-center">
            <SmartphoneIcon className="w-4 h-4 theme-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold theme-text-primary tracking-wide">
              {t('drawerQrTitle', 'Cross-Device QR Sign-In')}
            </h3>
            <p className="text-[11px] theme-text-secondary leading-normal">
              {t('drawerQrSubtitle', 'Scan with a logged-in mobile device to sign in instantly.')}
            </p>
          </div>
        </div>

        {/* Loading State using EmptyState */}
        {status === 'loading' && (
          <div className="py-6 flex items-center justify-center">
            <EmptyState
              variant="sub"
              size="sm"
              icon={QrCodeIcon}
              iconVariant="accent"
              title={t('generatingQR', 'Generating secure ticket...')}
              description={t(
                'qrGeneratingDesc',
                'Establishing a cryptographic session handshake...'
              )}
              animate
            />
          </div>
        )}

        {/* Pending Active QR Code */}
        {status === 'pending' && ticketId && (
          <div className="flex flex-col items-center justify-center py-3 px-2 space-y-4">
            {/* Centered QR Canvas with comfortable 4-side padding & margin */}
            <div className="p-5 sm:p-6 my-2 bg-white rounded-2xl shadow-md border theme-border flex items-center justify-center mx-auto transition-transform hover:scale-[1.01]">
              <QRCodeCanvas
                value={qrPayload}
                size={192}
                level="M"
                marginSize={1}
              />
            </div>

            {/* Countdown Badge */}
            <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full theme-bg-sub border theme-border text-xs font-mono theme-text-secondary shadow-xs">
              <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
              <span>{t('expiresIn', 'Expires in')}:</span>
              <span className="font-bold theme-accent">{timeFormatted}</span>
            </div>

            {/* Refresh Action */}
            <CustomButton
              variant="sub"
              size="sm"
              onClick={generateTicket}
              icon={RefreshIcon}
              className="mx-auto"
            >
              {t('regenerateQR', 'Refresh Code')}
            </CustomButton>
          </div>
        )}

        {/* Authorized State using EmptyState */}
        {status === 'authorized' && (
          <div className="py-6 flex items-center justify-center">
            <EmptyState
              variant="card"
              size="sm"
              icon={CheckIcon}
              iconVariant="success"
              title={t('sessionAuthorized', 'Authorized Successfully!')}
              description={authorizedUser?.name || t('userAuthorized', 'New device connected.')}
            />
          </div>
        )}

        {/* Expired State using EmptyState */}
        {status === 'expired' && (
          <div className="py-6 flex items-center justify-center">
            <EmptyState
              variant="sub"
              size="sm"
              icon={AlertCircleIcon}
              iconVariant="danger"
              title={t('qrExpired', 'Ticket Expired')}
              description={t(
                'qrExpiredDesc',
                'This QR code has timed out. Click refresh below to generate a new session.'
              )}
              action={{
                label: t('regenerateQR', 'Refresh Code'),
                onClick: generateTicket,
                icon: RefreshIcon,
                variant: 'primary',
                size: 'sm',
              }}
            />
          </div>
        )}
      </div>

      <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
    </DrawerContainer>
  );
};

export default QRSyncDrawer;
