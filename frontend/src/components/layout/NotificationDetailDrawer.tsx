import React, { useState, useEffect, useCallback } from 'react';
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
} from '@/components/ui/Icons';
import CustomButton from '@/components/ui/CustomButton';
import { DrawerContainer } from '@/components/layout';
import DeleteImpactModal from '@/components/common/DeleteImpactModal';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/i18n';
import {
  getInAppNotificationById,
  deleteInAppNotification,
  toggleNotificationReadStatus,
} from '@/api/notifications';
import type { InAppNotification, NotificationType } from '@/types/notifications';

export interface NotificationDetailDrawerProps {
  notificationId?: string | number | null;
  initialNotification?: InAppNotification | null;
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

export default function NotificationDetailDrawer({
  notificationId,
  initialNotification,
  onClose,
  onNotificationDeleted,
  onNotificationUpdated,
}: NotificationDetailDrawerProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, formatDate, isRTL } = useTranslation('notifications');

  const [notification, setNotification] = useState<InAppNotification | null>(() => {
    if (initialNotification && String(initialNotification.id) === String(notificationId)) {
      return initialNotification;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!notification && Boolean(notificationId));
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Load notification detail from API if not pre-populated
  const loadNotificationDetail = useCallback(async (id: string | number) => {
    try {
      setLoading(true);
      const data = await getInAppNotificationById(id);
      setNotification(data);
    } catch (err: any) {
      console.warn('[NotificationDetailDrawer] Failed to fetch notification:', err);
      showToast(err.message || t('notFound', 'Notification not found or has been removed.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (notificationId) {
      if (!notification || String(notification.id) !== String(notificationId)) {
        loadNotificationDetail(notificationId);
      }
    }
  }, [notificationId, loadNotificationDetail]);

  // Toggle read status
  const handleToggleRead = async () => {
    if (!notification) return;
    const targetStatus = !notification.is_read;
    try {
      setUpdatingStatus(true);
      const updated = await toggleNotificationReadStatus(notification.id, targetStatus);
      const nextNotification = {
        ...notification,
        is_read: targetStatus,
        read_at: targetStatus ? new Date().toISOString() : null,
        ...updated,
      };
      setNotification(nextNotification);
      onNotificationUpdated?.(nextNotification);
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
      showToast(
        targetStatus
          ? t('readSuccess', 'Marked as read')
          : t('unreadSuccess', 'Marked as unread'),
        'success'
      );
    } catch (err: any) {
      console.error('[NotificationDetailDrawer] Toggle read error:', err);
      showToast(err.message || 'Failed to update read status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete notification
  const handleConfirmDelete = async () => {
    if (!notification) return;
    try {
      setIsDeleting(true);
      await deleteInAppNotification(notification.id);
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
      showToast(t('deleteSuccess', 'Notification deleted successfully'), 'success');
      onNotificationDeleted?.(notification.id);
      setShowDeleteModal(false);
      onClose?.();
    } catch (err: any) {
      console.error('[NotificationDetailDrawer] Delete error:', err);
      showToast(err.message || 'Failed to delete notification', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Associated Action URL
  const handleOpenAction = () => {
    if (!notification?.action_url) return;
    onClose?.();
    navigate(notification.action_url);
  };

  if (loading) {
    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="p-6 text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-secondary">
            <BellIcon className="w-6 h-6 opacity-40 animate-spin" />
          </div>
          <div className="h-4 w-40 theme-bg-sub rounded-md mx-auto" />
          <div className="h-3 w-64 theme-bg-sub rounded-md mx-auto" />
          <div className="h-24 w-full theme-bg-sub rounded-xl mx-auto mt-4" />
        </div>
      </DrawerContainer>
    );
  }

  if (!notification) {
    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-secondary">
            <AlertCircleIcon className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold theme-text-primary">
            {t('notFound', 'Notification not found or has been removed.')}
          </h3>
          <p className="text-xs theme-text-secondary">
            {t('noData', 'No records found')}
          </p>
          <div className="pt-2">
            <CustomButton
              type="button"
              variant="sub"
              size="sm"
              onClick={onClose}
            >
              {t('close', 'Close')}
            </CustomButton>
          </div>
        </div>
      </DrawerContainer>
    );
  }

  const typeConfig = getNotificationTypeBadgeConfig(notification.notification_type);
  const TypeIcon = typeConfig.icon;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-6 pt-2 text-left @container">
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
                  notification.is_read
                    ? 'theme-bg-surface theme-text-secondary theme-border'
                    : 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/30 font-extrabold'
                }`}
              >
                {notification.is_read ? (
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
              <span>{formatRelativeTime(notification.created_at)}</span>
            </div>
          </div>

          {/* Notification Title */}
          <div>
            <h2 className="text-base font-bold theme-text-primary leading-snug">
              {notification.title}
            </h2>
            <div className="text-[11px] theme-text-secondary mt-1 flex items-center gap-2">
              <span>{formatDate(notification.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {notification.read_at && (
                <>
                  <span>•</span>
                  <span>{t('readAt', 'Read at')}: {formatDate(notification.read_at, { timeStyle: 'short' })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Message Content Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('messagePayload', 'Notification Message')}
            </span>
          </div>

          <div className="p-4 rounded-xl theme-bg-surface border theme-border text-xs theme-text-primary leading-relaxed whitespace-pre-wrap shadow-2xs font-normal">
            {notification.message}
          </div>
        </div>

        {/* 3. Associated Action Card (if action_url exists) */}
        {notification.action_url && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b theme-border">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {t('openAction', 'Open Associated Page')}
              </span>
            </div>

            <div className="p-4 rounded-xl border theme-border theme-bg-accent-soft/30 flex items-center justify-between gap-3 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold theme-text-primary mb-0.5">
                  <LinkIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span className="truncate">{t('openAction', 'Open Associated Page')}</span>
                </div>
                <div className="text-[11px] theme-text-secondary font-mono truncate">
                  {notification.action_url}
                </div>
              </div>

              <CustomButton
                type="button"
                variant="primary"
                size="sm"
                icon={ArrowRightIcon}
                onClick={handleOpenAction}
                className="shrink-0"
              >
                {t('view', 'Go to Page')}
              </CustomButton>
            </div>
          </div>
        )}

        {/* 4. Notification Metadata Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('metadata', 'Notification Metadata')}
            </span>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2 text-xs font-mono">
            {/* Recipient */}
            <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
              <span className="text-[11px] font-sans theme-text-secondary">{t('recipient', 'Recipient')}:</span>
              <span className="text-xs font-bold theme-text-primary truncate ml-2">
                {notification.recipient_username ? `@${notification.recipient_username}` : `ID: ${notification.recipient}`}
              </span>
            </div>

            {/* Notification ID */}
            <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
              <span className="text-[11px] font-sans theme-text-secondary">{t('notificationId', 'Notification ID')}:</span>
              <span className="text-xs font-bold theme-text-secondary font-mono truncate ml-2">
                #{notification.id}
              </span>
            </div>

            {/* Type */}
            <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
              <span className="text-[11px] font-sans theme-text-secondary">{t('type', 'Type')}:</span>
              <span className="text-xs font-bold theme-text-primary uppercase truncate ml-2">
                {notification.notification_type || 'INFO'}
              </span>
            </div>

            {/* Channel */}
            <div className="p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between">
              <span className="text-[11px] font-sans theme-text-secondary">{t('inAppNotification', 'Channel')}:</span>
              <span className="text-xs font-bold theme-accent truncate ml-2">
                IN-APP ALERT
              </span>
            </div>
          </div>
        </div>

        {/* 5. Actions Toolbar / Footer */}
        <div className="pt-4 border-t theme-border flex items-center justify-between gap-2 flex-wrap">
          {/* Delete Action Button */}
          <CustomButton
            type="button"
            variant="danger-subtle"
            size="sm"
            icon={TrashIcon}
            onClick={() => setShowDeleteModal(true)}
            disabled={updatingStatus || isDeleting}
          >
            {t('deleteNotification', 'Delete Notification')}
          </CustomButton>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Read/Unread Toggle */}
            <CustomButton
              type="button"
              variant="sub"
              size="sm"
              onClick={handleToggleRead}
              disabled={updatingStatus || isDeleting}
              loading={updatingStatus}
            >
              {notification.is_read
                ? t('markAsUnread', 'Mark as Unread')
                : t('markAsRead', 'Mark as Read')}
            </CustomButton>

            {/* Close Drawer Button */}
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              {t('close', 'Close')}
            </CustomButton>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteImpactModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title={t('deleteNotification', 'Delete Notification')}
          subtitle={t('deleteConfirm', 'Are you sure you want to delete this notification? This action cannot be undone.')}
          entityType="Notification"
          entityName={notification.title}
          confirmButtonText={t('delete', 'Delete')}
          requireAck={false}
          isDeleting={isDeleting}
        />
      )}
    </DrawerContainer>
  );
}
