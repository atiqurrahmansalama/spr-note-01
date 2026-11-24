import React, { useMemo } from 'react';
import type { CalendarEvent } from '../../../types';
import { formatTime12, getEventColors, getEventDisplayType } from '../utils/calendarUtils';
import { getHijriDateString } from '../../../../../../utils/hijriUtils';
import { useTranslation } from '../../../../../../i18n';
import { ClockIcon, CalendarIcon } from '../../../../../../components/ui/Icons';

interface CalendarAgendaListViewProps {
  filteredEvents: CalendarEvent[];
  isHijriEnabled?: boolean;
  embeddedSurface?: boolean;
  activeTenantId?: string;
  selectedCategory?: string;
  onOpenEventDetail: (evt: CalendarEvent) => void;
}

export const CalendarAgendaListView: React.FC<CalendarAgendaListViewProps> = ({
  filteredEvents,
  isHijriEnabled = false,
  embeddedSurface = false,
  activeTenantId,
  selectedCategory,
  onOpenEventDetail,
}) => {
  const { t, formatNumber } = useTranslation('calendar');

  const workingHoursEvents = useMemo(
    () => filteredEvents.filter((evt) => evt.category === 'WORKING_HOURS'),
    [filteredEvents]
  );

  const academicEvents = useMemo(
    () => filteredEvents.filter((evt) => evt.category !== 'WORKING_HOURS'),
    [filteredEvents]
  );

  const isWorkingHoursOnly = selectedCategory === 'WORKING_HOURS';
  const isAcademicEventsOnly = selectedCategory === 'ACADEMIC_EVENT';
  const isAllOrAgenda = !isWorkingHoursOnly && !isAcademicEventsOnly;

  const renderEventRow = (evt: CalendarEvent) => {
    const style = getEventColors(evt, activeTenantId);
    const isAllDay = evt.isFullDay || !evt.startTime || !evt.endTime;

    return (
      <div
        key={evt.id}
        onClick={() => onOpenEventDetail(evt)}
        className="p-3.5 @sm:p-4 rounded-2xl border-0 theme-bg-tile hover:theme-bg-elevated/75 transition cursor-pointer flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2.5 @sm:gap-4 shadow-2xs"
      >
        <div className="flex items-start @sm:items-center gap-3 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 @sm:w-3 @sm:h-3 rounded-full shrink-0 mt-1 @sm:mt-0 ${style.dot}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs @sm:text-sm font-bold theme-text-primary truncate">{evt.title}</h4>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${style.bg} ${style.text}`}>
                {getEventDisplayType(evt, activeTenantId)}
              </span>
            </div>
            <p className="text-[11px] @sm:text-xs theme-text-secondary mt-0.5 truncate">
              {t('audience', 'Audience')}: <strong className="theme-text-primary font-medium">{evt.audience || 'ALL'}</strong>
              {evt.description && <span className="ml-1 opacity-80">({evt.description})</span>}
            </p>
          </div>
        </div>

        <div className="text-left @sm:text-right shrink-0 flex @sm:flex-col items-center @sm:items-end justify-between w-full @sm:w-auto pt-1 @sm:pt-0 border-0">
          {!isAllDay ? (
            <div className={`font-mono font-bold text-xs ${style.text}`}>
              {formatTime12(evt.startTime)} – {formatTime12(evt.endTime)}
            </div>
          ) : (
            <div className="text-xs font-semibold theme-text-secondary">{t('fullDay', 'Full Day')}</div>
          )}
          <div className="text-[10px] @sm:text-[11px] theme-text-secondary mt-0.5 font-mono flex items-center gap-1.5 flex-wrap">
            <span>{evt.repeats ? t('repeatsWeekly', 'Repeats weekly') : evt.startDate}</span>
            {isHijriEnabled && evt.startDate && !evt.repeats && (
              <span className="theme-accent font-semibold">• {getHijriDateString(evt.startDate)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`@container ${embeddedSurface ? 'p-0 pb-4' : 'p-3 @sm:p-4 pb-5 @sm:pb-6'} space-y-6`}>
      {filteredEvents.length === 0 ? (
        <div className="p-10 @sm:p-12 text-center text-xs theme-text-secondary border-0 rounded-2xl theme-bg-tile shadow-2xs">
          {selectedCategory === 'WORKING_HOURS'
            ? t('noWorkingHoursFound', 'No working hours or shifts found.')
            : selectedCategory === 'ACADEMIC_EVENT'
            ? t('noAcademicEventsFound', 'No academic events or milestones found.')
            : t('noEventsOrWorkingHours', 'No events or working hours matching the filter criteria.')}
        </div>
      ) : isWorkingHoursOnly ? (
        /* Working Hours Only View */
        <div className="space-y-2.5 @sm:space-y-3">
          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                <ClockIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  {t('workingHoursTitle', 'Working Hours & Shifts')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-tile theme-text-secondary shadow-2xs">
                  {formatNumber(workingHoursEvents.length)}
                </span>
              </div>
            </div>
          </div>
          {workingHoursEvents.map(renderEventRow)}
        </div>
      ) : isAcademicEventsOnly ? (
        /* Academic Events Only View */
        <div className="space-y-2.5 @sm:space-y-3">
          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  {t('academicEventsTitle', 'Academic Events & Milestones')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-tile theme-text-secondary shadow-2xs">
                  {formatNumber(academicEvents.length)}
                </span>
              </div>
            </div>
          </div>
          {academicEvents.map(renderEventRow)}
        </div>
      ) : (
        /* Agenda View: Separated into Working Hours & Academic Events Sub-Headers */
        <div className="space-y-6">
          {/* 1. Working Hours Section */}
          <div className="space-y-2.5 @sm:space-y-3">
            <div className="flex items-center justify-between px-1 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                  <ClockIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    {t('workingHoursTitle', 'Working Hours & Shifts')}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-tile theme-text-secondary shadow-2xs">
                    {formatNumber(workingHoursEvents.length)}
                  </span>
                </div>
              </div>
            </div>

            {workingHoursEvents.length === 0 ? (
              <div className="p-6 text-center text-xs theme-text-secondary border-0 rounded-2xl theme-bg-tile/70 shadow-2xs">
                {t('noWorkingHoursScheduled', 'No working hours or shifts scheduled.')}
              </div>
            ) : (
              workingHoursEvents.map(renderEventRow)
            )}
          </div>

          {/* 2. Academic Events Section */}
          <div className="space-y-2.5 @sm:space-y-3">
            <div className="flex items-center justify-between px-1 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    {t('academicEventsTitle', 'Academic Events & Milestones')}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-bg-tile theme-text-secondary shadow-2xs">
                    {formatNumber(academicEvents.length)}
                  </span>
                </div>
              </div>
            </div>

            {academicEvents.length === 0 ? (
              <div className="p-6 text-center text-xs theme-text-secondary border-0 rounded-2xl theme-bg-tile/70 shadow-2xs">
                {t('noAcademicEventsScheduled', 'No academic events or milestones scheduled.')}
              </div>
            ) : (
              academicEvents.map(renderEventRow)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CalendarAgendaListView);
