import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  CheckCircle2Icon,
  CloseIcon,
  SettingsIcon,
  SparklesIcon,
} from '../ui/Icons';
import {
  getInAppNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../api/notifications';

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffSec = Math.floor((now - date) / 1000);

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

export default function NotificationBellDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const [list, count] = await Promise.all([
        getInAppNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotificationBellDropdown] Fetch error:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s auto polling

    const handleCustomRefresh = () => loadNotifications();
    window.addEventListener('spr_notification_refresh', handleCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('spr_notification_refresh', handleCustomRefresh);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (notif.action_url) {
      setIsOpen(false);
      navigate(notif.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredList =
    activeTab === 'UNREAD'
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div ref={dropdownRef} className="relative select-none">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition border-0 bg-transparent flex items-center justify-center cursor-pointer active:scale-95"
        title="Notifications"
        aria-label="Notifications"
      >
        <BellIcon className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-[var(--bg-surface)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl theme-bg-surface border theme-border shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-3.5 border-b theme-border flex items-center justify-between theme-bg-sub/50 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border theme-border">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[11px] font-semibold theme-accent hover:underline cursor-pointer bg-transparent border-0"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated cursor-pointer bg-transparent border-0 transition"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b theme-border theme-bg-sub/20 px-3 pt-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`pb-2 px-2 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent ${
                activeTab === 'ALL'
                  ? 'border-[var(--accent-main)] theme-accent'
                  : 'border-transparent theme-text-secondary hover:theme-text-primary'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              className={`pb-2 px-2 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent ${
                activeTab === 'UNREAD'
                  ? 'border-[var(--accent-main)] theme-accent'
                  : 'border-transparent theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {filteredList.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full theme-bg-elevated border theme-border flex items-center justify-center mx-auto mb-2.5 theme-text-secondary">
                  <BellIcon className="w-5 h-5 opacity-60" />
                </div>
                <div className="text-xs font-bold theme-text-primary">All caught up!</div>
                <div className="text-[11px] theme-text-secondary mt-0.5">
                  {activeTab === 'UNREAD'
                    ? 'No unread notifications at the moment.'
                    : 'No notifications recorded yet.'}
                </div>
              </div>
            ) : (
              filteredList.map((item) => {
                let badgeClass = 'theme-bg-sub theme-text-secondary';
                if (item.notification_type === 'SUCCESS') badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                else if (item.notification_type === 'ALERT') badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                else if (item.notification_type === 'WARNING') badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                else if (item.notification_type === 'INFO') badgeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-start ${
                      item.is_read
                        ? 'theme-bg-surface border-transparent hover:theme-bg-elevated'
                        : 'theme-bg-elevated border-[var(--accent-main)]/30 hover:border-[var(--accent-main)] shadow-sm'
                    }`}
                  >
                    {/* Unread indicator / type icon */}
                    <div className="shrink-0 mt-0.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border uppercase ${badgeClass}`}>
                        {item.notification_type || 'INFO'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className={`text-xs truncate ${item.is_read ? 'font-semibold theme-text-primary' : 'font-bold theme-text-primary'}`}>
                          {item.title}
                        </div>
                        <span className="text-[10px] theme-text-secondary shrink-0 whitespace-nowrap">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <div className="text-[11px] theme-text-secondary line-clamp-2 leading-relaxed">
                        {item.message}
                      </div>
                    </div>

                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-main)] shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t theme-border theme-bg-sub/30 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/app-management/notifications');
              }}
              className="text-[11px] font-bold theme-text-secondary hover:theme-accent flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Notification Hub</span>
            </button>
            <span className="text-[10px] theme-text-secondary">SPR Real-time</span>
          </div>
        </div>
      )}
    </div>
  );
}
