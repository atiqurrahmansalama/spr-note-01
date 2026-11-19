import React from 'react';
import { CheckCircleIcon, TeacherIcon } from '@/components/ui/Icons';
import type { StaffOnboardingPayload } from '../../types';

interface StaffOnboardingStepReviewProps {
  formData: StaffOnboardingPayload;
  showPayroll: boolean;
}

export const StaffOnboardingStepReview: React.FC<StaffOnboardingStepReviewProps> = ({
  formData,
  showPayroll,
}) => {
  return (
    <div className="space-y-5 animate-fade-in border-0">
      <div className="p-4 rounded-2xl theme-bg-app border-0">
        <h4 className="text-xs font-bold theme-text-primary">Summary Verification &amp; Confirmation</h4>
        <p className="text-[11px] theme-text-secondary mt-0.5">
          Please review the candidate profile details below before finalizing official onboarding into the institutional roster.
        </p>
      </div>

      <div className="p-6 rounded-3xl theme-bg-surface shadow-xs space-y-6 border-0">
        {/* Profile Header */}
        <div className="flex items-center gap-4 border-0">
          <div className="w-16 h-16 rounded-3xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 overflow-hidden shadow-xs border-0">
            {formData.photo_url ? (
              <img src={formData.photo_url} alt={formData.name} className="w-full h-full object-cover" />
            ) : (
              <TeacherIcon className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold theme-text-primary">{formData.name}</h3>
            {formData.bangla_name && (
              <p className="text-xs theme-text-secondary">{formData.bangla_name}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border-0">
                Rank {formData.rank_order}
              </span>
              <span className="text-xs font-semibold theme-accent">{formData.designation}</span>
              <span className="text-xs theme-text-muted">•</span>
              <span className="text-xs theme-text-secondary">{formData.staff_type}</span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-0">
          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1 border-0">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Contact &amp; Identity
            </span>
            <p className="text-xs font-semibold theme-text-primary">{formData.phone_number}</p>
            <p className="text-xs theme-text-secondary truncate">{formData.email || 'No email provided'}</p>
            <p className="text-xs theme-text-secondary">NID: {formData.nid_no || '—'}</p>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1 border-0">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Academic Background
            </span>
            <p className="text-xs font-semibold theme-text-primary">{formData.highest_degree || '—'}</p>
            <p className="text-xs theme-text-secondary">{formData.specialization || 'General'}</p>
            <p className="text-xs theme-text-secondary">CV: {formData.cv_name || (formData.cv_url ? 'Attached' : 'None')}</p>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-app space-y-1 border-0">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
              Employment &amp; Joining
            </span>
            <p className="text-xs font-semibold theme-text-primary">{formData.employment_status}</p>
            <p className="text-xs theme-text-secondary">Joined: {formData.joining_date}</p>
            {showPayroll && formData.base_salary ? (
              <p className="text-xs font-mono font-bold theme-accent">BDT {formData.base_salary.toLocaleString()} / mo</p>
            ) : null}
          </div>
        </div>

        {/* Address */}
        <div className="p-3.5 rounded-2xl theme-bg-app border-0">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block mb-1">
            Present Address
          </span>
          <p className="text-xs theme-text-primary">
            {formData.address || `${formData.upazila_thana || ''}, ${formData.district || ''}` || 'Not provided'}
          </p>
        </div>
      </div>
    </div>
  );
};

