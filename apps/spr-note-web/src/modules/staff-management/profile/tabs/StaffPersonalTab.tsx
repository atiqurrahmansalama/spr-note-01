import React from 'react';
import {
  TeacherIcon,
  LocationPinIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';
import type { StaffMember } from '@/types/staff';

export interface StaffPersonalTabProps {
  staff: StaffMember;
}

export const StaffPersonalTab: React.FC<StaffPersonalTabProps> = ({ staff }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Biographical & Employment Profile */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <TeacherIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Biographical &amp; Institutional Profile
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Core personal credentials, designation, and employment status
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Full Legal Name (English)
            </span>
            <p className="font-bold theme-text-primary text-base">
              {staff.user_name || staff.name_en || staff.name || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Name (Bengali / Native)
            </span>
            <p className="font-bold theme-text-primary text-base">
              {staff.bangla_name || (staff as any).name_bn || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Official Email
            </span>
            <p className="font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <MailIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.user_email || staff.email || '—'}</span>
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Contact Phone
            </span>
            <p className="font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <PhoneIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.user_phone || staff.phone_number || '—'}</span>
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Blood Group
            </span>
            <p className="font-bold theme-text-primary text-sm">
              {staff.blood_group ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg theme-bg-app font-mono font-bold theme-accent">
                  {staff.blood_group}
                </span>
              ) : (
                '—'
              )}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              National ID (NID)
            </span>
            <p className="font-mono font-bold theme-text-primary text-sm">
              {staff.nid_no || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Joining Date
            </span>
            <p className="font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.joining_date || '—'}</span>
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Employment Status
            </span>
            <p className="font-bold theme-text-primary text-sm">
              {staff.employment_status || 'Active'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Hierarchy Rank Order
            </span>
            <p className="font-mono font-bold theme-text-primary text-sm">
              Rank #{staff.rank_order ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Residential Address & Emergency Contacts */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <LocationPinIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Residential Address &amp; Emergency Contact
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Physical living address, division, and emergency phone numbers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div className="sm:col-span-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Street / Village Address
            </span>
            <p className="font-semibold theme-text-primary text-sm leading-relaxed">
              {staff.address || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Emergency Contact Phone
            </span>
            <p className="font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <PhoneIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.emergency_contact || '—'}</span>
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Upazila / Thana
            </span>
            <p className="font-semibold theme-text-primary text-sm">
              {staff.upazila_thana || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              District
            </span>
            <p className="font-semibold theme-text-primary text-sm">
              {staff.district || '—'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Division
            </span>
            <p className="font-semibold theme-text-primary text-sm">
              {staff.division || '—'}
            </p>
          </div>

          {staff.postal_code && (
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Postal Code
              </span>
              <p className="font-mono font-semibold theme-text-primary text-sm">
                {staff.postal_code}
              </p>
            </div>
          )}

          {staff.latitude && staff.longitude && (
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
                Geo Coordinates
              </span>
              <p className="font-mono text-xs theme-text-secondary">
                {staff.latitude}, {staff.longitude}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffPersonalTab;
