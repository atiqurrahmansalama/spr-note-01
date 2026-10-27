import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BellIcon } from '../ui/Icons';
import IconButton from '../ui/IconButton';
import { useRightSidebar } from '@/context/RightSidebarContext';
import {
  getUnreadNotificationSummary,
} from '@/api/notifications';
import {
  triggerNotificationAlert,
} from '@/utils/notificationSoundService';

/**
 * NotificationBellDropdown
 * 
 * Header Notification Trigger Button.
 * Directly triggers the modern Right Sidebar Notification Center drawer on click,
 * maintaining lightweight background summary polling, sound chimes, and live unread badge updates.
 * Optimized for minimal database network transfer and pauses when browser tab is inactive.
 */
export default function NotificationBellDropdown() {
  const { openDrawer } = useRightSidebar();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const lastAlertedIdRef = useRef<string | number | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  const checkUnreadNotifications = useCallback(async (triggerAlerts: boolean = true) => {
    // Skip network polling completely if browser tab is hidden or minimized
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    try {
      const summary = await getUnreadNotificationSummary();
      setUnreadCount(summary.unread_count);

      if (!isInitialLoadRef.current && triggerAlerts && summary.latest_id) {
        if (lastAlertedIdRef.current !== summary.latest_id) {
          lastAlertedIdRef.current = summary.latest_id;
          triggerNotificationAlert(
            summary.latest_title || 'New Notification',
            summary.latest_message || '',
            summary.latest_action_url || '',
            String(summary.latest_id)
          );
        }
      } else if (summary.latest_id) {
        lastAlertedIdRef.current = summary.latest_id;
      }

      isInitialLoadRef.current = false;
    } catch (err) {
      console.warn('[NotificationBellDropdown] Summary check error:', err);
    }
  }, []);

  useEffect(() => {
    checkUnreadNotifications(false);

    // 60-second gentle polling interval (converses database egress)
    const interval = setInterval(() => checkUnreadNotifications(true), 60000);

    // Immediate check upon returning to tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkUnreadNotifications(true);
      }
    };

    const handleCustomRefresh = () => checkUnreadNotifications(true);

    window.addEventListener('spr_notification_refresh', handleCustomRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('spr_notification_refresh', handleCustomRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkUnreadNotifications]);

  const handleOpenNotifications = () => {
    openDrawer('notifications');
  };

  return (
    <div className="relative select-none inline-flex items-center">
      <IconButton
        icon={BellIcon}
        size="sm"
        variant="ghost"
        onClick={handleOpenNotifications}
        title="Notifications (Click to open sidebar)"
        ariaLabel="Notifications"
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full theme-bg-accent theme-accent-text text-[10px] font-extrabold shadow-sm ring-2 ring-[var(--bg-surface)] animate-pulse pointer-events-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}

