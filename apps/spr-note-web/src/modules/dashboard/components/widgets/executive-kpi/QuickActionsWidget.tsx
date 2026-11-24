import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../../../i18n';
import type { DashboardQuickAction } from '../../../types';
import { useQuickCommandDesk } from './useQuickCommandDesk';
import IconButton from '../../../../../components/ui/IconButton';
import {
  SparklesIcon,
  BookOpenIcon,
  AttendanceIcon,
  CalendarIcon,
  ClassIcon,
  StudentIcon,
  TeacherIcon,
  BuildingOfficeIcon,
  PinIcon,
  ClockIcon,
  CloseIcon,
  BookmarkIcon,
  TrashIcon,
  DotsVerticalIcon,
} from '../../../../../components/ui/Icons';

import { ROUTE_TITLE_MAP } from '../../../../../components/layout/routeMeta';

export interface AppShortcutItem {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  color: 'accent' | 'emerald' | 'purple' | 'amber' | 'rose' | 'sky';
  icon: React.ComponentType<{ className?: string }>;
  requiredFeatureKey?: string;
}

const CANONICAL_SHORTCUT_SPECS: Array<{
  path: string;
  color: AppShortcutItem['color'];
  featureKey?: string;
}> = [
  { path: '/studies/daily-progress', color: 'purple', featureKey: 'progress_management' },
  { path: '/studies/progress-reports', color: 'accent', featureKey: 'progress_management' },
  { path: '/studies/progress-analytics', color: 'sky', featureKey: 'progress_management' },
  { path: '/attendance/students/monthly-matrix', color: 'emerald', featureKey: 'student_class_attendance' },
  { path: '/academy/periods', color: 'amber', featureKey: 'class_period_slots' },
  { path: '/academy/calendar-events', color: 'rose', featureKey: 'academy_calendar_events' },
  { path: '/students', color: 'accent', featureKey: 'student_roster' },
  { path: '/admission', color: 'emerald', featureKey: 'student_admission' },
  { path: '/staff/roster', color: 'sky', featureKey: 'staff_roster' },
  { path: '/academy/campus-profile', color: 'amber', featureKey: 'campus_profile' },
  { path: '/academy/classes-groups', color: 'purple', featureKey: 'student_classes' },
];

/**
 * Dynamically generated from canonical Route Metadata Registry (ROUTE_TITLE_MAP).
 * Eliminates all hardcoded titles, categories, and descriptions.
 */
export const AVAILABLE_APP_SHORTCUTS: AppShortcutItem[] = CANONICAL_SHORTCUT_SPECS.map((spec) => {
  const meta = ROUTE_TITLE_MAP[spec.path] || {
    title: spec.path,
    category: 'General',
  };
  const id = spec.path.replace(/^\//, '').replace(/[/\\-]/g, '_');
  const description = meta.subCategory
    ? `${meta.category} • ${meta.subCategory}`
    : meta.category;

  return {
    id,
    title: meta.title,
    description,
    path: spec.path,
    category: meta.category,
    color: spec.color,
    icon: getShortcutIcon(spec.path),
    requiredFeatureKey: spec.featureKey,
  };
});

export interface QuickActionsWidgetProps {
  actions?: DashboardQuickAction[];
  selectedActionIds?: string[];
  title?: string;
  className?: string;
}

const ACTION_COLOR_STYLES: Record<string, { bg: string; text: string }> = {
  accent: {
    bg: 'theme-bg-accent-soft text-[var(--accent-main)]',
    text: 'text-[var(--accent-main)]',
  },
  emerald: {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
  },
  amber: {
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
  },
  sky: {
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
  },
};

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

function getShortcutIcon(path: string): React.ComponentType<{ className?: string }> {
  const p = path.toLowerCase();
  if (p.includes('daily-progress') || p.includes('quran') || p.includes('hifz')) return BookOpenIcon;
  if (p.includes('report') || p.includes('analytic') || p.includes('assessment')) return SparklesIcon;
  if (p.includes('attendance') || p.includes('roll-call')) return AttendanceIcon;
  if (p.includes('student') || p.includes('admission')) return StudentIcon;
  if (p.includes('staff') || p.includes('teacher') || p.includes('faculty')) return TeacherIcon;
  if (p.includes('calendar') || p.includes('event') || p.includes('holiday')) return CalendarIcon;
  if (p.includes('branch') || p.includes('campus') || p.includes('institution')) return BuildingOfficeIcon;
  if (p.includes('class') || p.includes('section') || p.includes('timetable')) return ClassIcon;
  return BookmarkIcon;
}

export default function QuickActionsWidget({
  title,
  className = '',
}: QuickActionsWidgetProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  const {
    pinnedPages,
    recentPages,
    addPin,
    removePin,
    isPinned,
    clearRecents,
    removeRecent,
  } = useQuickCommandDesk();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  // Filter out any page that is already pinned from the Recently Visited Pages list
  const unpinnedRecentPages = useMemo(() => {
    return recentPages.filter((r) => !isPinned(r.path));
  }, [recentPages, isPinned]);

  return (
    <div
      className={`@container p-4 @[480px]:p-5 rounded-3xl theme-bg-surface shadow-xs hover:shadow-md h-full flex flex-col justify-start space-y-4 select-none min-w-0 border-0 ${className}`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-1 border-0 shrink-0 relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <BookmarkIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary truncate">
              {title || t('quickCommandDesk', 'Quick Command Desk')}
            </h3>
            <p className="hidden @[640px]:block text-[11px] theme-text-secondary mt-0.5 truncate">
              {t('quickCommandDeskSub', 'Instant pinned bookmarks & recently visited pages')}
            </p>
          </div>
        </div>

        {/* 3-Dot Options Menu (Reused Project IconButton, Ghost Variant - Transparent by default, subtle on hover) */}
        <div ref={menuRef} className="relative shrink-0">
          <IconButton
            icon={DotsVerticalIcon}
            variant="ghost"
            size="sm"
            active={isMenuOpen}
            title="Quick Command Desk Options"
            ariaLabel="Quick Command Desk Options"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          />

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 p-1.5 rounded-2xl theme-bg-surface border-0 ring-0 shadow-xl z-30 animate-fade-in">
              <button
                type="button"
                disabled={recentPages.length === 0}
                onClick={() => {
                  clearRecents();
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-0 select-none text-left ${
                  recentPages.length > 0
                    ? 'theme-text-primary hover:theme-bg-app hover:text-rose-500 cursor-pointer'
                    : 'opacity-40 theme-text-secondary cursor-not-allowed'
                }`}
              >
                <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('clearHistory', 'Clear Recents History')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. SECTION 1: PINNED SHORTCUTS (Badge removed) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <PinIcon className="w-3.5 h-3.5 theme-accent" />
          <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
            {t('pinnedShortcuts', 'Pinned Shortcuts')}
          </span>
        </div>

        {pinnedPages.length === 0 ? (
          <div className="py-4 text-center text-xs theme-text-secondary theme-bg-app rounded-2xl p-3 shadow-2xs space-y-1">
            <p className="font-semibold theme-text-primary">No Pinned Pages Yet</p>
            <p className="text-[11px] max-w-sm mx-auto">
              Pin frequently visited pages using the Quick Access Tool at the bottom-right corner of the screen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-3 @[1100px]:grid-cols-4 gap-2">
            {pinnedPages.map((pin) => {
              const style = ACTION_COLOR_STYLES[pin.color || 'accent'] || ACTION_COLOR_STYLES.accent;
              const ItemIcon = getShortcutIcon(pin.path);

              return (
                <div
                  key={pin.id}
                  onClick={() => navigate(pin.path)}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/70 transition-all cursor-pointer group relative min-w-0 border-0 shadow-2xs"
                >
                  {/* Menu Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.bg} shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </div>

                  {/* Header & Subtitle (Subtitle hidden on small screens) */}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold theme-text-primary truncate group-hover:theme-accent transition-colors leading-tight">
                      {pin.title}
                    </div>
                    <div className="hidden @[480px]:block text-[10px] theme-text-secondary truncate mt-0.5 leading-tight">
                      {pin.category} {pin.subCategory && `• ${pin.subCategory}`}
                    </div>
                  </div>

                  {/* Unpin Action (Reused Project IconButton) */}
                  <IconButton
                    icon={CloseIcon}
                    variant="ghost"
                    size="xs"
                    title="Unpin page"
                    ariaLabel="Unpin page"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:theme-bg-surface transition-all shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePin(pin.id);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SECTION 2: RECENTLY VISITED PAGES (Subtle soft divider line, excludes pinned pages, badge removed) */}
      <div className="space-y-2.5 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <ClockIcon className="w-3.5 h-3.5 theme-accent" />
          <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
            {t('recentPages', 'Recently Visited Pages')}
          </span>
        </div>

        {unpinnedRecentPages.length === 0 ? (
          <div className="py-4 text-center text-xs theme-text-secondary theme-bg-app rounded-2xl p-3 shadow-2xs space-y-1">
            <p className="font-semibold theme-text-primary">No Recent Pages Tracked Yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-3 @[1100px]:grid-cols-4 gap-2">
            {unpinnedRecentPages.map((recent) => {
              const ItemIcon = getShortcutIcon(recent.path);

              return (
                <div
                  key={recent.path}
                  onClick={() => navigate(recent.path)}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/70 transition-all cursor-pointer group relative min-w-0 border-0 shadow-2xs"
                >
                  {/* Menu Icon */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 theme-bg-surface theme-text-secondary shadow-2xs group-hover:scale-105 transition-transform">
                    <ItemIcon className="w-4 h-4" />
                  </div>

                  {/* Header & Subtitle (Subtitle hidden on small screens) */}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold theme-text-primary truncate group-hover:theme-accent transition-colors leading-tight">
                      {recent.title}
                    </div>
                    <div className="hidden @[480px]:flex items-center justify-between text-[10px] theme-text-secondary mt-0.5 leading-tight">
                      <span className="truncate">{recent.category}</span>
                      <span className="font-mono shrink-0 ml-1 opacity-75">
                        {formatRelativeTime(recent.visitedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Pin & Remove (Reused Project IconButton) */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <IconButton
                      icon={PinIcon}
                      variant="ghost"
                      size="xs"
                      title="Pin to desk"
                      ariaLabel="Pin to desk"
                      className="opacity-0 group-hover:opacity-100 hover:theme-accent hover:theme-bg-surface transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        addPin({
                          path: recent.path,
                          title: recent.title,
                          category: recent.category,
                          subCategory: recent.subCategory,
                        });
                      }}
                    />

                    <IconButton
                      icon={CloseIcon}
                      variant="ghost"
                      size="xs"
                      title="Remove from recents"
                      ariaLabel="Remove from recents"
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:theme-bg-surface transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(recent.path);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
