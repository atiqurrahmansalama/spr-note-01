import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QuickAdmissionForm from "./QuickAdmissionForm";
import FullAdmissionWizard from "./FullAdmissionWizard";
import AdmissionSuccessModal from "./AdmissionSuccessModal";

export default function StudentAdmissionView() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState("QUICK"); // QUICK or FULL
  const [admittedStudent, setAdmittedStudent] = useState(null);

  // Shared form inputs
  const [sharedData, setSharedData] = useState({
    name: "",
    bangla_name: "",
    student_id_card_number: "",
    gender: "MALE",
    dob: "",
    blood_group: "",
    birth_certificate_no: "",
    session_year: "2026-2027",
    class_or_group_id: "",
    group_name: "",
    roll_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    previous_school_name: "",
    tc_number: "",
    father_name: "",
    father_phone: "",
    father_occupation: "",
    mother_name: "",
    mother_phone: "",
    primary_guardian_name: "",
    guardian_phone: "",
    guardian_relation: "Father",
    guardian_nid: "",
    emergency_contact_phone: "",
    street_address: "",
    post_office: "",
    post_code: "",
    thana_or_upazila: "",
    district: "",
    division: "",
    perm_street: "",
    perm_post_office: "",
    perm_post_code: "",
    perm_thana: "",
    perm_district: "",
    perm_division: "",
  });

  const handleReset = () => {
    setAdmittedStudent(null);
    setSharedData({
      name: "",
      bangla_name: "",
      student_id_card_number: "",
      gender: "MALE",
      dob: "",
      blood_group: "",
      birth_certificate_no: "",
      session_year: "2026-2027",
      class_or_group_id: "",
      group_name: "",
      roll_number: "",
      admission_date: new Date().toISOString().split("T")[0],
      previous_school_name: "",
      tc_number: "",
      father_name: "",
      father_phone: "",
      father_occupation: "",
      mother_name: "",
      mother_phone: "",
      primary_guardian_name: "",
      guardian_phone: "",
      guardian_relation: "Father",
      guardian_nid: "",
      emergency_contact_phone: "",
      street_address: "",
      post_office: "",
      post_code: "",
      thana_or_upazila: "",
      district: "",
      division: "",
      perm_street: "",
      perm_post_office: "",
      perm_post_code: "",
      perm_thana: "",
      perm_district: "",
      perm_division: "",
    });
  };

  const handleClose = () => {
    navigate("/groups-students");
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Premium Styled Header (similar to User Management header) */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-inner">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight theme-text-primary flex items-center gap-2.5">
                <span>Student Admission and Registration</span>
              </h1>
              <p className="text-xs theme-text-secondary">
                Enroll new students under quick mode or full institutional mode.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-bg-surface border theme-border rounded-2xl shadow-xl p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Tab Switcher */}
        {!admittedStudent && (
          <div className="flex bg-neutral-100 dark:theme-bg-sub p-1 mb-6 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode("QUICK")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeMode === "QUICK"
                  ? "bg-white dark:theme-bg-surface theme-text-primary shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              Quick Admission
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("FULL")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeMode === "FULL"
                  ? "bg-white dark:theme-bg-surface theme-text-primary shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              Full Institutional Admission
            </button>
          </div>
        )}

        <div>
          {admittedStudent ? (
            <AdmissionSuccessModal
              student={admittedStudent}
              onReset={handleReset}
              onClose={handleClose}
            />
          ) : activeMode === "QUICK" ? (
            <QuickAdmissionForm
              onCancel={handleClose}
              onSuccess={setAdmittedStudent}
              sharedData={sharedData}
              setSharedData={setSharedData}
            />
          ) : (
            <FullAdmissionWizard
              onCancel={handleClose}
              onSuccess={setAdmittedStudent}
              sharedData={sharedData}
              setSharedData={setSharedData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
