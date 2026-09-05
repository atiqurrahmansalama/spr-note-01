import React from 'react';
import { DrawerSection } from '../../../../../components/layout';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import { BookOpenIcon } from '../../../../../components/ui/Icons';

/**
 * SubjectCurriculumSection
 * Handles Curriculum Book selection and Subject Examination Title.
 */
export default function SubjectCurriculumSection({
  formData,
  setFormData,
  bookOptions = [],
  classMatchingBooks = [],
  handleBookChange,
}) {
  return (
    <DrawerSection
      title="Subject & Curriculum Book"
      icon={BookOpenIcon}
    >
      <div className="space-y-3.5">
        <CustomSelect
          label="Curriculum Textbook"
          value={formData.curriculumBookId || (formData.subjectName ? 'CUSTOM' : '')}
          options={bookOptions}
          icon={BookOpenIcon}
          placeholder={
            formData.classId
              ? classMatchingBooks.length > 0
                ? `Select Book (${classMatchingBooks.length} available for ${formData.className})...`
                : 'No curriculum books found (Choose Custom Subject)...'
              : 'Select Target Class first...'
          }
          disabled={!formData.classId}
          onChange={handleBookChange}
        />

        <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3.5">
          <div className="@[480px]:col-span-2">
            <CustomInput
              label="Subject Examination Title"
              value={formData.subjectName}
              onChange={(val) => setFormData((prev) => ({ ...prev, subjectName: val }))}
              placeholder="e.g. Arabic Grammar 1st Paper"
              required
            />
          </div>
        </div>
      </div>
    </DrawerSection>
  );
}
