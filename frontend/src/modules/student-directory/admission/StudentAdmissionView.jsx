import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FullAdmissionWizard from './FullAdmissionWizard';
import AdmissionSuccessModal from './AdmissionSuccessModal';
import AdmissionInviteDrawerForm from './AdmissionInviteDrawerForm';
import AdmissionQRCodeCardModal from './AdmissionQRCodeCardModal';
import {
  AcademicCapIcon,
  QrCodeIcon,
  PlusIcon,
  CopyIcon,
  ShareIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
  MoreVerticalIcon,
} from '../../../components/ui/Icons';
import PageHeader from '../../../components/ui/PageHeader';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import { PageContainer } from '../../../components/layout';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import { academicYearsStore, admissionSettingsStore } from '../../../utils/localStore';
import {
  getAdmissionTokens,
  toggleAdmissionTokenActive,
  deleteAdmissionToken,
} from '../../../api/admissions';

export default function StudentAdmissionView() {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { activeTenantId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeTab = searchParams.get('tab') || 'direct'; // 'direct' | 'online_qr'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [admittedStudent, setAdmittedStudent] = useState(null);

  const ongoingYear = admissionSettingsStore.getActiveAdmissionYear(activeTenantId);

  // QR Tokens state
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [selectedTokenForQR, setSelectedTokenForQR] = useState(null);

  // Shared Direct Form Data
  const [sharedData, setSharedData] = useState({
    name: '',
    bangla_name: '',
    student_id_card_number: '',
    gender: 'MALE',
    dob: '',
    blood_group: '',
    birth_certificate_no: '',
    session_year: ongoingYear?.name || '',
    student_class: '',
    education_status: '',
    roll_number: '',
    admission_date: new Date().toISOString().split('T')[0],
    previous_school_name: '',
    father_name: '',
    father_phone: '',
    father_occupation: '',
    mother_name: '',
    mother_phone: '',
    mother_occupation: '',
    primary_guardian_name: '',
    guardian_phone: '',
    guardian_relation: 'Father',
    guardian_nid: '',
    emergency_contact_phone: '',
    street_address: '',
    post_code: '',
    thana_or_upazila: '',
    district: '',
    division: '',
    perm_street: '',
    perm_post_code: '',
    perm_thana: '',
    perm_district: '',
    perm_division: '',
  });

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try {
      const data = await getAdmissionTokens();
      setTokens(data);
    } catch (err) {
      console.error('Failed to load admission tokens', err);
    } finally {
      setLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'online_qr') {
      loadTokens();
    }
  }, [activeTab, loadTokens]);

  useEffect(() => {
    const handleAcademicUpdate = () => {
      const currentYear = admissionSettingsStore.getActiveAdmissionYear(activeTenantId);
      if (currentYear?.name) {
        setSharedData((prev) => ({ ...prev, session_year: currentYear.name }));
      }
      if (activeTab === 'online_qr') {
        loadTokens();
      }
    };
    window.addEventListener('spr_academic_years_updated', handleAcademicUpdate);
    window.addEventListener('spr_admission_settings_updated', handleAcademicUpdate);
    window.addEventListener('spr_tenant_changed', handleAcademicUpdate);
    return () => {
      window.removeEventListener('spr_academic_years_updated', handleAcademicUpdate);
      window.removeEventListener('spr_admission_settings_updated', handleAcademicUpdate);
      window.removeEventListener('spr_tenant_changed', handleAcademicUpdate);
    };
  }, [activeTenantId, activeTab, loadTokens]);

  const handleTabChange = (tabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  };

  // Universal Right Sidebar Drawer Registration
  useDrawerRegistration(
    'admission_campaign',
    () => {
      return {
        title: 'Generate Admission Link & QR',
        category: 'Student Admission & QR',
        width: 580,
        content: (
          <AdmissionInviteDrawerForm
            onSuccess={() => {
              loadTokens();
              closeDrawer();
            }}
          />
        ),
      };
    },
    [loadTokens, closeDrawer]
  );

  const handleOpenCreateDrawer = () => {
    openDrawer('admission_campaign');
  };

  const handleToggleActive = async (tokenItem) => {
    try {
      const res = await toggleAdmissionTokenActive(tokenItem.id);
      showToast(res.message || 'Status updated successfully', 'success');
      loadTokens();
    } catch (err) {
      showToast(err.message || 'Failed to update token status', 'error');
    }
  };

  const handleDeleteToken = async (tokenItem) => {
    if (!window.confirm(`Are you sure you want to delete the admission link "${tokenItem.title}"?`)) {
      return;
    }
    try {
      await deleteAdmissionToken(tokenItem.id);
      showToast('Admission campaign deleted', 'success');
      loadTokens();
    } catch (err) {
      showToast(err.message || 'Failed to delete token', 'error');
    }
  };

  const handleCopyLink = (tokenItem) => {
    const url = `${window.location.origin}/apply?token=${tokenItem.token}`;
    navigator.clipboard.writeText(url);
    showToast('Public admission link copied to clipboard!', 'success');
  };

  const handleReset = () => {
    setAdmittedStudent(null);
    setSharedData({
      name: '',
      bangla_name: '',
      student_id_card_number: '',
      gender: 'MALE',
      dob: '',
      blood_group: '',
      birth_certificate_no: '',
      session_year: '2026-2027',
      student_class: '',
      education_status: '',
      roll_number: '',
      admission_date: new Date().toISOString().split('T')[0],
      previous_school_name: '',
      father_name: '',
      father_phone: '',
      father_occupation: '',
      mother_name: '',
      mother_phone: '',
      mother_occupation: '',
      primary_guardian_name: '',
      guardian_phone: '',
      guardian_relation: 'Father',
      guardian_nid: '',
      emergency_contact_phone: '',
      street_address: '',
      post_code: '',
      thana_or_upazila: '',
      district: '',
      division: '',
      perm_street: '',
      perm_post_code: '',
      perm_thana: '',
      perm_district: '',
      perm_division: '',
    });
  };

  const handleClose = () => {
    navigate('/groups-students');
  };

  return (
    <PageContainer>
      {/* 1. Standard Page Header */}
      <PageHeader
        icon={AcademicCapIcon}
        title="Student Admission & Registration"
        subtitle="Enroll new students directly or generate online QR codes and public links for remote registration."
      />

      {/* 2. Mode Tab Switcher */}
      <TabSwitcher
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={[
          { id: 'direct', label: 'Direct Enrollment', icon: AcademicCapIcon },
          { id: 'online_qr', label: 'Online QR & Link Admission', icon: QrCodeIcon },
        ]}
        rightContent={
          activeTab === 'online_qr' ? (
            <button
              type="button"
              onClick={handleOpenCreateDrawer}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-sm shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Generate Link &amp; QR</span>
            </button>
          ) : null
        }
      />

      {/* 3. Main Container Body */}
      {activeTab === 'direct' && (
        <div className="pt-2">
          {admittedStudent ? (
            <div className="p-8 rounded-3xl theme-bg-surface border theme-border shadow-md max-w-xl mx-auto text-center space-y-5 animate-zoom-in">
              <AdmissionSuccessModal
                student={admittedStudent}
                onReset={handleReset}
                onClose={handleClose}
              />
            </div>
          ) : (
            <FullAdmissionWizard
              onCancel={handleClose}
              onSuccess={setAdmittedStudent}
              sharedData={sharedData}
              setSharedData={setSharedData}
            />
          )}
        </div>
      )}

      {/* TAB 2: Online QR & Link Admission Management */}
      {activeTab === 'online_qr' && (
        <div className="space-y-6 animate-fade-in">
          {loadingTokens ? (
            <div className="p-12 rounded-3xl theme-bg-surface border theme-border flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent theme-accent animate-spin" />
              <p className="text-xs theme-text-secondary font-medium">Loading admission campaigns...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-10 sm:p-14 rounded-3xl theme-bg-surface border theme-border flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shadow-inner shrink-0">
                <QrCodeIcon className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-extrabold theme-text-primary">No Admission QR Links Generated</h3>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  Create shareable online admission links and downloadable QR codes for applicants and guardians to register remotely.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateDrawer}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Generate First Admission QR Link</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tokens.map((tokenItem) => {
                const publicUrl = `${window.location.origin}/apply?token=${tokenItem.token}`;
                return (
                  <div
                    key={tokenItem.id}
                    className="p-5 sm:p-6 rounded-3xl theme-bg-surface border theme-border shadow-xs flex flex-col justify-between space-y-4 hover:border-accent transition"
                  >
                    {/* Top Row: Title & Status */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase theme-bg-accent-soft theme-accent border theme-border">
                          {tokenItem.session_year}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            tokenItem.is_active
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {tokenItem.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black theme-text-primary tracking-tight">
                        {tokenItem.title}
                      </h4>
                      <p className="text-xs theme-text-secondary mt-0.5">
                        Class: {tokenItem.target_class_name || 'Open to All Classes'}
                      </p>
                    </div>

                    {/* Middle Metrics */}
                    <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-[10px] theme-text-secondary uppercase font-bold">Applications</p>
                        <p className="text-base font-black theme-accent">{tokenItem.applied_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] theme-text-secondary uppercase font-bold">Capacity</p>
                        <p className="text-base font-black theme-text-primary">
                          {tokenItem.max_applications > 0 ? tokenItem.max_applications : 'Unlimited'}
                        </p>
                      </div>
                    </div>

                    {/* Token Code Display */}
                    <div className="p-2.5 rounded-xl theme-bg-sub border theme-border flex items-center justify-between text-xs font-mono theme-text-secondary">
                      <span>{tokenItem.token}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(tokenItem)}
                        title="Copy Link"
                        className="p-1 rounded-lg hover:theme-bg-elevated theme-text-primary transition cursor-pointer"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t theme-border">
                      <button
                        type="button"
                        onClick={() => setSelectedTokenForQR(tokenItem)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-xs"
                      >
                        <QrCodeIcon className="w-3.5 h-3.5" />
                        <span>View QR Card</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tokenItem)}
                          className="flex-1 py-2 px-2 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated text-[11px] font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer text-center"
                        >
                          {tokenItem.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteToken(tokenItem)}
                          className="p-2 rounded-xl border theme-border theme-bg-sub hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                          title="Delete Campaign"
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

      {/* QR Code Card Modal */}
      {selectedTokenForQR && (
        <AdmissionQRCodeCardModal
          isOpen={Boolean(selectedTokenForQR)}
          onClose={() => setSelectedTokenForQR(null)}
          tokenData={selectedTokenForQR}
        />
      )}
    </PageContainer>
  );
}
