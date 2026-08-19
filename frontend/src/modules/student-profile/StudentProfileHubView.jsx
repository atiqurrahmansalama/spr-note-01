import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { useFeatureControl } from "../../context/FeatureControlContext";
import {
  StudentIcon,
  ClassIcon,
  GroupIcon,
  BookOpenIcon,
  TagIcon,
  HistoryIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PhoneIcon,
  WhatsAppIcon,
  UploadIcon,
  DownloadIcon,
  FileIcon,
  PrintIcon,
  TransferIcon,
  AdmissionIcon,
  ShieldIcon,
  QrCodeIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  CloseIcon,
  CopyIcon,
  CameraIcon,
  LocationPinIcon,
} from "../../components/ui/Icons";
import ActionMenu from "../../components/ui/ActionMenu";
import Modal from "../../components/ui/Modal";
import StudentTransferModal from "./StudentTransferModal";

// Bulletproof file type checkers
const isImageFile = (url = '', title = '') => {
  const clean = `${title} ${url}`.toLowerCase();
  return (
    /\.(jpg|jpeg|png|svg|webp|gif|bmp|jfif|heic)(\?|$)/i.test(clean) ||
    clean.includes('image/')
  );
};

const isPdfFile = (url = '', title = '') => {
  const clean = `${title} ${url}`.toLowerCase();
  return /\.pdf(\?|$)/i.test(clean);
};

const isOfficeFile = (url = '', title = '') => {
  const clean = `${title} ${url}`.toLowerCase();
  return /\.(doc|docx|xls|xlsx|csv|ppt|pptx)(\?|$)/i.test(clean);
};

// Convert full backend URLs (e.g. http://127.0.0.1:8000/media/...) to same-origin relative URLs (/media/...)
const getDocUrl = (rawUrl) => {
  if (!rawUrl) return '';
  const clean = rawUrl
    .replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i, '')
    .trim();
  return clean.startsWith('/') ? clean : `/${clean}`;
};

export default function StudentProfileHubView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSectionEnabled } = useFeatureControl();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preserve activeTab in sessionStorage so it never auto-switches
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem(`spr_student_tab_${id}`) || "personal";
    } catch {
      return "personal";
    }
  });

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    try {
      sessionStorage.setItem(`spr_student_tab_${id}`, tabKey);
    } catch {}
  };

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Document Vault State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [renameDocTarget, setRenameDocTarget] = useState(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    loadStudentProfile(true);
  }, [id]);

  // Load PDF into safe Blob URL for seamless browser embedding
  useEffect(() => {
    if (selectedDoc && isPdfFile(selectedDoc.file, selectedDoc.title) && isPreviewModalOpen) {
      let active = true;
      setPdfLoading(true);
      setPdfBlobUrl(null);
      const url = getDocUrl(selectedDoc.file);

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load PDF");
          return res.blob();
        })
        .then((blob) => {
          if (active) {
            const bUrl = URL.createObjectURL(
              new Blob([blob], { type: "application/pdf" })
            );
            setPdfBlobUrl(bUrl);
            setPdfLoading(false);
          }
        })
        .catch((err) => {
          console.warn("PDF blob load error, fallback to URL", err);
          if (active) {
            setPdfBlobUrl(url);
            setPdfLoading(false);
          }
        });

      return () => {
        active = false;
        if (pdfBlobUrl && pdfBlobUrl.startsWith("blob:")) {
          URL.revokeObjectURL(pdfBlobUrl);
        }
      };
    } else {
      setPdfBlobUrl(null);
      setPdfLoading(false);
    }
  }, [selectedDoc, isPreviewModalOpen]);

  const loadStudentProfile = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/full-profile/`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);

        // If no saved tab exists in storage and this is initial load, set default
        const savedTab = sessionStorage.getItem(`spr_student_tab_${id}`);
        if (!savedTab && isInitial) {
          const isHifz = data.department_type === "HIFZ" && isSectionEnabled("quran_hifz_tracker");
          const defaultTab = isHifz ? "quran" : "personal";
          setActiveTab(defaultTab);
          sessionStorage.setItem(`spr_student_tab_${id}`, defaultTab);
        }

        if (data.documents && data.documents.length > 0 && !selectedDoc) {
          setSelectedDoc(data.documents[0]);
        }
      } else {
        showToast("Student profile not found.", "error");
        navigate("/students");
      }
    } catch {
      showToast("Failed to load student profile.", "error");
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // Dedicated direct file download handler
  const handleDownloadFile = async (fileUrl, title) => {
    const url = getDocUrl(fileUrl);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = title || "document";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        showToast("Download started!", "success");
        return;
      }
    } catch (e) {
      console.warn("Direct blob download failed, opening in new tab", e);
    }
    window.open(url, "_blank");
  };

  // Upload student profile photo
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    setUploadingPhoto(true);
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/`, {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        showToast("Profile photo updated successfully!", "success");
        loadStudentProfile(false);
      } else {
        showToast("Failed to update profile photo.", "error");
      }
    } catch {
      showToast("Network error uploading photo.", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Upload Document Vault file
  const handleFileUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    formData.append("doc_type", "OTHER");

    setUploading(true);
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/upload-document/`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("Document uploaded to vault successfully!", "success");
        loadStudentProfile(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to upload document.", "error");
      }
    } catch {
      showToast("Network error during upload.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRenameDocument = async () => {
    if (!renameDocTarget || !newDocTitle.trim()) return;

    try {
      const res = await fetchWithAuth(
        `/api/v1/students/${id}/documents/${renameDocTarget.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newDocTitle.trim() }),
        }
      );

      if (res.ok) {
        showToast("Document renamed successfully!", "success");
        setRenameDocTarget(null);
        setNewDocTitle("");
        loadStudentProfile(false);
      } else {
        showToast("Failed to rename document.", "error");
      }
    } catch {
      showToast("Error updating document title.", "error");
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete document "${title || "file"}"?`)) return;

    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/documents/${docId}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("Document deleted successfully.", "success");
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }
        loadStudentProfile(false);
      } else {
        showToast("Failed to delete document.", "error");
      }
    } catch {
      showToast("Error deleting document.", "error");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const calculateAge = (dobString) => {
    if (!dobString) return "--";
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getDocExtension = (fileUrl = '', title = '') => {
    const fromTitle = title?.split('.').pop()?.toLowerCase();
    const fromUrl = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase();
    return fromTitle || fromUrl || 'file';
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-16 px-4 text-center">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs theme-text-secondary animate-pulse">
          Loading student dossier...
        </p>
      </div>
    );
  }

  if (!student) return null;

  const isHifzDepartment =
    student.department_type === "HIFZ" && isSectionEnabled("quran_hifz_tracker");
  const isActive = (student.status || "ACTIVE").toUpperCase() === "ACTIVE";

  const qrVerificationUrl = `${window.location.origin}/verify-report/${student.uniq_id || student.id}`;

  const heroActionMenuItems = [
    {
      label: "View / Scan QR Code",
      icon: QrCodeIcon,
      onClick: () => setIsQrModalOpen(true),
    },
    {
      label: "Print ID Card",
      icon: PrintIcon,
      onClick: () => window.print(),
    },
    {
      label: "Transfer Class / Group",
      icon: TransferIcon,
      onClick: () => setIsTransferModalOpen(true),
    },
    ...(student.details?.guardian_phone
      ? [
          {
            label: "Contact Guardian",
            icon: WhatsAppIcon,
            onClick: () =>
              window.open(
                `https://wa.me/${student.details.guardian_phone.replace(/[^\d]/g, "")}`,
                "_blank"
              ),
          },
        ]
      : []),
    { divider: true },
    {
      label: "All Students Roster",
      icon: StudentIcon,
      onClick: () => navigate("/students"),
    },
  ];

  const getDocumentActionItems = (doc) => [
    {
      label: "Preview Document",
      icon: SearchIcon,
      onClick: () => {
        setSelectedDoc(doc);
        setIsPreviewModalOpen(true);
      },
    },
    {
      label: "Download File",
      icon: DownloadIcon,
      onClick: () => handleDownloadFile(doc.file, doc.title),
    },
    {
      label: "Rename Document",
      icon: EditIcon,
      onClick: () => {
        setRenameDocTarget(doc);
        setNewDocTitle(doc.title || "");
      },
    },
    { divider: true },
    {
      label: "Delete Document",
      icon: TrashIcon,
      danger: true,
      onClick: () => handleDeleteDocument(doc.id, doc.title),
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4 font-sans theme-text-primary animate-fade-in select-none text-left space-y-6">
      
      {/* --- HERO PROFILE HEADER CARD --- */}
      <div className="theme-bg-surface border theme-border rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          
          {/* Left: Avatar with Camera Upload & Identity Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left flex-1 min-w-0">
            {/* Unbordered Avatar Photo with Camera Upload Icon */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-visible shrink-0 theme-bg-sub shadow-xs">
              <div className="w-full h-full rounded-2xl overflow-hidden">
                {student.photo ? (
                  <img
                    src={getDocUrl(student.photo)}
                    alt={student.name_en || student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold theme-accent theme-bg-accent-soft">
                    {student.name_en ? student.name_en.charAt(0).toUpperCase() : "S"}
                  </div>
                )}
              </div>

              {/* Camera Upload Button */}
              <label
                title="Change student photo"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform border-2 border-white dark:border-zinc-900"
              >
                {uploadingPhoto ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CameraIcon className="w-3.5 h-3.5" />
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>

            {/* Name & Structured Metadata (Line 1: 2 Capsules, Line 2: 2 Normal Texts) */}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
                  {student.name_en || student.name}
                </h1>

                {/* Clean Green Status Pill beside name */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                  }`}
                >
                  {student.status || "Active"}
                </span>
              </div>

              {student.bangla_name && (
                <p className="text-xs theme-text-secondary font-medium">
                  {student.bangla_name}
                </p>
              )}

              {/* Line 1: 2 Capsules (ID & Roll) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border text-xs font-mono font-bold theme-text-primary">
                  <span>ID:</span>
                  <span>{student.uniq_id || `STU-${student.id}`}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border text-xs font-semibold theme-text-primary">
                  <span>Roll:</span>
                  <span className="font-mono font-bold">{student.roll_number ? `#${student.roll_number}` : "--"}</span>
                </span>
              </div>

              {/* Line 2: 2 Normal Texts (Class & Group) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs theme-text-secondary font-medium">
                <span>Class: <strong className="theme-text-primary font-semibold">{student.student_class_name || "General"}</strong></span>
                <span>•</span>
                <span>Group: <strong className="theme-text-primary font-semibold">{student.group_name || student.student_group_name || "General Group"}</strong></span>
              </div>
            </div>
          </div>

          {/* Right: 3-Dot Reusable Action Menu (QR code inside) */}
          <div className="shrink-0">
            <ActionMenu items={heroActionMenuItems} />
          </div>
        </div>
      </div>

      {/* --- TAB HEADERS (Unified Personal & Family with preserved Tab change) --- */}
      <div className="flex border-b theme-border overflow-x-auto gap-6 sm:gap-8 pb-0.5 scrollbar-none">
        {isHifzDepartment && (
          <button
            type="button"
            onClick={() => handleTabChange("quran")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === "quran"
                ? "border-[var(--accent-main)] theme-accent"
                : "border-transparent theme-text-secondary hover:theme-text-primary"
            }`}
          >
            <BookOpenIcon className="w-4 h-4" />
            <span>Quran &amp; Progress</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => handleTabChange("personal")}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "personal"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <StudentIcon className="w-4 h-4" />
          <span>Personal &amp; Family</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("documents")}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "documents"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <TagIcon className="w-4 h-4" />
          <span>Document Vault ({student.documents?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("timeline")}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "timeline"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          <span>Lifecycle Timeline</span>
        </button>
      </div>

      {/* --- TAB CONTENT PANELS --- */}
      <div className="mt-4">
        {/* TAB 1: QURAN & HIFZ TRACKER */}
        {isHifzDepartment && activeTab === "quran" && (
          <div className="space-y-6 animate-fade-in">
            <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
                <div>
                  <h3 className="font-bold text-base theme-text-primary flex items-center gap-2">
                    <BookOpenIcon className="w-5 h-5 text-sky-400" />
                    <span>30-Juz Quran Memorization &amp; Revision Matrix</span>
                  </h3>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    Live tracking of Sabq (New Lesson), Sabqi (Recent Revision), and Manzil (Distant Revision)
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span>Completed:</span>
                  <span>{student.details?.initial_completed_juz || 0} / 30 Juz</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="theme-text-secondary">Overall Hifz Milestones</span>
                  <span className="theme-accent font-mono">
                    {Math.round(((student.details?.initial_completed_juz || 0) / 30) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden p-0.5 border theme-border">
                  <div
                    className="h-full rounded-full theme-bg-accent transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((student.details?.initial_completed_juz || 0) / 30) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UNIFIED PERSONAL & FAMILY WITH DEDICATED ADDRESS CARD */}
        {activeTab === "personal" && (
          <div className="space-y-6 animate-fade-in">
            {/* Card 1: Biographical & Institutional Profile */}
            <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b theme-border pb-3">
                <StudentIcon className="w-4 h-4 theme-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider theme-text-primary">
                  Biographical &amp; Institutional Profile
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Full Legal Name (English)
                  </span>
                  <p className="font-bold theme-text-primary text-sm">{student.name_en || student.name || "--"}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Bangla Name
                  </span>
                  <p className="font-semibold theme-text-primary text-sm">{student.bangla_name || "--"}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Unique Student ID / Roll
                  </span>
                  <p className="font-mono font-bold text-sm theme-accent">
                    {student.uniq_id || `STU-${student.id}`} {student.roll_number ? `(Roll #${student.roll_number})` : ""}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Date of Birth / Age
                  </span>
                  <p className="font-semibold theme-text-primary">
                    {student.details?.date_of_birth || "--"}{" "}
                    {student.details?.date_of_birth && `(${calculateAge(student.details.date_of_birth)} yrs)`}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Blood Group
                  </span>
                  <p className="font-bold text-rose-400">{student.details?.blood_group || "--"}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Admission Date
                  </span>
                  <p className="font-mono font-semibold theme-text-primary">
                    {student.admission_date || "--"}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Guardians & Family Information */}
            <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b theme-border pb-3">
                <GroupIcon className="w-4 h-4 theme-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider theme-text-primary">
                  Guardian &amp; Family Contacts
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Primary Guardian Name
                  </span>
                  <p className="font-bold text-sm theme-text-primary">
                    {student.details?.guardian_name || student.details?.father_name || "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Guardian Phone / WhatsApp
                  </span>
                  {student.details?.guardian_phone ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-sm theme-text-primary">
                        {student.details.guardian_phone}
                      </span>
                      <a
                        href={`https://wa.me/${student.details.guardian_phone.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:scale-110 transition-transform p-1 rounded-md hover:bg-emerald-500/10"
                        title="Chat on WhatsApp"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <p className="font-semibold text-zinc-500 italic">Not Specified</p>
                  )}
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Father's Name
                  </span>
                  <p className="font-semibold theme-text-primary">{student.details?.father_name || "--"}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Mother's Name
                  </span>
                  <p className="font-semibold theme-text-primary">{student.details?.mother_name || "--"}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Emergency Contact
                  </span>
                  <p className="font-mono font-semibold theme-text-primary">
                    {student.details?.emergency_contact_phone || "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
                    Guardian Relation / Profession
                  </span>
                  <p className="font-semibold theme-text-primary">
                    {student.details?.guardian_relation || student.details?.father_occupation || "--"}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Dedicated Comprehensive Address Card */}
            <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b theme-border pb-3">
                <LocationPinIcon className="w-4 h-4 theme-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider theme-text-primary">
                  Residential &amp; Address Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Present / Residential Address
                  </span>
                  <p className="font-semibold theme-text-primary leading-relaxed text-xs sm:text-sm">
                    {student.details?.present_address || student.address || "No present address on record."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Permanent / Village Address
                  </span>
                  <p className="font-semibold theme-text-primary leading-relaxed text-xs sm:text-sm">
                    {student.details?.permanent_address || student.details?.present_address || student.address || "No permanent address on record."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT VAULT WITH LIVE PREVIEWS & 3-DOT ACTIONS */}
        {activeTab === "documents" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Document List & Gallery */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base theme-text-primary">
                    Vault Attachments ({student.documents?.length || 0})
                  </h3>
                  <span className="text-xs theme-text-secondary">
                    Click file to preview
                  </span>
                </div>

                {student.documents && student.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {student.documents.map((doc) => {
                      const ext = getDocExtension(doc.file, doc.title);
                      const isSelected = selectedDoc?.id === doc.id;
                      const isImg = isImageFile(doc.file, doc.title);
                      const isPdf = isPdfFile(doc.file, doc.title);
                      const isOffice = isOfficeFile(doc.file, doc.title);
                      const fileUrl = getDocUrl(doc.file);

                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsPreviewModalOpen(true);
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "theme-bg-accent-soft border-[var(--accent-main)] shadow-xs"
                              : "theme-bg-surface theme-border hover:theme-bg-sub/60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-xl theme-bg-sub border theme-border flex items-center justify-center shrink-0 overflow-hidden bg-black/5 dark:bg-white/5">
                              {isImg ? (
                                <img
                                  src={fileUrl}
                                  alt={doc.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' /%3E%3C/svg%3E";
                                  }}
                                />
                              ) : isPdf ? (
                                <FileIcon className="w-6 h-6 text-rose-400" />
                              ) : isOffice ? (
                                <FileIcon className="w-6 h-6 text-emerald-400" />
                              ) : (
                                <FileIcon className="w-6 h-6 text-sky-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs truncate theme-text-primary">
                                {doc.title || "Untitled Document"}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="px-1.5 py-0.2 rounded theme-bg-sub border theme-border text-[9px] font-mono font-bold uppercase text-zinc-400">
                                  {ext.toUpperCase()}
                                </span>
                                {doc.uploaded_at && (
                                  <span className="text-[10px] theme-text-secondary truncate">
                                    {new Date(doc.uploaded_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 3-Dot Action Menu for Document */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <ActionMenu items={getDocumentActionItems(doc)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center theme-text-secondary text-xs border border-dashed theme-border rounded-2xl theme-bg-surface">
                    <FileIcon className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="font-bold theme-text-primary text-sm">No documents in vault</p>
                    <p className="text-[11px] mt-1 text-zinc-400">
                      Attach Birth Certificates, NIDs, marksheets, or medical forms.
                    </p>
                  </div>
                )}
              </div>

              {/* Right 1 Col: Compact, Beautiful Upload Box */}
              <div className="lg:col-span-1">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`p-6 rounded-3xl border-2 border-dashed text-center transition-all h-full flex flex-col items-center justify-center space-y-3 ${
                    dragActive
                      ? "border-[var(--accent-main)] bg-[var(--accent-main)]/10 scale-[1.01]"
                      : "theme-border theme-bg-surface hover:theme-bg-sub/40"
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shadow-xs">
                    <UploadIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs theme-text-primary">Add New Document</h4>
                    <p className="text-[11px] theme-text-secondary mt-0.5">
                      Drop PDF, JPG, JPEG, PNG, SVG, DOC, XLS files
                    </p>
                  </div>
                  <label className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all">
                    <UploadIcon className="w-3.5 h-3.5" />
                    <span>Select File</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                    />
                  </label>
                  {uploading && (
                    <p className="text-[11px] theme-accent animate-pulse font-medium">
                      Uploading to vault...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIFECYCLE & TIMELINE */}
        {activeTab === "timeline" && (
          <div className="space-y-6 animate-fade-in">
            <div className="theme-bg-surface border theme-border p-6 md:p-8 rounded-3xl shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
                <div>
                  <h3 className="font-bold text-base theme-text-primary flex items-center gap-2">
                    <HistoryIcon className="w-5 h-5 text-sky-400" />
                    <span>Academic Progression &amp; Historical Timeline</span>
                  </h3>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    Immutable audit log of class promotions, halqa migrations, and grade transfers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <TransferIcon className="w-3.5 h-3.5" />
                  <span>Transfer Class / Group</span>
                </button>
              </div>

              {/* Progression Events List */}
              {student.academic_history && student.academic_history.length > 0 ? (
                <div className="space-y-4">
                  {student.academic_history.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold theme-text-primary text-sm">
                            {record.class_name || "General"}
                          </span>
                          {record.group_name && (
                            <span className="px-2 py-0.5 rounded-md theme-bg-surface border theme-border text-[10px] font-semibold theme-text-secondary">
                              {record.group_name}
                            </span>
                          )}
                          {record.is_current && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Current Enrolment
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] theme-text-secondary">
                          Reason: {record.transition_reason || "Annual Progression"}
                        </p>
                      </div>

                      <div className="text-right font-mono text-[11px] theme-text-secondary shrink-0">
                        <span>{record.start_date || "--"}</span>
                        {record.end_date && <span> &rarr; {record.end_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs theme-text-secondary text-center py-6">
                  No previous transfer history recorded for this student.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- LIVE DOCUMENT PREVIEW MODAL (SUPPORTING JPEG/JPG/PNG/PDF/DOCS) --- */}
      {isPreviewModalOpen && selectedDoc && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={selectedDoc.title || "Document Preview"}
          subtitle={`File Format: ${getDocExtension(selectedDoc.file, selectedDoc.title).toUpperCase()}`}
          icon={FileIcon}
          size="4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => handleDownloadFile(selectedDoc.file, selectedDoc.title)}
                className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="p-4 sm:p-6 w-full flex items-center justify-center min-h-[350px] max-h-[75vh] overflow-auto">
            {isImageFile(selectedDoc.file, selectedDoc.title) ? (
              <div className="flex flex-col items-center justify-center w-full">
                <img
                  src={getDocUrl(selectedDoc.file)}
                  alt={selectedDoc.title}
                  className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-lg border theme-border bg-black/5 dark:bg-black/40"
                  onError={(e) => {
                    console.error("Image failed to load in modal:", selectedDoc.file);
                  }}
                />
              </div>
            ) : isPdfFile(selectedDoc.file, selectedDoc.title) ? (
              pdfLoading ? (
                <div className="w-full h-[70vh] flex flex-col items-center justify-center space-y-3 bg-zinc-900 rounded-2xl border theme-border">
                  <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-400">Loading PDF document...</p>
                </div>
              ) : (
                <div className="w-full h-[70vh] flex flex-col rounded-2xl overflow-hidden border theme-border bg-zinc-900">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800 border-b border-zinc-700 text-xs text-white shrink-0">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileIcon className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="font-semibold truncate">{selectedDoc.title || "PDF Document"}</span>
                    </div>
                    <a
                      href={pdfBlobUrl || getDocUrl(selectedDoc.file)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold inline-flex items-center gap-1.5 transition text-white shrink-0 cursor-pointer"
                    >
                      <span>Open in Tab ↗</span>
                    </a>
                  </div>
                  <iframe
                    src={pdfBlobUrl || getDocUrl(selectedDoc.file)}
                    title={selectedDoc.title || "PDF Document"}
                    className="w-full flex-1 border-0 bg-white"
                  />
                </div>
              )
            ) : (
              <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl theme-bg-sub border theme-border space-y-5 text-center my-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto shadow-xs border border-blue-500/20">
                  <FileIcon className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {getDocExtension(selectedDoc.file, selectedDoc.title).toUpperCase()} DOCUMENT
                  </span>
                  <h4 className="font-bold text-sm sm:text-base theme-text-primary pt-2 break-all">
                    {selectedDoc.title || "Office Document"}
                  </h4>
                  <p className="text-xs theme-text-secondary">
                    Word &amp; Office documents open directly on your device via Microsoft Word or your default office app.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedDoc.file, selectedDoc.title)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download &amp; Open</span>
                  </button>
                  <a
                    href={getDocUrl(selectedDoc.file)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated theme-text-primary transition inline-flex items-center justify-center gap-1.5"
                  >
                    <SearchIcon className="w-3.5 h-3.5" />
                    <span>Open in Browser</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* --- RENAME DOCUMENT MODAL --- */}
      {renameDocTarget && (
        <Modal
          isOpen={Boolean(renameDocTarget)}
          onClose={() => setRenameDocTarget(null)}
          title="Rename Document"
          subtitle="Update file title in student document vault"
          icon={EditIcon}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setRenameDocTarget(null)}
                className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameDocument}
                disabled={!newDocTitle.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                Save Name
              </button>
            </div>
          }
        >
          <div className="p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Document Title
            </label>
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="e.g. Birth Certificate (Verified)"
              className="w-full h-10 px-3.5 py-2 rounded-xl border theme-border theme-bg-sub text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>
        </Modal>
      )}

      {/* --- QR CODE VERIFICATION MODAL --- */}
      {isQrModalOpen && (
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title="Student Verification QR Code"
          subtitle={`Scan to verify student identity (${student.name_en || student.name})`}
          icon={QrCodeIcon}
          size="sm"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrVerificationUrl);
                  showToast("Verification link copied to clipboard!", "success");
                }}
                className="px-3.5 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-md">
              <QRCodeSVG
                value={qrVerificationUrl}
                size={180}
                level="H"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
            </div>
            <div>
              <p className="font-mono font-bold text-sm theme-text-primary">
                {student.uniq_id || `ID-${student.id}`}
              </p>
              <p className="text-xs theme-text-secondary mt-0.5">
                Official Suffah Academy Student ID
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* --- STUDENT TRANSFER MODAL --- */}
      {isTransferModalOpen && (
        <StudentTransferModal
          isOpen={isTransferModalOpen}
          student={student}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={() => loadStudentProfile(false)}
        />
      )}
    </div>
  );
}
