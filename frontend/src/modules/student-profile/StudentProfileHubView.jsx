import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ShieldIcon
} from "../../components/ui/Icons";
import StudentTransferModal from "./StudentTransferModal";

export default function StudentProfileHubView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSectionEnabled } = useFeatureControl();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("quran");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  
  // Drag and drop / file upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadStudentProfile();
  }, [id]);

  const loadStudentProfile = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/full-profile/`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
        // Default to personal tab if not HIFZ or tracker is disabled
        const isHifz = data.department_type === "HIFZ" && isSectionEnabled("quran_hifz_tracker");
        setActiveTab(isHifz ? "quran" : "personal");
      } else {
        showToast("Student profile not found.", "error");
        navigate("/students");
      }
    } catch (err) {
      showToast("Failed to load student profile.", "error");
    } finally {
      setLoading(false);
    }
  };

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
        showToast("Document uploaded successfully!", "success");
        loadStudentProfile();
      } else {
        showToast("Failed to upload document.", "error");
      }
    } catch {
      showToast("Network error during upload.", "error");
    } finally {
      setUploading(false);
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

  // Helper to compute age from Date of Birth
  const calculateAge = (dobString) => {
    if (!dobString) return "--";
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-16 px-4 text-center">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs theme-text-secondary animate-pulse">Loading comprehensive student dossier...</p>
      </div>
    );
  }

  if (!student) return null;

  const isHifzDepartment = student.department_type === "HIFZ" && isSectionEnabled("quran_hifz_tracker");

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 font-sans theme-text-primary animate-fade-in select-none">
      
      {/* --- HERO PROFILE HEADER --- */}
      <div className="theme-bg-surface border theme-border rounded-3xl p-6 md:p-8 shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          {/* Avatar / Photo */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-1 shadow-lg shrink-0">
            {student.photo ? (
              <img
                src={student.photo}
                alt={student.name_en || student.name}
                className="w-full h-full object-cover rounded-[22px]"
              />
            ) : (
              <div className="w-full h-full rounded-[22px] theme-bg-surface flex items-center justify-center text-3xl font-extrabold text-sky-400">
                {student.name_en ? student.name_en.charAt(0).toUpperCase() : "S"}
              </div>
            )}
          </div>

          {/* Name & Quick Metadata */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">{student.name_en || student.name}</h1>
            {student.bangla_name && <p className="text-sm theme-text-secondary font-semibold">{student.bangla_name}</p>}
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-800 border theme-border text-zinc-300">
                ID: {student.uniq_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1">
                <GroupIcon className="w-3 h-3" />
                <span>{student.group_name || "General Group"}</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                student.status?.toUpperCase() === 'ACTIVE' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}>
                {student.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PrintIcon className="w-3.5 h-3.5" />
            <span>Print ID Card</span>
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <TransferIcon className="w-3.5 h-3.5" />
            <span>Transfer Class/Group</span>
          </button>
          <button
            onClick={() => navigate(`/students`)}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <StudentIcon className="w-3.5 h-3.5" />
            <span>All Students</span>
          </button>
        </div>
      </div>

      {/* --- TAB HEADERS --- */}
      <div className="flex border-b theme-border overflow-x-auto gap-8 mb-6 pb-0.5 scrollbar-none">
        {isHifzDepartment && (
          <button
            onClick={() => setActiveTab("quran")}
            className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
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
          onClick={() => setActiveTab("personal")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "personal"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <StudentIcon className="w-4 h-4" />
          <span>Personal &amp; Identity</span>
        </button>
        <button
          onClick={() => setActiveTab("guardians")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "guardians"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <GroupIcon className="w-4 h-4" />
          <span>Guardians &amp; Family</span>
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "documents"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <TagIcon className="w-4 h-4" />
          <span>Document Vault</span>
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "timeline"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          <span>Lifecycle Timeline</span>
        </button>
      </div>

      {/* --- TAB BODY CONTENT --- */}
      <div className="w-full">
        {/* TAB 1: QURAN & PROGRESS */}
        {activeTab === "quran" && isHifzDepartment && (
          <div className="space-y-8 animate-fade-in">
            {/* Metric Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="theme-bg-surface border theme-border p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Completed Juz</h4>
                  <p className="text-2xl font-extrabold mt-1">{student.completed_juz_count} / 30</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="theme-bg-surface border theme-border p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Active Juz In-Progress</h4>
                  <p className="text-2xl font-extrabold mt-1">
                    {student.active_juz && student.active_juz.length > 0 
                      ? student.active_juz.join(", ") 
                      : "--"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <BookOpenIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="theme-bg-surface border theme-border p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Recent Mistake Average</h4>
                  <p className="text-2xl font-extrabold mt-1">{student.recent_error_average}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <AlertTriangleIcon className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 30 Juz Visualizer Grid */}
            <div className="theme-bg-surface border theme-border p-6 md:p-8 rounded-3xl shadow-lg">
              <h3 className="font-bold text-base mb-6">30 Juz Interactive Quran Progress Visualizer</h3>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
                {student.quran_progress && student.quran_progress.map((j) => {
                  let badgeClass = "bg-zinc-800 text-zinc-500 border border-zinc-700/30";
                  if (j.status === "completed") {
                    badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]";
                  } else if (j.status === "in_progress") {
                    badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse";
                  }
                  return (
                    <div
                      key={j.juz}
                      className={`h-16 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-sm transition-all hover:scale-105 ${badgeClass}`}
                      title={`Juz ${j.juz}: ${j.status.toUpperCase()}`}
                    >
                      <span className="text-[10px] tracking-wider uppercase opacity-60">Juz</span>
                      <span className="text-lg">{j.juz}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL DETAILS */}
        {activeTab === "personal" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity Card */}
              <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg space-y-4">
                <h3 className="font-bold text-base border-b theme-border pb-3">Identity &amp; Bio</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs theme-text-secondary block">Date of Birth</span>
                    <span className="font-semibold">{student.dob || "--"}</span>
                    {student.dob && (
                      <span className="ml-1.5 text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded">
                        {calculateAge(student.dob)} Yrs Old
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs theme-text-secondary block">Blood Group</span>
                    <span className="font-bold text-rose-400">{student.blood_group || "--"}</span>
                  </div>
                  <div>
                    <span className="text-xs theme-text-secondary block">Gender</span>
                    <span className="font-semibold">{student.gender || "--"}</span>
                  </div>
                  <div>
                    <span className="text-xs theme-text-secondary block">Admission Mode</span>
                    <span className="font-semibold">{student.admission_mode || "--"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs theme-text-secondary block">Birth Certificate No</span>
                    <span className="font-semibold font-mono">{student.birth_certificate_no || "--"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs theme-text-secondary block">NID Card Number</span>
                    <span className="font-semibold font-mono">{student.nid_no || "--"}</span>
                  </div>
                </div>
              </div>

              {/* Address Cards */}
              <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg space-y-4">
                <h3 className="font-bold text-base border-b theme-border pb-3">Unified Addresses</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-1">Present Address</span>
                    <p className="font-semibold leading-relaxed">
                      {student.present_address 
                        ? `${student.present_address.street_address || ""}, ${student.present_address.thana_or_upazila || ""}, ${student.present_address.district || ""}, ${student.present_address.division || ""}`
                        : "No present address configured."}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Permanent Address</span>
                    <p className="font-semibold leading-relaxed">
                      {student.permanent_address 
                        ? `${student.permanent_address.street_address || ""}, ${student.permanent_address.thana_or_upazila || ""}, ${student.permanent_address.district || ""}, ${student.permanent_address.division || ""}`
                        : "No permanent address configured."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GUARDIANS & FAMILY */}
        {activeTab === "guardians" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Father & Mother Cards */}
              <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg space-y-4">
                <h3 className="font-bold text-base border-b theme-border pb-3">Parents Info</h3>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs theme-text-secondary block">Father's Name</span>
                      <span className="font-semibold">{student.guardian_detail?.father_name || "--"}</span>
                    </div>
                    <div>
                      <span className="text-xs theme-text-secondary block">Occupation</span>
                      <span className="font-semibold">{student.guardian_detail?.father_occupation || "--"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs theme-text-secondary block">Mother's Name</span>
                      <span className="font-semibold">{student.guardian_detail?.mother_name || "--"}</span>
                    </div>
                    <div>
                      <span className="text-xs theme-text-secondary block">Occupation</span>
                      <span className="font-semibold">{student.guardian_detail?.mother_occupation || "--"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Guardian Actions */}
              <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg space-y-4">
                <h3 className="font-bold text-base border-b theme-border pb-3">Primary Guardian</h3>
                {student.guardian_detail ? (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs theme-text-secondary block">Guardian Name</span>
                        <span className="font-bold">{student.guardian_detail.primary_guardian_name || "--"}</span>
                      </div>
                      <div>
                        <span className="text-xs theme-text-secondary block">Relation</span>
                        <span className="font-semibold text-sky-400">{student.guardian_detail.guardian_relation || "Father"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t theme-border">
                      <a
                        href={`tel:${student.guardian_detail.primary_guardian_phone}`}
                        className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated transition-colors text-center text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PhoneIcon className="w-3.5 h-3.5" />
                        <span>Direct Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${student.guardian_detail.primary_guardian_phone?.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-center text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>WhatsApp Message</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs theme-text-secondary">No guardian information configured.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DOCUMENT VAULT */}
        {activeTab === "documents" && (
          <div className="space-y-6 animate-fade-in">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`w-full p-8 rounded-3xl border-2 border-dashed text-center transition-all ${
                dragActive 
                  ? "border-sky-500 bg-sky-500/10 scale-[1.01]" 
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-sky-400">
                <UploadIcon className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm">Drag &amp; Drop documents here</h4>
              <p className="text-xs theme-text-secondary mt-1">Accepts Birth Certificates, marksheets, and NIDs.</p>
              <div className="mt-4">
                <label className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 cursor-pointer shadow-md inline-flex items-center gap-1.5">
                  <UploadIcon className="w-3.5 h-3.5" />
                  <span>Select File</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                </label>
              </div>
              {uploading && <p className="text-xs text-sky-400 mt-2 animate-pulse">Uploading file...</p>}
            </div>

            {/* Uploaded Documents List */}
            <div className="theme-bg-surface border theme-border p-6 rounded-3xl shadow-lg">
              <h3 className="font-bold text-base mb-4">Document Attachment Repository</h3>
              {student.documents && student.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {student.documents.map((doc) => (
                    <div key={doc.id} className="p-4 theme-bg-sub border theme-border rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-sky-400">
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs truncate max-w-[160px]">{doc.title || "Document"}</h4>
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mt-1 w-max">
                            {doc.doc_type}
                          </span>
                        </div>
                      </div>
                      <a
                        href={doc.file}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl border theme-border hover:theme-bg-elevated text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <DownloadIcon className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs theme-text-secondary text-center py-6">No uploaded documents in vault yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LIFECYCLE & TIMELINE */}
        {activeTab === "timeline" && (
          <div className="space-y-6 animate-fade-in">
            {/* Academic Progression History Card */}
            <div className="theme-bg-surface border theme-border p-6 md:p-8 rounded-3xl shadow-lg space-y-6">
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
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <TransferIcon className="w-3.5 h-3.5" />
                  <span>Transfer Class / Group</span>
                </button>
              </div>

              {/* Progression Events List */}
              {student.academic_history && student.academic_history.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-zinc-800">
                  {student.academic_history.map((hist, idx) => {
                    const isCurrent = hist.is_current;
                    const startDateFormatted = hist.start_date || "Start";
                    const endDateFormatted = isCurrent ? "Present" : hist.end_date || "--";

                    return (
                      <div key={hist.id || idx} className="flex gap-4 relative">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 shadow-sm ${
                            isCurrent
                              ? "bg-emerald-500/15 border-2 border-emerald-400 text-emerald-400"
                              : "theme-bg-sub border theme-border text-zinc-400"
                          }`}
                        >
                          {isCurrent ? (
                            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <HistoryIcon className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>

                        <div className="flex-1 theme-bg-sub border theme-border p-4 rounded-2xl space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs theme-text-primary">
                                {hist.student_class_name || "No Class"} &bull; {hist.student_group_name || "General Group"}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                                  Active Enrollment
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono theme-text-secondary bg-zinc-800/80 px-2 py-0.5 rounded-md border theme-border">
                              {startDateFormatted} &rarr; {endDateFormatted}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <p className="text-xs text-zinc-300">
                              <strong className="text-zinc-400">Reason:</strong> {hist.transition_reason || "Standard Progression"}
                            </p>
                            {hist.transferred_by_name && (
                              <span className="text-[10px] theme-text-secondary">
                                Authorized by: <strong className="theme-text-primary">{hist.transferred_by_name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback if no explicit history recorded */
                <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-center text-xs theme-text-secondary">
                  No historical progression logs recorded yet. Current assignment: <strong>{student.student_class_name || "No Class"} / {student.student_group_name || student.group_name || "General Group"}</strong>.
                </div>
              )}
            </div>

            {/* Lifecycle Milestones */}
            <div className="theme-bg-surface border theme-border p-6 md:p-8 rounded-3xl shadow-lg space-y-6">
              <h3 className="font-bold text-base">Institutional Onboarding Milestones</h3>
              <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-zinc-800">
                {/* Event 1: Admission */}
                <div className="flex gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center z-10 shadow-sm">
                    <AdmissionIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs">Onboarded via {student.admission_mode || "General"} Admission</h4>
                    <p className="text-[10px] theme-text-secondary">{student.admission_date || student.created_at || "--"}</p>
                  </div>
                </div>

                {/* Event 2: Group Registration */}
                <div className="flex gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center z-10 shadow-sm">
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs">Assigned Group: {student.student_group_name || student.group_name || "General Group"}</h4>
                    <p className="text-[10px] theme-text-secondary">{student.created_at ? new Date(student.created_at).toLocaleDateString() : "--"}</p>
                  </div>
                </div>

                {/* Event 3: Profile Verification */}
                <div className="flex gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border theme-border text-zinc-400 flex items-center justify-center z-10 shadow-sm">
                    <ShieldIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs">Student ID &amp; Profile Verification Token Created</h4>
                    <p className="text-[10px] theme-text-secondary">{student.updated_at ? new Date(student.updated_at).toLocaleDateString() : "--"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Academic Transfer Modal */}
      <StudentTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        student={student}
        onSuccess={() => {
          loadStudentProfile();
        }}
      />
    </div>
  );
}
