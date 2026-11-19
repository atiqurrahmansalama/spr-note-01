import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TeacherIcon,
} from '@/components/ui/Icons';
import TabSwitcher from '@/components/ui/TabSwitcher';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/context/ToastContext';
import { useDrawerRegistration, useRightSidebar } from '@/context/RightSidebarContext';
import {
  deleteStaffOnboardingToken,
  getStaffOnboardingTokens,
  toggleStaffOnboardingTokenActive,
} from '@/api/staffOnboarding';
import { getApprovalSummary } from '@/api/approvals';
import { ApprovalQueuePanel } from '@/modules/approvals';
import {
  QuickStaffOnboardingForm,
  StaffInviteDrawerForm,
  StaffOnboardingLinksPanel,
  StaffOnboardingSuccess,
  StaffOnboardingWizard,
  StaffQRCodeCardModal,
} from './';
import { useStaffTranslation } from '../locales';
import type { StaffOnboardingPayload } from '../types';

type StaffOnboardingTabId = 'quick' | 'direct' | 'online_qr' | 'approvals';

export const StaffOnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { t } = useStaffTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawUrlTab = searchParams.get('tab');
  const activeTab: StaffOnboardingTabId = useMemo(() => {
    if (rawUrlTab === 'approvals') return 'approvals';
    if (rawUrlTab === 'online_qr') return 'online_qr';
    if (rawUrlTab === 'direct' || rawUrlTab === 'wizard') return 'direct';
    return 'quick';
  }, [rawUrlTab]);

  // Ensure URL tab parameter defaults cleanly to 'quick'
  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'quick');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);
  const [sharedDraft, setSharedDraft] = useState<Partial<StaffOnboardingPayload>>({});
  const [onboardedStaff, setOnboardedStaff] = useState<any>(null);

  // Approvals & QR Tokens State
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [selectedTokenForQR, setSelectedTokenForQR] = useState<any>(null);

  const loadApprovalCount = useCallback(async () => {
    try {
      const summary = await getApprovalSummary();
      const count = summary?.by_domain?.STAFF_ONBOARDING ?? 0;
      setPendingApprovalsCount(count);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    loadApprovalCount();
  }, [loadApprovalCount, activeTab]);

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
        label: t('onlineQrTab', 'Online Onboarding'),
        icon: QrCodeIcon,
      },
      {
        id: 'approvals',
        label:
          pendingApprovalsCount > 0
            ? `${t('approvalsTab', 'Pending Approvals')} (${pendingApprovalsCount})`
            : t('approvalsTab', 'Pending Approvals'),
        icon: ShieldCheckIcon,
      },
    ],
    [t, pendingApprovalsCount]
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

  const handleCloseInviteDrawer = useCallback(() => {
    closeDrawer();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('mode');
      next.delete('tokenId');
      return next;
    });
  }, [closeDrawer, setSearchParams]);

  // Register Right Sidebar Drawer for Creating & Editing Onboarding Invite Links
  useDrawerRegistration(
    'staff_onboarding_invite',
    (params) => {
      const mode = params.get('mode') || 'add';
      const tokenId = params.get('tokenId');
      const foundToken = tokenId
        ? tokens.find((item) => String(item.id) === String(tokenId)) || null
        : null;

      return {
        title:
          mode === 'edit' && foundToken
            ? t('drawerEditInviteTitle', 'Edit Onboarding Invite')
            : t('drawerCreateInviteTitle', 'Create Onboarding Invite'),
        category: t('onlineQrTab', 'Online Onboarding'),
        size: 'md' as const,
        content: (
          <StaffInviteDrawerForm
            key={`staff-invite-${mode}-${tokenId || 'new'}`}
            tokenData={foundToken}
            onCancel={handleCloseInviteDrawer}
            onSuccess={() => {
              loadTokens();
              handleCloseInviteDrawer();
            }}
          />
        ),
      };
    },
    [tokens, handleCloseInviteDrawer, loadTokens, t]
  );

  const handleOpenInviteDrawer = useCallback(
    (tokenItem?: any) => {
      if (tokenItem?.id) {
        openDrawer('staff_onboarding_invite', { mode: 'edit', tokenId: String(tokenItem.id) });
      } else {
        openDrawer('staff_onboarding_invite', { mode: 'add' });
      }
    },
    [openDrawer]
  );

  return (
    <PageContainer className="pb-12 sm:pb-16">
      {/* Mode Tab Switcher with Built-in Inline Action Button */}
      <TabSwitcher
        tabs={tabsList}
        activeTab={activeTab}
        onChange={handleTabChange}
        inlineAction={{
          label: t('createInviteBtn', 'New Invite'),
          icon: PlusIcon,
          onClick: () => handleOpenInviteDrawer(),
        }}
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

      {/* TAB 3: Online Links & QR Codes (Card Grid + DataTable View) */}
      {activeTab === 'online_qr' && (
        <div className="pt-2 border-0">
          <StaffOnboardingLinksPanel
            tokens={tokens}
            loading={loadingTokens}
            onCreateNew={() => handleOpenInviteDrawer()}
            onEditToken={(tokenItem) => handleOpenInviteDrawer(tokenItem)}
            onViewQr={setSelectedTokenForQR}
            onCopyLink={handleCopyLink}
            onToggleActive={handleToggleActive}
            onDeleteToken={handleDeleteToken}
          />
        </div>
      )}

      {/* TAB 4: Pending Approvals Queue (Unified Reusable Approvals Engine) */}
      {activeTab === 'approvals' && (
        <div className="pt-2 border-0">
          <ApprovalQueuePanel domain="STAFF_ONBOARDING" />
        </div>
      )}

      <StaffQRCodeCardModal
        isOpen={Boolean(selectedTokenForQR)}
        tokenData={selectedTokenForQR}
        onClose={() => setSelectedTokenForQR(null)}
      />
    </PageContainer>
  );
};

export default StaffOnboardingView;
