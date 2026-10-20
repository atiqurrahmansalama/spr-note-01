/**
 * SPR Note — AcademicSessionSwitcherDrawer Component
 * ====================================================
 * Enterprise Right Sidebar Drawer to switch system-wide Active Academic Year
 * and Active Semester / Term.
 * Features strict types, container responsiveness, bottom spacing,
 * and complete 4-language i18n localization.
 */

import React, { useState, useMemo } from 'react';
import {
  SessionsIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import CustomSelect, { SelectOption } from '@/components/ui/CustomSelect';
import { DrawerContainer, DrawerSection, DrawerFooter } from '@/components/layout';
import { useAcademicSession } from '@/context/AcademicSessionContext';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/context/ToastContext';
import { academicYearsStore, getAcademicYearStatus } from '@/utils/localStore';
import { AcademicYear, AcademicSessionSwitcherDrawerProps } from './types';
import { useTranslation } from '@/i18n';

export default function AcademicSessionSwitcherDrawer({
  onSaved,
  onCancel,
}: AcademicSessionSwitcherDrawerProps) {
  const { activeTenantId } = useTenant();
  const {
    activeYear: globalActiveYear,
    activeSemester: globalActiveSemester,
    setActiveYear,
    setActiveSemester,
  } = useAcademicSession();
  const { showToast } = useToast();
  const { t, formatNumber, formatDate } = useTranslation('academy');

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

  const academicYears = useMemo<AcademicYear[]>(() => {
    return (academicYearsStore.getAcademicYears(activeTenantId) as AcademicYear[]) || [];
  }, [activeTenantId]);

  // Selected Year ID state
  const [selectedYearId, setSelectedYearId] = useState<string>(() => {
    return globalActiveYear ? String(globalActiveYear.id) : (academicYears[0] ? String(academicYears[0].id) : '');
  });

  const selectedYear = useMemo<AcademicYear | null>(() => {
    return academicYears.find((y) => String(y.id) === String(selectedYearId)) || academicYears[0] || null;
  }, [academicYears, selectedYearId]);

  // Selected Semester ID state
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(() => {
    if (globalActiveSemester && selectedYear) {
      const match = selectedYear.terms?.find((t) => String(t.id) === String(globalActiveSemester.id));
      if (match) return String(match.id);
    }
    return selectedYear?.terms?.[0] ? String(selectedYear.terms[0].id) : '';
  });

  const selectedTerm = useMemo(() => {
    if (!selectedYear || !selectedYear.terms) return null;
    return selectedYear.terms.find((t) => String(t.id) === String(selectedSemesterId)) || selectedYear.terms[0] || null;
  }, [selectedYear, selectedSemesterId]);

  // Year options with badges
  const yearOptions: SelectOption[] = useMemo(() => {
    return academicYears.map((y) => {
      const status = getAcademicYearStatus(y.startDate, y.endDate);
      const isCurrentActive = String(y.id) === String(globalActiveYear?.id);
      return {
        value: String(y.id),
        label: y.name,
        badge: isCurrentActive
          ? t('activeSession', 'Active Session')
          : status === 'ACTIVE'
          ? t('ongoing', 'Ongoing')
          : status === 'UPCOMING'
          ? t('upcoming', 'Upcoming')
          : t('pastSession', 'Past Session'),
      };
    });
  }, [academicYears, globalActiveYear, t]);

  // Term options for selected year
  const termOptions: SelectOption[] = useMemo(() => {
    if (!selectedYear || !selectedYear.terms) return [];
    return selectedYear.terms.map((tItem) => {
      const isCurrentActiveTerm =
        String(globalActiveYear?.id) === String(selectedYear.id) &&
        String(globalActiveSemester?.id) === String(tItem.id);
      return {
        value: String(tItem.id),
        label: `${tItem.name} (${formatDateDisplay(tItem.startDate)} – ${formatDateDisplay(tItem.endDate)})`,
        badge: isCurrentActiveTerm ? t('activeSemesterTerm', 'Active Term') : undefined,
      };
    });
  }, [selectedYear, globalActiveYear, globalActiveSemester, t]);

  // Handle Year Change
  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    const target = academicYears.find((y) => String(y.id) === String(yearId));
    if (target && target.terms && target.terms.length > 0) {
      setSelectedSemesterId(String(target.terms[0].id));
    } else {
      setSelectedSemesterId('');
    }
  };

  // Submit Active Session Switch
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedYear) {
      showToast(t('selectAcademicYear', 'Please select a valid academic year.'), 'error');
      return;
    }

    setActiveYear(selectedYear);
    if (selectedTerm) {
      setActiveSemester(selectedTerm);
    }

    showToast(
      t(
        'setActiveSuccess',
        `Active academic session switched to "${selectedYear.name}" ${selectedTerm ? `(${selectedTerm.name})` : ''}`,
        { name: selectedYear.name }
      ),
      'success'
    );
    if (onSaved) onSaved();
  };

  const selectedYearStatus = selectedYear ? getAcademicYearStatus(selectedYear.startDate, selectedYear.endDate) : 'UPCOMING';

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-10 sm:pb-12">
        {/* Section 1: Academic Year Selection */}
        <DrawerSection
          title={t('activeAcademicYear', 'Active Academic Year')}
          icon={SessionsIcon}
          subtitle={t(
            'chooseMasterSessionDesc',
            'Choose the master academic calendar session for this academy'
          )}
          className="pt-1"
        >
          <div className="space-y-4">
            <CustomSelect
              label={t('selectAcademicYear', 'Select Academic Year')}
              value={selectedYearId}
              onChange={handleYearChange}
              options={yearOptions}
              placeholder={t('chooseAcademicYearPlaceholder', 'Choose Academic Year...')}
              icon={SessionsIcon}
              required
            />

            {selectedYear && (
              <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="theme-text-secondary font-medium">
                    {t('sessionDates', 'Session Dates:')}
                  </span>
                  <span className="font-mono font-bold theme-text-primary">
                    {formatDateDisplay(selectedYear.startDate)} – {formatDateDisplay(selectedYear.endDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="theme-text-secondary font-medium">
                    {t('calendarStatus', 'Calendar Status:')}
                  </span>
                  <span className="font-mono font-bold theme-accent">
                    {selectedYearStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="theme-text-secondary font-medium">
                    {t('totalTerms', 'Total Terms:')}
                  </span>
                  <span className="font-mono font-bold theme-text-primary">
                    {t('termsConfigured', `${selectedYear.terms?.length || 0} Terms configured`, {
                      count: formatNumber(selectedYear.terms?.length || 0),
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Section 2: Active Semester / Term Selection */}
        {selectedYear && selectedYear.terms && selectedYear.terms.length > 0 && (
          <DrawerSection
            title={t('activeSemesterTerm', 'Active Semester / Term')}
            icon={CalendarIcon}
            subtitle={t(
              'selectActiveSemesterDesc',
              'Select the active semester to scope class routines, attendance, and mark sheets'
            )}
          >
            <div className="space-y-4">
              <CustomSelect
                label={t('selectSemesterTerm', 'Select Semester / Term')}
                value={selectedSemesterId}
                onChange={(val) => setSelectedSemesterId(val)}
                options={termOptions}
                placeholder={t('chooseSemesterPlaceholder', 'Choose Semester...')}
                icon={CalendarIcon}
                required
              />

              {selectedTerm && (
                <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="theme-text-secondary font-medium">
                      {t('termPeriod', 'Term Period:')}
                    </span>
                    <span className="font-mono font-bold theme-text-primary">
                      {formatDateDisplay(selectedTerm.startDate)} – {formatDateDisplay(selectedTerm.endDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="theme-text-secondary font-medium">
                      {t('termSequence', 'Term Sequence:')}
                    </span>
                    <span className="font-mono font-bold theme-accent">
                      {selectedTerm.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </DrawerSection>
        )}

        {/* Global Context Notice */}
        <div className="p-3.5 rounded-2xl theme-bg-sub/60 border theme-border text-xs flex items-start gap-2.5">
          <ClockIcon className="w-4 h-4 theme-accent shrink-0 mt-0.5" />
          <div className="theme-text-secondary leading-relaxed">
            {t(
              'switchSessionNotice',
              'Changing the active session immediately realigns all module dashboards, class schedules, exam cards, and student attendance logs to this selected academic calendar.'
            )}
          </div>
        </div>

        {/* Action Buttons with Bottom Padding */}
        <div className="pt-4 pb-2">
          <DrawerFooter
            onSubmit={handleSubmit}
            onSave={handleSubmit}
            onCancel={onCancel}
            saveLabel={t('switchActiveSession', 'Switch Active Session')}
            saveIcon={CheckCircleIcon}
          />
        </div>
      </form>
    </DrawerContainer>
  );
}
