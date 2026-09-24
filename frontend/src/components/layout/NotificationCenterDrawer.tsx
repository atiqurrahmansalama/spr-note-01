import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  AlertCircleIcon,
  InfoIcon,
  ClockIcon,
  TrashIcon,
  ArrowRightIcon,
  LinkIcon,
  CheckIcon,
  Volume2Icon,
  VolumeXIcon,
  LaptopIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  CheckDoubleIcon,
} from '@/components/ui/Icons';
import CustomButton from '@/components/ui/CustomButton';
import CustomInput from '@/components/ui/CustomInput';
import { DrawerContainer } from '@/components/layout';
import DeleteImpactModal from '@/components/common/DeleteImpactModal';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/i18n';
import {
  getInAppNotifications,
  getUnreadNotificationCount,
  getInAppNotificationById,
  markAllNotificationsAsRead,
  deleteInAppNotification,
  toggleNotificationReadStatus,
} from '@/api/notifications';
import {
  triggerNotificationAlert,
  getNotificationSoundMode,
  setNotificationSoundMode,
  cycleNotificationSoundMode,
  playTestChime,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  isDeviceNotificationSupported,
  type NotificationSoundMode,
} from '@/utils/notificationSoundService';
import type { InAppNotification, NotificationType } from '@/types/notifications';

export interface NotificationCenterDrawerProps {
  initialNotificationId?: string | number | null;
  onClose?: () => void;
  onNotificationDeleted?: (id: string | number) => void;
  onNotificationUpdated?: (updated: InAppNotification) => void;
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getNotificationTypeBadgeConfig(type?: NotificationType) {
  switch (type) {
    case 'SUCCESS':
      return {
        label: 'Success',
        icon: CheckCircle2Icon,
        className: 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20',
      };
    case 'ALERT':
      return {
        label: 'Urgent Alert',
        icon: AlertCircleIcon,
        className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      };
    case 'WARNING':
      return {
        label: 'Warning',
        icon: AlertTriangleIcon,
        className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      };
    case 'INFO':
    default:
      return {
        label: 'Information',
        icon: InfoIcon,
        className: 'theme-bg-sub theme-text-primary border theme-border',
      };
  }
}

/**
 * NotificationCenterDrawer
 * 
 * Enterprise Right Sidebar Notification Center with seamless Master-Detail navigation,
 * real-time polling, sound mode switcher, unread filtration, and instant action execution.
 */
export default function NotificationCenterDrawer({
  initialNotificationId,
  onClose,
  onNotificationDeleted,
  onNotificationUpdated,
}: NotificationCenterDrawerProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, formatDate } = useTranslation('notifications');

  // List State
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [markingAllRead, setMarkingAllRead] = useState<boolean>(false);

  // Sound and Device Alerts State
  const [soundMode, setSoundMode] = useState<NotificationSoundMode>(getNotificationSoundMode());
  const [devicePermission, setDevicePermission] = useState<NotificationPermission>(getDeviceNotificationPermission());

  // Master-Detail State
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | number | null>(initialNotificationId || null);
  const [selectedNotification, setSelectedNotification] = useState<InAppNotification | null>(null);
  const [, setLoadingDetail] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<InAppNotification | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Load all notifications list
  const loadNotifications = useCallback(async (triggerAlerts: boolean = true) => {
    try {
      const [list, count] = await Promise.all([
        getInAppNotifications(),
        getUnreadNotificationCount(),
      ]);

      if (!isInitialLoadRef.current && triggerAlerts) {
        const incomingUnread = list.filter((n) => !n.is_read && !seenIdsRef.current.has(n.id));
        if (incomingUnread.length > 0) {
          const latest = incomingUnread[0];
          triggerNotificationAlert(
            latest.title,
            latest.message,
            latest.action_url,
            String(latest.id)
          );
        }
      }

      list.forEach((n) => seenIdsRef.current.add(n.id));
      isInitialLoadRef.current = false;

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotificationCenterDrawer] Fetch error:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Sync notifications on mount and setup polling
  useEffect(() => {
    loadNotifications(false);
    const interval = setInterval(() => loadNotifications(true), 25000);

    const handleCustomRefresh = () => loadNotifications(true);
    window.addEventListener('spr_notification_refresh', handleCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('spr_notification_refresh', handleCustomRefresh);
    };
  }, [loadNotifications]);

  // Load detail when selectedNotificationId changes
  useEffect(() => {
    if (!selectedNotificationId) {
      setSelectedNotification(null);
      return;
    }

    // Try finding in current notifications state first
    const cached = notifications.find((n) => String(n.id) === String(selectedNotificationId));
    if (cached) {
      setSelectedNotification(cached);
      return;
    }

    // Otherwise fetch from API
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const data = await getInAppNotificationById(selectedNotificationId);
        setSelectedNotification(data);
      } catch (err: any) {
        console.warn('[NotificationCenterDrawer] Failed to fetch notification detail:', err);
        showToast(err.message || t('notFound', 'Notification not found or has been removed.'), 'error');
        setSelectedNotificationId(null);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [selectedNotificationId, notifications, showToast, t]);

  // Sound Mode Handlers
  const handleSoundModeChange = async (mode: NotificationSoundMode) => {
    setSoundMode(mode);
    setNotificationSoundMode(mode);
    if (mode === 'APP_CHIME') {
      playTestChime('APP_CHIME');
    } else if (mode === 'DEVICE_SOUND') {
      if (isDeviceNotificationSupported() && Notification.permission === 'default') {
        const perm = await requestDeviceNotificationPermission();
        setDevicePermission(perm);
      }
      playTestChime('DEVICE_SOUND');
    }
  };

  const handleRequestDeviceAlerts = async () => {
    const perm = await requestDeviceNotificationPermission();
    setDevicePermission(perm);
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      if (selectedNotification) {
        setSelectedNotification((prev) => (prev ? { ...prev, is_read: true } : null));
      }
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
      showToast('All notifications marked as read', 'success');
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      showToast('Failed to mark all as read', 'error');
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Toggle single notification read status
  const handleToggleRead = async (notif: InAppNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetStatus = !notif.is_read;
    try {
      setUpdatingStatus(true);
      const updated = await toggleNotificationReadStatus(notif.id, targetStatus);
      const updatedItem = {
        ...notif,
        is_read: targetStatus,
        read_at: targetStatus ? new Date().toISOString() : null,
        ...updated,
      };

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? updatedItem : n))
      );
      if (selectedNotification && String(selectedNotification.id) === String(notif.id)) {
        setSelectedNotification(updatedItem);
      }
      setUnreadCount((prev) => (targetStatus ? Math.max(0, prev - 1) : prev + 1));
      onNotificationUpdated?.(updatedItem);
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
    } catch (err: any) {
      console.error('Failed to toggle read status:', err);
      showToast(err.message || 'Failed to update read status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete notification
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await deleteInAppNotification(itemToDelete.id);
      setNotifications((prev) => prev.filter((n) => n.id !== itemToDelete.id));
      if (!itemToDelete.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (selectedNotificationId === itemToDelete.id) {
        setSelectedNotificationId(null);
        setSelectedNotification(null);
      }
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
      showToast('Notification deleted successfully', 'success');
      onNotificationDeleted?.(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete notification', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open notification detail
  const handleSelectNotification = async (notif: InAppNotification) => {
    setSelectedNotificationId(notif.id);
    setSelectedNotification(notif);
    if (!notif.is_read) {
      handleToggleRead(notif);
    }
  };

  // Open Associated Action URL
  const handleOpenAction = (actionUrl?: string) => {
    const url = actionUrl || selectedNotification?.action_url;
    if (!url) return;
    onClose?.();
    navigate(url);
  };

  // Filter list by tab & search
  const filteredList = useMemo(() => {
    let list = activeTab === 'UNREAD' ? notifications.filter((n) => !n.is_read) : notifications;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q)) ||
          (n.notification_type && n.notification_type.toLowerCase().includes(q))
      );
    }
    return list;
  }, [notifications, activeTab, searchQuery]);

  // ==========================================
  // DETAIL VIEW
  // ==========================================
  if (selectedNotificationId && selectedNotification) {
    const typeConfig = getNotificationTypeBadgeConfig(selectedNotification.notification_type);
    const TypeIcon = typeConfig.icon;

    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="space-y-6 pt-1 pb-8 text-left @container">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
            <button
              type="button"
              onClick={() => {
                setSelectedNotificationId(null);
                setSelectedNotification(null);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold theme-accent hover:underline cursor-pointer bg-transparent border-0"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span>Back to Notifications</span>
            </button>

            <span className="text-[10px] font-mono theme-text-secondary">
              #{selectedNotification.id}
            </span>
          </div>

          {/* 1. Header Overview Banner */}
          <div className="p-4 rounded-2xl border theme-border theme-bg-sub/50 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${typeConfig.className}`}>
                  <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeConfig.label}</span>
                </span>

                {/* Read / Unread Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    selectedNotification.is_read
                      ? 'theme-bg-surface theme-text-secondary theme-border'
                      : 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/30 font-extrabold'
                  }`}
                >
                  {selectedNotification.is_read ? (
                    <>
                      <CheckIcon className="w-3 h-3 text-emerald-500" />
                      <span>{t('read', 'Read')}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
                      <span>{t('unread', 'Unread')}</span>
                    </>
                  )}
                </span>
              </div>

              {/* Time Stamp */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium theme-text-secondary">
                <ClockIcon className="w-3.5 h-3.5 opacity-70" />
                <span>{formatRelativeTime(selectedNotification.created_at)}</span>
              </div>
            </div>

            {/* Notification Title */}
            <div>
              <h2 className="text-base font-bold theme-text-primary leading-snug">
                {selectedNotification.title}
              </h2>
              <div className="text-[11px] theme-text-secondary mt-1 flex items-center gap-2">
                <span>{formatDate(selectedNotification.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {selectedNotification.read_at && (
                  <>
                    <span>•</span>
                    <span>{t('readAt', 'Read at')}: {formatDate(selectedNotification.read_at, { timeStyle: 'short' })}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2. Message Content Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
              <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                {t('messagePayload', 'Notification Message')}
              </span>
            </div>

            <div className="p-4 rounded-xl theme-bg-surface border theme-border text-xs theme-text-primary leading-relaxed whitespace-pre-wrap shadow-2xs font-normal">
              {selectedNotification.message}
            </div>
          </div>

          {/* 3. Associated Action Card */}
          {selectedNotification.action_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
                <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                  {t('openAction', 'Associated Action')}
                </span>
              </div>

              <div className="p-4 rounded-xl border theme-border theme-bg-accent-soft/30 flex items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold theme-text-primary mb-0.5">
                    <LinkIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                    <span className="truncate">{t('openAction', 'Open Associated Page')}</span>
                  </div>
                  <div className="text-[11px] theme-text-secondary font-mono truncate">
                    {selectedNotification.action_url}
                  </div>
                </div>

                <CustomButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={ArrowRightIcon}
                  onClick={() => handleOpenAction(selectedNotification.action_url)}
                  className="shrink-0"
                >
                  {t('view', 'Go to Page')}
                </CustomButton>
              </div>
            </div>
          )}

          {/* 4. Notification Metadata */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b theme-border">
              <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                {t('metadata', 'Notification Metadata')}
              </span>
            </div>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
                <span className="text-[11px] font-sans theme-text-secondary">{t('recipient', 'Recipient')}:</span>
                <span className="text-xs font-bold theme-text-primary truncate ml-2">
                  {selectedNotification.recipient_username ? `@${selectedNotification.recipient_username}` : `ID: ${selectedNotification.recipient}`}
                </span>
              </div>

              <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
                <span className="text-[11px] font-sans theme-text-secondary">{t('notificationId', 'Notification ID')}:</span>
                <span className="text-xs font-bold theme-text-secondary font-mono truncate ml-2">
                  #{selectedNotification.id}
                </span>
              </div>

              <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
                <span className="text-[11px] font-sans theme-text-secondary">{t('type', 'Type')}:</span>
                <span className="text-xs font-bold theme-text-primary uppercase truncate ml-2">
                  {selectedNotification.notification_type || 'INFO'}
                </span>
              </div>

              <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
                <span className="text-[11px] font-sans theme-text-secondary">{t('inAppNotification', 'Channel')}:</span>
                <span className="text-xs font-bold theme-accent truncate ml-2">
                  IN-APP ALERT
                </span>
              </div>
            </div>
          </div>

          {/* 5. Footer Actions */}
          <div className="pt-4 border-t theme-border flex items-center justify-between gap-2 flex-wrap">
            <CustomButton
              type="button"
              variant="danger-subtle"
              size="sm"
              icon={TrashIcon}
              onClick={() => {
                setItemToDelete(selectedNotification);
                setShowDeleteModal(true);
              }}
              disabled={updatingStatus || isDeleting}
            >
              {t('deleteNotification', 'Delete')}
            </CustomButton>

            <div className="flex items-center gap-2">
              <CustomButton
                type="button"
                variant="sub"
                size="sm"
                onClick={() => handleToggleRead(selectedNotification)}
                disabled={updatingStatus || isDeleting}
                loading={updatingStatus}
              >
                {selectedNotification.is_read
                  ? t('markAsUnread', 'Mark as Unread')
                  : t('markAsRead', 'Mark as Read')}
              </CustomButton>

              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedNotificationId(null);
                  setSelectedNotification(null);
                }}
              >
                Back
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && itemToDelete && (
          <DeleteImpactModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}
            onConfirm={handleConfirmDelete}
            title={t('deleteNotification', 'Delete Notification')}
            subtitle={t('deleteConfirm', 'Are you sure you want to delete this notification? This action cannot be undone.')}
            entityType="Notification"
            entityName={itemToDelete.title}
            confirmButtonText={t('delete', 'Delete')}
            requireAck={false}
            isDeleting={isDeleting}
          />
        )}
      </DrawerContainer>
    );
  }

  // ==========================================
  // LIST VIEW (DEFAULT NOTIFICATION CENTER)
  // ==========================================
  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-4 pt-1 pb-8 text-left @container">
        {/* 1. Sound & Alert Controls Panel */}
        <div className="p-3 rounded-2xl border theme-border theme-bg-sub/40 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Volume2Icon className="w-3.5 h-3.5 theme-accent" />
              <span className="text-xs font-bold theme-text-primary">Alert Tone & Devices</span>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (soundMode === 'DEVICE_SOUND' && isDeviceNotificationSupported() && Notification.permission === 'default') {
                  const perm = await requestDeviceNotificationPermission();
                  setDevicePermission(perm);
                }
                playTestChime(soundMode);
              }}
              disabled={soundMode === 'MUTE'}
              className="text-[11px] font-semibold theme-accent hover:underline disabled:opacity-40 disabled:hover:no-underline cursor-pointer bg-transparent border-0"
            >
              Test Alert
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl theme-bg-surface border theme-border">
            <button
              type="button"
              onClick={() => handleSoundModeChange('APP_CHIME')}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                soundMode === 'APP_CHIME'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <Volume2Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">App Chime</span>
            </button>

            <button
              type="button"
              onClick={() => handleSoundModeChange('DEVICE_SOUND')}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                soundMode === 'DEVICE_SOUND'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <LaptopIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">System OS</span>
            </button>

            <button
              type="button"
              onClick={() => handleSoundModeChange('MUTE')}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                soundMode === 'MUTE'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <VolumeXIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mute</span>
            </button>
          </div>

          {/* Permission Prompt Banner */}
          {isDeviceNotificationSupported() && devicePermission === 'default' && (
            <div className="p-2 rounded-xl border theme-border bg-emerald-500/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <BellIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 truncate">
                  Enable system desktop alerts?
                </span>
              </div>
              <button
                type="button"
                onClick={handleRequestDeviceAlerts}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer border-0 transition shrink-0"
              >
                Enable
              </button>
            </div>
          )}
        </div>

        {/* 2. Filter & Actions Toolbar */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl theme-bg-sub border theme-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`py-1 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'theme-bg-accent text-white shadow-xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                All ({notifications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('UNREAD')}
                className={`py-1 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'UNREAD'
                    ? 'theme-bg-accent text-white shadow-xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Mark All Read Button */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="text-xs font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-0"
              >
                <CheckDoubleIcon className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <CustomInput
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(val: any) => setSearchQuery(typeof val === 'string' ? val : val?.target?.value ?? '')}
            icon={SearchIcon}
            size="sm"
            className="w-full"
          />
        </div>

        {/* 3. Notifications List */}
        <div className="space-y-2">
          {loadingList ? (
            <div className="p-8 text-center space-y-3 animate-pulse">
              <div className="w-10 h-10 rounded-full theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-secondary">
                <BellIcon className="w-5 h-5 opacity-40 animate-spin" />
              </div>
              <div className="text-xs theme-text-secondary">Loading notifications...</div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed theme-border theme-bg-sub/30 flex flex-col items-center justify-center text-center space-y-2 my-2">
              <div className="w-10 h-10 rounded-xl theme-bg-sub theme-text-secondary flex items-center justify-center shadow-xs">
                <BellIcon className="w-5 h-5 opacity-60" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold theme-text-primary block">
                  {activeTab === 'UNREAD' ? 'No unread notifications' : 'All caught up!'}
                </span>
                <p className="text-[11px] theme-text-secondary leading-relaxed max-w-[220px]">
                  {searchQuery
                    ? 'No notifications match your search query.'
                    : activeTab === 'UNREAD'
                    ? 'You have read all received alerts.'
                    : 'New alerts, events, and broadcast notices will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            filteredList.map((item) => {
              const typeConfig = getNotificationTypeBadgeConfig(item.notification_type);
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectNotification(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-2 group ${
                    item.is_read
                      ? 'theme-bg-surface theme-border-subtle hover:theme-border-accent-soft hover:theme-bg-sub/30'
                      : 'theme-bg-accent-soft/20 theme-border-accent-soft shadow-xs hover:theme-bg-accent-soft/35'
                  }`}
                >
                  {/* Top Bar: Type, Time, and Unread Dot */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${typeConfig.className}`}>
                        <TypeIcon className="w-3 h-3 shrink-0" />
                        <span>{typeConfig.label}</span>
                      </span>

                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] theme-text-secondary font-medium shrink-0">
                        {formatRelativeTime(item.created_at)}
                      </span>

                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(item);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 rounded-md theme-text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer bg-transparent border-0 opacity-0 group-hover:opacity-100"
                        title="Delete notification"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div>
                    <h4 className={`text-xs ${item.is_read ? 'font-semibold theme-text-primary' : 'font-bold theme-text-primary'}`}>
                      {item.title}
                    </h4>
                    <p className="text-[11px] theme-text-secondary line-clamp-2 leading-relaxed mt-0.5">
                      {item.message}
                    </p>
                  </div>

                  {/* Action Link Footer Preview */}
                  {item.action_url && (
                    <div className="pt-1.5 border-t theme-border-subtle flex items-center justify-between text-[10.5px]">
                      <span className="theme-accent font-semibold flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        <span>Action available</span>
                      </span>
                      <ChevronRightIcon className="w-3.5 h-3.5 theme-text-secondary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 4. Bottom Footer Shortcut to Notification Hub */}
        <div className="pt-2 border-t theme-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate('/app-management/notifications');
            }}
            className="text-xs font-semibold theme-text-secondary hover:theme-accent flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Open Notification Management Hub</span>
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && itemToDelete && (
        <DeleteImpactModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title={t('deleteNotification', 'Delete Notification')}
          subtitle={t('deleteConfirm', 'Are you sure you want to delete this notification? This action cannot be undone.')}
          entityType="Notification"
          entityName={itemToDelete.title}
          confirmButtonText={t('delete', 'Delete')}
          requireAck={false}
          isDeleting={isDeleting}
        />
      )}
    </DrawerContainer>
  );
}
