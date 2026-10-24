import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { auth as authStore } from '../../../utils/localStore';
import { RefreshIcon, CheckIcon, AlertCircleIcon } from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';
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
      <div className="@container space-y-4 pt-2 pb-6 px-1 text-center">
        <div className="p-3.5 rounded-xl theme-bg-sub/50 border theme-border text-xs theme-text-secondary leading-relaxed">
          {t(
            'drawerQrSubtitle',
            'Scan this dynamic QR code with a logged-in mobile companion app to authenticate instantly without typing your password.'
          )}
        </div>

        {status === 'loading' && (
          <div className="w-56 h-56 mx-auto rounded-2xl theme-bg-sub/50 border theme-border flex items-center justify-center animate-pulse">
            <span className="text-xs theme-text-secondary">{t('generatingQR', 'Generating secure ticket...')}</span>
          </div>
        )}

        {status === 'pending' && ticketId && (
          <div className="space-y-4 py-2">
            <div className="w-56 h-56 mx-auto p-3.5 bg-white rounded-2xl shadow-sm border theme-border flex items-center justify-center">
              <QRCodeCanvas value={qrPayload} size={200} level="M" />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-mono theme-text-secondary">
              <span>{t('expiresIn', 'Expires in')}:</span>
              <span className="font-bold theme-accent">{timeFormatted}</span>
            </div>

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

        {status === 'authorized' && (
          <div className="p-6 rounded-2xl theme-bg-accent-soft border theme-border space-y-2">
            <div className="w-12 h-12 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center mx-auto">
              <CheckIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold theme-text-primary">
              {t('sessionAuthorized', 'Authorized Successfully!')}
            </h3>
            <p className="text-xs theme-text-secondary">
              {authorizedUser?.name || t('userAuthorized', 'New device connected.')}
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="p-6 rounded-2xl theme-bg-sub/50 border theme-border space-y-3">
            <AlertCircleIcon className="w-10 h-10 theme-danger mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold theme-text-primary">
                {t('qrExpired', 'Ticket Expired')}
              </h3>
              <p className="text-xs theme-text-secondary">
                {t('qrExpiredDesc', 'This QR code has timed out. Click refresh below to generate a new session.')}
              </p>
            </div>
            <CustomButton
              variant="primary"
              size="sm"
              onClick={generateTicket}
              icon={RefreshIcon}
              className="mx-auto"
            >
              {t('regenerateQR', 'Refresh Code')}
            </CustomButton>
          </div>
        )}
      </div>

      <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
    </DrawerContainer>
  );
};

export default QRSyncDrawer;
