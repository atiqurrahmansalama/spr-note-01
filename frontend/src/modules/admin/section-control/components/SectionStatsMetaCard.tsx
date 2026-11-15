import React, { useState, useRef, useEffect } from 'react';
import { DotsVerticalIcon, AdjustmentsHorizontalIcon, CheckIcon } from '../../../../components/ui/Icons';
import IconButton from '../../../../components/ui/IconButton';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { ScopeType } from '../types';

export interface SectionStatsMetaCardProps {
  activeScope: ScopeType;
  totalCount: number;
  enabledCount: number;
  disabledCount: number;
  percentage: number;
  activeRole?: string;
  activeAcademy?: string;
  activeUser?: string;
  modifiedCount?: number;
  className?: string;
}

/**
 * SectionStatsMetaCard
 * Compact "More" button triggering a high-density metacard popover in the upper toolbar.
 * Displays total feature controllers, enabled/active count, disabled count, and completion rate.
 * Adheres strictly to Rule 14 (borderless, soft-surface, ring-0, Apple/Linear minimalist aesthetics).
 */
export const SectionStatsMetaCard: React.FC<SectionStatsMetaCardProps> = ({
  activeScope,
  totalCount,
  enabledCount,
  disabledCount,
  percentage,
  activeRole,
  activeAcademy,
  activeUser,
  modifiedCount = 0,
  className = '',
}) => {
  const { t, formatNumber } = useSectionTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Derive human-readable scope label
  const scopeLabel = React.useMemo(() => {
    switch (activeScope) {
      case 'global':
        return t('tabs.global', 'Global Defaults');
      case 'role':
        return activeRole ? `Role: ${activeRole}` : t('tabs.role', 'Role Scopes');
      case 'academy':
        return activeAcademy ? `Academy: #${activeAcademy}` : t('tabs.academy', 'Academy Overrides');
      case 'user':
        return activeUser ? `User: #${activeUser}` : t('tabs.user', 'User Overrides');
      default:
        return 'Feature Scope';
    }
  }, [activeScope, activeRole, activeAcademy, activeUser, t]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* 1. Sleek Compact "More" Icon Button (Reusing Enterprise IconButton, border-0 ring-0) */}
      <IconButton
        icon={DotsVerticalIcon}
        size="md"
        variant={isOpen ? 'accent-soft' : 'sub'}
        active={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        title={t('stats.title', 'Feature Controls Overview')}
        ariaLabel={t('stats.title', 'Feature Controls Overview')}
        className="shrink-0 border-0 ring-0"
      />

      {/* 2. Floating Metacard Popover (Rule 14: Borderless, soft-surface, Apple/Linear minimalist, reusable theme shadow) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 p-4 rounded-2xl theme-bg-surface theme-shadow-popover border-0 ring-0 animate-in fade-in zoom-in-95 duration-150 select-none space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b theme-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold theme-text-primary leading-tight truncate">
                  {t('stats.title', 'Feature Controls Overview')}
                </h4>
                <p className="text-[10px] theme-text-secondary truncate mt-0.5">
                  {scopeLabel}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary shrink-0">
              {percentage}% Active
            </span>
          </div>

          {/* Key Metrics: Total & Enabled side by side */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Total Feature Controllers */}
            <div className="p-3 rounded-xl theme-bg-app border-0 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary truncate">
                {t('stats.total', 'Total Features')}
              </div>
              <div className="text-xl font-bold font-mono theme-text-primary leading-none">
                {formatNumber(totalCount)}
              </div>
            </div>

            {/* Enabled / Active Controllers */}
            <div className="p-3 rounded-xl theme-bg-accent-soft/50 border-0 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-accent truncate flex items-center gap-1.5">
                <span>{t('stats.enabled', 'Enabled & Active')}</span>
              </div>
              <div className="text-xl font-bold font-mono theme-accent leading-none">
                {formatNumber(enabledCount)}
              </div>
            </div>
          </div>

          {/* Disabled & Active Summary Line */}
          <div className="p-2.5 rounded-xl theme-bg-app border-0 flex items-center justify-between text-xs">
            <span className="theme-text-secondary text-[11px] font-medium">
              {t('stats.disabled', 'Disabled / Inactive')}:
            </span>
            <span className="font-mono font-bold theme-text-primary">
              {formatNumber(disabledCount)}
            </span>
          </div>

          {/* Visual Percentage Progress Bar */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[10px] font-semibold theme-text-secondary">
              <span>{t('stats.activeRate', 'Active Deployment Rate')}</span>
              <span className="font-mono">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full theme-bg-sub overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-main)] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          {/* Footer Notice */}
          <div className="pt-1 text-[10px] theme-text-secondary flex items-center justify-between border-t theme-border">
            {modifiedCount > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>
                  {t('stats.unsavedChanges', '{{count}} unsaved changes in scope', {
                    count: formatNumber(modifiedCount),
                  })}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckIcon className="w-3 h-3 shrink-0" />
                <span>{t('stats.liveSynced', 'Scope Synchronized & Live')}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionStatsMetaCard;
