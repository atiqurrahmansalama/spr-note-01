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
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="theme-bg-surface border theme-border rounded-2xl shadow-xl p-6">
        <div className="border-b theme-border pb-4 mb-4">
          <h2 className="text-lg font-bold theme-text-primary uppercase tracking-wide">
            Student Admission and Registration
          </h2>
          <p className="text-xs theme-text-secondary mt-1">
            Enroll new students under quick mode or full institutional mode.
          </p>
        </div>

        {/* Tab Switcher */}
        {!admittedStudent && (
          <div className="flex bg-neutral-100 dark:theme-bg-sub p-1 mb-6 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode("QUICK")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
