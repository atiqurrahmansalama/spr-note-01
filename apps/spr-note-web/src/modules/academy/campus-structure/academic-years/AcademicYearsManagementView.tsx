/**
 * SPR Note — AcademicYearsManagementView Component
 * ==================================================
 * High-level enterprise orchestrator for academic years.
 * Displays all academic years as collapsible profile cards,
 * with line-by-line sessions/terms revealed upon expansion.
 * Scoped under active Tenant ID to safeguard institution-level academic data.
 * Fully localized with 4-language i18n support.
 */

import React from 'react';
import { SessionsIcon, PlusIcon } from '@/components/ui/Icons';
import CustomButton from '@/components/ui/CustomButton';
import { useRightSidebar } from '@/context/RightSidebarContext';
import { AcademicYear, AcademicYearsManagementViewProps } from './types';
import { useAcademicYears } from './hooks/useAcademicYears';
import { AcademicYearCard } from './components';
import { useTranslation } from '@/i18n';

export default function AcademicYearsManagementView({
  isEmbedded = false,
  hideHeader = false,
  hideMetrics = false,
}: AcademicYearsManagementViewProps) {
  const { openDrawer } = useRightSidebar();
  const {
    academicYears,
    globalActiveYear,
    deleteAcademicYear,
    setAsActiveYear,
  } = useAcademicYears();

  const { t, formatNumber } = useTranslation('academy');

  // Open Drawer for Add/Edit
  const handleOpenAdd = () => {
    openDrawer('campus-action', { type: 'academic_years', mode: 'add' });
  };

  const handleOpenEdit = (year: AcademicYear) => {
    openDrawer('campus-action', { type: 'academic_years', mode: 'edit', yearId: year.id });
  };

  const handleSwitchSession = (year: AcademicYear) => {
    openDrawer('campus-action', { type: 'switch_session', yearId: year.id });
  };

  // Empty State: Zero Academic Years
  if (academicYears.length === 0) {
    return (
      <div className="p-12 text-center border theme-border rounded-2xl theme-bg-sub/30 flex flex-col items-center justify-center gap-3 animate-fade-in">
        <div className="p-3 rounded-2xl theme-bg-surface border theme-border theme-text-secondary opacity-60 shadow-xs">
          <SessionsIcon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold theme-text-primary">
            {t('noAcademicYearsFound', 'No Academic Years Found')}
          </h4>
          <p className="text-xs theme-text-secondary mt-0.5">
            {t(
              'noAcademicYearsSubMessage',
              'Configure an academic year to scope classes, admissions, routines, and exam schedules.'
            )}
          </p>
        </div>
        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={handleOpenAdd}
          className="mt-2"
        >
          {t('createAcademicYear', 'Create Academic Year')}
        </CustomButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-5 animate-fade-in">
      {/* ─── 0. Top Management Toolbar / Header ───────────────────────── */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary">
                {t('academicYears', 'Academic Years')}
              </h2>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-accent shadow-2xs">
                {formatNumber(academicYears.length)} {t('academicYears', 'Years')}
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'manageAcademicYearsDesc',
                'Manage discrete institutional academic calendars, session boundaries, and semester terms.'
              )}
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenAdd}
            >
              {t('createAcademicYear', 'Add Academic Year')}
            </CustomButton>
          </div>
        </div>
      )}

      {/* ─── 1. Collapsible Academic Year Cards Stack ─────────────────── */}
      <div className="space-y-4">
        {academicYears.map((ay) => {
          const isAct = String(globalActiveYear?.id) === String(ay.id);

          return (
            <AcademicYearCard
              key={ay.id}
              year={ay}
              isGlobalActive={isAct}
              defaultExpanded={false}
              onEdit={handleOpenEdit}
              onDelete={deleteAcademicYear}
              onSwitchSession={handleSwitchSession}
              onSetActive={setAsActiveYear}
            />
          );
        })}
      </div>
    </div>
  );
}
