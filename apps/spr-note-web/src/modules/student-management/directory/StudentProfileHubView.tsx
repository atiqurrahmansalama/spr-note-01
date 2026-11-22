import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../../utils/authService';
import { useToast } from '../../../context/ToastContext';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { PageContainer } from '../../../components/layout';
import AccessDeniedView from '../../../components/common/AccessDeniedView';
import TabSwitcher from '../../../components/ui/TabSwitcher';
import {
  StudentIcon,
  BookOpenIcon,
  TagIcon,
  HistoryIcon,
  RefreshIcon,
  ChevronLeftIcon,
} from '../../../components/ui/Icons';
import { StudentTransferDrawer } from './components';
import {
  StudentFullProfile,
  StudentVaultDocument,
  getDocUrl,
  StudentProfileHero,
  StudentPersonalTab,
  StudentQuranTab,
  StudentDocumentsTab,
  StudentTimelineTab,
  StudentQrModal,
  DocumentPreviewModal,
  DocumentRenameModal,
} from './profile';

export const StudentProfileHubView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSectionEnabled } = useFeatureControl();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const canViewProfile = isSectionEnabled('student_roster_view_profile');
  const canEditStudent = isSectionEnabled('student_roster_edit_student');
  const canTransferStudent = isSectionEnabled('student_roster_academic_transfer');

  const [student, setStudent] = useState<StudentFullProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('personal');

  // Photo & Document Upload States
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  // Modals state
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<StudentVaultDocument | null>(null);
  const [renameDocTarget, setRenameDocTarget] = useState<StudentVaultDocument | null>(null);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [isRenamingDoc, setIsRenamingDoc] = useState<boolean>(false);

  // Load student profile details
  const loadStudentProfile = useCallback(
    async (isInitial = false) => {
      if (!id) return;
      if (isInitial) setLoading(true);

      try {
        const res = await fetchWithAuth(`/api/v1/students/${id}/full-profile/`);
        if (res.ok) {
          const data: StudentFullProfile = await res.json();
          setStudent(data);

          const savedTab = sessionStorage.getItem(`spr_student_tab_${id}`);
          if (!savedTab && isInitial) {
            const isHifz =
              data.department_type === 'HIFZ' && isSectionEnabled('quran_hifz_tracker');
            const defaultTab = isHifz ? 'quran' : 'personal';
            setActiveTab(defaultTab);
            sessionStorage.setItem(`spr_student_tab_${id}`, defaultTab);
          } else if (savedTab && isInitial) {
            setActiveTab(savedTab);
          }
        } else {
          showToast('Student profile not found.', 'error');
          navigate('/students');
        }
      } catch (err: any) {
        console.error('Error fetching student profile:', err);
        showToast('Failed to load student profile.', 'error');
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [id, isSectionEnabled, navigate, showToast]
  );

  useEffect(() => {
    if (id) {
      loadStudentProfile(true);
    }
  }, [id, loadStudentProfile]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    if (id) {
      sessionStorage.setItem(`spr_student_tab_${id}`, nextTab);
    }
  };

  // Direct file download handler
  const handleDownloadFile = async (fileUrl: string, title?: string) => {
    const url = getDocUrl(fileUrl);
    try {
      const res = await fetch(url);
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
    window.open(url, '_blank');
  };

  // Upload student photo
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('photo', file);

    setUploadingPhoto(true);
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/`, {
        method: 'PATCH',
        body: formData,
      });

      if (res.ok) {
        showToast('Profile photo updated successfully!', 'success');
        loadStudentProfile(false);
      } else {
        showToast('Failed to update profile photo.', 'error');
      }
    } catch {
      showToast('Network error uploading photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Upload document to vault
  const handleUploadDocument = async (file: File) => {
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('doc_type', 'OTHER');

    setUploadingDoc(true);
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/upload-document/`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        showToast('Document uploaded to vault successfully!', 'success');
        loadStudentProfile(false);
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

  // Rename document
  const handleRenameDocument = async () => {
    if (!renameDocTarget || !newDocTitle.trim() || !id) return;

    setIsRenamingDoc(true);
    try {
      const res = await fetchWithAuth(
        `/api/v1/students/${id}/documents/${renameDocTarget.id}/`,
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
        loadStudentProfile(false);
      } else {
        showToast('Failed to rename document.', 'error');
      }
    } catch {
      showToast('Error updating document title.', 'error');
    } finally {
      setIsRenamingDoc(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string | number, title?: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete document "${title || 'file'}"?`)) return;

    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/documents/${docId}/`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Document deleted successfully.', 'success');
        if (previewDoc?.id === docId) {
          setPreviewDoc(null);
        }
        loadStudentProfile(false);
      } else {
        showToast('Failed to delete document.', 'error');
      }
    } catch {
      showToast('Error deleting document.', 'error');
    }
  };

  // Drawer registration for student academic transfer
  useDrawerRegistration(
    'student-transfer',
    (params: any) => {
      const studentId =
        params?.studentId ||
        params?.id ||
        (params?.get ? params.get('studentId') || params.get('id') : null);

      const targetStudent =
        params?.student ||
        (studentId && student && String(student.id) === String(studentId)
          ? student
          : student);

      if (!targetStudent) return null;

      if (!canTransferStudent) {
        return {
          title: 'Academic Transfer Restricted',
          subtitle: `${targetStudent.name_en || targetStudent.name || ''}`,
          category: 'Student Directory',
          size: 'md' as const,
          content: (
            <AccessDeniedView
              variant="drawer"
              sectionKey="student_roster_academic_transfer"
              title="Academic Transfer Restricted"
              message="Student academic and section transfers have been disabled by your institution administrator."
              onClose={closeDrawer}
            />
          ),
        };
      }

      return {
        title: 'Academic Transfer & Reassignment',
        subtitle: `${targetStudent.name_en || targetStudent.name || ''} (${targetStudent.student_id_card_number || targetStudent.uniq_id || targetStudent.id})`,
        category: 'Student Directory',
        size: 'md' as const,
        content: (
          <StudentTransferDrawer
            key={`transfer-${targetStudent.id}`}
            student={targetStudent}
            studentIds={[targetStudent.id]}
            selectedStudents={[targetStudent]}
            onClose={closeDrawer}
            onSuccess={() => {
              closeDrawer();
              loadStudentProfile(false);
            }}
          />
        ),
      };
    },
    [student, canTransferStudent, closeDrawer, loadStudentProfile]
  );

  // Granular profile tab permissions controlled via Feature & Module Control
  // Declared at top level unconditionally before any conditional returns (React Rules of Hooks)
  const isQuranTabEnabled =
    isSectionEnabled('student_profile_quran_progress') &&
    (student?.department_type === 'HIFZ' ? isSectionEnabled('quran_hifz_tracker') : true);
  const isPersonalTabEnabled = isSectionEnabled('student_profile_personal_family');
  const isDocumentsTabEnabled = isSectionEnabled('student_profile_document_vault');
  const isTimelineTabEnabled = isSectionEnabled('student_profile_lifecycle_timeline');

  const tabs = useMemo(() => [
    ...(isQuranTabEnabled
      ? [{ id: 'quran', label: 'Quran & Progress', icon: BookOpenIcon }]
      : []),
    ...(isPersonalTabEnabled
      ? [{ id: 'personal', label: 'Personal & Family', icon: StudentIcon }]
      : []),
    ...(isDocumentsTabEnabled
      ? [
          {
            id: 'documents',
            label: 'Document Vault',
            badge: student?.documents?.length || 0,
            icon: TagIcon,
          },
        ]
      : []),
    ...(isTimelineTabEnabled
      ? [{ id: 'timeline', label: 'Lifecycle Timeline', icon: HistoryIcon }]
      : []),
  ], [isQuranTabEnabled, isPersonalTabEnabled, isDocumentsTabEnabled, isTimelineTabEnabled, student?.documents?.length]);

  // Synchronize active tab when tab permissions change (Unconditional top-level hook)
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // If viewing student profile hubs is disabled by feature control, block access
  if (!canViewProfile) {
    return (
      <AccessDeniedView
        sectionKey="student_roster_view_profile"
        title="Student Profile Access Restricted"
        message="Viewing full student profile hubs has been disabled by your institution administrator. Contact your administrator if you require access."
      />
    );
  }

  if (loading) {
    return (
      <PageContainer maxWidth="6xl">
        <div className="py-24 text-center theme-text-secondary flex flex-col items-center justify-center gap-3">
          <RefreshIcon className="w-8 h-8 theme-accent animate-spin" />
          <span className="text-xs font-medium animate-pulse">Loading student dossier...</span>
        </div>
      </PageContainer>
    );
  }

  if (!student) {
    return (
      <PageContainer maxWidth="6xl">
        <div className="py-24 text-center space-y-4">
          <h2 className="text-lg font-bold theme-text-primary">Student Profile Not Found</h2>
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="inline-flex items-center gap-1.5 px-4 py-2 theme-bg-app hover:theme-bg-elevated/40 theme-text-primary rounded-2xl text-xs font-semibold cursor-pointer border-0 shadow-xs"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            <span>Return to Student Roster</span>
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="6xl">
      <div className="space-y-6">
        {/* 1. Hero Profile Card (Borderless Soft-Surface Standard) */}
        <StudentProfileHero
          student={student}
          uploadingPhoto={uploadingPhoto}
          canEditStudent={canEditStudent}
          canTransferStudent={canTransferStudent}
          onPhotoUpload={handleProfilePhotoUpload}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          onOpenTransferModal={() => openDrawer('student-transfer', { studentId: student.id, student })}
        />

        {/* 2. Reusable Enterprise Tab Switcher & Panels */}
        {tabs.length > 0 ? (
          <>
            <TabSwitcher
              tabs={tabs}
              activeTab={activeTab}
              onChange={handleTabChange}
            />

            {/* 3. Tab Panels */}
            {isQuranTabEnabled && activeTab === 'quran' && (
              <StudentQuranTab student={student} />
            )}

            {isPersonalTabEnabled && activeTab === 'personal' && (
              <StudentPersonalTab student={student} />
            )}

            {isDocumentsTabEnabled && activeTab === 'documents' && (
              <StudentDocumentsTab
                student={student}
                uploading={uploadingDoc}
                onUploadFile={handleUploadDocument}
                onPreviewDoc={(doc) => setPreviewDoc(doc)}
                onDownloadDoc={handleDownloadFile}
                onRenameDoc={(doc) => {
                  setRenameDocTarget(doc);
                  setNewDocTitle(doc.title || '');
                }}
                onDeleteDoc={handleDeleteDocument}
              />
            )}

            {isTimelineTabEnabled && activeTab === 'timeline' && (
              <StudentTimelineTab student={student} />
            )}
          </>
        ) : (
          <div className="p-8 text-center rounded-3xl theme-bg-surface border-0 shadow-xs space-y-2">
            <h3 className="text-sm font-bold theme-text-primary">Profile Details Restricted</h3>
            <p className="text-xs theme-text-secondary">
              All profile tabs have been disabled by your institution administrator.
            </p>
          </div>
        )}

        {/* 4. Modals */}
        <StudentQrModal
          isOpen={isQrModalOpen}
          student={student}
          onClose={() => setIsQrModalOpen(false)}
        />

        <DocumentPreviewModal
          isOpen={Boolean(previewDoc)}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDownloadFile}
        />

        <DocumentRenameModal
          isOpen={Boolean(renameDocTarget)}
          doc={renameDocTarget}
          newTitle={newDocTitle}
          onNewTitleChange={setNewDocTitle}
          onClose={() => {
            setRenameDocTarget(null);
            setNewDocTitle('');
          }}
          onSubmit={handleRenameDocument}
          loading={isRenamingDoc}
        />
      </div>
    </PageContainer>
  );
};

export default StudentProfileHubView;
