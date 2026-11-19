import React from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import {
  DepartmentSelect,
  ClassSelect,
  SectionSelect,
  TeacherSelect,
} from '../../../../../components/selectors';
import {
  BuildingLibraryIcon,
  UserIcon,
  DocumentTextIcon,
} from '../../../../../components/ui/Icons';

export interface SubjectAcademicScopeSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  allAvailableClasses?: any[];
  handleDepartmentChange: (deptId: string) => void;
  handleClassChange: (classId: string, classObj?: any) => void;
  handleSectionChange: (secId: string) => void;
}

/**
 * SubjectAcademicScopeSection
 * Handles Department, Target Class, Section Scope, Room/Hall, Examiner & Invigilation notes.
 * Streamlined Enterprise Section Headers (Zero Boxed Cards).
 */
export default function SubjectAcademicScopeSection({
  formData,
  setFormData,
  allAvailableClasses = [],
  handleDepartmentChange,
  handleClassChange,
  handleSectionChange,
}: SubjectAcademicScopeSectionProps) {
  return (
    <div className="space-y-6 text-left">
      {/* ─── Academic Scope & Location ────────────────────────────────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <BuildingLibraryIcon className="w-4 h-4 theme-accent shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Academic Scope & Location
          </h3>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 pt-1">
          <DepartmentSelect
            label="Department Scope"
            value={formData.departmentId}
            allowAll={true}
            allLabel="All Departments (Institution-Wide)"
            placeholder="Select Department..."
            onChange={handleDepartmentChange}
          />

          <ClassSelect
            label="Target Academic Class"
            value={formData.classId}
            departmentId={formData.departmentId}
            classes={allAvailableClasses}
            allowAll={false}
            placeholder="Select Class..."
            required
            onChange={handleClassChange}
          />

          <SectionSelect
            label="Section Scope"
            value={formData.sectionId || 'ALL'}
            classId={formData.classId}
            allowAll={true}
            allValue="ALL"
            allLabel="All Sections (Class-Wide)"
            placeholder="Select Section Scope..."
            onChange={handleSectionChange}
          />

          <CustomInput
            label="Exam Room / Hall"
            value={formData.roomNo}
            onChange={(val: string) => setFormData((prev: any) => ({ ...prev, roomNo: val }))}
            placeholder="e.g. Hall 204, Central Auditorium"
            icon={BuildingLibraryIcon}
          />
        </div>
      </div>

      {/* ─── Examiner & Invigilation ─────────────────────────────────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <UserIcon className="w-4 h-4 theme-accent shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Examiner & Invigilation
          </h3>
        </div>

        <div className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <TeacherSelect
              label="Hall Invigilator"
              value={formData.invigilatorId || formData.teacherId}
              allowAll={false}
              searchable={true}
              placeholder="Assign hall supervisor..."
              onChange={(selectedVal: string, teacherObj: any) => {
                const teacherNameStr =
                  teacherObj?.name_en ||
                  teacherObj?.name ||
                  teacherObj?.full_name ||
                  teacherObj?.user_name ||
                  teacherObj?.label ||
                  '';
                setFormData((prev: any) => ({
                  ...prev,
                  invigilatorId: selectedVal || '',
                  invigilatorName: teacherNameStr,
                  teacherId: selectedVal || '',
                  teacherName: teacherNameStr,
                }));
              }}
            />

            <TeacherSelect
              label="Paper Setter & Examiner"
              value={formData.examinerId || formData.evaluatorId}
              allowAll={false}
              searchable={true}
              placeholder="Assign evaluator..."
              onChange={(selectedVal: string, teacherObj: any) => {
                const teacherNameStr =
                  teacherObj?.name_en ||
                  teacherObj?.name ||
                  teacherObj?.full_name ||
                  teacherObj?.user_name ||
                  teacherObj?.label ||
                  '';
                setFormData((prev: any) => ({
                  ...prev,
                  examinerId: selectedVal || '',
                  examinerName: teacherNameStr,
                  evaluatorId: selectedVal || '',
                  evaluatorName: teacherNameStr,
                }));
              }}
            />
          </div>

          <CustomInput
            label="Invigilation Notes / Instructions"
            value={formData.notes}
            onChange={(val: string) => setFormData((prev: any) => ({ ...prev, notes: val }))}
            placeholder="e.g. Roll 1–40 in Hall A, Calculators strictly prohibited"
            icon={DocumentTextIcon}
          />
        </div>
      </div>
    </div>
  );
}
