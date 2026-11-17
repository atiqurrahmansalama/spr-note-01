import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DotsVerticalIcon, AdjustmentsHorizontalIcon, CheckIcon, LayersIcon } from '../../../../components/ui/Icons';
import IconButton from '../../../../components/ui/IconButton';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { ScopeType, SectionCategory } from '../types';

export interface SectionStatsMetaCardProps {
  activeScope: ScopeType;
  totalCount: number;
  enabledCount: number;
  disabledCount: number;
  percentage: number;
  activeRole?: string;
  activeRoleName?: string;
  activeAcademy?: string;
  activeAcademyName?: string;
  activeAcademyRole?: string;
  activeAcademyUser?: string;
  activeAcademyUserName?: string;
  activeUser?: string;
  activeUserName?: string;
  categories?: SectionCategory[];
  modifiedFlags?: Record<string, boolean>;
  modifiedCount?: number;
  className?: string;
}

/**
 * SectionStatsMetaCard
 * Compact "More" button triggering an enterprise metacard popover in the upper toolbar.
 * Displays total feature controllers, enabled/active count, parent core modules vs sub-features,
 * and category-level progress breakdown.
 * Adheres strictly to Rule 14 (borderless, soft-surface, ring-0, Apple/Linear minimalist aesthetics).
 */
export const SectionStatsMetaCard: React.FC<SectionStatsMetaCardProps> = ({
  activeScope,
  totalCount,
  enabledCount,
  disabledCount,
  percentage,
  activeRole,
  activeRoleName,
  activeAcademy,
  activeAcademyName,
  activeAcademyRole,
  activeAcademyUser,
  activeAcademyUserName,
  activeUser,
  activeUserName,
  categories = [],
  modifiedFlags = {},
  modifiedCount = 0,
  className = '',
}) => {
  const { t, formatNumber } = useSectionTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape key
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

  // Derive human-readable scope label with pristine names (never raw UUIDs)
  const scopeLabel = useMemo(() => {
    switch (activeScope) {
      case 'global':
        return t('tabs.global', 'Global Defaults');
      case 'role': {
        const rName = activeRoleName || activeRole;
        return rName ? `Role: ${rName}` : t('tabs.role', 'Role Scopes');
      }
      case 'academy': {
        const instName = activeAcademyName || (activeAcademy ? `Academy: #${activeAcademy.slice(0, 8)}...` : t('tabs.academy', 'Academy Overrides'));
        if (activeAcademyRole && activeAcademyRole !== 'ALL') {
          return `${instName} • Role: ${activeAcademyRole}`;
        }
        if (activeAcademyUser && activeAcademyUser !== 'ALL') {
          const uName = activeAcademyUserName || `#${activeAcademyUser}`;
          return `${instName} • User: ${uName}`;
        }
        return activeAcademyName ? `Academy: ${activeAcademyName}` : instName;
      }
      case 'user': {
        const uName = activeUserName || (activeUser ? `#${activeUser}` : '');
        return uName ? `User: ${uName}` : t('tabs.user', 'User Overrides');
      }
      default:
        return 'Feature Scope';
    }
  }, [
    activeScope,
    activeRole,
    activeRoleName,
    activeAcademy,
    activeAcademyName,
    activeAcademyRole,
    activeAcademyUser,
    activeAcademyUserName,
    activeUser,
    activeUserName,
    t,
  ]);

  // Comprehensive Core Modules (Parents) vs Sub-Features calculation
  const coreModuleStats = useMemo(() => {
    if (!categories || categories.length === 0) {
      return {
        categoryList: [],
        parentCount: 0,
        parentEnabled: 0,
        subCount: 0,
        subEnabled: 0,
      };
    }

    let parentCount = 0;
    let parentEnabled = 0;
    let subCount = 0;
    let subEnabled = 0;

    const categoryList = categories.map((cat) => {
      let catTotal = 0;
      let catEnabled = 0;

      (cat.sections || []).forEach((sec) => {
        parentCount += 1;
        catTotal += 1;
        const isParentActive =
          modifiedFlags[sec.section_key] !== undefined
            ? Boolean(modifiedFlags[sec.section_key])
            : Boolean(sec.effective_enabled ?? sec.is_enabled);

        if (isParentActive) {
          parentEnabled += 1;
          catEnabled += 1;
        }

        (sec.children || []).forEach((child) => {
          subCount += 1;
          catTotal += 1;
          const isChildActive =
            modifiedFlags[child.section_key] !== undefined
              ? Boolean(modifiedFlags[child.section_key])
              : Boolean(child.effective_enabled ?? child.is_enabled);

          if (isChildActive) {
            subEnabled += 1;
            catEnabled += 1;
          }
        });
      });

      return {
        key: cat.key,
        title: cat.title,
        total: catTotal,
        enabled: catEnabled,
        percentage: catTotal > 0 ? Math.round((catEnabled / catTotal) * 100) : 0,
      };
    });

    return {
      categoryList,
      parentCount,
      parentEnabled,
      subCount,
      subEnabled,
    };
  }, [categories, modifiedFlags]);

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
        <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 p-4 rounded-3xl theme-bg-surface theme-shadow-popover border-0 ring-0 animate-in fade-in zoom-in-95 duration-150 select-none space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b theme-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 shadow-2xs">
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold theme-text-primary leading-tight truncate">
                  {t('stats.title', 'Feature Controls Overview')}
                </h4>
                <p className="text-[11px] theme-text-secondary truncate mt-0.5" title={scopeLabel}>
                  {scopeLabel}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full theme-bg-sub theme-text-secondary shrink-0">
              {percentage}% Active
            </span>
          </div>

          {/* Key Metrics Grid: 4-Item Layout (Total, Deployment Rate, Core Parents, Sub-Features) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Total Feature Controllers */}
            <div className="p-3 rounded-2xl theme-bg-app border-0 space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary truncate">
                {t('stats.total', 'Total Features')}
              </div>
              <div className="text-lg font-bold font-mono theme-text-primary leading-none">
                {formatNumber(totalCount)}
              </div>
            </div>

            {/* Enabled Rate */}
            <div className="p-3 rounded-2xl theme-bg-accent-soft/40 border-0 space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-accent truncate">
                {t('stats.activeRate', 'Active Rate')}
              </div>
              <div className="text-lg font-bold font-mono theme-accent leading-none">
                {percentage}%
              </div>
            </div>

            {/* Core Parent Modules Breakdown */}
            <div className="p-3 rounded-2xl theme-bg-app border-0 space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary truncate flex items-center gap-1">
                <LayersIcon className="w-3 h-3 theme-accent shrink-0" />
                <span>{t('stats.coreModules', 'Core Modules')}</span>
              </div>
              <div className="text-sm font-bold font-mono theme-text-primary leading-none">
                {formatNumber(coreModuleStats.parentEnabled)} / {formatNumber(coreModuleStats.parentCount || 11)}
              </div>
            </div>

            {/* Sub-Features Breakdown */}
            <div className="p-3 rounded-2xl theme-bg-app border-0 space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary truncate">
                {t('stats.subFeatures', 'Sub-Features')}
              </div>
              <div className="text-sm font-bold font-mono theme-text-secondary leading-none">
                {formatNumber(coreModuleStats.subEnabled)} / {formatNumber(coreModuleStats.subCount || 0)}
              </div>
            </div>
          </div>

          {/* Overall Deployment Progress Bar */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[10px] font-semibold theme-text-secondary">
              <span>{t('stats.overallDeployment', 'Overall Deployment')}</span>
              <span className="font-mono">{formatNumber(enabledCount)} / {formatNumber(totalCount)} ({percentage}%)</span>
            </div>
            <div className="h-1.5 w-full rounded-full theme-bg-sub overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-main)] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          {/* Core Modules Breakdown List (Requested by User) */}
          {coreModuleStats.categoryList.length > 0 && (
            <div className="space-y-2 pt-1 border-t theme-border">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider theme-text-secondary px-0.5">
                <span>{t('stats.coreModules', 'Core Modules')}</span>
                <span>Active / Total</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {coreModuleStats.categoryList.map((cat) => (
                  <div
                    key={cat.key}
                    className="p-2.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 border-0 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold theme-text-primary">
                      <span className="truncate pr-2">{cat.title}</span>
                      <span className="font-mono text-[11px] shrink-0 font-bold">
                        {formatNumber(cat.enabled)} / {formatNumber(cat.total)}
                      </span>
                    </div>

                    <div className="h-1 w-full rounded-full theme-bg-sub overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-main)] transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Notice */}
          <div className="pt-2 text-[10px] theme-text-secondary flex items-center justify-between border-t theme-border">
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
