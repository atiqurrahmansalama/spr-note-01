import React, { useState } from 'react';
import { PageContainer } from '@/components/layout';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import {
  BugIcon,
  PlusIcon,
  SearchIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  CloudIcon,
  HardDriveIcon,
} from '@/components/ui/Icons';
import { useTranslation } from '@/i18n/useTranslation';

export const BugReportingHubView: React.FC = () => {
  const { t, formatNumber } = useTranslation('navigation');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const severityOptions = [
    { value: 'ALL', label: t('allSeverities', 'All Severities') },
    { value: 'LOW', label: t('sevLow', 'Minor / Cosmetic') },
    { value: 'MEDIUM', label: t('sevMedium', 'Moderate Inconvenience') },
    { value: 'HIGH', label: t('sevHigh', 'Major Feature Malfunction') },
    { value: 'BLOCKER', label: t('sevBlocker', 'System Blocker') },
  ];

  return (
    <PageContainer className="pb-12 sm:pb-16 text-start">
      <div className="space-y-6">
        {/* Page Header Stack */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl theme-bg-surface flex items-center justify-center shadow-xs border-0 shrink-0">
              <BugIcon className="w-6 h-6 theme-accent" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight theme-text-primary">
                {t('bugReporting', 'Bug Reporting & Technical Feedback')}
              </h1>
              <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
                {t(
                  'bugReportingSubtitle',
                  'Report software glitches, sync delays, and technical feedback directly to engineering.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CustomButton
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={() => {}}
            >
              {t('reportAnomaly', 'Report System Anomaly')}
            </CustomButton>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('reportedBugs', 'Reported')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('triagedAnomalies', 'Awaiting triage')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('investigatingBugs', 'Investigating')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <ClockIcon className="w-3.5 h-3.5 theme-accent" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('reproducingIssue', 'Root-cause analysis')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('resolvedBugs', 'Resolved & Fixed')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('deployedInRelease', 'Patched in releases')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('systemHealth', 'System Health')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <CloudIcon className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary text-emerald-500">
              100%
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('servicesOperational', 'All systems online')}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="w-full md:w-72">
            <CustomInput
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e?.target ? e.target.value : String(e || ''))}
              placeholder={t('searchBugs', 'Search bug reports...')}
              icon={SearchIcon}
            />
          </div>

          <div className="w-48">
            <CustomSelect
              options={severityOptions}
              value={severityFilter}
              onChange={(val) => setSeverityFilter(val)}
              searchable={false}
            />
          </div>
        </div>

        {/* Foundational Diagnostic Card */}
        <div className="p-8 sm:p-12 rounded-3xl theme-bg-surface shadow-xs border-0 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl theme-bg-app flex items-center justify-center mx-auto shadow-xs border-0">
            <HardDriveIcon className="w-8 h-8 theme-text-secondary" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">
              {t('noBugsReported', 'No Bug Reports Filed')}
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              {t(
                'bugReportingFoundationDescription',
                'System diagnostics, error captures, and developer feedback reports will be tracked here. The automated client telemetry collects device, OS, and sync status seamlessly.'
              )}
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default BugReportingHubView;
