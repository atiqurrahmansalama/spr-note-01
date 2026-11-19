import React from 'react';
import CustomInput from '@/components/ui/CustomInput';
import DocumentFilePicker from '@/components/ui/DocumentFilePicker';
import MultiDocumentManager from '@/components/ui/MultiDocumentManager';
import type { StaffOnboardingPayload } from '../../types';

interface StaffOnboardingStepDocsProps {
  formData: StaffOnboardingPayload;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
}

export const StaffOnboardingStepDocs: React.FC<StaffOnboardingStepDocsProps> = ({
  formData,
  onChange,
}) => {
  return (
    <div className="space-y-6 animate-fade-in border-0">
      <div className="p-4 rounded-2xl theme-bg-app border-0">
        <h4 className="text-xs font-bold theme-text-primary">Academic Qualifications &amp; Bio-Data</h4>
        <p className="text-[11px] theme-text-secondary mt-0.5">
          Specify educational achievements, specialization, and upload CV and verified credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-0">
        <CustomInput
          label="Highest Academic Degree / Sanad"
          name="highest_degree"
          placeholder="e.g. Dawra-e-Hadith / Masters in Islamic Studies"
          value={formData.highest_degree || ''}
          onChange={(val) => onChange('highest_degree', val)}
        />

        <CustomInput
          label="Area of Specialization / Subject"
          name="specialization"
          placeholder="e.g. Hifz-ul-Quran, Tajweed, Fiqh, Arabic Grammar"
          value={formData.specialization || ''}
          onChange={(val) => onChange('specialization', val)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-0">
        <CustomInput
          label="Past Work &amp; Teaching Experience"
          name="experience_details"
          placeholder="e.g. 5 years as Senior Ustadh at Jamia Islamia"
          value={formData.experience_details || ''}
          onChange={(val) => onChange('experience_details', val)}
        />

        {formData.staff_type === 'TEACHING' && (
          <CustomInput
            label="Maximum Daily Lecture Periods"
            name="max_daily_periods"
            type="number"
            placeholder="4"
            value={String(formData.max_daily_periods || 4)}
            onChange={(val) => onChange('max_daily_periods', Number(val) || 4)}
          />
        )}
      </div>

      {/* CV Attachment */}
      <div className="p-4 rounded-2xl theme-bg-app space-y-2 border-0">
        <DocumentFilePicker
          fileUrl={formData.cv_url}
          fileName={formData.cv_name}
          fileSize={formData.cv_size}
          onChange={(fileData: any) => {
            onChange('cv_url', fileData?.url || '');
            onChange('cv_name', fileData?.name || '');
            onChange('cv_size', fileData?.size || '');
          }}
          onRemove={() => {
            onChange('cv_url', '');
            onChange('cv_name', '');
            onChange('cv_size', '');
          }}
          label="Resume / Bio-Data (CV)"
          subLabel="Upload CV or Bio-Data document (PDF / Image / DOCX, Max 5MB)"
        />
      </div>

      {/* Multiple Documents / Sanad Attachments */}
      <div className="p-4 rounded-2xl theme-bg-app space-y-2 border-0">
        <label className="text-xs font-bold theme-text-primary block">Educational Certificates &amp; Credentials</label>
        <MultiDocumentManager
          documents={formData.documents || []}
          onChange={(docs: any) => onChange('documents', docs)}
        />
      </div>
    </div>
  );
};

