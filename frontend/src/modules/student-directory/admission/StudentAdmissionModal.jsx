import { useState } from "react";
import QuickAdmissionForm from "./QuickAdmissionForm";
import FullAdmissionWizard from "./FullAdmissionWizard";
import AdmissionSuccessModal from "./AdmissionSuccessModal";

export default function StudentAdmissionModal({ isOpen, onClose, onSuccess }) {
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

  if (!isOpen) return null;

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

  const handleAdmissionSuccess = (student) => {
    setAdmittedStudent(student);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleClose = () => {
    if (admittedStudent && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-6xl md:max-w-7xl xl:max-w-[85vw] theme-bg-surface border theme-border rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border shrink-0">
          <h2 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
            Student Admission and Registration
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="theme-text-secondary hover:theme-text-primary text-sm p-1.5 rounded-lg hover:theme-bg-sub transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher (Only visible if not yet admitted) */}
        {!admittedStudent && (
          <div className="flex theme-bg-sub border theme-border p-1.5 mx-6 mt-4.5 rounded-2xl shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMode("QUICK")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeMode === "QUICK"
                  ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
              }`}
            >
              Quick Admission
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("FULL")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeMode === "FULL"
                  ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
              }`}
            >
              Full Institutional Admission
            </button>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {admittedStudent ? (
            <AdmissionSuccessModal
              student={admittedStudent}
              onReset={handleReset}
              onClose={handleClose}
            />
          ) : activeMode === "QUICK" ? (
            <QuickAdmissionForm
              onCancel={handleClose}
              onSuccess={handleAdmissionSuccess}
              sharedData={sharedData}
              setSharedData={setSharedData}
            />
          ) : (
            <FullAdmissionWizard
              onCancel={handleClose}
              onSuccess={handleAdmissionSuccess}
              sharedData={sharedData}
              setSharedData={setSharedData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
