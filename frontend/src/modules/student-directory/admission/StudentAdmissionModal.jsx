import { useState, useEffect } from "react";
import QuickAdmissionForm from "./QuickAdmissionForm";
import FullAdmissionWizard from "./FullAdmissionWizard";
import AdmissionSuccessModal from "./AdmissionSuccessModal";
import { SparklesIcon, AcademicCapIcon, CloseIcon } from "../../../components/ui/Icons";

export default function StudentAdmissionModal({ isOpen, onClose, onSuccess, initialMode = "QUICK" }) {
  const [activeMode, setActiveMode] = useState(initialMode); // QUICK or FULL
  const [admittedStudent, setAdmittedStudent] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode || "QUICK");
    }
  }, [isOpen, initialMode]);

  // Shared form inputs
  const [sharedData, setSharedData] = useState({
    name: "",
    bangla_name: "",
    student_id_card_number: "",
    gender: "MALE",
    dob: "",
    blood_group: "",
    birth_certificate_no: "",
    nid_no: "",
    session_year: "2026-2027",
    student_class: "",
    education_status: "",
    roll_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    previous_school_name: "",
    father_name: "",
    father_phone: "",
    father_occupation: "",
    mother_name: "",
    mother_phone: "",
    mother_occupation: "",
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
      nid_no: "",
      session_year: "2026-2027",
      student_class: "",
      education_status: "",
      roll_number: "",
      admission_date: new Date().toISOString().split("T")[0],
      previous_school_name: "",
      father_name: "",
      father_phone: "",
      father_occupation: "",
      mother_name: "",
      mother_phone: "",
      mother_occupation: "",
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-5xl h-[88vh] max-h-[820px] theme-bg-surface border theme-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border shrink-0 theme-bg-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent shrink-0 shadow-inner">
              <AcademicCapIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black theme-text-primary tracking-tight">
                Student Admission & Registration Portal
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Enroll student with institutional class assignment and digital archive
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-2xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Only visible if not yet admitted) */}
        {!admittedStudent && (
          <div className="px-6 pt-4 shrink-0">
            <div className="grid grid-cols-2 p-1.5 rounded-2xl theme-bg-sub border theme-border gap-2">
              <button
                type="button"
                onClick={() => setActiveMode("QUICK")}
                className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  activeMode === "QUICK"
                    ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                    : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                <span>Short Admission</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("FULL")}
                className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  activeMode === "FULL"
                    ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                    : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                }`}
              >
                <AcademicCapIcon className="w-4 h-4" />
                <span>Admission</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 custom-scrollbar">
          {admittedStudent ? (
            <AdmissionSuccessModal
              student={admittedStudent}
              onClose={handleClose}
              onReset={handleReset}
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
