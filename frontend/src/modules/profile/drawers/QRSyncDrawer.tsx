import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  SpinnerIcon,
} from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';
import EmptyState from '../../../components/ui/EmptyState';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMountedRef = useRef<boolean>(true);
  const reqCounterRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTicketIdRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number>(0);

  // Preserve latest callbacks across renders without invalidating memoized hooks
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const tRef = useRef(t);
  tRef.current = t;

  const cleanupTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkTicketStatus = useCallback(
    async (id: string) => {
      // Discard responses from superseded tickets
      if (activeTicketIdRef.current !== id || !isMountedRef.current) return;

      try {
        const res = await fetchWithAuth(`/api/v1/auth/qr/status/${id}/`);
        if (activeTicketIdRef.current !== id || !isMountedRef.current) return;

        if (res.ok) {
          const data = await res.json();
          if (activeTicketIdRef.current !== id || !isMountedRef.current) return;

          if (data.status === 'authorized') {
            cleanupTimers();
            setStatus('authorized');
            setAuthorizedUser(data.user);

            if (data.tokens) {
              authStore.saveTokens(data.tokens);
              if (data.user) authStore.saveUser(data.user);
              showToastRef.current(
                tRef.current('loginAuthorizedSuccess', 'Session authorized successfully!'),
                'success'
              );
              window.dispatchEvent(new CustomEvent('spr_auth_updated'));
              setTimeout(() => {
                onCloseRef.current();
                window.location.reload();
              }, 1200);
            }
          } else if (data.status === 'expired') {
            cleanupTimers();
            setStatus('expired');
          }
        }
      } catch {
        // Polling retry cycle runs automatically on the next interval
      }
    },
    [cleanupTimers]
  );

  const generateTicket = useCallback(async () => {
    const currentReqId = ++reqCounterRef.current;
    cleanupTimers();

    if (!activeTicketIdRef.current) {
      setStatus('loading');
      setTimeLeft(180);
      setAuthorizedUser(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetchWithAuth('/api/v1/auth/qr/generate/', {
        method: 'POST',
      });

      // Discard if component unmounted or superseded by a newer refresh click
      if (currentReqId !== reqCounterRef.current || !isMountedRef.current) return;

      if (res.ok) {
        const data = await res.json();
        if (currentReqId !== reqCounterRef.current || !isMountedRef.current) return;

        const newTicketId = data.ticket_id;
        const durationSeconds = data.expires_in_seconds || 180;

        activeTicketIdRef.current = newTicketId;
        setTicketId(newTicketId);
        setStatus('pending');
        setTimeLeft(durationSeconds);
        setAuthorizedUser(null);

        // Absolute target wall-clock expiry time
        const expiresAt = Date.now() + durationSeconds * 1000;
        expiresAtRef.current = expiresAt;

        cleanupTimers();

        // Wall-clock Countdown Timer
        timerRef.current = setInterval(() => {
          if (!isMountedRef.current) return;
          const now = Date.now();
          const remainingSeconds = Math.max(0, Math.ceil((expiresAtRef.current - now) / 1000));
          setTimeLeft(remainingSeconds);

          if (remainingSeconds <= 0) {
            cleanupTimers();
            setStatus('expired');
          }
        }, 1000);

        // Status Polling: strictly bounded to this active ticket
        pollRef.current = setInterval(() => {
          if (activeTicketIdRef.current === newTicketId && isMountedRef.current) {
            checkTicketStatus(newTicketId);
          }
        }, 2000);
      } else {
        setStatus('expired');
        showToastRef.current(
          tRef.current('qrGenerateFailed', 'Failed to generate sync ticket.'),
          'error'
        );
      }
    } catch (err: any) {
      if (currentReqId !== reqCounterRef.current || !isMountedRef.current) return;
      setStatus('expired');
      showToastRef.current(
        err.message || tRef.current('qrGenerateFailed', 'Failed to generate sync ticket.'),
        'error'
      );
    } finally {
      if (currentReqId === reqCounterRef.current && isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [cleanupTimers, checkTicketStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    generateTicket();
    return () => {
      isMountedRef.current = false;
      cleanupTimers();
    };
  }, [generateTicket, cleanupTimers]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const qrPayload = JSON.stringify({
    type: 'SPR_QR_AUTH',
    ticket_id: ticketId,
    endpoint: typeof window !== 'undefined' ? window.location.origin : '',
  });

  return (
    <DrawerContainer
      padding="none"
      spacing="normal"
      footer={<DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />}
    >
      <div className="@container space-y-4 pt-2 pb-6 px-1">
        {/* Reused Enterprise Drawer Section without Subtitle */}
        <DrawerSection
          title={t('drawerQrTitle', 'Cross-Device QR Sign-In')}
          subtitle={t('drawerQrSubtitle', 'Scan with a logged-in mobile device to sign in instantly.')}
          icon={SmartphoneIcon}
          className="pt-0 first:pt-0"
        >
          {status === 'authorized' ? (
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
          ) : status === 'expired' ? (
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
          ) : status === 'loading' && !ticketId ? (
            <div className="py-8 flex items-center justify-center">
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
          ) : (
            <div className="flex flex-col items-center justify-center py-3 px-2 space-y-4">
              {/* Centered QR Canvas with comfortable padding */}
              <div className="relative p-5 sm:p-6 my-2 bg-white rounded-2xl shadow-md border theme-border flex items-center justify-center mx-auto transition-transform hover:scale-[1.01]">
                {(isRefreshing || !ticketId) && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10 transition-opacity">
                    <SpinnerIcon className="w-8 h-8 theme-accent animate-spin" />
                  </div>
                )}
                {ticketId ? (
                  <QRCodeSVG
                    value={qrPayload}
                    size={192}
                    level="M"
                    className="w-48 h-48 block"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <SpinnerIcon className="w-8 h-8 theme-accent animate-spin" />
                  </div>
                )}
              </div>

              {/* Minimal Countdown Display without background or border */}
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-mono theme-text-secondary select-none">
                <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                <span>{t('expiresIn', 'Expires in')}:</span>
                <span className="font-bold theme-accent">{timeFormatted}</span>
              </div>

              {/* Refresh Action: pushed down with pt-2 and spinner indicator */}
              <div className="pt-2">
                <CustomButton
                  variant="sub"
                  size="sm"
                  onClick={generateTicket}
                  loading={isRefreshing}
                  icon={RefreshIcon}
                  className="mx-auto"
                >
                  {t('regenerateQR', 'Refresh Code')}
                </CustomButton>
              </div>
            </div>
          )}
        </DrawerSection>
      </div>
    </DrawerContainer>
  );
};

export default QRSyncDrawer;
