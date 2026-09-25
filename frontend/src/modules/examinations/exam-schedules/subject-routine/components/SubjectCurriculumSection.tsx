import React from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import { BookOpenIcon } from '../../../../../components/ui/Icons';
import { SelectOption } from '../types';

export interface SubjectCurriculumSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  bookOptions?: SelectOption[];
  classMatchingBooks?: any[];
  handleBookChange: (bookId: string) => void;
}

/**
 * SubjectCurriculumSection
 * Handles Curriculum Book selection and Subject Examination Title.
 * Streamlined Enterprise Section Headers (Zero Boxed Cards).
 */
export default function SubjectCurriculumSection({
  formData,
  setFormData,
  bookOptions = [],
  classMatchingBooks = [],
  handleBookChange,
}: SubjectCurriculumSectionProps) {
  return (
    <div className="space-y-3.5 text-left">
      <div className="flex items-center gap-2 pb-2 border-b theme-border">
        <BookOpenIcon className="w-4 h-4 theme-accent shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
          Subject & Curriculum Book
        </h3>
      </div>

      <div className="space-y-3.5 pt-1">
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
              onChange={(val: string) => setFormData((prev: any) => ({ ...prev, subjectName: val }))}
              placeholder="e.g. Arabic Grammar 1st Paper"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}
