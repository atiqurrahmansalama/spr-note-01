import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppSidebar,
  CustomButton,
  IconButton,
  useAppI18n,
  type AppSidebarItem,
  type AppSidebarMode,
} from '@repo/ui';
import { useAuth } from '../../core/auth/AuthContext';
import { getModuleIconComponent } from '../../core/navigation/moduleIcons';
import { useUniverseStore } from '../../stores/universeStore';
import {
  HeartIcon,
  ShieldIcon,
  SidebarRightIcon,
  SparklesIcon,
} from '../icons/UniverseIcons';

export interface UniverseSidebarProps {
  mode: AppSidebarMode;
  isOpen: boolean;
  onClose: () => void;
  onToggleCollapse?: () => void;
  onOpenPulseDrawer: () => void;
}

/**
 * Collapsible Left Sidebar for Our Little Universe.
 * Reuses @repo/ui AppSidebar with dynamic database-driven modules and OWNER-only controls.
 */
export const UniverseSidebar: React.FC<UniverseSidebarProps> = ({
  mode,
  isOpen,
  onClose,
  onToggleCollapse,
  onOpenPulseDrawer,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, formatNumber } = useAppI18n('foundation');
  const { user, space, modules, isAuthenticated, progress } = useAuth();
  const { collectedStars } = useUniverseStore();

  const items = useMemo<AppSidebarItem[]>(() => {
    const dynamicItems: AppSidebarItem[] = modules
      .filter((m) => m.is_enabled)
      .map((m) => ({
        id: m.id,
        label: m.title,
        path: m.route_path,
        icon: getModuleIconComponent(m.icon_name),
        badge: m.badge_text || undefined,
        locked: Boolean(m.is_locked && user?.role !== 'OWNER'),
      }));

    if (user?.role === 'OWNER') {
      dynamicItems.push({
        id: 'owner-admin-hub',
        label: t('adminHub', 'Admin Control Hub'),
        path: '/admin',
        icon: ShieldIcon,
        badge: t('ownerBadge', 'Owner'),
      });
    }

    return dynamicItems;
  }, [modules, user?.role, t]);

  if (!isAuthenticated || location.pathname === '/login') {
    return null;
  }

  if (user?.role !== 'OWNER' && !progress?.entry_unlocked) {
    return null;
  }

  return (
    <AppSidebar
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onToggleCollapse={onToggleCollapse}
      activePath={location.pathname}
      items={items}
      onNavigate={(path: string) => navigate(path)}
      brandTitle={space?.title || t('brandTitle', 'Our Little Universe')}
      brandSubtitle={space?.subtitle || t('brandSubtitle', 'A private galaxy of memories & stories')}
      brandIcon={HeartIcon}
      ariaLabel={t('sidebarNav', 'Universe Navigation')}
      footer={
        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl theme-bg-app border-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold theme-text-primary truncate">
                  {user?.name || user?.email}
                </div>
                <div className="text-[10px] theme-text-secondary uppercase tracking-wider font-semibold">
                  {user?.role === 'OWNER' ? t('roleOwner', 'Owner') : t('roleRecipient', 'Recipient')}
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent text-[11px] font-bold shrink-0">
                <SparklesIcon className="w-3 h-3" />
                <span>{formatNumber(collectedStars)}</span>
              </div>
            </div>

            <CustomButton
              variant="soft"
              size="xs"
              fullWidth
              icon={SidebarRightIcon}
              onClick={() => {
                onOpenPulseDrawer();
                if (mode === 'overlay') onClose();
              }}
            >
              {t('openQuickDrawer', 'Atmosphere & Quick Panel')}
            </CustomButton>
          </div>
        </div>
      }
      collapsedFooter={
        <div className="flex justify-center">
          <IconButton
            icon={SidebarRightIcon}
            variant="accent-soft"
            size="sm"
            onClick={onOpenPulseDrawer}
            title={t('openQuickDrawer', 'Atmosphere & Quick Panel')}
            aria-label={t('openQuickDrawer', 'Atmosphere & Quick Panel')}
          />
        </div>
      }
    />
  );
};

export default UniverseSidebar;
