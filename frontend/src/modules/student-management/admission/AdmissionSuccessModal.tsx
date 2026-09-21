import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdmissionSlipDocument from "./AdmissionSlipDocument";
import CustomButton from "../../../components/ui/CustomButton";
import { useAcademicData } from "../../../hooks/useAcademicData";
import {
  CheckCircle2Icon,
  PrintIcon,
  PlusIcon,
  RefreshIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  CalendarIcon,
  PhoneIcon,
  CopyIcon,
  CheckIcon,
  BuildingOfficeIcon,
} from "../../../components/ui/Icons";

export interface AdmissionSuccessStudent {
  id?: string | number;
  uniq_id?: string;
  student_id_card_number?: string;
  id_number?: string;
  name?: string;
  name_en?: string;
  bangla_name?: string;
  name_bn?: string;
  full_name?: string;
  photo?: string;
  avatar?: string;
  gender?: string;
  student_class?: string | number;
  student_class_name?: string;
  education_status?: string;
  class_name?: string;
  class_id?: string | number;
  section?: string | number;
  section_name?: string;
  student_section?: string | number;
  section_id?: string | number;
  group_name?: string;
  roll_number?: string | number;
  session_year?: string;
  admission_mode?: string;
  guardian_phone?: string;
  guardian_name?: string;
  department?: string | number;
  department_name?: string;
  department_id?: string | number;
  is_editing?: boolean;
  student_type?: string;
  academic_detail?: {
    class_name?: string;
    student_class?: string | number;
    section_name?: string;
    student_section?: string | number;
    group_name?: string;
    roll_number?: string | number;
    session_year?: string;
    department?: string | number;
    department_name?: string;
    department_id?: string | number;
  };
  guardian_detail?: {
    primary_guardian_name?: string;
    primary_guardian_phone?: string;
  };
  personal_detail?: {
    photo?: string;
  };
  details?: {
    guardian_phone?: string;
    guardian_name?: string;
  };
}

export interface AdmissionSuccessModalProps {
  student: AdmissionSuccessStudent;
  onReset: () => void;
  onClose: () => void;
  isEditing?: boolean;
}

export default function AdmissionSuccessModal({
  student,
  onReset,
  onClose,
  isEditing: propIsEditing,
}: AdmissionSuccessModalProps) {
  const navigate = useNavigate();
  const { departments = [], classes = [], sections = [] } = useAcademicData() || {};
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!student) return null;

  const isEditing = Boolean(
    propIsEditing ||
    student?.is_editing ||
    student?.student_type === "EXISTING"
  );

  // Safely extract consolidated student data across Quick and Full Admission schemas
  const studentName = student.name_en || student.name || student.full_name || "Student Record";
  const nativeName = student.bangla_name || student.name_bn || "";

  // 1. Resolve Class / Program Name cleanly across schemas and numeric ID lookups
  const rawClass =
    student.student_class_name ||
    student.class_name ||
    student.academic_detail?.class_name ||
    student.education_status;

  const classIdCandidate =
    student.student_class ||
    student.class_id ||
    student.academic_detail?.student_class ||
    (rawClass && !isNaN(Number(rawClass)) ? rawClass : null);

  const matchedClass = classIdCandidate
    ? (classes || []).find((c: any) => String(c.id) === String(classIdCandidate) || String(c.value) === String(classIdCandidate))
    : null;

  const className =
    (rawClass && isNaN(Number(rawClass)) && rawClass !== "Standard Class")
      ? rawClass
      : (matchedClass?.name || matchedClass?.class_name || matchedClass?.label || "General Academic");

  // 2. Resolve Section Name cleanly
  const rawSection =
    student.section_name ||
    student.academic_detail?.section_name ||
    student.student_section;

  const sectionIdCandidate =
    student.student_section ||
    student.section ||
    student.section_id ||
    (rawSection && !isNaN(Number(rawSection)) ? rawSection : null);

  const matchedSection = sectionIdCandidate
    ? (sections || []).find((s: any) => String(s.id) === String(sectionIdCandidate) || String(s.value) === String(sectionIdCandidate))
    : null;

  const sectionName =
    (rawSection && isNaN(Number(rawSection)))
      ? rawSection
      : (matchedSection?.section_name || matchedSection?.name || matchedSection?.label || "");

  // 3. Resolve Department Name cleanly
  const rawDept =
    student.department_name ||
    student.academic_detail?.department_name ||
    student.department;

  const deptIdCandidate =
    student.department ||
    student.department_id ||
    student.academic_detail?.department ||
    student.academic_detail?.department_id ||
    matchedClass?.department ||
    matchedClass?.department_id ||
    (rawDept && !isNaN(Number(rawDept)) ? rawDept : null);

  const matchedDept = deptIdCandidate
    ? (departments || []).find((d: any) => String(d.id) === String(deptIdCandidate) || String(d.value) === String(deptIdCandidate))
    : null;

  const departmentName =
    (rawDept && isNaN(Number(rawDept)))
      ? rawDept
      : (matchedDept?.name || matchedDept?.department_name || matchedDept?.label || "Academic Department");

  // 4. Resolve Student ID cleanly with enterprise fallback
  const rawStudentId =
    student.student_id_card_number ||
    student.uniq_id ||
    student.id_number;

  const sessionYear =
    student.session_year ||
    student.academic_detail?.session_year ||
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const currentYearPrefix = sessionYear?.slice(0, 4) || String(new Date().getFullYear());

  const studentId = (rawStudentId && String(rawStudentId).trim() !== "" && rawStudentId !== "ACTIVE")
    ? String(rawStudentId).trim()
    : student.id
    ? (String(student.id).startsWith("stu_")
        ? `STD-${currentYearPrefix}-${String(student.id).slice(-4).toUpperCase()}`
        : `STD-${currentYearPrefix}-${String(student.id).padStart(4, "0")}`)
    : `STD-${currentYearPrefix}-0001`;

  const groupName =
    student.group_name ||
    student.academic_detail?.group_name ||
    "";

  const rollNumber =
    student.roll_number ??
    student.academic_detail?.roll_number ??
    "";

  const guardianPhone =
    student.guardian_phone ||
    student.guardian_detail?.primary_guardian_phone ||
    student.details?.guardian_phone ||
    "--";

  const photoUrl =
    student.photo ||
    student.personal_detail?.photo ||
    student.avatar ||
    "";

  const admissionMode =
    student.admission_mode ||
    (isEditing ? "RECORD UPDATE" : "DIRECT ADMISSION");

  // Format Class & Section Display without redundant group duplicate
  const classDisplay = [
    className,
    sectionName ? `(${sectionName})` : "",
    groupName && groupName !== sectionName && groupName !== className ? `• ${groupName}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  const enrichedStudent: AdmissionSuccessStudent = {
    ...student,
    uniq_id: studentId,
    student_id_card_number: studentId,
    education_status: className,
    student_class_name: className,
    class_name: className,
    section_name: sectionName,
    department_name: departmentName,
  };

  const handleCopyId = () => {
    if (!studentId || studentId === "ACTIVE") return;
    navigator.clipboard.writeText(String(studentId));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2200);
  };

  const handleViewDirectory = () => {
    if (student?.id) {
      navigate(`/groups-students?highlight=${student.id}`);
    } else {
      onClose();
    }
  };

  return (
    <div className="text-center py-2 space-y-5 animate-fade-in font-sans">
      {/* 1. Ambient Celebration Hero */}
      <div className="flex flex-col items-center justify-center space-y-3 pt-1">
        {/* Concentric glowing check badge */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full theme-bg-accent-soft opacity-35 animate-pulse" />
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-3xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-xs">
            <CheckCircle2Icon className="w-9 h-9 sm:w-10 sm:h-10 theme-accent" />
          </div>
        </div>

        <div className="space-y-1.5 max-w-md mx-auto text-center px-2">
          {/* Heading */}
          <h3 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            {isEditing ? "Profile Updated Successfully!" : "Admission Confirmed!"}
          </h3>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed font-normal">
            {isEditing
              ? "The student's personal details have been safely updated."
              : "The student has been officially registered and added to the institutional student roster."}
          </p>
        </div>
      </div>

      {/* 2. Streamlined Minimal Student Identity Card */}
      <div className="w-full max-w-md mx-auto rounded-3xl theme-bg-sub border theme-border p-4 sm:p-5 text-left shadow-xs space-y-3.5 transition-all">
        {/* Card Header: Avatar, Name & Minimal Live Status */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b theme-border">
          <div className="flex items-center gap-3 min-w-0">
            {/* Student Avatar / Photo */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl theme-bg-accent theme-accent-text flex items-center justify-center text-base font-bold shrink-0 uppercase overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                studentName.charAt(0)
              )}
            </div>

            {/* Name Details */}
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-bold theme-text-primary truncate">
                {studentName}
              </h4>
              {nativeName ? (
                <p className="text-xs theme-text-secondary truncate mt-0.5">
                  {nativeName}
                </p>
              ) : (
                <p className="text-xs theme-text-secondary truncate mt-0.5">
                  {isEditing ? "Edited Registered Student" : "Newly Enrolled Student"}
                </p>
              )}
            </div>
          </div>

          {/* Minimal Live Status indicator without heavy box */}
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold theme-accent shrink-0">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full theme-bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 theme-bg-accent"></span>
            </span>
            <span>Active</span>
          </div>
        </div>

        {/* Clean Student ID Line (No nested box/border overload) */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b theme-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary shrink-0">
              Student ID:
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold theme-text-primary truncate">
              {studentId}
            </span>
            {rollNumber && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border font-semibold shrink-0">
                Roll #{rollNumber}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold theme-text-secondary hover:theme-accent hover:theme-bg-surface rounded-lg transition cursor-pointer"
            title="Copy Student ID"
          >
            {copiedId ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 theme-accent" />
                <span className="theme-accent">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Key Metadata Grid: Minimal & Clean without nested box cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-0.5">
          {/* Class & Section */}
          <div className="flex items-start gap-2.5">
            <AcademicCapIcon className="w-4 h-4 theme-text-secondary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Class / Program
              </span>
              <p className="font-semibold theme-text-primary truncate" title={classDisplay}>
                {classDisplay}
              </p>
            </div>
          </div>

          {/* Department */}
          <div className="flex items-start gap-2.5">
            <BuildingOfficeIcon className="w-4 h-4 theme-text-secondary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Department
              </span>
              <p className="font-semibold theme-text-primary truncate" title={departmentName}>
                {departmentName}
              </p>
            </div>
          </div>

          {/* Session Year */}
          <div className="flex items-start gap-2.5">
            <CalendarIcon className="w-4 h-4 theme-text-secondary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Session Year
              </span>
              <p className="font-semibold theme-text-primary truncate">
                {sessionYear}
              </p>
            </div>
          </div>

          {/* Guardian Phone */}
          <div className="flex items-start gap-2.5">
            <PhoneIcon className="w-4 h-4 theme-text-secondary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary block">
                Guardian Phone
              </span>
              <p className="font-semibold font-mono theme-text-primary truncate">
                {guardianPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Card Footer Strip: Minimal Tag */}
        <div className="flex items-center justify-between text-[11px] pt-2 border-t theme-border theme-text-secondary">
          <span>Registration Track</span>
          <span className="font-bold uppercase tracking-wider theme-accent">
            {admissionMode}
          </span>
        </div>
      </div>

      {/* 3. Reusable Enterprise Action Suite */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto pt-1">
        <CustomButton
          type="button"
          variant="primary"
          fullWidth
          icon={PrintIcon}
          onClick={() => setShowPrintSlip(true)}
        >
          Print Slip
        </CustomButton>

        <CustomButton
          type="button"
          variant="secondary"
          fullWidth
          icon={isEditing ? RefreshIcon : PlusIcon}
          onClick={onReset}
        >
          {isEditing ? "Edit Another" : "Admit Another"}
        </CustomButton>

        <CustomButton
          type="button"
          variant="outline"
          fullWidth
          icon={ArrowRightIcon}
          onClick={handleViewDirectory}
        >
          View Directory
        </CustomButton>
      </div>

      {/* Print Slip Overlay */}
      {showPrintSlip && (
        <AdmissionSlipDocument
          student={enrichedStudent}
          onClose={() => setShowPrintSlip(false)}
        />
      )}
    </div>
  );
}
