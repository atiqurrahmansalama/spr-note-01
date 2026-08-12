import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";

export default function StudentProfileModal({ student, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("ACADEMIC");
  const [details, setDetails] = useState(() => student?.details || {});
  const [loading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (student?.id && isOpen) {
      fetchWithAuth(`/api/students/${student.id}/`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.details) {
            setDetails(data.details);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [student?.id, isOpen]);

  if (!isOpen || !student) return null;

  const studentName = student.label || student.name_en || student.name || "Unnamed Student";
  const studentGroup = student.sub || student.group_name || student.group || "General Group";
  const studentRoll = student.roll_number || student.roll || "--";
  const studentUniqId = student.uniq_id || student.unique_id || `STU-${student.id || "000"}`;
  const admissionDate = student.admission_date || "--";
  const status = student.status || (student.is_active !== false ? "Active" : "Inactive");
  const educationStatus = student.education_status || "Standard Hifz Program";

  // Tab 2 fields from details object
  const nameBn = details?.name_bn || "--";
  const fatherName = details?.father_name || "--";
  const motherName = details?.mother_name || "--";
  const guardianName = details?.guardian_name || "--";
  const guardianPhone = details?.guardian_phone || "--";
  const emergencyPhone = details?.emergency_phone || "--";
  const bloodGroup = details?.blood_group || "--";
  const curAddress = details?.cur_address || "--";
  const initialCompletedJuz = details?.initial_completed_juz ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl theme-bg-surface border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 theme-bg-sub border-b theme-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl theme-bg-accent theme-accent-text font-bold text-base flex items-center justify-center shadow-md">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary tracking-tight">
                {studentName}
              </h3>
              <p className="text-xs theme-text-secondary">
                {studentGroup} • Roll: #{studentRoll}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-xs theme-text-secondary hover:theme-text-primary hover:theme-bg-surface rounded-xl transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 2-Tab Navigation Header */}
        <div className="flex border-b theme-border px-5 pt-3 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("ACADEMIC")}
            className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === "ACADEMIC"
                ? "border-[var(--accent-main)] theme-accent"
                : "border-transparent theme-text-secondary hover:theme-text-primary"
            }`}
          >
            Tab 1: Academic Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PERSONAL")}
            className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === "PERSONAL"
                ? "border-[var(--accent-main)] theme-accent"
                : "border-transparent theme-text-secondary hover:theme-text-primary"
            }`}
          >
            Tab 2: Personal & Guardian Info
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
              Loading student details...
            </div>
          ) : activeTab === "ACADEMIC" ? (
            /* TAB 1: ACADEMIC PROFILE */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Unique Student ID (uniq_id)
                </span>
                <p className="text-xs font-mono font-bold theme-text-primary">
                  {studentUniqId}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Roll Number (roll_number)
                </span>
                <p className="text-xs font-bold theme-text-primary">
                  #{studentRoll}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Group / Halqa (group_name)
                </span>
                <p className="text-xs font-semibold theme-text-primary">
                  {studentGroup}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Admission Date (admission_date)
                </span>
                <p className="text-xs font-semibold theme-text-primary">
                  {admissionDate}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Account Status (status)
                </span>
                <div>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                    status.toLowerCase() === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Education Program (education_status)
                </span>
                <p className="text-xs font-semibold theme-text-primary">
                  {educationStatus}
                </p>
              </div>
            </div>
          ) : (
            /* TAB 2: DETAILED PERSONAL & GUARDIAN INFO */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Name in Bengali (name_bn)
                </span>
                <p className="text-xs font-bold theme-text-primary">
                  {nameBn}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Initial Completed Juz (initial_completed_juz)
                </span>
                <p className="text-xs font-bold theme-accent font-mono">
                  {initialCompletedJuz} Juz
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Father's Name (father_name)
                </span>
                <p className="text-xs font-semibold theme-text-primary">
                  {fatherName}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Mother's Name (mother_name)
                </span>
                <p className="text-xs font-semibold theme-text-primary">
                  {motherName}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Guardian Name (guardian_name)
                </span>
                <p className="text-xs font-semibold theme-text-primary">
                  {guardianName}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Guardian Phone (guardian_phone)
                </span>
                <p className="text-xs font-mono font-bold theme-text-primary">
                  {guardianPhone}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Emergency Phone (emergency_phone)
                </span>
                <p className="text-xs font-mono font-bold text-rose-400">
                  {emergencyPhone}
                </p>
              </div>

              <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Blood Group (blood_group)
                </span>
                <p className="text-xs font-bold text-amber-400">
                  {bloodGroup}
                </p>
              </div>

              <div className="sm:col-span-2 p-3.5 theme-bg-sub border theme-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                  Current Address (cur_address)
                </span>
                <p className="text-xs font-medium theme-text-primary leading-relaxed">
                  {curAddress}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 theme-bg-sub border-t theme-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold theme-accent-text theme-bg-accent rounded-xl shadow-md cursor-pointer hover:opacity-90 transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
