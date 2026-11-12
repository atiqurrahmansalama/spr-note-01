import React, { useState, useMemo } from 'react';
import {
  CalendarIcon,
  TimerIcon,
  ClockIcon,
  EditIcon,
  TrashIcon,
} from '../../../../components/ui/Icons';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import { getEventColors, getEventDisplayType } from './MasterTimeCalendar';
import { calendarImpactScopesStore } from '../../../../utils/localStore';
import { useTenant } from '../../../../context/TenantContext';
import { DrawerContainer } from '../../../../components/layout';
import { useCalendarTranslation } from '../locales';
import type { CalendarEvent } from '../types';

function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = String(parts[1] || '00').padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface TimeScheduleDetailDrawerProps {
  event: CalendarEvent;
  currentDate?: string;
  initialDate?: string;
  onEdit?: () => void;
  onDelete?: (deleteInfo: any) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export const TimeScheduleDetailDrawer: React.FC<TimeScheduleDetailDrawerProps> = ({
  event,
  currentDate,
  initialDate,
  onEdit,
  onDelete,
  onClose,
  readOnly = false,
}) => {
  const { activeTenantId } = useTenant();
  const { t } = useCalendarTranslation();
  const effectiveDate = currentDate || initialDate || event?.startDate || new Date().toISOString().split('T')[0];

  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [deleteScope, setDeleteScope] = useState<string>('THIS_EVENT');

  const deleteScopeOptions = useMemo(() => [
    {
      value: 'THIS_EVENT',
      label: `This day only (${effectiveDate})`,
      description: 'Delete only this specific day occurrence. Past and future schedules will remain intact.',
    },
    {
      value: 'THIS_AND_FOLLOWING',
      label: 'This and following days',
      description: `Delete from ${effectiveDate} onwards. Preserves all past attendance and logs.`,
    },
    {
      value: 'ALL_EVENTS',
      label: 'All days in series',
      description: 'Delete the entire recurring schedule series completely.',
    },
  ], [effectiveDate]);

  const allScopes = useMemo(() => {
    return calendarImpactScopesStore.getScopes(activeTenantId);
  }, [activeTenantId]);

  if (!event) return null;

  const style = getEventColors(event, activeTenantId);
  const isWorkingHours = event.category === 'WORKING_HOURS';
  const isAllDay = event.isFullDay || !event.startTime || !event.endTime;
  const isRecurringOrMultiDay = Boolean(
    event.repeats || (event.endDate && event.endDate !== event.startDate)
  );

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-6 pt-2 pb-6 @container">
        {/* Top Hero Summary Surface */}
        <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface border-0 shadow-xs space-y-3.5">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${style.bg} border-0 shadow-xs`}>
              {isWorkingHours ? (
                <TimerIcon className={`w-5 h-5 ${style.text}`} />
              ) : (
                <CalendarIcon className={`w-5 h-5 ${style.text}`} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold theme-text-primary leading-snug break-words">
                  {event.title}
                </h3>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: style.hex }}
                />
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-semibold rounded-lg ${style.bg} ${style.text} border-0`}>
                  {getEventDisplayType(event, activeTenantId)}
                </span>
                <span className="inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-lg theme-bg-app border-0 theme-text-secondary">
                  {t('audience', 'Audience')}: {event.audience || 'ALL'}
                </span>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="p-3.5 rounded-2xl theme-bg-app border-0 text-xs theme-text-secondary leading-relaxed">
              {event.description}
            </div>
          )}
        </div>

        {/* Streamlined Timing & Metadata Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1">
            <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              {t('timingDetails', 'Schedule & Timing Details')}
            </h4>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5 text-xs">
            {/* Time */}
            <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
              <span className="theme-text-secondary font-medium">{t('sessionTiming', 'Session Timing')}</span>
              <span className="font-mono font-bold theme-text-primary">
                {isAllDay
                  ? t('fullDay', 'Full Day')
                  : `${formatTime12(event.startTime)} – ${formatTime12(event.endTime)}`}
              </span>
            </div>

            {/* Recurrence Pattern */}
            <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
              <span className="theme-text-secondary font-medium">{t('recurrencePattern', 'Recurrence Pattern')}</span>
              <span className="font-semibold theme-text-primary">
                {event.repeats
                  ? t('weeklyRecurring', 'Weekly Recurring')
                  : t('singleDate', 'Single Date')}
              </span>
            </div>

            {/* Effective Date */}
            {event.startDate && (
              <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
                <span className="theme-text-secondary font-medium">{t('effectiveDate', 'Effective Date')}</span>
                <span className="font-mono font-semibold theme-text-primary">{event.startDate}</span>
              </div>
            )}

            {/* Priority Rank */}
            <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
              <span className="theme-text-secondary font-medium">{t('precedencePriority', 'Precedence Priority')}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent border-0">
                #{event.priorityRank || (event as any).rank || 1}
              </span>
            </div>

            {/* Timezone */}
            {event.timezone && (
              <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs @[480px]:col-span-2">
                <span className="theme-text-secondary font-medium">{t('timezone', 'Timezone')}</span>
                <span className="font-mono text-xs theme-text-secondary">{event.timezone}</span>
              </div>
            )}
          </div>

          {/* Active Days */}
          {event.repeats && Array.isArray(event.repeatDays) && event.repeatDays.length > 0 && (
            <div className="p-3.5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-2 text-xs">
              <span className="theme-text-secondary font-medium block">{t('activeDays', 'Active Days')}</span>
              <div className="flex flex-wrap gap-1.5">
                {event.repeatDays.map((d: number) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold theme-bg-accent-soft theme-accent border-0"
                  >
                    {WEEKDAY_NAMES[d] || `Day ${d}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active System Impacts */}
          {Array.isArray(event.impacts) && event.impacts.length > 0 && (
            <div className="p-3.5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-2 text-xs">
              <span className="theme-text-secondary font-medium block">{t('impacts', 'System Impacts')}</span>
              <div className="flex flex-wrap gap-1.5">
                {event.impacts.map((impactId: string) => {
                  const matched = allScopes.find((i: any) => i.id === impactId || i.code === impactId);
                  return (
                    <span
                      key={impactId}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold theme-bg-app border-0 theme-text-primary flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full theme-bg-accent shrink-0" />
                      <span>{matched?.name || matched?.badge || impactId}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Inline Delete Confirmation Block with CustomSelect Scope */}
        {!readOnly && isConfirmingDelete ? (
          <div className="p-4 rounded-3xl bg-rose-500/10 dark:bg-rose-950/30 border-0 space-y-3.5 animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <TrashIcon className="w-4 h-4 theme-danger shrink-0" />
              <h4 className="text-xs font-bold theme-text-primary">
                {t('confirmDeletion', 'Confirm Schedule Deletion')}
              </h4>
            </div>

            {isRecurringOrMultiDay ? (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold theme-text-secondary">
                  {t('applyDeletionTo', 'Apply Deletion To')}
                </label>
                <CustomSelect
                  value={deleteScope}
                  onChange={(val: any) => setDeleteScope(String(val))}
                  options={deleteScopeOptions}
                  placeholder={t('applyDeletionTo', 'Select delete scope...')}
                  showDescription={true}
                  direction="up"
                />
              </div>
            ) : (
              <p className="text-xs theme-text-secondary leading-relaxed">
                {t('confirmDeleteSingle', 'Are you sure you want to permanently delete this item?')} ({event.title})
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-0">
              <CustomButton
                type="button"
                variant="surface"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
              >
                {t('cancel', 'Cancel')}
              </CustomButton>
              <CustomButton
                type="button"
                variant="danger-solid"
                size="sm"
                icon={TrashIcon}
                onClick={() => {
                  if (onDelete) {
                    onDelete({
                      id: event.id,
                      deleteScope: isRecurringOrMultiDay ? deleteScope : 'ALL_EVENTS',
                      targetDate: effectiveDate,
                    });
                  }
                }}
              >
                {t('confirmDeleteBtn', 'Confirm Delete')}
              </CustomButton>
            </div>
          </div>
        ) : (
          /* Action Buttons (Read-Only shows only Close button) */
          <div className={`pt-2 border-0 flex items-center ${readOnly || (!onEdit && !onDelete) ? 'justify-end' : 'justify-between'} gap-2.5 flex-wrap`}>
            {!readOnly && onDelete && (
              <CustomButton
                type="button"
                variant="danger"
                size="md"
                icon={TrashIcon}
                onClick={() => setIsConfirmingDelete(true)}
              >
                {t('deleteBtn', 'Delete')}
              </CustomButton>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {onClose && (
                <CustomButton
                  type="button"
                  variant="surface"
                  size="md"
                  onClick={onClose}
                >
                  {t('close', 'Close')}
                </CustomButton>
              )}
              {!readOnly && onEdit && (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="md"
                  icon={EditIcon}
                  onClick={onEdit}
                >
                  {t('editScheduleBtn', 'Edit Schedule')}
                </CustomButton>
              )}
            </div>
          </div>
        )}
      </div>
    </DrawerContainer>
  );
};

export default TimeScheduleDetailDrawer;

