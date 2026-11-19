import React, { useState } from 'react';
import { PageContainer } from '@/components/layout';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import {
  HeadsetIcon,
  PlusIcon,
  SearchIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BuildingIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { useTranslation } from '@/i18n/useTranslation';

export const HelpdeskHubView: React.FC = () => {
  const { t, formatNumber } = useTranslation('navigation');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const categoryOptions = [
    { value: 'ALL', label: t('allCategories', 'All Categories') },
    { value: 'FACILITY', label: t('categoryFacility', 'Facility & Dormitory') },
    { value: 'ACADEMIC', label: t('categoryAcademic', 'Academic & Curriculum') },
    { value: 'GRIEVANCE', label: t('categoryGrievance', 'Discipline & Grievance') },
    { value: 'ADMINISTRATIVE', label: t('categoryAdmin', 'Administrative & Payroll') },
  ];

  const statusOptions = [
    { value: 'ALL', label: t('allStatuses', 'All Statuses') },
    { value: 'OPEN', label: t('statusOpen', 'Open') },
    { value: 'IN_PROGRESS', label: t('statusInProgress', 'In Progress') },
    { value: 'RESOLVED', label: t('statusResolved', 'Resolved') },
    { value: 'CLOSED', label: t('statusClosed', 'Closed') },
  ];

  return (
    <PageContainer className="pb-12 sm:pb-16 text-start">
      <div className="space-y-6">
        {/* Page Header Stack */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl theme-bg-surface flex items-center justify-center shadow-xs border-0 shrink-0">
              <HeadsetIcon className="w-6 h-6 theme-accent" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight theme-text-primary">
                {t('institutionalHelpdesk', 'Institutional Helpdesk & Issues')}
              </h1>
              <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
                {t(
                  'helpdeskSubtitle',
                  'Track, report, and resolve internal academy, dormitory, and departmental service tickets.'
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
              {t('newTicket', 'New Support Ticket')}
            </CustomButton>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('openTickets', 'Open Tickets')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('awaitingAction', 'Awaiting assignment')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('inProgressTickets', 'In Progress')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('activeResolution', 'Being resolved')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('resolvedTickets', 'Resolved')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('successfullyClosed', 'Resolved this month')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('urgentPriority', 'Urgent Priority')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium text-rose-500">
              {t('criticalAttention', 'Critical / Urgent')}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="w-full md:w-72">
            <CustomInput
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e?.target ? e.target.value : String(e || ''))}
              placeholder={t('searchTickets', 'Search by ticket #, subject...')}
              icon={SearchIcon}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <CustomSelect
                options={categoryOptions}
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                searchable={false}
              />
            </div>
            <div className="w-36">
              <CustomSelect
                options={statusOptions}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                searchable={false}
              />
            </div>
          </div>
        </div>

        {/* Foundational Queue Card */}
        <div className="p-8 sm:p-12 rounded-3xl theme-bg-surface shadow-xs border-0 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl theme-bg-app flex items-center justify-center mx-auto shadow-xs border-0">
            <BuildingIcon className="w-8 h-8 theme-text-secondary" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">
              {t('noTicketsFound', 'No Service Tickets Found')}
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              {t(
                'helpdeskFoundationDescription',
                'Institutional helpdesk and facility incident tracking is active for this campus. Staff and operators can submit tickets to request repairs, supplies, or official inquiries.'
              )}
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default HelpdeskHubView;

