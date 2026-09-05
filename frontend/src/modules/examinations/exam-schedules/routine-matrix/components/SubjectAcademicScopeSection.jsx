import React from 'react';
import { DrawerSection } from '../../../../../components/layout';
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

/**
 * SubjectAcademicScopeSection
 * Handles Department, Target Class, Section Scope, Room/Hall, Examiner & Invigilation notes.
 */
export default function SubjectAcademicScopeSection({
  formData,
  setFormData,
  allAvailableClasses = [],
  handleDepartmentChange,
  handleClassChange,
  handleSectionChange,
}) {
  return (
    <>
      {/* ─── Academic Scope & Location ────────────────────────────────────── */}
      <DrawerSection
        title="Academic Scope & Location"
        icon={BuildingLibraryIcon}
      >
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
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
            onChange={(val) => setFormData((prev) => ({ ...prev, roomNo: val }))}
            placeholder="e.g. Hall 204, Central Auditorium"
            icon={BuildingLibraryIcon}
          />
        </div>
      </DrawerSection>

      {/* ─── Examiner & Invigilation ─────────────────────────────────────── */}
      <DrawerSection
        title="Examiner & Invigilation"
        icon={UserIcon}
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <TeacherSelect
              label="Hall Invigilator"
              value={formData.invigilatorId || formData.teacherId}
              allowAll={false}
              searchable={true}
              placeholder="Assign hall supervisor..."
              onChange={(selectedVal, teacherObj) => {
                const teacherNameStr =
                  teacherObj?.name_en ||
                  teacherObj?.name ||
                  teacherObj?.full_name ||
                  teacherObj?.user_name ||
                  teacherObj?.label ||
                  '';
                setFormData((prev) => ({
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
              onChange={(selectedVal, teacherObj) => {
                const teacherNameStr =
                  teacherObj?.name_en ||
                  teacherObj?.name ||
                  teacherObj?.full_name ||
                  teacherObj?.user_name ||
                  teacherObj?.label ||
                  '';
                setFormData((prev) => ({
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
            onChange={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
            placeholder="e.g. Roll 1–40 in Hall A, Calculators strictly prohibited"
            icon={DocumentTextIcon}
          />
        </div>
      </DrawerSection>
    </>
  );
}
