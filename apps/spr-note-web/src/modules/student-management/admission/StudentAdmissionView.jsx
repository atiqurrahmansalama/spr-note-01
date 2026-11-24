import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FullAdmissionWizard from './FullAdmissionWizard';
import QuickAdmissionForm from './QuickAdmissionForm';
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
  SparklesIcon,
  EditIcon,
  CloseIcon,
  ChecklistIcon,
} from '../../../components/ui/Icons';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import CustomButton from '../../../components/ui/CustomButton';
import EmptyState from '../../../components/ui/EmptyState';
import { IconButton } from '../../../components/ui/IconButton';
import { PageContainer } from '../../../components/layout';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { getPublicAdmissionUrl } from '../../../utils/tenantUrlUtils';
import { fetchWithAuth } from '../../../utils/authService';
import { academicYearsStore, admissionSettingsStore, students as studentStore } from '../../../utils/localStore';
import {
  getAdmissionTokens,
  toggleAdmissionTokenActive,
  deleteAdmissionToken,
} from '../../../api/admissions';
import { getApprovalSummary } from '../../../api/approvals';
import { ApprovalQueuePanel } from '../../approvals/components/ApprovalQueuePanel';
import AccessDeniedView from '../../../components/common/AccessDeniedView';

export default function StudentAdmissionView() {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { activeTenantId, currentInstitution } = useTenant();
  const { isSectionEnabled } = useFeatureControl();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Dynamic feature checks with granular section controls
  const isAdmissionModuleEnabled = isSectionEnabled('student_admission') && isSectionEnabled('nav_student_management');
  const isQuickEnabled = isSectionEnabled('student_admission_quick') && isSectionEnabled('student_quick_admission');
  const isFullEnabled = isSectionEnabled('student_admission_full');
  const isOnlineQrEnabled = isSectionEnabled('student_admission_online_qr');
  const isApprovalsEnabled = isSectionEnabled('student_admission_pending_approvals');
  const canEditStudent = isSectionEnabled('student_roster_edit_student');

  const canUseQuick = isQuickEnabled;
  const canUseFull = isFullEnabled;
  const canUseOnlineQr = isOnlineQrEnabled;
  const canUseApprovals = isApprovalsEnabled;

  const editId = searchParams.get('edit') || searchParams.get('student_id') || searchParams.get('id');
  const rawUrlTab = searchParams.get('tab');

  // Pending approvals counter for badge
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const loadApprovalCount = useCallback(async () => {
    try {
      const summary = await getApprovalSummary();
      const count = summary?.by_domain?.STUDENT_ADMISSION ?? 0;
      setPendingApprovalsCount(count);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    loadApprovalCount();
  }, [loadApprovalCount, rawUrlTab]);

  // Compute active tab dynamically based on URL and enabled features
  const activeTab = useMemo(() => {
    if (rawUrlTab === 'approvals' && canUseApprovals) return 'approvals';
    if (rawUrlTab === 'online_qr' && canUseOnlineQr) return 'online_qr';
    if (rawUrlTab === 'quick' && canUseQuick) return 'quick';
    if (rawUrlTab === 'direct' && canUseFull) return 'direct';

    // No tab specified in URL or default fallback
    if (editId) {
      if (canUseFull) return 'direct';
      if (canUseQuick) return 'quick';
    }

    if (canUseQuick) return 'quick';
    if (canUseFull) return 'direct';
    if (canUseOnlineQr) return 'online_qr';
    if (canUseApprovals) return 'approvals';
    return '';
  }, [rawUrlTab, editId, canUseQuick, canUseFull, canUseOnlineQr, canUseApprovals]);

  // Tab list dynamically filtered by active feature permissions
  const tabsList = useMemo(() => {
    const list = [];
    if (canUseQuick) {
      list.push({ id: 'quick', label: 'Quick Admission', icon: SparklesIcon });
    }
    if (canUseFull) {
      list.push({ id: 'direct', label: 'Full Admission Wizard', icon: AcademicCapIcon });
    }
    if (canUseOnlineQr) {
      list.push({ id: 'online_qr', label: 'Online QR & Link Admission', icon: QrCodeIcon });
    }
    if (canUseApprovals) {
      list.push({
        id: 'approvals',
        label: pendingApprovalsCount > 0 ? `Pending Approvals (${pendingApprovalsCount})` : 'Pending Approvals',
        icon: ChecklistIcon,
      });
    }
    return list;
  }, [canUseQuick, canUseFull, canUseOnlineQr, canUseApprovals, pendingApprovalsCount]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [admittedStudent, setAdmittedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loadingEditData, setLoadingEditData] = useState(false);

  const ongoingYear = admissionSettingsStore.getActiveAdmissionYear(activeTenantId);

  // QR Tokens state
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [selectedTokenForQR, setSelectedTokenForQR] = useState(null);

  const loadTokens = useCallback(async () => {
    try {
      setLoadingTokens(true);
      const data = await getAdmissionTokens();
      setTokens(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error('Failed to load admission tokens:', err);
    } finally {
      setLoadingTokens(false);
    }
  }, []);

  // Shared Direct Form Data
  const [sharedData, setSharedData] = useState({
    is_editing: Boolean(editId),
    edit_student_id: editId || null,
    student_type: editId ? 'EXISTING' : 'NEW',
    name: searchParams.get('name') || '',
    bangla_name: '',
    student_id_card_number: '',
    gender: 'MALE',
    dob: '',
    blood_group: '',
    birth_certificate_no: '',
    session_year: ongoingYear?.name || '',
    department: searchParams.get('dept') || searchParams.get('department') || '',
    student_class: searchParams.get('class') || searchParams.get('student_class') || '',
    student_section: searchParams.get('section') || searchParams.get('student_section') || '',
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

  // Load existing student full profile for editing and auto-fill
  useEffect(() => {
    if (!editId) {
      setEditingStudent(null);
      return;
    }

    let isMounted = true;
    setLoadingEditData(true);

    const applyStudentData = (stu) => {
      if (!isMounted || !stu) return;
      setEditingStudent(stu);

      const g = stu.guardian_detail || (Array.isArray(stu.guardians) && stu.guardians[0]) || stu.details || {};
      const a = stu.academic_detail || {};
      const pAddr = stu.present_address || {};
      const permAddr = stu.permanent_address || {};

      setSharedData((prev) => ({
        ...prev,
        is_editing: true,
        edit_student_id: stu.id,
        student_type: "EXISTING",
        name: stu.name_en || stu.name || (stu.name_i18n && typeof stu.name_i18n === 'object' ? stu.name_i18n.en || Object.values(stu.name_i18n)[0] : '') || prev.name || '',
        bangla_name: stu.bangla_name || (stu.name_i18n && typeof stu.name_i18n === 'object' ? stu.name_i18n.bn : '') || stu.details?.name_bn || '',
        name_i18n: stu.name_i18n && typeof stu.name_i18n === 'object' && Object.keys(stu.name_i18n).length > 0
          ? stu.name_i18n
          : { en: stu.name_en || stu.name || '', bn: stu.bangla_name || stu.details?.name_bn || '' },
        student_id_card_number: stu.student_id_card_number || stu.uniq_id || '',
        uniq_id: stu.uniq_id || stu.student_id_card_number || '',
        gender: stu.gender || 'MALE',
        dob: stu.dob || stu.details?.date_of_birth || '',
        blood_group: stu.blood_group || stu.details?.blood_group || '',
        birth_certificate_no: stu.birth_certificate_no || '',
        nid_no: stu.nid_no || '',
        session_year: a.session_year || stu.session_year || ongoingYear?.name || '2026-2027',
        department: stu.department || a.department || stu.department_id || prev.department || '',
        student_class: stu.student_class != null
          ? String(typeof stu.student_class === 'object' ? stu.student_class?.id : stu.student_class)
          : (a.student_class != null ? String(typeof a.student_class === 'object' ? a.student_class?.id : a.student_class) : (prev.student_class || '')),
        student_section: stu.student_section != null
          ? String(typeof stu.student_section === 'object' ? stu.student_section?.id : stu.student_section)
          : (stu.section != null
              ? String(typeof stu.section === 'object' ? stu.section?.id : stu.section)
              : (stu.student_group != null
                  ? String(typeof stu.student_group === 'object' ? stu.student_group?.id : stu.student_group)
                  : (a.student_section != null ? String(a.student_section) : (prev.student_section || '')))),
        education_status: stu.education_status || stu.student_class_name || prev.education_status || '',
        roll_number: stu.roll_number != null ? stu.roll_number : '',
        admission_date: stu.admission_date || a.admission_date || prev.admission_date || new Date().toISOString().split('T')[0],
        target_status: stu.target_status || 'NON_RESIDENTIAL',
        branch_id: stu.branch || '',
        photo: stu.photo || '',
        previous_school_name: a.previous_school_name || '',
        previous_school_address: a.previous_school_address || '',
        previous_class: a.previous_class || '',
        previous_grade: a.previous_grade || '',
        previous_average: a.previous_average || '',
        previous_passing_year: a.previous_passing_year || '',
        previous_study_details: a.previous_study_details || '',
        tc_number: a.tc_number || '',
        father_name: g.father_name || stu.details?.father_name || stu.father_name || '',
        father_phone: g.father_phone || stu.details?.father_phone || '',
        father_occupation: g.father_occupation || stu.details?.father_occupation || '',
        mother_name: g.mother_name || stu.details?.mother_name || '',
        mother_phone: g.mother_phone || '',
        mother_occupation: g.mother_occupation || '',
        primary_guardian_name: g.primary_guardian_name || stu.details?.guardian_name || stu.guardian_name || '',
        guardian_phone: g.primary_guardian_phone || g.guardian_phone || stu.guardian_phone || stu.details?.guardian_phone || stu.details?.emergency_phone || stu.details?.father_phone || prev.guardian_phone || '',
        guardian_relation: g.guardian_relation || stu.details?.guardian_relation || 'Father',
        guardian_nid: g.guardian_nid || '',
        emergency_contact_phone: g.emergency_contact_phone || stu.details?.emergency_phone || '',
        street_address: pAddr.street_address || pAddr.address_line1 || '',
        post_code: pAddr.post_code || '',
        thana_or_upazila: pAddr.thana_or_upazila || pAddr.thana || '',
        district: pAddr.district || '',
        division: pAddr.division || '',
        perm_street: permAddr.street_address || permAddr.address_line1 || '',
        perm_post_code: permAddr.post_code || '',
        perm_thana: permAddr.thana_or_upazila || permAddr.thana || '',
        perm_district: permAddr.district || '',
        perm_division: permAddr.division || '',
      }));
    };

    fetchWithAuth(`/api/v1/students/${editId}/full-profile/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((stu) => {
        if (stu) {
          applyStudentData(stu);
        } else {
          return fetchWithAuth(`/api/v1/students/${editId}/`)
            .then((res2) => (res2.ok ? res2.json() : null))
            .then((stu2) => {
              if (stu2) {
                applyStudentData(stu2);
              } else {
                const localStu = (studentStore.getAll() || []).find((s) => String(s.id) === String(editId));
                if (localStu) applyStudentData(localStu);
              }
            });
        }
      })
      .catch((err) => {
        console.warn("Failed to load student for editing, checking local cache", err);
        const localStu = (studentStore.getAll() || []).find((s) => String(s.id) === String(editId));
        if (localStu) applyStudentData(localStu);
      })
      .finally(() => {
        if (isMounted) setLoadingEditData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editId]);

  // Sync sharedData from search parameters if not in edit mode
  useEffect(() => {
    if (!editId) {
      const qName = searchParams.get('name');
      const qDept = searchParams.get('dept') || searchParams.get('department');
      const qClass = searchParams.get('class') || searchParams.get('student_class');
      const qSection = searchParams.get('section') || searchParams.get('student_section');
      if (qName || qDept || qClass || qSection) {
        setSharedData((prev) => ({
          ...prev,
          name: qName != null && qName !== '' ? qName : prev.name,
          department: qDept != null && qDept !== '' ? qDept : prev.department,
          student_class: qClass != null && qClass !== '' ? qClass : prev.student_class,
          student_section: qSection != null && qSection !== '' ? qSection : prev.student_section,
        }));
      }
    }
  }, [searchParams, editId]);

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
    const url = getPublicAdmissionUrl(currentInstitution, tokenItem.token);
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

  const handleClose = (studentToHighlight) => {
    const returnTo = searchParams.get('returnTo');
    const targetStudent = studentToHighlight || admittedStudent || editingStudent;
    if (returnTo) {
      const delimiter = returnTo.includes('?') ? '&' : '?';
      const nameVal = targetStudent?.name_en || targetStudent?.name || '';
      const idVal = targetStudent?.id || '';
      const deptVal = targetStudent?.department || targetStudent?.department_id || '';
      const classVal = targetStudent?.student_class || targetStudent?.class_id || '';
      const secVal =
        targetStudent?.student_section ||
        (typeof targetStudent?.section === 'object' ? targetStudent?.section?.id : targetStudent?.section) ||
        targetStudent?.section_id ||
        '';
      const groupVal = targetStudent?.group_name || targetStudent?.section_name || targetStudent?.sub || '';

      const redirectParams = new URLSearchParams();
      if (nameVal) redirectParams.set('selectedStudentName', nameVal);
      if (idVal) redirectParams.set('selectedStudentId', String(idVal));
      if (deptVal) redirectParams.set('dept', String(deptVal));
      if (classVal) redirectParams.set('class', String(classVal));
      if (secVal) redirectParams.set('section', String(secVal));
      if (groupVal) redirectParams.set('group', String(groupVal));

      const redirectUrl = redirectParams.toString()
        ? `${returnTo}${delimiter}${redirectParams.toString()}`
        : returnTo;
      navigate(redirectUrl, { replace: true });
      return;
    }
    if (targetStudent?.id) {
      navigate(`/groups-students?highlight=${targetStudent.id}`);
    } else {
      navigate('/groups-students');
    }
  };

  // Access control guards (Evaluated strictly AFTER all React hooks have executed unconditionally)
  if (!isAdmissionModuleEnabled) {
    return (
      <AccessDeniedView
        sectionKey="student_admission"
        title="Student Admission Restricted"
        message="Student Admission & Registration has been disabled by your institution administrator."
      />
    );
  }

  if (editId && !canEditStudent) {
    return (
      <AccessDeniedView
        sectionKey="student_roster_edit_student"
        title="Student Edit Access Restricted"
        message="Editing student profiles has been disabled by your institution administrator. If you need to make changes to student profiles, contact your administrator."
      />
    );
  }

  if (!canUseQuick && !canUseFull && !canUseOnlineQr && !canUseApprovals) {
    return (
      <AccessDeniedView
        sectionKey="student_admission"
        title="All Admission Channels Restricted"
        message="All student admission channels (Quick, Full Wizard, Online QR, and Approvals) have been disabled by your institution administrator."
      />
    );
  }

  if (rawUrlTab === 'quick' && !canUseQuick) {
    return (
      <AccessDeniedView
        sectionKey="student_admission_quick"
        title="Quick Admission Restricted"
        message="Quick Student Admission has been disabled by your institution administrator."
      />
    );
  }

  if (rawUrlTab === 'direct' && !canUseFull) {
    return (
      <AccessDeniedView
        sectionKey="student_admission_full"
        title="Full Admission Wizard Restricted"
        message="The Full Admission Wizard has been disabled by your institution administrator."
      />
    );
  }

  if (rawUrlTab === 'online_qr' && !canUseOnlineQr) {
    return (
      <AccessDeniedView
        sectionKey="student_admission_online_qr"
        title="Online QR & Link Admission Restricted"
        message="Online QR Code and public link admission channels have been disabled by your institution administrator."
      />
    );
  }

  if (rawUrlTab === 'approvals' && !canUseApprovals) {
    return (
      <AccessDeniedView
        sectionKey="student_admission_pending_approvals"
        title="Admission Approvals Restricted"
        message="Student admission approvals queue has been disabled by your institution administrator."
      />
    );
  }

  return (
    <PageContainer>
      {/* Edit Mode Notice Banner */}
      {editingStudent && activeTab !== 'online_qr' && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl theme-bg-accent-soft border theme-border shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center shrink-0 shadow-xs">
              <EditIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-normal theme-text-secondary">
                  Editing Student Profile: <span className="font-bold theme-text-primary">{editingStudent.name_en || editingStudent.name}</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border">
                  {editingStudent.uniq_id || `ID: ${editingStudent.id}`}
                </span>
              </div>
            </div>
          </div>

          <CustomButton
            type="button"
            variant="secondary"
            size="xs"
            icon={CloseIcon}
            onClick={() => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('edit');
                next.delete('student_id');
                next.delete('id');
                return next;
              });
              handleReset();
            }}
          >
            Cancel
          </CustomButton>
        </div>
      )}

      {/* 2. Mode Tab Switcher */}
      <TabSwitcher
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={tabsList}
        rightContent={
          activeTab === 'online_qr' ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenCreateDrawer}
            >
              Generate Link &amp; QR
            </CustomButton>
          ) : null
        }
      />

      {/* 3. Main Container Body */}
      {/* TAB 1: Quick Admission */}
      {activeTab === 'quick' && (
        <div className="pt-2">
          {admittedStudent ? (
            <div className="p-8 rounded-3xl theme-bg-surface border theme-border shadow-md max-w-xl mx-auto text-center space-y-5 animate-zoom-in">
              <AdmissionSuccessModal
                student={admittedStudent}
                isEditing={Boolean(editingStudent || sharedData?.is_editing)}
                onReset={handleReset}
                onClose={handleClose}
              />
            </div>
          ) : (
            <QuickAdmissionForm
              onCancel={() => {
                const returnTo = searchParams.get('returnTo');
                if (returnTo) {
                  navigate(returnTo, { replace: true });
                } else {
                  handleClose();
                }
              }}
              onSuccess={(stu) => {
                const returnTo = searchParams.get('returnTo');
                if (returnTo) {
                  handleClose(stu);
                } else {
                  setAdmittedStudent(stu);
                }
              }}
              sharedData={sharedData}
              setSharedData={setSharedData}
              editingStudent={editingStudent}
            />
          )}
        </div>
      )}

      {/* TAB 2: Full Admission Wizard */}
      {activeTab === 'direct' && (
        <div className="pt-2">
          {admittedStudent ? (
            <div className="p-8 rounded-3xl theme-bg-surface border theme-border shadow-md max-w-xl mx-auto text-center space-y-5 animate-zoom-in">
              <AdmissionSuccessModal
                student={admittedStudent}
                isEditing={Boolean(editingStudent || sharedData?.is_editing || editId)}
                onReset={handleReset}
                onClose={handleClose}
              />
            </div>
          ) : (
            <FullAdmissionWizard
              onCancel={handleClose}
              onSuccess={(stu) => {
                const returnTo = searchParams.get('returnTo');
                if (returnTo) {
                  handleClose(stu);
                } else {
                  setAdmittedStudent(stu);
                }
              }}
              sharedData={sharedData}
              setSharedData={setSharedData}
              isEditing={Boolean(editingStudent || sharedData?.is_editing || editId)}
              editStudentId={editId || editingStudent?.id || sharedData?.edit_student_id}
            />
          )}
        </div>
      )}

      {/* TAB 3: Online QR & Link Admission Management */}
      {activeTab === 'online_qr' && (
        <div className="space-y-6 animate-fade-in">
          {loadingTokens ? (
            <div className="p-12 rounded-3xl theme-bg-surface border-0 shadow-xs flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent theme-accent animate-spin" />
              <p className="text-xs theme-text-secondary font-medium">Loading admission campaigns...</p>
            </div>
          ) : tokens.length === 0 ? (
            <EmptyState
              icon={QrCodeIcon}
              iconVariant="accent"
              title="No Admission QR Links Generated"
              description="Create shareable online admission links and downloadable QR codes for applicants and guardians to register remotely."
              action={{
                label: "Generate First Admission QR Link",
                icon: PlusIcon,
                onClick: handleOpenCreateDrawer,
                variant: "primary",
              }}
              variant="card"
              className="border-0 rounded-3xl"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tokens.map((tokenItem) => {
                return (
                  <div
                    key={tokenItem.id}
                    className="p-5 sm:p-6 rounded-3xl theme-bg-surface border-0 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
                  >
                    {/* Top Row: Title & Status */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase theme-bg-accent-soft theme-accent border-0">
                          {tokenItem.session_year}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border-0 ${
                            tokenItem.is_active
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
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
                    <div className="p-3.5 rounded-2xl theme-bg-app border-0 grid grid-cols-2 gap-2 text-center">
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
                    <div className="p-2.5 rounded-xl theme-bg-app border-0 flex items-center justify-between text-xs font-mono theme-text-secondary">
                      <span className="truncate mr-2">{tokenItem.token}</span>
                      <IconButton
                        icon={CopyIcon}
                        size="xs"
                        variant="ghost"
                        onClick={() => handleCopyLink(tokenItem)}
                        title="Copy Link"
                        ariaLabel="Copy Link"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                      <CustomButton
                        type="button"
                        size="xs"
                        variant="primary"
                        icon={QrCodeIcon}
                        onClick={() => setSelectedTokenForQR(tokenItem)}
                      >
                        View QR Card
                      </CustomButton>

                      <div className="flex items-center gap-1.5">
                        <CustomButton
                          type="button"
                          size="xs"
                          variant="sub"
                          onClick={() => handleToggleActive(tokenItem)}
                          className="flex-1"
                        >
                          {tokenItem.is_active ? 'Pause' : 'Resume'}
                        </CustomButton>
                        <IconButton
                          icon={TrashIcon}
                          size="sm"
                          variant="danger-soft"
                          onClick={() => handleDeleteToken(tokenItem)}
                          title="Delete Campaign"
                          ariaLabel="Delete Campaign"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Pending Approvals Queue (Unified Reusable Approvals Engine) */}
      {activeTab === 'approvals' && (
        <div className="pt-2 border-0">
          <ApprovalQueuePanel domain="STUDENT_ADMISSION" />
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
