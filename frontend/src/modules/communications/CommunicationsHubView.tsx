import React, { useState } from 'react';
import { PageContainer } from '@/components/layout';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import {
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  MailIcon,
  BellIcon,
  UsersIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import { useTranslation } from '@/i18n/useTranslation';

export const CommunicationsHubView: React.FC = () => {
  const { t, formatNumber } = useTranslation('navigation');
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('ALL');

  const audienceOptions = [
    { value: 'ALL', label: t('allAudiences', 'All Audiences') },
    { value: 'TEACHERS', label: t('teachersOnly', 'Teaching Faculty') },
    { value: 'STAFF', label: t('staffOnly', 'All Staff & Faculty') },
    { value: 'STUDENTS', label: t('studentsGuardians', 'Students & Guardians') },
    { value: 'ADMINS', label: t('adminsOnly', 'Administrative Leadership') },
  ];

  return (
    <PageContainer className="pb-12 sm:pb-16 text-start">
      <div className="space-y-6">
        {/* Page Header Stack */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl theme-bg-surface flex items-center justify-center shadow-xs border-0 shrink-0">
              <MessageSquareIcon className="w-6 h-6 theme-accent" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight theme-text-primary">
                {t('communications', 'Communications')}
              </h1>
              <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
                {t(
                  'communicationsSubtitle',
                  'Official notices, administrative memos, and structured inquiry threads.'
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
              {t('newMemo', 'New Institutional Memo')}
            </CustomButton>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('activeMemos', 'Active Memos')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <BellIcon className="w-3.5 h-3.5 theme-accent" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('pinnedNotices', 'Pinned announcements')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('directThreads', 'Direct Threads')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <MailIcon className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('oneToOneInquiries', 'Staff & faculty dialogs')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('targetedAudiences', 'Audiences')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <UsersIcon className="w-3.5 h-3.5 text-purple-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(5)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('recipientGroups', 'Departmental cohorts')}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold theme-text-secondary">
              <span>{t('archivedMemos', 'Archived')}</span>
              <div className="w-7 h-7 rounded-xl theme-bg-app flex items-center justify-center">
                <ClockIcon className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black theme-text-primary">
              {formatNumber(0)}
            </div>
            <span className="text-[11px] font-medium theme-text-secondary">
              {t('pastCommunications', 'Historic records')}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-3xl theme-bg-surface shadow-xs border-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="w-full md:w-72">
            <CustomInput
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e?.target ? e.target.value : String(e || ''))}
              placeholder={t('searchCommunications', 'Search memos & notices...')}
              icon={SearchIcon}
            />
          </div>

          <div className="w-48">
            <CustomSelect
              options={audienceOptions}
              value={audienceFilter}
              onChange={(val) => setAudienceFilter(val)}
              searchable={false}
            />
          </div>
        </div>

        {/* Foundational Feed Card */}
        <div className="p-8 sm:p-12 rounded-3xl theme-bg-surface shadow-xs border-0 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl theme-bg-app flex items-center justify-center mx-auto shadow-xs border-0">
            <MailIcon className="w-8 h-8 theme-text-secondary" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold theme-text-primary">
              {t('noMemosFound', 'No Communications Found')}
            </h3>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              {t(
                'communicationsFoundationDescription',
                'Official in-app communications, administrative memos, and department-wide notices will appear here once published.'
              )}
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default CommunicationsHubView;
