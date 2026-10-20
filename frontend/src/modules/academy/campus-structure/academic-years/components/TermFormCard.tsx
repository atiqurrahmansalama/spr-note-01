/**
 * SPR Note — TermFormCard Component
 * ===================================
 * Container-responsive single term editor card inside the Academic Year drawer.
 * Guarantees strict date boundaries against the parent academic year.
 * Fully localized with 4-language i18n support.
 */

import React from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import { TrashIcon, AlertCircleIcon } from '@/components/ui/Icons';
import { AcademicTerm } from '../types';
import { useTranslation } from '@/i18n';

export interface TermFormCardProps {
  term: AcademicTerm;
  index: number;
  totalTerms: number;
  yearStartDate: string;
  yearEndDate: string;
  disabledRanges?: { startDate: string; endDate: string }[];
  errorMessage?: string | null;
  onChange: (index: number, field: keyof AcademicTerm, value: string) => void;
  onRemove: (index: number) => void;
}

export default function TermFormCard({
  term,
  index,
  totalTerms,
  yearStartDate,
  yearEndDate,
  disabledRanges = [],
  errorMessage,
  onChange,
  onRemove,
}: TermFormCardProps) {
  const { t, formatNumber } = useTranslation('academy');

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border ${
        errorMessage
          ? 'border-rose-500/50 bg-rose-500/[0.02]'
          : 'theme-border theme-bg-surface'
      } space-y-3 relative group shadow-2xs transition-all`}
    >
      {/* Header: Term Tag + Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-bold theme-accent px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border">
          {t('termName', 'Term')} #{formatNumber(index + 1)}
        </span>

        {totalTerms > 1 && (
          <CustomButton
            type="button"
            variant="ghost"
            size="icon-xs"
            icon={TrashIcon}
            onClick={() => onRemove(index)}
            title={t('removeTerm', 'Remove Term')}
          />
        )}
      </div>

      {/* Row 1: Term Name */}
      <div className="w-full">
        <CustomInput
          label={t('termName', 'Term Name')}
          value={term.name}
          onChange={(val) => onChange(index, 'name', val)}
          placeholder="e.g. 1st Semester / Mid-Term"
          required
        />
      </div>

      {/* Row 2: Start Date & End Date (Container Query Responsive Grid) */}
      <div className="@container">
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
          <div className="w-full">
            <ReusableCalendar
              label={t('startDate', 'Start Date')}
              selectedDate={term.startDate}
              onSelectDate={(d) => onChange(index, 'startDate', d)}
              minDate={yearStartDate || undefined}
              maxDate={term.endDate || yearEndDate || undefined}
              disabledRanges={disabledRanges}
              placeholder={t('selectStartDatePlaceholder', 'Start Date...')}
            />
          </div>

          <div className="w-full">
            <ReusableCalendar
              label={t('endDate', 'End Date')}
              selectedDate={term.endDate}
              onSelectDate={(d) => onChange(index, 'endDate', d)}
              minDate={term.startDate || yearStartDate || undefined}
              maxDate={yearEndDate || undefined}
              disabledRanges={disabledRanges}
              placeholder={t('selectEndDatePlaceholder', 'End Date...')}
              alignRight
            />
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <p className="text-xs text-rose-500 font-medium pt-1 flex items-center gap-1.5 animate-fade-in">
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
