import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import QuickAdmissionForm from "./QuickAdmissionForm";
import FullAdmissionWizard from "./FullAdmissionWizard";
import AdmissionSuccessModal from "./AdmissionSuccessModal";
import { SparklesIcon, AcademicCapIcon, GroupsIcon } from "../../../components/ui/Icons";

export default function StudentAdmissionView({ defaultMode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isShortRoute = defaultMode === "QUICK" || location.pathname.includes("short");
  const [activeMode, setActiveMode] = useState(isShortRoute ? "QUICK" : "FULL");
  const [admittedStudent, setAdmittedStudent] = useState(null);

  useEffect(() => {
    if (defaultMode) {
      setActiveMode(defaultMode);
    } else if (location.pathname.includes("short")) {
      setActiveMode("QUICK");
    } else {
      setActiveMode("FULL");
    }
  }, [location.pathname, defaultMode]);

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
    post_code: "",
    thana_or_upazila: "",
    district: "",
    division: "",
    perm_street: "",
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
      post_code: "",
      thana_or_upazila: "",
      district: "",
      division: "",
      perm_street: "",
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
    <div className="w-full max-w-6xl mx-auto py-3 px-3 sm:px-6 space-y-4 flex flex-col h-[calc(100vh-80px)] min-h-[640px]">
      {/* Header Bar */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-inner">
            <GroupsIcon className="w-5 h-5 theme-accent" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight theme-text-primary">
              Student Admission and Registration
            </h1>
            <p className="text-xs theme-text-secondary">
              Enroll new students under quick admission or full institutional mode.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container Card with Full Height */}
      <div className="theme-bg-surface border theme-border rounded-3xl shadow-xl p-5 sm:p-7 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tab Switcher */}
        {!admittedStudent && (
          <div className="grid grid-cols-2 p-1.5 rounded-2xl theme-bg-sub border theme-border gap-2 mb-4 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setActiveMode("QUICK")}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                activeMode === "QUICK"
                  ? "theme-bg-accent theme-accent-text font-black shadow-md scale-[1.005]"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
              }`}
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Short Admission</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("FULL")}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                activeMode === "FULL"
                  ? "theme-bg-accent theme-accent-text font-black shadow-md scale-[1.005]"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
              }`}
            >
              <AcademicCapIcon className="w-4 h-4" />
              <span>Admission</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {admittedStudent ? (
            <AdmissionSuccessModal
              student={admittedStudent}
              onReset={handleReset}
              onClose={handleClose}
            />
          ) : activeMode === "QUICK" ? (
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <QuickAdmissionForm
                onCancel={handleClose}
                onSuccess={setAdmittedStudent}
                sharedData={sharedData}
                setSharedData={setSharedData}
              />
            </div>
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
