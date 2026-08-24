import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StaffOnboardingWizard from './StaffOnboardingWizard';
import StaffInviteDrawerForm from './StaffInviteDrawerForm';
import StaffQRCodeCardModal from './StaffQRCodeCardModal';
import {
  AdmissionIcon,
  TeacherIcon,
  QrCodeIcon,
  PlusIcon,
  CopyIcon,
  ShareIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
  SparklesIcon,
  BuildingOfficeIcon,
} from '../../../components/ui/Icons';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { PageContainer } from '../../../components/layout';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { useToast } from '../../../context/ToastContext';
import {
  getStaffOnboardingTokens,
  toggleStaffOnboardingTokenActive,
  deleteStaffOnboardingToken,
} from '../../../api/staffOnboarding';

export default function StaffOnboardingView() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openDrawer, closeDrawer, openRightSidebar, closeRightSidebar } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'direct'; // 'direct' | 'online_qr'
  const [onboardedStaff, setOnboardedStaff] = useState(null);

  // QR Tokens State
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [selectedTokenForQR, setSelectedTokenForQR] = useState(null);

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try {
      const data = await getStaffOnboardingTokens();
      setTokens(data);
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

  const handleTabChange = (tabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  };

  // Universal Right Sidebar Drawer Registration
  useDrawerRegistration(
    'staff_recruitment_campaign',
    () => {
      return {
        title: 'Generate Staff Onboarding Link & QR',
        category: 'Staff Management & Recruitment',
        width: 580,
        content: (
          <StaffInviteDrawerForm
            onSuccess={() => {
              loadTokens();
              if (closeDrawer) closeDrawer();
              if (closeRightSidebar) closeRightSidebar();
            }}
          />
        ),
      };
    },
    [loadTokens, closeDrawer, closeRightSidebar]
  );

  const handleOpenCreateDrawer = () => {
    if (openDrawer) {
      openDrawer('staff_recruitment_campaign');
    } else if (openRightSidebar) {
      openRightSidebar({
        title: 'Generate Staff Onboarding Link & QR',
        subtitle: 'Create a recruitment invitation link with default rank & department preset',
        width: 'md',
        content: (
          <StaffInviteDrawerForm
            onSuccess={() => {
              loadTokens();
              closeRightSidebar();
            }}
            onCancel={() => closeRightSidebar()}
          />
        ),
      });
    }
  };

  const handleToggleActive = async (tokenItem) => {
    try {
      const res = await toggleStaffOnboardingTokenActive(tokenItem.id);
      showToast(res.message || 'Status updated successfully', 'success');
      loadTokens();
    } catch (err) {
      showToast(err.message || 'Failed to update token status', 'error');
    }
  };

  const handleDeleteToken = async (tokenItem) => {
    if (!window.confirm(`Are you sure you want to delete the onboarding link "${tokenItem.title}"?`)) {
      return;
    }
    try {
      await deleteStaffOnboardingToken(tokenItem.id);
      showToast('Staff onboarding campaign deleted', 'success');
      loadTokens();
    } catch (err) {
      showToast(err.message || 'Failed to delete token', 'error');
    }
  };

  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/staff-onboard?token=${token}`;
    navigator.clipboard.writeText(url);
    showToast('Onboarding link copied to clipboard!', 'success');
  };

  return (
    <PageContainer>
      {/* 1. Top Page Header */}
      <PageHeader
        icon={AdmissionIcon}
        title="Staff Onboarding & Recruitment"
        subtitle="Direct faculty registration, recruitment campaigns, and shareable QR invitation cards"
        breadcrumbs={[
          { label: 'Staff Management', href: '/staff/roster' },
          { label: 'Staff Onboarding', active: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/staff/roster')}
              className="px-3.5 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              View Staff Roster
            </button>
            <button
              onClick={handleOpenCreateDrawer}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <QrCodeIcon className="w-4 h-4" />
              <span>Generate Invite QR</span>
            </button>
          </div>
        }
      />

      {/* 2. Top Tab Switcher */}
      <TabSwitcher
        tabs={[
          { id: 'direct', label: 'Direct Onboarding Wizard', icon: TeacherIcon },
          { id: 'online_qr', label: 'Recruitment Links & QR Codes', icon: QrCodeIcon },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {/* TAB 1: Direct Onboarding Wizard */}
      {activeTab === 'direct' && (
        <div className="pt-2">
          {onboardedStaff ? (
            <div className="p-8 rounded-3xl theme-bg-surface border theme-border shadow-md max-w-xl mx-auto text-center space-y-5 animate-zoom-in">
              <div className="w-16 h-16 rounded-full theme-bg-accent-soft text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircleIcon className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold theme-text-primary">Staff Member Successfully Onboarded!</h3>
                <p className="text-xs theme-text-secondary mt-1">
                  Employee profile registered with ID{' '}
                  <span className="font-mono font-bold theme-accent">{onboardedStaff.staff?.employee_id}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="theme-text-secondary">Name:</span>
                  <span className="font-bold theme-text-primary">{onboardedStaff.staff?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-secondary">Designation:</span>
                  <span className="font-bold theme-accent">{onboardedStaff.staff?.designation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-secondary">Role:</span>
                  <span className="font-medium theme-text-primary">{onboardedStaff.staff?.staff_type}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardedStaff(null)}
                  className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-primary transition cursor-pointer"
                >
                  Onboard Another Staff
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/staff/${onboardedStaff.staff?.id}`)}
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  View Profile Detail
                </button>
              </div>
            </div>
          ) : (
            <StaffOnboardingWizard
              onCompleted={(result) => setOnboardedStaff(result)}
              onCancel={() => navigate('/staff/roster')}
            />
          )}
        </div>
      )}

      {/* TAB 2: Online Links & QR Codes */}
      {activeTab === 'online_qr' && (
        <div className="space-y-4 pt-2 animate-fade-in">
          {/* Header Card */}
          <div className="p-4 sm:p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                Active Staff Recruitment &amp; Onboarding Links
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Send shareable links or print QR cards for candidate faculty &amp; staff recruitment.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateDrawer}
              className="px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Onboarding Link</span>
            </button>
          </div>

          {/* Token Cards Grid */}
          {loadingTokens ? (
            <div className="p-12 text-center text-xs theme-text-secondary">
              Loading recruitment campaigns...
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-12 rounded-2xl theme-bg-surface border theme-border text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center mx-auto theme-text-secondary">
                <QrCodeIcon className="w-6 h-6 theme-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold theme-text-primary">No Recruitment Links Found</h4>
                <p className="text-xs theme-text-secondary mt-1">
                  Generate a QR code or online link to allow prospective faculty members to submit their onboarding forms.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateDrawer}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition cursor-pointer"
              >
                Create First Link
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((t) => {
                const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
                const isLimitReached = t.max_applications > 0 && t.applied_count >= t.max_applications;

                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs hover:border-[var(--accent-main)]/50 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Badge & Status Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            !t.is_active || isExpired || isLimitReached
                              ? 'theme-bg-sub theme-text-secondary theme-border'
                              : 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                          }`}
                        >
                          {!t.is_active
                            ? 'Inactive'
                            : isExpired
                            ? 'Expired'
                            : isLimitReached
                            ? 'Limit Reached'
                            : 'Active Link'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(t)}
                            className="text-[11px] font-semibold theme-text-secondary hover:theme-accent transition cursor-pointer"
                          >
                            {t.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteToken(t)}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                            title="Delete link"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div>
                        <h4 className="text-sm font-bold theme-text-primary group-hover:theme-accent transition">
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] theme-text-secondary">
                          <span className="font-semibold theme-text-primary">
                            {t.designation || t.staff_type}
                          </span>
                          {t.rank_order && t.rank_order !== 99 && (
                            <span className="font-mono font-bold text-[10px] theme-accent">
                              [Rank {t.rank_order}]
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Applications Stats */}
                      <div className="p-3 rounded-xl theme-bg-sub border theme-border grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] theme-text-secondary block font-medium">Applications</span>
                          <span className="font-bold theme-text-primary font-mono text-sm">
                            {t.applied_count}{' '}
                            <span className="text-[10px] font-normal theme-text-secondary">
                              / {t.max_applications > 0 ? t.max_applications : '∞'}
                            </span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] theme-text-secondary block font-medium">Expires</span>
                          <span className="text-[11px] font-medium theme-text-primary">
                            {t.expires_at ? t.expires_at.split('T')[0] : 'No Expiry'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t theme-border flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(t.token)}
                        className="px-3 py-1.5 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CopyIcon className="w-3.5 h-3.5 theme-accent" />
                        <span>Copy Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTokenForQR(t)}
                        className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <QrCodeIcon className="w-3.5 h-3.5" />
                        <span>QR Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QR Poster & Share Modal */}
      {selectedTokenForQR && (
        <StaffQRCodeCardModal
          isOpen={Boolean(selectedTokenForQR)}
          onClose={() => setSelectedTokenForQR(null)}
          tokenData={selectedTokenForQR}
        />
      )}
    </PageContainer>
  );
}
