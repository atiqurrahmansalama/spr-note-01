import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { useFeatureControl } from "../../context/FeatureControlContext";

export default function StudentProfileHubView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isSectionEnabled } = useFeatureControl();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("quran");
  
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
        navigate("/student-roster");
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
      <div className="w-full max-w-6xl mx-auto py-12 px-4 animate-pulse space-y-6">
        <div className="h-40 bg-zinc-800 rounded-3xl" />
        <div className="h-10 bg-zinc-800 rounded-xl w-1/2" />
        <div className="h-64 bg-zinc-800 rounded-3xl" />
      </div>
    );
  }

  if (!student) return null;

  const isHifzDepartment = student.department_type === "HIFZ" && isSectionEnabled("quran_hifz_tracker");

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 font-sans theme-text-primary animate-fade-in select-none">
      
      {/* --- HERO HEADER --- */}
      <div className="w-full theme-bg-surface border theme-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl theme-bg-accent theme-accent-text font-bold text-3xl flex items-center justify-center shadow-lg border border-sky-400/20">
            {student.name_en ? student.name_en.charAt(0).toUpperCase() : "S"}
          </div>
          {/* Details */}
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{student.name_en}</h1>
            {student.bangla_name && <p className="text-sm theme-text-secondary font-semibold">{student.bangla_name}</p>}
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-800 border theme-border text-zinc-300">
                ID: {student.uniq_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {student.group_name || "General Group"}
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
            className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            🖨️ Print ID Card
          </button>
          <button
            onClick={() => showToast("Slip generation not implemented.", "info")}
            className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            📄 Admission Slip
          </button>
          <button
            onClick={() => navigate(`/group-roster`)}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all cursor-pointer shadow-md"
          >
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      {/* --- TAB HEADERS --- */}
      <div className="flex border-b theme-border overflow-x-auto gap-8 mb-6 pb-0.5 scrollbar-none">
        {isHifzDepartment && (
          <button
            onClick={() => setActiveTab("quran")}
            className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "quran"
                ? "border-[var(--accent-main)] theme-accent"
                : "border-transparent theme-text-secondary hover:theme-text-primary"
            }`}
          >
            📊 Quran &amp; Progress
          </button>
        )}
        <button
          onClick={() => setActiveTab("personal")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "personal"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          👤 Personal &amp; Identity
        </button>
        <button
          onClick={() => setActiveTab("guardians")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "guardians"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          👨‍👩‍👦 Guardians &amp; Family
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "documents"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          📁 Document Vault
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "timeline"
              ? "border-[var(--accent-main)] theme-accent"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          📜 Lifecycle Timeline
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
                <div className="text-3xl text-emerald-400">✅</div>
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
                <div className="text-3xl text-amber-400">📖</div>
              </div>
              <div className="theme-bg-surface border theme-border p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Recent Mistake Average</h4>
                  <p className="text-2xl font-extrabold mt-1">{student.recent_error_average}</p>
                </div>
                <div className="text-3xl text-rose-400">⚠️</div>
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
              <div className="flex flex-wrap gap-4 justify-center mt-6 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-amber-500/10 border border-amber-500/30 animate-pulse" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-zinc-800 border border-zinc-700/30" />
                  <span>Upcoming</span>
                </div>
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
                        📞 Direct Call
                      </a>
                      <a
                        href={`https://wa.me/${student.guardian_detail.primary_guardian_phone?.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-center text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        💬 WhatsApp Message
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
              <div className="text-4xl mb-3">📤</div>
              <h4 className="font-bold text-sm">Drag &amp; Drop documents here</h4>
              <p className="text-xs theme-text-secondary mt-1">Accepts Birth Certificates, marksheets, and NIDs.</p>
              <div className="mt-4">
                <label className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 cursor-pointer shadow-md inline-block">
                  Select File
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
                        <div className="text-2xl">📄</div>
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
                        className="px-3 py-1.5 rounded-xl border theme-border hover:theme-bg-elevated text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        💾 Download
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
          <div className="theme-bg-surface border theme-border p-6 md:p-8 rounded-3xl shadow-lg animate-fade-in">
            <h3 className="font-bold text-base mb-6">Student Onboarding &amp; Lifecycle Timeline</h3>
            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-zinc-800">
              
              {/* Event 1: Admission */}
              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                  🎓
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Onboarded via {student.admission_mode} Admission</h4>
                  <p className="text-[10px] theme-text-secondary">{student.admission_date || student.created_at || "--"}</p>
                </div>
              </div>

              {/* Event 2: Group Registration */}
              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                  🏷️
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Assigned to Group: {student.group_name || "General Group"}</h4>
                  <p className="text-[10px] theme-text-secondary">{student.created_at ? new Date(student.created_at).toLocaleDateString() : "--"}</p>
                </div>
              </div>

              {/* Event 3: Profile Lock/Sync */}
              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border theme-border text-zinc-400 flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                  🔒
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Student Profile Sync &amp; Verification Card Created</h4>
                  <p className="text-[10px] theme-text-secondary">{student.updated_at ? new Date(student.updated_at).toLocaleDateString() : "--"}</p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
