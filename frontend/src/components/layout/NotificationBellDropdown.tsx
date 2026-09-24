import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BellIcon } from '../ui/Icons';
import { useRightSidebar } from '@/context/RightSidebarContext';
import {
  getInAppNotifications,
  getUnreadNotificationCount,
} from '@/api/notifications';
import {
  triggerNotificationAlert,
} from '@/utils/notificationSoundService';

/**
 * NotificationBellDropdown
 * 
 * Header Notification Trigger Button.
 * Directly triggers the modern Right Sidebar Notification Center drawer on click,
 * maintaining real-time background polling, sound chimes, and live unread badge updates.
 */
export default function NotificationBellDropdown() {
  const { openDrawer } = useRightSidebar();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  const loadNotifications = useCallback(async (triggerAlerts: boolean = true) => {
    try {
      const [list, count] = await Promise.all([
        getInAppNotifications(),
        getUnreadNotificationCount(),
      ]);

      if (!isInitialLoadRef.current && triggerAlerts) {
        // Detect newly arrived unread notifications
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

      // Update seen set
      list.forEach((n) => seenIdsRef.current.add(n.id));
      isInitialLoadRef.current = false;

      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotificationBellDropdown] Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications(false);
    const interval = setInterval(() => loadNotifications(true), 25000); // 25s auto polling

    const handleCustomRefresh = () => loadNotifications(true);
    window.addEventListener('spr_notification_refresh', handleCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('spr_notification_refresh', handleCustomRefresh);
    };
  }, [loadNotifications]);

  const handleOpenNotifications = () => {
    openDrawer('notifications');
  };

  return (
    <div className="relative select-none">
      <button
        type="button"
        onClick={handleOpenNotifications}
        className="relative p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95"
        title="Notifications (Click to open sidebar)"
        aria-label="Notifications"
      >
        <BellIcon className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full theme-bg-accent theme-accent-text text-[10px] font-extrabold shadow-sm ring-2 ring-[var(--bg-surface)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

