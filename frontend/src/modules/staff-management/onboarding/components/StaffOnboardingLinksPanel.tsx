import React, { useCallback, useMemo, useState } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import DataViewToolbar from '@/components/ui/DataViewToolbar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  EditIcon,
  ExternalLinkIcon,
  PlusIcon,
  QrCodeIcon,
  SparklesIcon,
  TeacherIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import { useStaffTranslation } from '../../locales';

export type LinksViewMode = 'grid' | 'table';
export type LinksModeFilter = 'ALL' | 'QUICK' | 'FULL';

export interface StaffOnboardingLinksPanelProps {
  tokens: any[];
  loading: boolean;
  onCreateNew: () => void;
  onEditToken: (tokenItem: any) => void;
  onViewQr: (tokenItem: any) => void;
  onCopyLink: (token: string) => void;
  onToggleActive: (tokenItem: any) => void;
  onDeleteToken: (tokenItem: any) => void;
}

export const StaffOnboardingLinksPanel: React.FC<StaffOnboardingLinksPanelProps> = ({
  tokens,
  loading,
  onCreateNew,
  onEditToken,
  onViewQr,
  onCopyLink,
  onToggleActive,
  onDeleteToken,
}) => {
  const { t, formatDate, formatNumber } = useStaffTranslation();

  const [viewMode, setViewMode] = useState<LinksViewMode>('grid');
  const [modeFilter, setModeFilter] = useState<LinksModeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const modeFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: t('allModesFilter', 'All Modes') },
      { value: 'QUICK', label: t('quickModeBadge', 'Quick Onboarding') },
      { value: 'FULL', label: t('fullModeBadge', 'Full Wizard') },
    ],
    [t]
  );

  const getTokenStatus = (tokenItem: any) => {
    const isExpired = Boolean(tokenItem.expires_at && new Date(tokenItem.expires_at) < new Date());
    const isQuotaFull = Boolean(
      tokenItem.max_applications > 0 && tokenItem.applied_count >= tokenItem.max_applications
    );
    if (isExpired) {
      return {
        label: t('statusExpired', 'Expired'),
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
      };
    }
    if (isQuotaFull) {
      return {
        label: t('quotaFullStatus', 'Quota Full'),
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
      };
    }
    if (!tokenItem.is_active) {
      return {
        label: t('statusInactive', 'Inactive'),
        badgeClass: 'theme-bg-tile theme-text-secondary',
      };
    }
    return {
      label: t('statusActive', 'Active'),
      badgeClass: 'theme-bg-accent-soft theme-accent',
    };
  };

  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (tokens || []).filter((item) => {
      const normalizedMode = item.onboarding_mode === 'QUICK' ? 'QUICK' : 'FULL';
      if (modeFilter !== 'ALL' && normalizedMode !== modeFilter) return false;
      if (!q) return true;
      return [
        item.title,
        item.token,
        item.designation,
        item.staff_type,
        item.department_name,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [tokens, modeFilter, searchQuery]);

  const handleOpenPortal = (token: string) => {
    const url = `${window.location.origin}/staff-onboard?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const buildTokenActionItems = useCallback(
    (item: any) => [
      {
        label: t('openPublicLink', 'Open Portal'),
        icon: ExternalLinkIcon,
        onClick: () => handleOpenPortal(item.token),
      },
      {
        label: t('viewQrCode', 'View QR Code'),
        icon: QrCodeIcon,
        onClick: () => onViewQr(item),
      },
      {
        label: t('copyLink', 'Copy Link'),
        icon: CopyIcon,
        onClick: () => onCopyLink(item.token),
      },
      {
        label: t('editCampaign', 'Edit Campaign'),
        icon: EditIcon,
        onClick: () => onEditToken(item),
      },
      {
        label: item.is_active
          ? t('pauseLink', 'Pause')
          : t('activateLink', 'Activate'),
        icon: item.is_active ? ClockIcon : CheckIcon,
        onClick: () => onToggleActive(item),
      },
      {
        label: t('deleteCampaign', 'Delete Campaign'),
        icon: TrashIcon,
        variant: 'danger',
        divider: true,
        onClick: () => onDeleteToken(item),
      },
    ],
    [onCopyLink, onDeleteToken, onEditToken, onToggleActive, onViewQr, t]
  );

  const tableColumns: Column<any>[] = useMemo(
    () => [
      {
        key: 'serial',
        label: t('colSerial', 'SL'),
        width: 56,
        minWidth: 56,
        align: 'center',
        render: (_item, idx) => (
          <span className="text-xs font-mono font-semibold theme-text-secondary">
            {formatNumber((idx ?? 0) + 1)}
          </span>
        ),
      },
      {
        key: 'title',
        label: t('colCampaign', 'CAMPAIGN & TOKEN'),
        minWidth: 220,
        sortable: true,
        render: (item) => (
          <div className="min-w-0 space-y-1">
            <div className="font-bold text-xs sm:text-sm theme-text-primary truncate max-w-[240px]">
              {item.title}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono theme-text-secondary">{item.token}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyLink(item.token);
                }}
                title={t('copyLink', 'Copy Link')}
                className="p-1 rounded-md hover:theme-bg-elevated/60 theme-text-secondary hover:theme-accent transition cursor-pointer border-0"
              >
                <CopyIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        ),
      },
      {
        key: 'onboarding_mode',
        label: t('colFormMode', 'FORM MODE'),
        minWidth: 165,
        sortable: true,
        render: (item) => {
          const isQuick = item.onboarding_mode === 'QUICK';
          const IconComp = isQuick ? SparklesIcon : TeacherIcon;
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border-0 whitespace-nowrap ${
                isQuick
                  ? 'theme-bg-accent-soft theme-accent'
                  : 'theme-bg-tile theme-text-primary'
              }`}
            >
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isQuick
                  ? t('quickModeBadge', 'Quick Onboarding')
                  : t('fullModeBadge', 'Full Wizard')}
              </span>
            </span>
          );
        },
      },
      {
        key: 'designation',
        label: t('colRole', 'ROLE'),
        minWidth: 190,
        sortable: true,
        render: (item) => {
          const posts =
            Array.isArray(item.allowed_designations) && item.allowed_designations.length > 0
              ? item.allowed_designations.join(', ')
              : item.designation || t('openToAllRanks', 'Open to All Ranks');
          return (
            <div
              className="text-xs font-semibold theme-text-primary truncate max-w-[220px]"
              title={posts}
            >
              {posts}
            </div>
          );
        },
      },
      {
        key: 'applied_count',
        label: t('colQuota', 'APPLICATIONS'),
        minWidth: 125,
        align: 'center',
        sortable: true,
        render: (item) => (
          <span className="font-mono text-xs font-bold theme-text-primary whitespace-nowrap">
            {formatNumber(item.applied_count || 0)}
            {' / '}
            <span className="theme-text-secondary font-medium">
              {item.max_applications > 0
                ? formatNumber(item.max_applications)
                : t('quotaUnlimited', 'Unlimited')}
            </span>
          </span>
        ),
      },
      {
        key: 'expires_at',
        label: t('colExpires', 'EXPIRES'),
        minWidth: 120,
        sortable: true,
        render: (item) => (
          <span className="text-xs font-mono theme-text-secondary whitespace-nowrap">
            {item.expires_at ? formatDate(item.expires_at) : t('noExpiry', 'No Expiry')}
          </span>
        ),
      },
      {
        key: 'is_active',
        label: t('colStatus', 'STATUS'),
        minWidth: 105,
        align: 'center',
        sortable: true,
        render: (item) => {
          const status = getTokenStatus(item);
          return (
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border-0 whitespace-nowrap ${status.badgeClass}`}>
              {status.label}
            </span>
          );
        },
      },
      {
        key: 'actions',
        label: t('colActions', 'ACTIONS'),
        width: 80,
        minWidth: 80,
        align: 'right',
        render: (item) => (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <ActionMenu
              align="right"
              size="md"
              variant="ghost"
              items={buildTokenActionItems(item)}
            />
          </div>
        ),
      },
    ],
    [buildTokenActionItems, formatDate, formatNumber, onCopyLink, t]
  );

  if (loading) {
    return (
      <div className="p-12 text-center text-xs theme-text-secondary">
        {t('loadingCampaigns', 'Loading recruitment campaigns...')}
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="p-12 rounded-3xl theme-bg-surface text-center space-y-3 border-0 shadow-xs">
        <div className="w-12 h-12 rounded-2xl theme-bg-tile flex items-center justify-center mx-auto theme-text-secondary border-0">
          <QrCodeIcon className="w-6 h-6 theme-accent" />
        </div>
        <div>
          <h4 className="text-sm font-bold theme-text-primary">
            {t('noLinksTitle', 'No Recruitment Links Found')}
          </h4>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            {t(
              'noLinksDescription',
              'Generate a QR code or online link to allow prospective faculty members to submit their onboarding forms.'
            )}
          </p>
        </div>
        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={onCreateNew}
        >
          {t('createFirstLink', 'Create First Link')}
        </CustomButton>
      </div>
    );
  }

  return (
    <div className="space-y-4 @container animate-fade-in text-start">
      {/* Project Standard Borderless DataViewToolbar (Search + Mode Dropdown + Card/Table Toggle) */}
      <DataViewToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('searchCampaignsPlaceholder', 'Search links, role, token...')}
        searchVariant="app"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        tableLabel={t('tableView', 'Table View')}
        cardsLabel={t('cardGrid', 'Card Grid')}
        filterElement={
          <div className="w-full @[560px]:w-52 shrink-0">
            <CustomSelect
              value={modeFilter}
              onChange={(val: string) => setModeFilter((val || 'ALL') as LinksModeFilter)}
              options={modeFilterOptions}
              placeholder={t('allModesFilter', 'All Modes')}
            />
          </div>
        }
      />

      {/* Filtered Empty State */}
      {filteredTokens.length === 0 ? (
        <div className="p-8 @[540px]:p-10 rounded-3xl theme-bg-surface text-center text-xs theme-text-secondary border-0 shadow-xs">
          {t('noStaffFound', 'No recruitment campaigns match your filter.')}
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={filteredTokens}
          keyExtractor={(item: any) => item.id}
          compact={false}
        />
      ) : (
        <div className="grid grid-cols-1 @[560px]:grid-cols-2 @[920px]:grid-cols-3 gap-4 border-0">
          {filteredTokens.map((tokenItem) => {
            const status = getTokenStatus(tokenItem);
            const isQuick = tokenItem.onboarding_mode === 'QUICK';
            const ModeIcon = isQuick ? SparklesIcon : TeacherIcon;
            const roleSummary =
              Array.isArray(tokenItem.allowed_designations) && tokenItem.allowed_designations.length > 0
                ? tokenItem.allowed_designations.join(', ')
                : tokenItem.designation || t('openToAllRanks', 'Open to All Ranks');

            return (
              <div
                key={tokenItem.id}
                className="p-4 @[420px]:p-5 rounded-3xl theme-bg-surface shadow-xs space-y-4 hover:shadow-md transition-all border-0 flex flex-col justify-between min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  {/* Top Header: Form Mode, Status & 3-Dot ActionMenu */}
                  <div className="flex items-center justify-between gap-2 border-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold border-0 truncate ${
                        isQuick
                          ? 'theme-bg-accent-soft theme-accent'
                          : 'theme-bg-tile theme-text-primary'
                      }`}
                    >
                      <ModeIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {isQuick
                          ? t('quickModeBadge', 'Quick Onboarding')
                          : t('fullModeBadge', 'Full Wizard')}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border-0 ${status.badgeClass}`}>
                        {status.label}
                      </span>
                      <ActionMenu
                        align="right"
                        size="md"
                        variant="ghost"
                        items={buildTokenActionItems(tokenItem)}
                      />
                    </div>
                  </div>

                  {/* Campaign Title, Permitted Role & Token */}
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-bold theme-text-primary truncate">
                      {tokenItem.title}
                    </h4>
                    <p
                      className="text-xs theme-text-secondary truncate"
                      title={roleSummary}
                    >
                      {roleSummary}
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-mono theme-text-secondary truncate">
                        {tokenItem.token}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCopyLink(tokenItem.token)}
                        title={t('copyLink', 'Copy Link')}
                        className="p-1 rounded-md hover:theme-bg-elevated/60 theme-text-secondary hover:theme-accent transition cursor-pointer border-0 shrink-0"
                      >
                        <CopyIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Essential Metrics Row */}
                  <div className="p-3 rounded-2xl theme-bg-tile border-0 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
                        {t('applicationsCount', 'Applications')}
                      </span>
                      <span className="text-xs font-mono font-bold theme-text-primary">
                        {formatNumber(tokenItem.applied_count || 0)} /{' '}
                        {tokenItem.max_applications > 0
                          ? formatNumber(tokenItem.max_applications)
                          : t('quotaUnlimited', 'Unlimited')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
                        {t('expiresLabel', 'Expires')}
                      </span>
                      <span className="text-xs font-mono font-semibold theme-text-primary">
                        {tokenItem.expires_at ? formatDate(tokenItem.expires_at) : t('noExpiry', 'No Expiry')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffOnboardingLinksPanel;

