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
  AcademicCapIcon,
  SparklesIcon,
  CalendarIcon,
} from "../../components/ui/Icons";
import { getBranchDisplayName } from "../../utils/localStore";
import ActionMenu from "../../components/ui/ActionMenu";
import StatusBadge from "../../components/ui/StatusBadge";
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

/**
 * Enterprise Helper: Resolve standardized curriculum subjects & modules based on class and department.
 */
const getClassSubjects = (className = "", departmentType = "") => {
  const clean = `${className} ${departmentType}`.toLowerCase();
  if (clean.includes("hifz") || clean.includes("quran") || clean.includes("juz") || clean.includes("para")) {
    return [
      { code: "HIFZ", name: "Hifzul Quran (হিফজুল কুরআন)", type: "Core" },
      { code: "TAJW", name: "Tajweed & Makhraj (তাজবীদ ও উচ্চারণ)", type: "Recitation" },
      { code: "DOUR", name: "Daily Sabaq & Dour (সবক ও রিভিশন)", type: "Revision" },
      { code: "TAFS", name: "Surah Meaning & Duas (জরুরি দোয়া ও অর্থ)", type: "Islamic" },
      { code: "ADAB", name: "Akhlaq & Islamic Manners (আখলাক ও তারবিয়াত)", type: "Character" },
    ];
  }
  if (clean.includes("nazera") || clean.includes("noorani") || clean.includes("play") || clean.includes("kg") || clean.includes("nursery")) {
    return [
      { code: "NOOR", name: "Noorani Qaida & Haroof (নূরানী কায়দা ও বর্ণমালা)", type: "Foundation" },
      { code: "NAZR", name: "Quran Nazera Reading (কুরআন পাঠ)", type: "Reading" },
      { code: "MASL", name: "Essential Masail & Namaz (নামাজ ও মাসআলা)", type: "Practical" },
      { code: "LANG", name: "Bangla & English Alphabets (বাংলা ও ইংরেজি)", type: "Language" },
      { code: "MATH", name: "Basic Numeracy & Count (গণিত)", type: "Numeracy" },
    ];
  }
  if (clean.includes("kitab") || clean.includes("mizan") || clean.includes("nahw") || clean.includes("fazilat") || clean.includes("dawra") || clean.includes("alim")) {
    return [
      { code: "NAHW", name: "Arabic Grammar & Sarf (ইলমুন নাহু ও সরফ)", type: "Grammar" },
      { code: "LITR", name: "Arabic Literature & Composition (আরবি সাহিত্য)", type: "Language" },
      { code: "FIQH", name: "Fiqh & Usul-ul-Fiqh (ইসলামি আইন ও নীতি)", type: "Jurisprudence" },
      { code: "HDTH", name: "Hadith Studies & Sunnah (হাদিস শরিফ)", type: "Hadith" },
      { code: "TFSR", name: "Tafsir-ul-Quran (কুরআনের তাফসীর)", type: "Exegesis" },
      { code: "GENL", name: "General Academic Studies (সাধারণ বিষয়াবলি)", type: "Academic" },
    ];
  }
  return [
    { code: "QURN", name: "Quran & Islamic Studies (কুরআন ও ইসলামি শিক্ষা)", type: "Core" },
    { code: "ARBC", name: "Arabic Language (আরবি ভাষা)", type: "Language" },
    { code: "BNGL", name: "Bengali Language & Literature (বাংলা)", type: "General" },
    { code: "ENG",  name: "English Communication (ইংরেজি)", type: "Language" },
    { code: "MATH", name: "General Mathematics (গণিত)", type: "Math" },
    { code: "SCNC", name: "General Science & ICT (বিজ্ঞান ও তথ্যপ্রযুক্তি)", type: "Science" },
  ];
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
        <div className="w-10 h-10 border-4 border-[var(--accent-main)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-4">
          
          {/* Avatar with Camera Upload & Identity Details (Centered on mobile, left-aligned on sm+) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 flex-1 min-w-0 text-center sm:text-left">
            {/* Avatar Photo with Camera Upload Icon */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-visible shrink-0 theme-bg-sub border theme-border shadow-xs">
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

              {/* Camera Upload Button (No Border, Theme Color, Clean Shadow) */}
              <label
                title="Change student photo"
                className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform z-10"
              >
                {uploadingPhoto ? (
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CameraIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

            {/* Name, Filled Status Badge, Bangla Name & Metadata */}
            <div className="space-y-1.5 min-w-0 flex-1 flex flex-col items-center sm:items-start">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary leading-tight">
                  {student.name_en || student.name}
                </h1>

                {/* Reusable Theme Filled Active Badge */}
                <StatusBadge status={student.status || "ACTIVE"} variant="filled" />
              </div>

              {student.bangla_name && (
                <p className="text-xs theme-text-secondary font-medium">
                  {student.bangla_name}
                </p>
              )}

              {/* Minimal Clean Metadata: Line 1: ID, Roll | Line 2: Class, Group */}
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                  {/* ID with Minimal Copy */}
                  <div 
                    onClick={() => {
                      navigator.clipboard.writeText(student.uniq_id || `STU-${student.id}`);
                      showToast("Student ID copied!", "success");
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border font-mono text-xs cursor-pointer hover:border-[var(--border-hover)] transition-all group select-text"
                    title="Click to copy ID"
                  >
                    <span className="text-[10px] uppercase font-bold theme-text-secondary">ID:</span>
                    <span className="font-bold theme-text-primary">{student.uniq_id || `STU-${student.id}`}</span>
                    <CopyIcon className="w-3 h-3 text-zinc-400 group-hover:theme-accent transition-colors shrink-0" />
                  </div>

                  {/* Roll */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg theme-bg-sub border theme-border text-xs">
                    <span className="text-[10px] uppercase font-bold theme-text-secondary">Roll:</span>
                    <span className="font-mono font-bold theme-text-primary">{student.roll_number ? `#${student.roll_number}` : "--"}</span>
                  </span>
                </div>

                {/* Class & Group - Minimal Text with subtle separators */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs theme-text-secondary font-medium">
                  <span>Class: <strong className="theme-text-primary font-semibold">{student.student_class_name || "General"}</strong></span>
                  <span>•</span>
                  <span>Group: <strong className="theme-text-primary font-semibold">{student.group_name || student.student_group_name || "General Group"}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3-Dot Action Menu - Cleanly anchored top-right on mobile & desktop */}
          <div className="absolute top-4 right-4 sm:static shrink-0 pt-0.5">
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
                    <BookOpenIcon className="w-5 h-5 theme-accent" />
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
          <div className="space-y-8 animate-fade-in">
            {/* Card 1: Biographical & Institutional Profile */}
            <div className="theme-bg-surface border theme-border p-7 sm:p-8 rounded-3xl shadow-xs space-y-7">
              <div className="flex items-center justify-between border-b theme-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-xs">
                    <StudentIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                      Biographical &amp; Institutional Profile
                    </h3>
                    <p className="text-[11px] theme-text-secondary mt-0.5">
                      Core personal credentials and academy enrolment status
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12 text-xs">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Full Legal Name (English)
                  </span>
                  <p className="font-bold theme-text-primary text-base">{student.name_en || student.name || "--"}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Native / Bangla Name
                  </span>
                  <p className="font-semibold theme-text-primary text-base">{student.bangla_name || student.details?.name_bn || "--"}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Unique Student ID &amp; Roll
                  </span>
                  <p className="font-mono font-bold text-base theme-accent">
                    {student.uniq_id || `STU-${student.id}`} {student.roll_number ? `(Roll #${student.roll_number})` : ""}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Date of Birth &amp; Calculated Age
                  </span>
                  {(() => {
                    const dob = student.dob || student.date_of_birth || student.details?.date_of_birth || student.details?.dob;
                    return (
                      <p className="font-medium theme-text-primary text-sm sm:text-base">
                        {dob ? `${dob} (${calculateAge(dob)} years)` : <span className="text-zinc-500">Not Specified</span>}
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Gender
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base capitalize">
                    {student.gender ? student.gender.toLowerCase() : "Male"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Blood Group
                  </span>
                  <p className="font-bold text-rose-500 text-sm sm:text-base">
                    {student.blood_group || student.details?.blood_group || "--"}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Campus Branch
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {getBranchDisplayName(student.branch_name || student.branch) || "Main Campus"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Class &amp; Section / Group
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.student_class_name || student.education_status || "General Class"} {student.group_name ? `• ${student.group_name}` : ""}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Admission Session Year
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.academic_detail?.session_year || student.session_year || "--"}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Admission Date
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.admission_date || student.academic_detail?.admission_date || student.details?.admission_date || "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Identity Document (BRN / NID)
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.birth_certificate_no
                      ? `BRN: ${student.birth_certificate_no}`
                      : student.nid_no
                      ? `NID: ${student.nid_no}`
                      : <span className="text-zinc-500">Not Submitted</span>}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Residential Status
                  </span>
                  <p className="font-semibold theme-text-primary text-xs sm:text-sm uppercase tracking-wide">
                    {(student.target_status || "NON_RESIDENTIAL").replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Guardians & Family Information */}
            <div className="theme-bg-surface border theme-border p-7 sm:p-8 rounded-3xl shadow-xs space-y-7">
              <div className="flex items-center justify-between border-b theme-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-xs">
                    <GroupIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                      Guardian &amp; Family Contacts
                    </h3>
                    <p className="text-[11px] theme-text-secondary mt-0.5">
                      Parents, primary guardians, emergency contact details
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12 text-xs">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Primary Guardian Name
                  </span>
                  <p className="font-bold text-base theme-text-primary">
                    {student.guardian_detail?.primary_guardian_name ||
                     student.guardian_detail?.father_name ||
                     student.details?.guardian_name ||
                     student.details?.father_name ||
                     "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Guardian Phone &amp; WhatsApp
                  </span>
                  {(() => {
                    const phone =
                      student.guardian_detail?.primary_guardian_phone ||
                      student.guardian_detail?.father_phone ||
                      student.details?.guardian_phone ||
                      student.details?.emergency_phone;
                    return phone ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-base theme-text-primary">
                          {phone}
                        </span>
                        <a
                          href={`https://wa.me/${phone.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:scale-110 transition-transform p-1 rounded-md hover:bg-emerald-500/10"
                          title="Chat on WhatsApp"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <p className="font-normal text-zinc-500">Not Specified</p>
                    );
                  })()}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Guardian Relation
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.guardian_relation || student.details?.guardian_relation || "--"}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Guardian National ID (NID)
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.guardian_nid || <span className="text-zinc-500">Not Provided</span>}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Father's Name
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.father_name || student.details?.father_name || "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Father's Phone &amp; WhatsApp
                  </span>
                  {(() => {
                    const fPhone = student.guardian_detail?.father_phone;
                    return fPhone ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-medium text-sm sm:text-base theme-text-primary">{fPhone}</span>
                        <a
                          href={`https://wa.me/${fPhone.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:scale-110 transition-transform p-0.5 rounded"
                          title="WhatsApp Father"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <p className="font-normal text-zinc-500">--</p>
                    );
                  })()}
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Father's Occupation
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.father_occupation || student.details?.father_occupation || "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Mother's Name
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.mother_name || student.details?.mother_name || "--"}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Mother's Phone
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.mother_phone || <span className="text-zinc-500">--</span>}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Mother's Occupation
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.guardian_detail?.mother_occupation || <span className="text-zinc-500">--</span>}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Emergency Contact Number
                  </span>
                  <p className="font-mono font-medium text-sm sm:text-base theme-text-primary">
                    {student.guardian_detail?.emergency_contact_phone ||
                     student.details?.emergency_contact_phone ||
                     student.details?.emergency_phone ||
                     <span className="text-zinc-500">--</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Previous Academic Background (পূর্ববর্তী শিক্ষার বিস্তারিত) */}
            <div className="theme-bg-surface border theme-border p-7 sm:p-8 rounded-3xl shadow-xs space-y-7">
              <div className="flex items-center justify-between border-b theme-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-xs">
                    <AcademicCapIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                      Previous Academic Background
                    </h3>
                    <p className="text-[11px] theme-text-secondary mt-0.5">
                      Prior madrasa/school credentials, passing grade, TC and records
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12 text-xs">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Previous Academy / Madrasa
                  </span>
                  <p className="font-bold text-base theme-text-primary">
                    {student.academic_detail?.previous_school_name || <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Previous Academy Location
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.academic_detail?.previous_school_address || <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Previous Class / Level
                  </span>
                  <p className="font-medium theme-text-primary text-sm sm:text-base">
                    {student.academic_detail?.previous_class || <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Previous Exam Grade / Division
                  </span>
                  <p className="font-bold theme-accent text-sm sm:text-base">
                    {student.academic_detail?.previous_grade ||
                     student.academic_detail?.previous_result?.split(" (")[0] ||
                     student.academic_detail?.previous_result ||
                     <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Average / Percentage / GPA
                  </span>
                  <p className="font-mono font-bold theme-text-primary text-sm sm:text-base">
                    {student.academic_detail?.previous_average ||
                     (student.academic_detail?.previous_result?.includes("(")
                       ? student.academic_detail?.previous_result?.split("(")[1]?.replace(")", "")
                       : <span className="text-zinc-500 font-normal">--</span>)}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Passing Year
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.academic_detail?.previous_passing_year || <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Transfer Certificate (TC) Number
                  </span>
                  <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                    {student.academic_detail?.tc_number || <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                    Academic &amp; Study Notes
                  </span>
                  <p className="font-medium theme-text-primary text-sm leading-relaxed">
                    {student.academic_detail?.previous_study_details || <span className="text-zinc-500 font-normal">--</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Dedicated Comprehensive Address Card (Minimal Flat Grid with full details) */}
            {(() => {
              const presAddr = student.present_address || (typeof student.details?.present_address === "object" ? student.details?.present_address : null);
              const presStreet = (presAddr && presAddr.street_address) || (typeof student.details?.present_address === "string" ? student.details?.present_address : "") || (typeof student.address === "string" ? student.address : "") || "--";
              const presThana = (presAddr && presAddr.thana_or_upazila) || student.thana || student.upazila || "--";
              const presDistrict = (presAddr && presAddr.district) || student.district || "--";
              const presDivision = (presAddr && presAddr.division) || student.division || "--";
              const presPost = (presAddr && (presAddr.post_code || presAddr.post_office)) ? `${presAddr.post_office || ""} ${presAddr.post_code ? `(${presAddr.post_code})` : ""}`.trim() : "--";
              const presCoords = student.latitude && student.longitude ? `${student.latitude}, ${student.longitude}` : (presAddr?.latitude && presAddr?.longitude ? `${presAddr.latitude}, ${presAddr.longitude}` : null);

              const permAddr = student.permanent_address || (typeof student.details?.permanent_address === "object" ? student.details?.permanent_address : null);
              const permStreet = (permAddr && permAddr.street_address) || (typeof student.details?.permanent_address === "string" ? student.details?.permanent_address : "") || "--";
              const permThana = (permAddr && permAddr.thana_or_upazila) || "--";
              const permDistrict = (permAddr && permAddr.district) || "--";
              const permDivision = (permAddr && permAddr.division) || "--";
              const permPost = (permAddr && (permAddr.post_code || permAddr.post_office)) ? `${permAddr.post_office || ""} ${permAddr.post_code ? `(${permAddr.post_code})` : ""}`.trim() : "--";

              return (
                <div className="theme-bg-surface border theme-border p-7 sm:p-8 rounded-3xl shadow-xs space-y-7">
                  <div className="flex items-center justify-between border-b theme-border pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-xs">
                        <LocationPinIcon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                          Residential &amp; Address Information
                        </h3>
                        <p className="text-[11px] theme-text-secondary mt-0.5">
                          Present and permanent residence locations
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Present Address Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider theme-text-primary block">
                        Present / Current Address
                      </span>
                      {presCoords && (
                        <span className="text-[10px] font-mono font-bold theme-accent px-2.5 py-1 rounded-lg theme-bg-accent-soft border theme-border">
                          GPS: {presCoords}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-7 gap-x-12 text-xs">
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Street / Village / Area
                        </span>
                        <p className="font-medium theme-text-primary leading-relaxed text-sm sm:text-base">
                          {presStreet}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Thana / Upazila
                        </span>
                        <p className="font-medium theme-text-primary text-sm sm:text-base">
                          {presThana}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          District
                        </span>
                        <p className="font-medium theme-text-primary text-sm sm:text-base">
                          {presDistrict}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Division
                        </span>
                        <p className="font-medium theme-text-primary text-sm sm:text-base">
                          {presDivision}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Post Office &amp; Code
                        </span>
                        <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                          {presPost}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Permanent Address Details */}
                  <div className="space-y-4 pt-6 border-t theme-border">
                    <span className="text-xs font-bold uppercase tracking-wider theme-text-primary block">
                      Permanent / Village Address
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-7 gap-x-12 text-xs">
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Street / Village / Area
                        </span>
                        <p className="font-medium theme-text-primary leading-relaxed text-sm sm:text-base">
                          {permStreet}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Thana / Upazila
                        </span>
                        <p className="font-medium theme-text-primary text-sm sm:text-base">
                          {permThana}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          District
                        </span>
                        <p className="font-medium theme-text-primary text-sm sm:text-base">
                          {permDistrict}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Division
                        </span>
                        <p className="font-medium theme-text-primary text-sm sm:text-base">
                          {permDivision}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1.5">
                          Post Office &amp; Code
                        </span>
                        <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                          {permPost}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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

        {/* TAB 4: LIFECYCLE & TIMELINE (Concise Single-Line Format) */}
        {activeTab === "timeline" && (
          <div className="space-y-6 animate-fade-in">
            <div className="theme-bg-surface border theme-border p-6 sm:p-7 rounded-3xl shadow-xs space-y-6">
              
              {/* Header & Transfer Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b theme-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-xs">
                    <HistoryIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                      Academic Progression &amp; Lifecycle Timeline
                    </h3>
                    <p className="text-[11px] theme-text-secondary mt-0.5">
                      Chronological summary of admissions, class progression, and academic transitions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <TransferIcon className="w-3.5 h-3.5" />
                  <span>Transfer Class / Group</span>
                </button>
              </div>

              {/* Concise Vertical Timeline */}
              <div className="space-y-0 pt-1">
                
                {/* 1. Current Active Stage */}
                <div className="flex items-start gap-3 sm:gap-4 group">
                  <div className="flex flex-col items-center self-stretch shrink-0">
                    <div className="w-7 h-7 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs z-10">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="w-0.5 flex-1 theme-bg-sub border-l theme-border my-1.5"></div>
                  </div>

                  <div className="flex-1 pb-5 min-w-0">
                    <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub/40 border theme-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs shadow-2xs hover:border-[var(--border-hover)] transition-all">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold theme-accent px-2 py-0.5 rounded-md theme-bg-accent-soft border theme-border shrink-0">
                          {student.admission_date || "Current Session"}
                        </span>
                        <span className="font-bold text-xs sm:text-sm theme-text-primary">
                          {student.student_class_name || student.education_status || "General Class"}
                        </span>
                        {(student.group_name || student.student_group_name) && (
                          <span className="theme-text-secondary font-medium">
                            • {student.group_name || student.student_group_name}
                          </span>
                        )}
                        <span className="theme-text-secondary">
                          • Campus: {getBranchDisplayName(student.branch_name || student.branch) || "Main Campus"}
                        </span>
                        {student.roll_number && (
                          <span className="theme-text-secondary font-mono font-medium">
                            • Roll #{student.roll_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                          Active Enrolment
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Historical Transitions */}
                {student.academic_history && student.academic_history.filter((r) => !r.is_current).map((record) => (
                  <div key={record.id} className="flex items-start gap-3 sm:gap-4 group">
                    <div className="flex flex-col items-center self-stretch shrink-0">
                      <div className="w-7 h-7 rounded-full theme-bg-surface border theme-border flex items-center justify-center theme-text-secondary shadow-xs z-10">
                        <HistoryIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="w-0.5 flex-1 theme-bg-sub border-l theme-border my-1.5"></div>
                    </div>

                    <div className="flex-1 pb-5 min-w-0">
                      <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub/20 border theme-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs hover:border-[var(--border-hover)] transition-all">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-semibold theme-text-secondary px-2 py-0.5 rounded-md theme-bg-surface border theme-border shrink-0">
                            {record.start_date || "--"} &rarr; {record.end_date || "Completed"}
                          </span>
                          <span className="font-semibold text-xs sm:text-sm theme-text-primary">
                            Class Transfer: {record.student_class_name || record.class_name || "General Class"}
                          </span>
                          {(record.student_group_name || record.group_name) && (
                            <span className="theme-text-secondary font-medium">
                              • {record.student_group_name || record.group_name}
                            </span>
                          )}
                          <span className="theme-text-secondary">
                            • Reason: {record.transition_reason || "Annual Progression"}
                          </span>
                          {record.transferred_by_name && (
                            <span className="theme-text-secondary font-medium">
                              • By {record.transferred_by_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-surface border theme-border theme-text-secondary uppercase tracking-wider">
                            Completed Stage
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Official Academy Admission Milestone */}
                <div className="flex items-start gap-3 sm:gap-4 group">
                  <div className="flex flex-col items-center self-stretch shrink-0">
                    <div className="w-7 h-7 rounded-full theme-bg-surface border theme-border flex items-center justify-center theme-accent shadow-xs z-10">
                      <SparklesIcon className="w-3.5 h-3.5" />
                    </div>
                    {student.academic_detail?.previous_school_name && (
                      <div className="w-0.5 flex-1 theme-bg-sub border-l theme-border my-1.5"></div>
                    )}
                  </div>

                  <div className="flex-1 pb-5 min-w-0">
                    <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub/20 border theme-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs hover:border-[var(--border-hover)] transition-all">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-semibold theme-text-primary px-2 py-0.5 rounded-md theme-bg-surface border theme-border shrink-0">
                          {student.admission_date || (student.created_at ? new Date(student.created_at).toLocaleDateString() : "--")}
                        </span>
                        <span className="font-semibold text-xs sm:text-sm theme-text-primary">
                          Academy Admission: Enrolled into {student.student_class_name || "Academy"}
                        </span>
                        <span className="theme-text-secondary font-mono font-medium">
                          • ID: {student.uniq_id || `STU-${student.id}`}
                        </span>
                        <span className="theme-text-secondary">
                          • Mode: {student.admission_mode === "FULL" ? "Full Institutional" : "Quick Entry"}
                        </span>
                        <span className="theme-text-secondary">
                          • Branch: {getBranchDisplayName(student.branch_name || student.branch) || "Main Campus"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 uppercase tracking-wider">
                          Enrolled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Prior Academic Background Record (If exists) */}
                {student.academic_detail?.previous_school_name && (
                  <div className="flex items-start gap-3 sm:gap-4 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-7 h-7 rounded-full theme-bg-surface border theme-border flex items-center justify-center text-sky-400 shadow-xs z-10">
                        <AcademicCapIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub/20 border theme-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs hover:border-[var(--border-hover)] transition-all">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-semibold theme-text-secondary px-2 py-0.5 rounded-md theme-bg-surface border theme-border shrink-0">
                            {student.academic_detail.previous_passing_year || "Prior Record"}
                          </span>
                          <span className="font-semibold text-xs sm:text-sm theme-text-primary">
                            Prior School: {student.academic_detail.previous_school_name}
                          </span>
                          {student.academic_detail.previous_class && (
                            <span className="theme-text-secondary">
                              • Class: {student.academic_detail.previous_class}
                            </span>
                          )}
                          {(student.academic_detail.previous_grade || student.academic_detail.previous_result) && (
                            <span className="theme-text-secondary">
                              • Result: {student.academic_detail.previous_grade || student.academic_detail.previous_result}
                              {student.academic_detail.previous_average ? ` (${student.academic_detail.previous_average})` : ""}
                            </span>
                          )}
                          {student.academic_detail.tc_number && (
                            <span className="theme-text-secondary font-mono">
                              • TC #{student.academic_detail.tc_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-surface border theme-border text-sky-400 uppercase tracking-wider">
                            Prior Education
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
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
