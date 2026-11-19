/**
 * SPR Note — AcademicYearDrawerForm Component
 * =============================================
 * Enterprise Right Sidebar Drawer Form for creating and editing Academic Years & Terms.
 * Features:
 * - Dynamic calendar disabling for other academic sessions (zero duplicate dates)
 * - Container-responsive grids (@container & @[480px]:grid-cols-2)
 * - Smart interactive date conflict alert with neutral border, light red tint,
 *   and predictive slot resolution
 * - 4-language i18n localization (en, bn, ar, ur)
 * - Auto-distribution of terms and semesters across session duration
 * - Generous bottom padding (pb-10/pb-12) to ensure comfortable breathing room below action buttons
 */

import React, { useState, useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import {
  SessionsIcon,
  CalendarIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '@/components/layout';
import { academicYearsStore } from '@/utils/localStore';
import { getHijriDetails } from '@/utils/hijriUtils';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/context/ToastContext';
import { useFormAutoSave } from '@/hooks';
import { useTranslation } from '@/i18n';
import {
  AcademicYear,
  AcademicYearFormData,
  AcademicYearDrawerFormProps,
  TermSystemType,
  AcademicTerm,
} from './types';
import { useDateGuards, getNextDay } from './hooks/useDateGuards';
import { SmartDateConflictAlert, TermFormCard } from './components';

export default function AcademicYearDrawerForm({
  year = null,
  onSave,
  onCancel,
}: AcademicYearDrawerFormProps) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { t, formatNumber, formatDate } = useTranslation('academy');

  const termSystemOptions = useMemo(() => [
    { value: 'SEMESTER' as TermSystemType, label: t('semesterSystem', 'Semester System (2 Terms)') },
    { value: 'TRIMESTER' as TermSystemType, label: t('trimesterSystem', 'Trimester System (3 Terms)') },
    { value: 'QUARTER' as TermSystemType, label: t('quarterSystem', 'Quarter System (4 Terms)') },
    { value: 'ANNUAL' as TermSystemType, label: t('annualSession', 'Annual Session (1 Term)') },
    { value: 'CUSTOM' as TermSystemType, label: t('customTermSystem', 'Custom Term System') },
  ], [t]);

  // Load existing academic years for cross-session date guards
  const [storeVersion, setStoreVersion] = useState(0);

  const otherAcademicYears: AcademicYear[] = useMemo(() => {
    const all = (academicYearsStore.getAcademicYears(activeTenantId) as AcademicYear[]) || [];
    return all.filter((y) => !year || String(y.id) !== String(year.id));
  }, [activeTenantId, year, storeVersion]);

  // Date Guards Engine
  const {
    disabledRanges,
    getConflicts,
    getTermConflicts,
    getNextAvailableSlot,
    getSmartBounds,
    autoDistributeTerms,
  } = useDateGuards(otherAcademicYears);

  // Initialize form state
  const [formData, setFormData] = useState<AcademicYearFormData>(() => {
    if (year) {
      return {
        id: year.id,
        startDate: year.startDate || '',
        endDate: year.endDate || '',
        termSystem: year.termSystem || 'SEMESTER',
        terms: Array.isArray(year.terms)
          ? year.terms.map((t, idx) => ({
              id: t.id || `term_${Date.now()}_${idx}`,
              name: t.name || `Term ${idx + 1}`,
              startDate: t.startDate || '',
              endDate: t.endDate || '',
            }))
          : [],
      };
    }

    // New Academic Year suggestion
    const suggested = academicYearsStore.getSuggestedNextYear(activeTenantId);
    return {
      startDate: suggested.startDate,
      endDate: suggested.endDate,
      termSystem: (suggested.termSystem as TermSystemType) || 'SEMESTER',
      terms: (suggested.terms as AcademicTerm[]) || [],
    };
  });

  // Auto-Save / Draft Persistence
  const storageKey = year ? `acad_year_edit_${year.id}` : `acad_year_create_${activeTenantId || 'default'}`;
  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: true,
  });

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Dynamic Hijri & Gregorian representation calculated live from dates
  const computedMeta = useMemo(() => {
    if (!formData.startDate || !formData.endDate) {
      const cy = new Date().getFullYear();
      return { name: `${cy}-${cy + 1}`, hijri: '' };
    }

    try {
      const sYear = new Date(formData.startDate).getFullYear();
      const eYear = new Date(formData.endDate).getFullYear();
      const gregorianName = sYear === eYear ? String(sYear) : `${sYear}-${eYear}`;

      const sHijri = getHijriDetails(new Date(formData.startDate));
      const eHijri = getHijriDetails(new Date(formData.endDate));
      let hijriName = '';
      if (sHijri?.year && eHijri?.year) {
        hijriName =
          sHijri.year === eHijri.year
            ? `${sHijri.year} AH`
            : `${sHijri.year}–${eHijri.year} AH`;
      }

      return { name: gregorianName, hijri: hijriName };
    } catch {
      return { name: '', hijri: '' };
    }
  }, [formData.startDate, formData.endDate]);

  // Live real-time collision detection
  const sessionConflicts = useMemo(() => {
    return getConflicts(formData.startDate, formData.endDate);
  }, [getConflicts, formData.startDate, formData.endDate]);

  // Smart bounds for date inputs to avoid wrapping around other sessions
  const smartBounds = useMemo(() => {
    return getSmartBounds(formData.startDate, formData.endDate);
  }, [getSmartBounds, formData.startDate, formData.endDate]);

  // Next available open date slot suggestion
  const suggestedSlot = useMemo(() => {
    return getNextAvailableSlot();
  }, [getNextAvailableSlot]);


  // Term conflicts
  const termConflicts = useMemo(() => {
    return getTermConflicts(formData.terms, formData.startDate, formData.endDate);
  }, [getTermConflicts, formData.terms, formData.startDate, formData.endDate]);

  // Handle date change
  const handleDateChange = (field: 'startDate' | 'endDate', dateStr: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: dateStr };

      // Ensure 1st term start date and last term end date stay inside bounds
      if (field === 'startDate' && next.terms.length > 0) {
        if (next.terms[0].startDate < dateStr) {
          next.terms[0].startDate = dateStr;
        }
      }
      if (field === 'endDate' && next.terms.length > 0) {
        const lastIdx = next.terms.length - 1;
        if (next.terms[lastIdx].endDate > dateStr) {
          next.terms[lastIdx].endDate = dateStr;
        }
      }

      return next;
    });

    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: null, general: null }));
    }
  };

  // Term System Model Change
  const handleTermSystemChange = (newSystem: TermSystemType) => {
    const updatedTerms = autoDistributeTerms(
      formData.startDate,
      formData.endDate,
      newSystem,
      formData.terms
    );

    setFormData((prev) => ({
      ...prev,
      termSystem: newSystem,
      terms: updatedTerms,
    }));
  };

  // Auto-distribute terms action
  const handleAutoDistribute = () => {
    const updatedTerms = autoDistributeTerms(
      formData.startDate,
      formData.endDate,
      formData.termSystem,
      formData.terms
    );

    setFormData((prev) => ({
      ...prev,
      terms: updatedTerms,
    }));
  };

  // 1-Click Auto-Fix to Suggested Available Window
  const handleAutoFix = (slot: typeof suggestedSlot) => {
    const redistributedTerms = autoDistributeTerms(
      slot.startDate,
      slot.endDate,
      formData.termSystem,
      formData.terms
    );

    setFormData((prev) => ({
      ...prev,
      startDate: slot.startDate,
      endDate: slot.endDate,
      terms: redistributedTerms,
    }));

    setErrors({});
  };

  // Add individual custom term
  const handleAddTerm = () => {
    const idx = formData.terms.length + 1;
    const lastTerm = formData.terms[formData.terms.length - 1];
    const newStartDate = lastTerm?.endDate ? getNextDay(lastTerm.endDate) : formData.startDate || '';
    const newEndDate = formData.endDate || '';

    const newTerm: AcademicTerm = {
      id: `term_${Date.now()}_${idx}`,
      name: `Term ${idx}`,
      startDate: newStartDate <= newEndDate ? newStartDate : '',
      endDate: newEndDate,
    };

    setFormData((prev) => ({
      ...prev,
      terms: [...prev.terms, newTerm],
    }));
  };

  // Update specific term field
  const handleTermChange = (index: number, field: keyof AcademicTerm, value: string) => {
    setFormData((prev) => {
      const nextTerms = [...prev.terms];
      nextTerms[index] = {
        ...nextTerms[index],
        [field]: value,
      };
      return { ...prev, terms: nextTerms };
    });

    if (errors[`term_${index}`] || errors[`term_${index}_overlap`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`term_${index}`];
        delete copy[`term_${index}_overlap`];
        return copy;
      });
    }
  };

  // Remove specific term
  const handleRemoveTerm = (index: number) => {
    if (formData.terms.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  };

  // Form submission with strict validation
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) {
      newErrors.startDate = t('startDateRequired', 'Start date is required.');
    }
    if (!formData.endDate) {
      newErrors.endDate = t('endDateRequired', 'End date is required.');
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = t('endDateBeforeStart', 'End date cannot be before start date.');
    }

    // 1. Cross-Session Guard: Check for collisions
    if (sessionConflicts.length > 0) {
      newErrors.general = sessionConflicts[0].message;
    }

    // 2. Intra-Session Guard: Check terms validity
    formData.terms.forEach((tItem, i) => {
      if (!tItem.name?.trim()) {
        newErrors[`term_${i}`] = t('termNameRequired', 'Term name is required.');
      }
      if (!tItem.startDate || !tItem.endDate) {
        newErrors[`term_${i}`] = t('termDatesRequired', 'Start and End dates are required.');
      } else if (tItem.startDate > tItem.endDate) {
        newErrors[`term_${i}`] = t('endDateBeforeStart', 'End date cannot be before start date.');
      } else if (formData.startDate && formData.endDate) {
        if (tItem.startDate < formData.startDate || tItem.endDate > formData.endDate) {
          newErrors[`term_${i}`] = t('termDatesOutOfBounds', 'Dates must stay within academic session bounds.');
        }
      }
    });

    // 3. Inter-term overlaps
    termConflicts
      .filter((tc) => tc.conflictType === 'TERM_OVERLAP')
      .forEach((tc) => {
        newErrors[`term_${tc.termIndex}_overlap`] = tc.message;
      });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...formData,
      name: computedMeta.name || 'Academic Year',
    };

    clearDraft();
    if (onSave) {
      onSave(payload);
    }
  };

  const hasCriticalCollision = sessionConflicts.length > 0;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-10 sm:pb-12">
        {/* ─── 0. Live Interactive Smart Date Conflict Alert ────────── */}
        <SmartDateConflictAlert
          conflicts={sessionConflicts}
          suggestedSlot={suggestedSlot}
          onAutoFix={handleAutoFix}
        />

        {/* ─── 1. Auto-Generated Academic Year & Hijri Summary Banner ─── */}
        <div className="p-3.5 sm:p-4 rounded-2xl border theme-border theme-bg-sub/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl theme-bg-surface border theme-border flex items-center justify-center theme-accent shrink-0 shadow-xs">
              <SessionsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                {t('autoGeneratedAcademicYear', 'Academic Year (Auto-Generated)')}
              </div>
              <div className="text-base sm:text-lg font-bold theme-text-primary truncate">
                {computedMeta.name || t('academicSession', 'Academic Session')}
              </div>
            </div>
          </div>

          {computedMeta.hijri && (
            <div className="self-start sm:self-center shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl theme-bg-surface border theme-border theme-accent shadow-2xs">
                {t('hijri', 'Hijri')}: {computedMeta.hijri}
              </span>
            </div>
          )}
        </div>

        {/* ─── 2. Session Dates & Term System Model ─────────────────── */}
        <DrawerSection
          title={t('sessionDatesAndTermSystem', 'Session Dates & Term System')}
          icon={SessionsIcon}
          className="pt-1"
        >
          <div className="space-y-4">
            {/* Start Date & End Date in Responsive Container Grid */}
            <div className="@container">
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                <div>
                  <ReusableCalendar
                    label={t('startDate', 'Start Date')}
                    selectedDate={formData.startDate}
                    onSelectDate={(d) => handleDateChange('startDate', d)}
                    minDate={smartBounds.minStartDate}
                    maxDate={smartBounds.maxStartDate}
                    disabledRanges={disabledRanges}
                    placeholder={t('selectStartDatePlaceholder', 'Select Start Date...')}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <ReusableCalendar
                    label={t('endDate', 'End Date')}
                    selectedDate={formData.endDate}
                    onSelectDate={(d) => handleDateChange('endDate', d)}
                    minDate={smartBounds.minEndDate}
                    maxDate={smartBounds.maxEndDate}
                    disabledRanges={disabledRanges}
                    placeholder={t('selectEndDatePlaceholder', 'Select End Date...')}
                    alignRight
                  />
                  {errors.endDate && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Term System Selector */}
            <div className="w-full">
              <CustomSelect
                label={t('termSystemModel', 'Term System Model')}
                name="termSystem"
                value={formData.termSystem}
                onChange={(val) => handleTermSystemChange(val as TermSystemType)}
                options={termSystemOptions}
              />
            </div>
          </div>
        </DrawerSection>

        {/* ─── 3. Terms / Semesters Breakdown List with Guards ──────── */}
        <DrawerSection
          title={`${t('termsAndSemesters', 'Terms & Semesters')} (${formatNumber(formData.terms.length)})`}
          icon={CalendarIcon}
          headerRight={
            <div className="flex items-center gap-1.5">
              {formData.terms.length > 1 && (
                <CustomButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  icon={SparklesIcon}
                  onClick={handleAutoDistribute}
                  title="Auto distribute dates evenly"
                >
                  {t('distribute', 'Distribute')}
                </CustomButton>
              )}
              <CustomButton
                type="button"
                variant="soft"
                size="xs"
                icon={PlusIcon}
                onClick={handleAddTerm}
              >
                {t('addTerm', 'Add Term')}
              </CustomButton>
            </div>
          }
        >
          <div className="space-y-3 pt-1">
            {formData.terms.map((term, index) => {
              const termError = errors[`term_${index}`] || errors[`term_${index}_overlap`];
              const otherTermsRanges = formData.terms
                .filter((_, i) => i !== index && Boolean(_.startDate && _.endDate))
                .map((tItem) => ({ startDate: tItem.startDate, endDate: tItem.endDate }));

              return (
                <TermFormCard
                  key={term.id || index}
                  term={term}
                  index={index}
                  totalTerms={formData.terms.length}
                  yearStartDate={formData.startDate}
                  yearEndDate={formData.endDate}
                  disabledRanges={otherTermsRanges}
                  errorMessage={termError}
                  onChange={handleTermChange}
                  onRemove={handleRemoveTerm}
                />
              );
            })}
          </div>
        </DrawerSection>

        {/* ─── 4. Action Buttons with Dedicated Spacing Wrapper ─────── */}
        <div className="pt-4 pb-2">
          <DrawerFooter
            onSubmit={handleSubmit}
            onSave={handleSubmit}
            onCancel={onCancel}
            autoSaveStatus={autoSaveStatus}
            lastSavedAt={lastSavedAt}
            saveLabel={year ? t('updateAcademicYear', 'Update Academic Year') : t('saveAcademicYear', 'Save Academic Year')}
            saveIcon={SaveIcon}
            isSaveDisabled={hasCriticalCollision}
          />
        </div>
      </form>
    </DrawerContainer>
  );
}
