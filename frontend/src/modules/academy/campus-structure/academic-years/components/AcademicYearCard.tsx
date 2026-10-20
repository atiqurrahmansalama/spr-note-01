/**
 * SPR Note — AcademicYearCard Component
 * =======================================
 * Enterprise collapsible profile card displaying master academic session timeline,
 * status badges, Hijri representation, quick actions, and a line-by-line sessions/terms breakdown.
 * Powered by the reusable project CollapsibleCard.
 * Fully localized with 4-language i18n support.
 */

import React, { useMemo } from 'react';
import {
  SessionsIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronIcon,
  EditIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import ActionMenu, { ActionMenuItem } from '@/components/ui/ActionMenu';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import ProgressBar from '@/components/ui/ProgressBar';
import { AcademicYear, AcademicYearStatus, AcademicTerm } from '../types';
import { getAcademicYearStatus } from '@/utils/localStore';
import { getHijriDetails } from '@/utils/hijriUtils';
import { useTranslation } from '@/i18n';

export interface AcademicYearCardProps {
  year: AcademicYear;
  isGlobalActive: boolean;
  defaultExpanded?: boolean;
  onEdit: (year: AcademicYear) => void;
  onDelete: (id: string, name: string) => void;
  onSwitchSession: (year: AcademicYear) => void;
  onSetActive: (year: AcademicYear) => void;
}

export default function AcademicYearCard({
  year,
  isGlobalActive,
  defaultExpanded = false,
  onEdit,
  onDelete,
  onSwitchSession,
  onSetActive,
}: AcademicYearCardProps) {
  const { t, formatNumber, formatDate } = useTranslation('academy');

  const status: AcademicYearStatus = useMemo(
    () => getAcademicYearStatus(year.startDate, year.endDate),
    [year.startDate, year.endDate]
  );

  function calculateDurationDays(start: string, end: string): string {
    if (!start || !end) return '—';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? '—' : `${formatNumber(diffDays)} ${t('days', 'days')}`;
  }

  function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      return formatDate(new Date(dateStr), { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function getHijriYearSpan(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '';
    try {
      const sDetails = getHijriDetails(new Date(startStr));
      const eDetails = getHijriDetails(new Date(endStr));
      if (sDetails?.year && eDetails?.year) {
        if (sDetails.year === eDetails.year) {
          return `${formatNumber(sDetails.year)} AH`;
        }
        return `${formatNumber(sDetails.year)}–${formatNumber(eDetails.year)} AH`;
      }
      return '';
    } catch {
      return '';
    }
  }

  function getSessionProgress(startStr: string, endStr: string) {
    if (!startStr || !endStr) return null;
    const today = new Date();
    const start = new Date(startStr);
    const end = new Date(endStr);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= 0) return null;

    if (today < start) {
      const daysUntil = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        percentage: 0,
        statusText:
          t('startsInDays', `Starts in ${daysUntil} days`, { days: formatNumber(daysUntil) }) +
          ` (${formatDateDisplay(startStr)})`,
        isOngoing: false,
      };
    }

    if (today > end) {
      return {
        percentage: 100,
        statusText: t('completedOnDate', `Completed on ${formatDateDisplay(endStr)}`, {
          date: formatDateDisplay(endStr),
        }),
        isOngoing: false,
      };
    }

    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    return {
      percentage,
      statusText: `${formatNumber(elapsedDays)} / ${formatNumber(totalDays)} ${t(
        'days',
        'days'
      )} (${formatNumber(percentage)}%) • ${t('daysLeft', `${remainingDays} days left`, {
        days: formatNumber(remainingDays),
      })}`,
      isOngoing: true,
    };
  }

  function getTermStatus(term: AcademicTerm) {
    if (!term.startDate || !term.endDate) return 'UPCOMING';
    const today = new Date();
    const start = new Date(term.startDate);
    const end = new Date(term.endDate);
    if (today < start) return 'UPCOMING';
    if (today > end) return 'COMPLETED';
    return 'ONGOING';
  }

  function renderTermBadge(termStatus: string) {
    if (termStatus === 'ONGOING') {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse" />
          <span>{t('ongoing', 'Ongoing')}</span>
        </span>
      );
    }
    if (termStatus === 'UPCOMING') {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary shrink-0">
          {t('upcoming', 'Upcoming')}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-muted shrink-0">
        {t('completed', 'Completed')}
      </span>
    );
  }

  const hijriSpan = getHijriYearSpan(year.startDate, year.endDate);
  const progress = getSessionProgress(year.startDate, year.endDate);

  const termSystemLabel =
    year.termSystem === 'SEMESTER'
      ? t('semesterSystem', '2 Terms')
      : year.termSystem === 'TRIMESTER'
      ? t('trimesterSystem', '3 Terms')
      : year.termSystem === 'QUARTER'
      ? t('quarterSystem', '4 Terms')
      : year.termSystem === 'ANNUAL'
      ? t('annualSession', '1 Term')
      : `${formatNumber(year.terms?.length || 0)} ${t('termsAndSemesters', 'Terms')}`;

  const actionMenuItems: ActionMenuItem[] = [
    {
      label: t('changeActiveSession', 'Change Active Session'),
      icon: SessionsIcon,
      onClick: () => onSwitchSession(year),
    },
    ...(!isGlobalActive
      ? [
          {
            label: t('setAsActiveSession', 'Set as Active Session'),
            icon: CheckCircleIcon,
            onClick: () => onSetActive(year),
          },
        ]
      : []),
    {
      label: t('editAcademicYear', 'Edit Academic Year'),
      icon: EditIcon,
      onClick: () => onEdit(year),
    },
    {
      label: t('deleteAcademicYear', 'Delete Academic Year'),
      icon: TrashIcon,
      danger: true,
      onClick: () => onDelete(year.id, year.name),
    },
  ];

  const headerRight = <ActionMenu items={actionMenuItems} />;

  return (
    <CollapsibleCard
      collapsible={true}
      defaultExpanded={defaultExpanded}
      className={`@container ${isGlobalActive ? 'ring-1 ring-[var(--accent-main)]/30' : ''}`}
      renderHeader={(isExpanded, toggle) => (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          className="p-3.5 @[480px]:p-5 flex items-start @[480px]:items-center justify-between gap-3 @[480px]:gap-4 cursor-pointer hover:theme-bg-sub/30 select-none transition-colors"
        >
          {/* Left: Icon, Year Title, Status Badges, Subtitle */}
          <div className="flex items-start @[480px]:items-center gap-2.5 @[480px]:gap-3.5 min-w-0 flex-1">
            <div
              className={`w-9 h-9 @[480px]:w-11 @[480px]:h-11 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 @[480px]:mt-0 ${
                isGlobalActive
                  ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20 shadow-xs'
                  : 'theme-bg-sub border theme-border theme-text-secondary'
              }`}
            >
              <SessionsIcon className="w-4 h-4 @[480px]:w-5 @[480px]:h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-sm @[480px]:text-base md:text-lg font-bold theme-text-primary">
                    {year.name}
                  </h3>

                  {hijriSpan && (
                    <span className="text-xs @[480px]:text-sm font-sans theme-text-secondary font-normal shrink-0">
                      {hijriSpan}
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                {isGlobalActive ? (
                  <span className="text-[9.5px] @[480px]:text-[10px] font-mono font-bold px-2 @[480px]:px-2.5 py-0.5 rounded-full theme-bg-accent theme-accent-text shadow-2xs flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>{t('activeSession', 'Active Session')}</span>
                  </span>
                ) : status === 'ACTIVE' ? (
                  <span className="text-[9.5px] @[480px]:text-[10px] font-mono font-bold px-2 @[480px]:px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-accent">
                    {t('ongoing', 'Ongoing')}
                  </span>
                ) : status === 'UPCOMING' ? (
                  <span className="text-[9.5px] @[480px]:text-[10px] font-mono font-bold px-2 @[480px]:px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary">
                    {t('upcoming', 'Upcoming')}
                  </span>
                ) : (
                  <span className="text-[9.5px] @[480px]:text-[10px] font-mono font-bold px-2 @[480px]:px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-muted">
                    {t('pastSession', 'Past Session')}
                  </span>
                )}
              </div>

              <div className="text-[11px] @[480px]:text-xs font-mono theme-text-secondary mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap">
                <span className="flex items-center gap-1 shrink-0">
                  <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span>
                    {formatDateDisplay(year.startDate)} – {formatDateDisplay(year.endDate)}
                  </span>
                </span>
                <span className="opacity-40">•</span>
                <span className="font-semibold theme-text-primary shrink-0">{termSystemLabel}</span>
                <span className="opacity-40">•</span>
                <span className="shrink-0">{calculateDurationDays(year.startDate, year.endDate)}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions & Collapse Chevron (Vertical stack on narrow, horizontal on wide) */}
          <div className="flex flex-col @[480px]:flex-row items-center gap-1 @[480px]:gap-2 shrink-0 self-start @[480px]:self-center mt-0.5 @[480px]:mt-0">
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {headerRight}
            </div>

            <div
              className="w-7 h-7 @[480px]:w-8 @[480px]:h-8 rounded-lg flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors"
              title={isExpanded ? t('collapse', 'Collapse') : t('expand', 'Expand')}
              aria-label={isExpanded ? t('collapse', 'Collapse') : t('expand', 'Expand')}
            >
              <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5 @[480px]:w-4 @[480px]:h-4" />
            </div>
          </div>
        </div>
      )}
    >
      <div className="space-y-4 pt-3 @[480px]:pt-4">
        {/* ─── 1. Timeline Progress Bar (Powered by Reusable ProgressBar) ─── */}
        {progress && (
          <ProgressBar
            value={progress.percentage}
            label={progress.statusText}
            valueLabel={`${formatNumber(progress.percentage)}% ${t('elapsed', 'Elapsed')}`}
            size="md"
            variant="accent"
          />
        )}

        {/* ─── 2. Line-by-Line Sessions & Terms Breakdown (Zero redundant divider) ─── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                {t('termsAndSemesters', 'Sessions & Terms Breakdown')}
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary">
                {formatNumber(year.terms?.length || 0)}
              </span>
            </div>
          </div>

          {/* Line-by-Line Terms List */}
          {year.terms && year.terms.length > 0 ? (
            <div className="space-y-2">
              {year.terms.map((term, idx) => {
                const termStatus = getTermStatus(term);
                const termDisplayName =
                  term.name?.trim() ||
                  (year.termSystem === 'QUARTER'
                    ? `Quarter ${idx + 1}`
                    : year.termSystem === 'TRIMESTER'
                    ? `Term ${idx + 1}`
                    : year.termSystem === 'SEMESTER'
                    ? `Semester ${idx + 1}`
                    : `Term ${idx + 1}`);

                return (
                  <div
                    key={term.id || idx}
                    className="p-3 @[480px]:p-3.5 rounded-xl border theme-border theme-bg-sub/20 hover:theme-bg-sub/40 transition-colors text-xs font-mono"
                  >
                    {/* ─── Narrow container (< 640px / Mobile): Strictly 2 Lines ─── */}
                    <div className="flex flex-col gap-2 @[640px]:hidden">
                      {/* Line 1: Index + Term Name on Left | Status Badge on Right */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg theme-bg-surface border theme-border font-mono font-bold text-[11px] theme-accent flex items-center justify-center shrink-0 shadow-2xs">
                            {formatNumber(idx + 1)}
                          </span>
                          <span className="font-bold theme-text-primary text-xs truncate font-sans">
                            {termDisplayName}
                          </span>
                        </div>

                        <div className="shrink-0">
                          {renderTermBadge(termStatus)}
                        </div>
                      </div>

                      {/* Line 2: Date Range on Left | Duration on Right */}
                      <div className="flex items-center justify-between gap-2 min-w-0 pl-8">
                        <span className="text-[11px] font-mono theme-text-secondary flex items-center gap-1.5 shrink-0 opacity-85">
                          <CalendarIcon className="w-3 h-3 theme-accent shrink-0" />
                          <span>
                            {formatDateDisplay(term.startDate)} – {formatDateDisplay(term.endDate)}
                          </span>
                        </span>

                        <span className="text-[11px] font-mono theme-text-secondary font-medium shrink-0">
                          {calculateDurationDays(term.startDate, term.endDate)}
                        </span>
                      </div>
                    </div>

                    {/* ─── Wide container (>= 640px / Desktop): Strictly 1 Single Line ─── */}
                    <div className="hidden @[640px]:flex items-center justify-between gap-4 min-w-0">
                      {/* Left: Index + Term Name + Date Range */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                          <span className="w-6 h-6 rounded-lg theme-bg-surface border theme-border font-mono font-bold text-[11px] theme-accent flex items-center justify-center shrink-0 shadow-2xs">
                            {formatNumber(idx + 1)}
                          </span>
                          <span className="font-bold theme-text-primary text-sm truncate font-sans">
                            {termDisplayName}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono theme-text-secondary flex items-center gap-1.5 shrink-0 opacity-85">
                          <CalendarIcon className="w-3 h-3 theme-accent shrink-0" />
                          <span>
                            {formatDateDisplay(term.startDate)} – {formatDateDisplay(term.endDate)}
                          </span>
                        </span>
                      </div>

                      {/* Right: Duration + Status Badge */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-mono theme-text-secondary font-medium">
                          {calculateDurationDays(term.startDate, term.endDate)}
                        </span>

                        {renderTermBadge(termStatus)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl border theme-border border-dashed theme-bg-sub/10 text-center text-xs theme-text-secondary">
              {t('noTermsSubMessage', 'No semesters or terms have been configured for this academic year.')}
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
