import React from 'react';
import {
  StudentIcon,
  GroupIcon,
  AcademicCapIcon,
  LocationPinIcon,
  WhatsAppIcon,
} from '../../../../../components/ui/Icons';
import { StudentFullProfile, StudentAddressDetail } from '../types';
import { calculateAge } from '../utils';
import { getBranchDisplayName } from '../../../../../utils/localStore';
import { formatDisplayDate } from '../../../../../utils/dateUtils';

export interface StudentPersonalTabProps {
  student: StudentFullProfile;
}

export const StudentPersonalTab: React.FC<StudentPersonalTabProps> = ({ student }) => {
  const dob =
    student.dob ||
    student.date_of_birth ||
    student.details?.date_of_birth ||
    student.details?.dob;
  const calculatedAge = dob ? calculateAge(dob) : '--';

  // Address resolution
  const presAddr =
    typeof student.present_address === 'object'
      ? student.present_address
      : typeof student.details?.present_address === 'object'
      ? (student.details?.present_address as StudentAddressDetail)
      : null;
  const presStreet =
    presAddr?.street_address ||
    (typeof student.details?.present_address === 'string'
      ? student.details?.present_address
      : '') ||
    (typeof student.address === 'string' ? student.address : '') ||
    '—';
  const presThana = presAddr?.thana_or_upazila || student.thana || student.upazila || '—';
  const presDistrict = presAddr?.district || student.district || '—';
  const presDivision = presAddr?.division || student.division || '—';
  const presPost =
    presAddr?.post_code || presAddr?.post_office
      ? `${presAddr.post_office || ''} ${presAddr.post_code ? `(${presAddr.post_code})` : ''}`.trim()
      : '—';
  const presCoords =
    student.latitude && student.longitude
      ? `${student.latitude}, ${student.longitude}`
      : presAddr?.latitude && presAddr?.longitude
      ? `${presAddr.latitude}, ${presAddr.longitude}`
      : null;

  const permAddr =
    typeof student.permanent_address === 'object'
      ? student.permanent_address
      : typeof student.details?.permanent_address === 'object'
      ? (student.details?.permanent_address as StudentAddressDetail)
      : null;
  const permStreet =
    permAddr?.street_address ||
    (typeof student.details?.permanent_address === 'string'
      ? student.details?.permanent_address
      : '') ||
    '—';
  const permThana = permAddr?.thana_or_upazila || '—';
  const permDistrict = permAddr?.district || '—';
  const permDivision = permAddr?.division || '—';
  const permPost =
    permAddr?.post_code || permAddr?.post_office
      ? `${permAddr.post_office || ''} ${permAddr.post_code ? `(${permAddr.post_code})` : ''}`.trim()
      : '—';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Biographical & Institutional Profile */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <StudentIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Biographical &amp; Institutional Profile
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Core personal credentials and academy enrolment details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Full Legal Name (English)
            </span>
            <p className="font-bold theme-text-primary text-base">
              {student.name_en || student.name || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Native / Bangla Name
            </span>
            <p className="font-semibold theme-text-primary text-base">
              {student.bangla_name || student.details?.name_bn || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Unique Student ID &amp; Roll
            </span>
            <p className="font-mono font-bold text-base theme-accent">
              {student.uniq_id || `STU-${student.id}`}{' '}
              {student.roll_number ? `(Roll #${student.roll_number})` : ''}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Date of Birth &amp; Calculated Age
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {dob ? `${dob} (${calculatedAge} years)` : 'Not Specified'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Gender
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base capitalize">
              {student.gender ? student.gender.toLowerCase() : 'Male'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Blood Group
            </span>
            <p className="font-bold text-rose-500 text-sm sm:text-base">
              {student.blood_group || student.details?.blood_group || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Campus Branch
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {getBranchDisplayName(student.branch_name || student.branch) || 'Main Campus'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Class &amp; Section / Group
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.student_class_name || student.education_status || 'General Class'}{' '}
              {student.group_name || student.student_group_name
                ? `• ${student.group_name || student.student_group_name}`
                : ''}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Admission Date
            </span>
            <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
              {formatDisplayDate(
                student.admission_date ||
                  student.academic_detail?.admission_date ||
                  student.details?.admission_date
              )}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Identity Document (BRN / NID)
            </span>
            <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
              {student.birth_certificate_no
                ? `BRN: ${student.birth_certificate_no}`
                : student.nid_no
                ? `NID: ${student.nid_no}`
                : 'Not Submitted'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Residential Status
            </span>
            <p className="font-semibold theme-text-primary text-xs sm:text-sm uppercase tracking-wide">
              {(student.target_status || 'NON_RESIDENTIAL').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Guardian & Family Contacts */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <GroupIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Guardian &amp; Family Contacts
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Parents, primary guardian and emergency telephone contact details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Primary Guardian Name
            </span>
            <p className="font-bold text-base theme-text-primary">
              {student.guardian_detail?.primary_guardian_name ||
                student.guardian_detail?.father_name ||
                student.details?.guardian_name ||
                student.details?.father_name ||
                '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
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
                  <span className="font-mono font-bold text-base theme-text-primary">{phone}</span>
                  <a
                    href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg theme-bg-app hover:bg-emerald-500/10 text-emerald-500 transition-all border-0 shadow-xs"
                    title="Chat on WhatsApp"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <p className="font-normal theme-text-secondary">Not Specified</p>
              );
            })()}
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Guardian Relation
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.guardian_relation ||
                student.details?.guardian_relation ||
                '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Guardian National ID (NID)
            </span>
            <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.guardian_nid || 'Not Provided'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Father's Name
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.father_name || student.details?.father_name || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Father's Phone &amp; WhatsApp
            </span>
            {(() => {
              const fPhone = student.guardian_detail?.father_phone;
              return fPhone ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-medium text-sm sm:text-base theme-text-primary">
                    {fPhone}
                  </span>
                  <a
                    href={`https://wa.me/${fPhone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg theme-bg-app hover:bg-emerald-500/10 text-emerald-500 transition-all border-0 shadow-xs"
                    title="WhatsApp Father"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <p className="font-normal theme-text-secondary">—</p>
              );
            })()}
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Father's Occupation
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.father_occupation ||
                student.details?.father_occupation ||
                '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Mother's Name
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.mother_name || student.details?.mother_name || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Mother's Phone
            </span>
            <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.mother_phone || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Mother's Occupation
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.guardian_detail?.mother_occupation || '—'}
            </p>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Emergency Contact Number
            </span>
            <p className="font-mono font-medium text-sm sm:text-base theme-text-primary">
              {student.guardian_detail?.emergency_contact_phone ||
                student.details?.emergency_contact_phone ||
                student.details?.emergency_phone ||
                '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Previous Academic Background */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <AcademicCapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Previous Academic Background
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Prior madrasa/school credentials, exam grade, TC and records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Previous Academy / Madrasa
            </span>
            <p className="font-bold text-base theme-text-primary">
              {student.academic_detail?.previous_school_name || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Previous Academy Location
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.academic_detail?.previous_school_address || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Previous Class / Level
            </span>
            <p className="font-medium theme-text-primary text-sm sm:text-base">
              {student.academic_detail?.previous_class || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Previous Exam Grade / Division
            </span>
            <p className="font-bold theme-accent text-sm sm:text-base">
              {student.academic_detail?.previous_grade ||
                student.academic_detail?.previous_result?.split(' (')[0] ||
                student.academic_detail?.previous_result ||
                '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Average / Percentage / GPA
            </span>
            <p className="font-mono font-bold theme-text-primary text-sm sm:text-base">
              {student.academic_detail?.previous_average || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Passing Year
            </span>
            <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
              {student.academic_detail?.previous_passing_year || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Transfer Certificate (TC) Number
            </span>
            <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
              {student.academic_detail?.tc_number || '—'}
            </p>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Academic &amp; Study Notes
            </span>
            <p className="font-medium theme-text-primary text-sm leading-relaxed">
              {student.academic_detail?.previous_study_details || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Residential & Address Information */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <LocationPinIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Residential &amp; Address Information
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Present living and permanent village locations
            </p>
          </div>
        </div>

        {/* Present Address */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary block">
              Present / Current Address
            </span>
            {presCoords && (
              <span className="text-[10px] font-mono font-bold theme-accent px-2.5 py-1 rounded-xl theme-bg-accent-soft border-0 shadow-xs">
                GPS: {presCoords}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Street / Village / Area
              </span>
              <p className="font-medium theme-text-primary leading-relaxed text-sm sm:text-base">
                {presStreet}
              </p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Thana / Upazila
              </span>
              <p className="font-medium theme-text-primary text-sm sm:text-base">{presThana}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                District
              </span>
              <p className="font-medium theme-text-primary text-sm sm:text-base">{presDistrict}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Division
              </span>
              <p className="font-medium theme-text-primary text-sm sm:text-base">{presDivision}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Post Office &amp; Code
              </span>
              <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                {presPost}
              </p>
            </div>
          </div>
        </div>

        {/* Permanent Address */}
        <div className="space-y-3 pt-6 border-t theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary block">
            Permanent / Village Address
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Street / Village / Area
              </span>
              <p className="font-medium theme-text-primary leading-relaxed text-sm sm:text-base">
                {permStreet}
              </p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Thana / Upazila
              </span>
              <p className="font-medium theme-text-primary text-sm sm:text-base">{permThana}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                District
              </span>
              <p className="font-medium theme-text-primary text-sm sm:text-base">{permDistrict}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Division
              </span>
              <p className="font-medium theme-text-primary text-sm sm:text-base">{permDivision}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Post Office &amp; Code
              </span>
              <p className="font-mono font-medium theme-text-primary text-sm sm:text-base">
                {permPost}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPersonalTab;
