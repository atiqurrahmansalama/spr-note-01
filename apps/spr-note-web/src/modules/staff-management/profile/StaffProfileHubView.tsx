import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '@/utils/authService';
import { useToast } from '@/context/ToastContext';
import { useFeatureControl } from '@/context/FeatureControlContext';
import { useRightSidebar } from '@/context/RightSidebarContext';
import { PageContainer } from '@/components/layout';
import AccessDeniedView from '@/components/common/AccessDeniedView';
import TabSwitcher from '@/components/ui/TabSwitcher';
import {
  TeacherIcon,
  ClassIcon,
  DutyIcon,
  AttendanceIcon,
  BankIcon,
  TagIcon,
  HistoryIcon,
  RefreshIcon,
  ChevronLeftIcon,
} from '@/components/ui/Icons';
import {
  getStaffDetail,
  getTeacherAssignments,
  getStaffDuties,
  getStaffAttendance,
  getLeaveRequests,
} from '@/api/staff';
import StaffDrawerForm from '../StaffDrawerForm';
import TeacherAssignmentDrawerForm from '../TeacherAssignmentDrawerForm';
import GeneralDutyDrawerForm from '../GeneralDutyDrawerForm';
import type { StaffMember, StaffAttendanceRecord, StaffLeaveRequest } from '@/types/staff';

import { StaffProfileHero } from './StaffProfileHero';
import {
  StaffPersonalTab,
  StaffDutiesTab,
  StaffAttendanceTab,
  StaffPayrollTab,
  StaffDocumentsTab,
  StaffTimelineTab,
  TeacherAssignmentItem,
  GeneralDutyItem,
  StaffVaultDocument,
} from './tabs';
import { StaffApplyLeaveModal } from './modals/StaffApplyLeaveModal';
import { DocumentPreviewModal } from '@/modules/student-management/directory/profile/modals/DocumentPreviewModal';
import { DocumentRenameModal } from '@/modules/student-management/directory/profile/modals/DocumentRenameModal';

export const StaffProfileHubView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSectionEnabled } = useFeatureControl();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  // Feature Flag switches
  const canViewProfile =
    isSectionEnabled('staff_roster_view_profile') || isSectionEnabled('staff_roster');
  const canEditStaff = isSectionEnabled('staff_roster_edit_staff');
  const canAssignDuties = isSectionEnabled('staff_roster_assign_duties');

  const isPersonalEnabled = isSectionEnabled('staff_profile_personal_family');
  const isDutiesEnabled = isSectionEnabled('staff_profile_duties_assignments');
  const isAttendanceEnabled = isSectionEnabled('staff_profile_attendance');
  const isPayrollEnabled = isSectionEnabled('staff_profile_payroll_salary');
  const isVaultEnabled = isSectionEnabled('staff_profile_document_vault');
  const isTimelineEnabled = isSectionEnabled('staff_profile_lifecycle_timeline');

  // Core Data States
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>([]);
  const [duties, setDuties] = useState<GeneralDutyItem[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<StaffAttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('personal');

  // Modals & Document Vault States
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<StaffVaultDocument | null>(null);
  const [renameDocTarget, setRenameDocTarget] = useState<StaffVaultDocument | null>(null);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [isRenamingDoc, setIsRenamingDoc] = useState<boolean>(false);

  // Load Staff Data
  const loadStaffData = useCallback(
    async (isInitial = false) => {
      if (!id) return;
      if (isInitial) setLoading(true);

      try {
        const data: StaffMember = await getStaffDetail(id);
        setStaff(data);

        // Automatically synchronize URL in address bar to human-readable employee_id slug
        if (data?.employee_id && typeof window !== 'undefined') {
          const cleanSlug = data.employee_id.toLowerCase();
          if (id && id.toLowerCase() !== cleanSlug) {
            const currentSearch = window.location.search || '';
            window.history.replaceState(
              window.history.state || {},
              '',
              `/staff/${cleanSlug}${currentSearch}`
            );
          }
        }

        // Concurrently fetch assignments, duties, attendance logs, and leaves using canonical ID
        const staffCanonicalId = data.id || id;
        const [assignRes, dutyRes, attRes, leaveRes] = await Promise.allSettled([
          data.staff_type === 'TEACHING'
            ? getTeacherAssignments({ teacher: staffCanonicalId })
            : Promise.resolve([]),
          data.staff_type !== 'TEACHING'
            ? getStaffDuties({ staff: staffCanonicalId })
            : Promise.resolve([]),
          getStaffAttendance({ staff: staffCanonicalId }),
          getLeaveRequests({ staff: staffCanonicalId }),
        ]);

        if (assignRes.status === 'fulfilled') {
          const aVal = assignRes.value;
          setAssignments(Array.isArray(aVal) ? aVal : aVal?.results || []);
        }
        if (dutyRes.status === 'fulfilled') {
          const dVal = dutyRes.value;
          setDuties(Array.isArray(dVal) ? dVal : dVal?.results || []);
        }
        if (attRes.status === 'fulfilled') {
          const attVal = attRes.value;
          setAttendanceLogs(Array.isArray(attVal) ? attVal : attVal?.results || []);
        }
        if (leaveRes.status === 'fulfilled') {
          const lVal = leaveRes.value;
          setLeaves(Array.isArray(lVal) ? lVal : lVal?.results || []);
        }

        // Restore tab from sessionStorage if available
        const savedTab = sessionStorage.getItem(`spr_staff_tab_${id}`);
        if (savedTab && isInitial) {
          setActiveTab(savedTab);
        }
      } catch (err: any) {
        console.error('Error fetching staff profile details:', err);
        showToast(err.message || 'Failed to load staff details', 'error');
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [id, showToast]
  );

  useEffect(() => {
    if (id) {
      loadStaffData(true);
    }
  }, [id, loadStaffData]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    if (id) {
      sessionStorage.setItem(`spr_staff_tab_${id}`, nextTab);
    }
  };

  // Drawer handlers (with URL synchronization)
  const handleOpenEditDrawer = () => {
    if (!staff) return;
    openRightSidebar({
      drawerKey: 'edit_staff_profile',
      syncUrl: true,
      title: `Edit ${staff.user_name || 'Staff'} Profile`,
      subtitle: 'Modify designation, qualifications, credentials, and hierarchy rank',
      width: 'lg',
      content: (
        <StaffDrawerForm
          key={`edit_staff_profile_${staff.id}`}
          staffData={staff}
          onSaved={() => {
            showToast('Profile updated!', 'success');
            loadStaffData(false);
            closeRightSidebar();
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  const handleOpenAssignDrawer = () => {
    if (!staff) return;
    const isTeaching = staff.staff_type === 'TEACHING';

    if (isTeaching) {
      openRightSidebar({
        drawerKey: 'teaching_assignments',
        syncUrl: true,
        title: 'Class & Subject Assignments',
        subtitle: `Manage assigned academic classes and groups for ${staff.user_name || staff.employee_id}`,
        width: 'md',
        content: (
          <TeacherAssignmentDrawerForm
            key={`assign_drawer_${staff.id}`}
            teacher={staff}
            onUpdated={() => {
              loadStaffData(false);
            }}
            onCancel={() => closeRightSidebar()}
          />
        ),
      });
    } else {
      openRightSidebar({
        drawerKey: 'general_duties',
        syncUrl: true,
        title: 'General & Campus Duties',
        subtitle: `Assign residential, dining, or gate duties for ${staff.user_name || staff.employee_id}`,
        width: 'md',
        content: (
          <GeneralDutyDrawerForm
            key={`duty_drawer_${staff.id}`}
            staff={staff}
            onUpdated={() => {
              loadStaffData(false);
            }}
            onCancel={() => closeRightSidebar()}
          />
        ),
      });
    }
  };

  // Direct file download handler
  const handleDownloadFile = async (fileUrl: string, title?: string) => {
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = title || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        showToast('Download started!', 'success');
        return;
      }
    } catch (e) {
      console.warn('Direct blob download failed, opening in new tab', e);
    }
    window.open(fileUrl, '_blank');
  };

  // Document Vault: Upload
  const handleUploadDocument = async (file: File) => {
    if (!file || !id) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('doc_type', 'OTHER');

    setUploadingDoc(true);
    try {
      const res = await fetchWithAuth(`/api/v1/staff/${id}/upload-document/`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        showToast('Document uploaded to vault successfully!', 'success');
        loadStaffData(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to upload document.', 'error');
      }
    } catch {
      showToast('Network error during upload.', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Document Vault: Rename
  const handleRenameDocument = async () => {
    if (!renameDocTarget || !newDocTitle.trim() || !id) return;

    setIsRenamingDoc(true);
    try {
      const res = await fetchWithAuth(
        `/api/v1/staff/${id}/documents/${renameDocTarget.id}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newDocTitle.trim() }),
        }
      );

      if (res.ok) {
        showToast('Document renamed successfully!', 'success');
        setRenameDocTarget(null);
        setNewDocTitle('');
        loadStaffData(false);
      } else {
        showToast('Failed to rename document.', 'error');
      }
    } catch {
      showToast('Error updating document title.', 'error');
    } finally {
      setIsRenamingDoc(false);
    }
  };

  // Document Vault: Delete
  const handleDeleteDocument = async (docId: string | number, title?: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete document "${title || 'file'}"?`))
      return;

    try {
      const res = await fetchWithAuth(`/api/v1/staff/${id}/documents/${docId}/`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Document deleted successfully.', 'success');
        if (previewDoc?.id === docId) {
          setPreviewDoc(null);
        }
        loadStaffData(false);
      } else {
        showToast('Failed to delete document.', 'error');
      }
    } catch {
      showToast('Error deleting document.', 'error');
    }
  };

  // Dynamic Tabs with Feature Control Switches
  const isTeaching = staff?.staff_type === 'TEACHING';

  const availableTabs = useMemo(() => {
    const list = [];
    if (isPersonalEnabled) {
      list.push({ id: 'personal', label: 'Personal & Biographical', icon: TeacherIcon });
    }
    if (isDutiesEnabled) {
      list.push({
        id: 'duties',
        label: isTeaching ? 'Assigned Classes' : 'Operational Duties',
        badge: isTeaching ? assignments.length : duties.length,
        icon: isTeaching ? ClassIcon : DutyIcon,
      });
    }
    if (isAttendanceEnabled) {
      list.push({
        id: 'attendance',
        label: 'Attendance Logs',
        badge: attendanceLogs.length,
        icon: AttendanceIcon,
      });
    }
    if (isPayrollEnabled) {
      list.push({ id: 'payroll', label: 'Payroll & Banking', icon: BankIcon });
    }
    if (isVaultEnabled) {
      const docsCount = ((staff as any)?.documents || []).length;
      list.push({
        id: 'documents',
        label: 'Document Vault',
        badge: docsCount,
        icon: TagIcon,
      });
    }
    if (isTimelineEnabled) {
      list.push({ id: 'timeline', label: 'Lifecycle Timeline', icon: HistoryIcon });
    }
    return list;
  }, [
    isPersonalEnabled,
    isDutiesEnabled,
    isAttendanceEnabled,
    isPayrollEnabled,
    isVaultEnabled,
    isTimelineEnabled,
    isTeaching,
    assignments.length,
    duties.length,
    attendanceLogs.length,
    staff,
  ]);

  // Adjust activeTab if current tab is disabled
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Access Denied / Feature Gate Handling
  if (!canViewProfile) {
    return (
      <AccessDeniedView
        sectionKey="staff_roster_view_profile"
        title="Staff Profile Access Restricted"
        message="Viewing staff profile details has been restricted by your institution administrator."
      />
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="p-12 text-center theme-text-secondary flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <RefreshIcon className="w-8 h-8 theme-accent animate-spin" />
        <span className="text-sm font-medium">Loading staff profile details...</span>
      </div>
    );
  }

  // Not Found State
  if (!staff) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold theme-text-primary">Staff Member Not Found</h2>
        <p className="text-xs theme-text-secondary">
          The requested staff record does not exist or has been archived.
        </p>
        <button
          onClick={() => navigate('/staff/roster')}
          className="inline-flex items-center gap-1.5 px-4 py-2 theme-bg-app hover:theme-bg-elevated/40 theme-text-primary rounded-2xl text-xs font-semibold cursor-pointer border-0 shadow-xs"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          <span>Return to Staff Directory</span>
        </button>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="6xl">
      <div className="space-y-6">
        {/* 1. Hero Profile Card (Apple-style Borderless Soft Surface) */}
        <StaffProfileHero
          staff={staff}
          canEditStaff={canEditStaff}
          canAssignDuties={canAssignDuties}
          onOpenEditDrawer={handleOpenEditDrawer}
          onOpenAssignDrawer={handleOpenAssignDrawer}
          onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
        />

        {/* 2. Dynamic Feature-Controlled Tab Switcher */}
        {availableTabs.length > 0 && (
          <TabSwitcher
            tabs={availableTabs}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        )}

        {/* 3. Tab Contents */}
        {activeTab === 'personal' && isPersonalEnabled && (
          <StaffPersonalTab staff={staff} />
        )}

        {activeTab === 'duties' && isDutiesEnabled && (
          <StaffDutiesTab
            staff={staff}
            assignments={assignments}
            duties={duties}
            canAssignDuties={canAssignDuties}
            onOpenAssignDrawer={handleOpenAssignDrawer}
          />
        )}

        {activeTab === 'attendance' && isAttendanceEnabled && (
          <StaffAttendanceTab attendanceLogs={attendanceLogs} />
        )}

        {activeTab === 'payroll' && isPayrollEnabled && (
          <StaffPayrollTab staff={staff} />
        )}

        {activeTab === 'documents' && isVaultEnabled && (
          <StaffDocumentsTab
            staff={staff}
            uploading={uploadingDoc}
            onUploadFile={handleUploadDocument}
            onPreviewDoc={(doc) => setPreviewDoc(doc)}
            onDownloadDoc={handleDownloadFile}
            onRenameDoc={(doc) => {
              setRenameDocTarget(doc);
              setNewDocTitle(doc.title);
            }}
            onDeleteDoc={handleDeleteDocument}
          />
        )}

        {activeTab === 'timeline' && isTimelineEnabled && (
          <StaffTimelineTab staff={staff} timeline={(staff as any).timeline} />
        )}
      </div>

      {/* Leave Application Modal */}
      <StaffApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        staffId={staff.id}
        onLeaveApplied={() => loadStaffData(false)}
      />

      {/* Document Vault Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        doc={previewDoc as any}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownloadFile}
      />

      {/* Document Vault Rename Modal */}
      <DocumentRenameModal
        isOpen={Boolean(renameDocTarget)}
        doc={renameDocTarget as any}
        newTitle={newDocTitle}
        onNewTitleChange={setNewDocTitle}
        onClose={() => {
          setRenameDocTarget(null);
          setNewDocTitle('');
        }}
        onSubmit={handleRenameDocument}
        loading={isRenamingDoc}
      />
    </PageContainer>
  );
};

export default StaffProfileHubView;
