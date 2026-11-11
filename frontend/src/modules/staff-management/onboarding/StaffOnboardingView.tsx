import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AdmissionIcon,
  CopyIcon,
  PlusIcon,
  QrCodeIcon,
  SparklesIcon,
  TeacherIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import PageHeader from '@/components/ui/PageHeader';
import TabSwitcher from '@/components/ui/TabSwitcher';
import CustomButton from '@/components/ui/CustomButton';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/context/ToastContext';
import {
  deleteStaffOnboardingToken,
  getStaffOnboardingTokens,
  toggleStaffOnboardingTokenActive,
} from '@/api/staffOnboarding';
import {
  QuickStaffOnboardingForm,
  StaffInviteModal,
  StaffOnboardingSuccess,
  StaffOnboardingWizard,
  StaffQRCodeCardModal,
} from './';
import { useStaffTranslation } from '../locales';
import type { StaffOnboardingPayload } from '../types';

type StaffOnboardingTabId = 'quick' | 'direct' | 'online_qr';

export const StaffOnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useStaffTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawUrlTab = searchParams.get('tab');
  const activeTab: StaffOnboardingTabId = useMemo(() => {
    if (rawUrlTab === 'online_qr') return 'online_qr';
    if (rawUrlTab === 'direct' || rawUrlTab === 'wizard') return 'direct';
    return 'quick';
  }, [rawUrlTab]);

  // Shared draft state seamlessly preserved when switching between Quick & Full Wizard tabs
  const [sharedDraft, setSharedDraft] = useState<Partial<StaffOnboardingPayload>>({});
  const [onboardedStaff, setOnboardedStaff] = useState<any>(null);

  // QR Tokens State
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTokenForEdit, setSelectedTokenForEdit] = useState<any>(null);
  const [selectedTokenForQR, setSelectedTokenForQR] = useState<any>(null);

  const tabsList = useMemo(
    () => [
      {
        id: 'quick',
        label: t('quickOnboardingTab', 'Quick Onboarding'),
        icon: SparklesIcon,
      },
      {
        id: 'direct',
        label: t('directOnboardingTab', 'Full Onboarding Wizard'),
        icon: TeacherIcon,
      },
      {
        id: 'online_qr',
        label: t('onlineQrTab', 'Online QR & Link Onboarding'),
        icon: QrCodeIcon,
      },
    ],
    [t]
  );

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try {
      const data = await getStaffOnboardingTokens();
      setTokens(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load staff onboarding tokens', err);
    } finally {
      setLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'online_qr') {
      loadTokens();
    }
  }, [activeTab, loadTokens]);

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      setOnboardedStaff(null);
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  };

  const handleToggleActive = async (tokenItem: any) => {
    try {
      const res = await toggleStaffOnboardingTokenActive(tokenItem.id);
      showToast(
        res.message || t('statusUpdatedToast', 'Status updated successfully'),
        'success'
      );
      loadTokens();
    } catch (err: any) {
      showToast(
        err?.message || t('failedUpdateStatusToast', 'Failed to update token status'),
        'error'
      );
    }
  };

  const handleDeleteToken = async (tokenItem: any) => {
    const confirmMsg = t(
      'confirmDeleteToken',
      'Are you sure you want to delete the onboarding link "{{title}}"?',
      { title: tokenItem.title }
    );
    if (!window.confirm(confirmMsg)) {
      return;
    }
    try {
      await deleteStaffOnboardingToken(tokenItem.id);
      showToast(t('tokenDeletedToast', 'Staff onboarding campaign deleted'), 'success');
      loadTokens();
    } catch (err: any) {
      showToast(
        err?.message || t('failedDeleteTokenToast', 'Failed to delete token'),
        'error'
      );
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/staff-onboard?token=${token}`;
    navigator.clipboard.writeText(url);
    showToast(t('linkCopiedToast', 'Onboarding link copied to clipboard!'), 'success');
  };

  const handleOnboardingCompleted = useCallback((result: any) => {
    setOnboardedStaff(result);
    setSharedDraft({});
  }, []);

  const handleResetSuccess = useCallback(() => {
    setOnboardedStaff(null);
    setSharedDraft({});
  }, []);

  return (
    <PageContainer>
      {/* 1. Top Page Header */}
      <PageHeader
        icon={AdmissionIcon}
        title={t('onboardingTitle', 'Staff Onboarding & Recruitment')}
        subtitle={t(
          'onboardingSubtitle',
          'Quick onboarding, direct faculty registration, and shareable QR invitation links'
        )}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/staff/roster')}
              className="px-4 py-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0 shadow-xs active:scale-98"
            >
              {t('viewStaffRoster', 'View Staff Roster')}
            </button>
            {activeTab !== 'online_qr' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTokenForEdit(null);
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98 border-0"
              >
                <QrCodeIcon className="w-4 h-4 shrink-0" />
                <span>{t('generateInviteQr', 'Generate Invite QR')}</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. 3-Option Mode Tab Switcher (Quick | Full Wizard | Online QR & Link) */}
      <TabSwitcher
        tabs={tabsList}
        activeTab={activeTab}
        onChange={handleTabChange}
        rightContent={
          activeTab === 'online_qr' ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={() => {
                setSelectedTokenForEdit(null);
                setIsInviteModalOpen(true);
              }}
            >
              {t('createOnboardingLink', 'Create Onboarding Link')}
            </CustomButton>
          ) : null
        }
      />

      {/* TAB 1: Quick Staff Onboarding (Reusing Real Form Components & Hook) */}
      {activeTab === 'quick' && (
        <div className="pt-2 border-0">
          {onboardedStaff ? (
            <StaffOnboardingSuccess
              result={onboardedStaff}
              onReset={handleResetSuccess}
            />
          ) : (
            <QuickStaffOnboardingForm
              initialData={sharedDraft}
              onFormDataChange={setSharedDraft}
              onCompleted={handleOnboardingCompleted}
              onCancel={() => navigate('/staff/roster')}
            />
          )}
        </div>
      )}

      {/* TAB 2: Direct Full-Page 5-Step Onboarding Wizard */}
      {activeTab === 'direct' && (
        <div className="pt-2 border-0">
          {onboardedStaff ? (
            <StaffOnboardingSuccess
              result={onboardedStaff}
              onReset={handleResetSuccess}
            />
          ) : (
            <StaffOnboardingWizard
              initialData={sharedDraft}
              onFormDataChange={setSharedDraft}
              onCompleted={handleOnboardingCompleted}
              onCancel={() => navigate('/staff/roster')}
            />
          )}
        </div>
      )}

      {/* TAB 3: Online Links & QR Codes */}
      {activeTab === 'online_qr' && (
        <div className="space-y-4 pt-2 animate-fade-in border-0 text-start">
          <div className="p-5 rounded-3xl theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-0">
            <div>
              <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                {t('activeLinksHeading', 'Active Staff Recruitment & Onboarding Links')}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {t(
                  'activeLinksSubheading',
                  'Send shareable links or print QR cards for candidate faculty recruitment.'
                )}
              </p>
            </div>
          </div>

          {loadingTokens ? (
            <div className="p-12 text-center text-xs theme-text-secondary">
              {t('loadingCampaigns', 'Loading recruitment campaigns...')}
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-12 rounded-3xl theme-bg-surface text-center space-y-3 border-0 shadow-xs">
              <div className="w-12 h-12 rounded-2xl theme-bg-app flex items-center justify-center mx-auto theme-text-secondary border-0">
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
              <button
                type="button"
                onClick={() => {
                  setSelectedTokenForEdit(null);
                  setIsInviteModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition cursor-pointer border-0"
              >
                {t('createFirstLink', 'Create First Link')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-0">
              {tokens.map((tokenItem) => {
                const isExpired =
                  tokenItem.expires_at && new Date(tokenItem.expires_at) < new Date();
                return (
                  <div
                    key={tokenItem.id}
                    className="p-5 rounded-3xl theme-bg-surface shadow-xs space-y-4 hover:shadow-md transition-all border-0"
                  >
                    <div className="flex items-start justify-between gap-3 border-0">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full theme-bg-app theme-accent font-bold border-0">
                          {tokenItem.staff_type || 'FACULTY'}
                        </span>
                        <h4 className="text-sm font-bold theme-text-primary mt-1.5 truncate">
                          {tokenItem.title}
                        </h4>
                        {tokenItem.designation && (
                          <p className="text-xs font-medium theme-accent mt-0.5 truncate">
                            {tokenItem.designation}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 shrink-0 ${
                          !tokenItem.is_active || isExpired
                            ? 'theme-bg-app theme-text-secondary'
                            : 'theme-bg-accent-soft theme-accent'
                        }`}
                      >
                        {isExpired
                          ? t('statusExpired', 'Expired')
                          : tokenItem.is_active
                            ? t('statusActive', 'Active')
                            : t('statusInactive', 'Inactive')}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(tokenItem.token)}
                          className="p-2 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0 shadow-xs"
                          title={t('copyLink', 'Copy Link')}
                        >
                          <CopyIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTokenForQR(tokenItem)}
                          className="p-2 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0 shadow-xs"
                          title={t('viewQrCode', 'View QR Code')}
                        >
                          <QrCodeIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tokenItem)}
                          className="text-[11px] font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
                        >
                          {tokenItem.is_active
                            ? t('pauseLink', 'Pause')
                            : t('activateLink', 'Activate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteToken(tokenItem)}
                          className="p-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition cursor-pointer border-0"
                          title={t('deleteCampaign', 'Delete Campaign')}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals for In-Page Creation and QR */}
      <StaffInviteModal
        isOpen={isInviteModalOpen}
        tokenData={selectedTokenForEdit}
        onClose={() => {
          setIsInviteModalOpen(false);
          setSelectedTokenForEdit(null);
        }}
        onSuccess={loadTokens}
      />

      <StaffQRCodeCardModal
        isOpen={Boolean(selectedTokenForQR)}
        tokenData={selectedTokenForQR}
        onClose={() => setSelectedTokenForQR(null)}
      />
    </PageContainer>
  );
};

export default StaffOnboardingView;
