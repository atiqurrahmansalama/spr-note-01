import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TeacherIcon,
  ClassIcon,
  DutyIcon,
  PhoneIcon,
  WhatsAppIcon,
  EditIcon,
  CopyIcon,
  LeaveIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';
import ActionMenu from '@/components/ui/ActionMenu';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { formatEnglishDesignation } from '../roster/utils/designationUtils';
import type { StaffMember } from '@/types/staff';

export interface StaffProfileHeroProps {
  staff: StaffMember;
  canEditStaff?: boolean;
  canAssignDuties?: boolean;
  onOpenEditDrawer?: () => void;
  onOpenAssignDrawer?: () => void;
  onOpenLeaveModal?: () => void;
}

export const StaffProfileHero: React.FC<StaffProfileHeroProps> = ({
  staff,
  canEditStaff = true,
  canAssignDuties = true,
  onOpenEditDrawer,
  onOpenAssignDrawer,
  onOpenLeaveModal,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isTeaching = staff.staff_type === 'TEACHING';
  const displayName = staff.user_name || staff.name_en || staff.name || staff.employee_id || 'Staff Member';
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  const avatarSrc = staff.avatar || staff.user_avatar || staff.avatar_url || (staff as any).photo;
  const phone = staff.user_phone || staff.phone_number || staff.emergency_contact;
  const englishDesignation = formatEnglishDesignation(
    staff.designation || (isTeaching ? 'Teaching Faculty' : 'General Staff')
  );
  const roleTitle =
    (staff as any).user_role ||
    (staff as any).role ||
    (staff as any).role_name ||
    ((staff as any).user_type ? String((staff as any).user_type).replace(/_/g, ' ') : null) ||
    'Academy Administrator';

  const handleCopyId = () => {
    const idToCopy = staff.employee_id || `STF-${staff.id}`;
    navigator.clipboard.writeText(idToCopy);
    showToast('Employee ID copied to clipboard!', 'success');
  };

  const heroActionMenuItems = [
    ...(canEditStaff
      ? [
          {
            label: 'Edit Profile',
            icon: EditIcon,
            onClick: () => onOpenEditDrawer?.(),
          },
        ]
      : []),
    ...(canAssignDuties
      ? [
          {
            label: isTeaching ? 'Assign Classes' : 'Assign Duties',
            icon: isTeaching ? ClassIcon : DutyIcon,
            onClick: () => onOpenAssignDrawer?.(),
          },
        ]
      : []),
    {
      label: 'Apply Leave',
      icon: LeaveIcon,
      onClick: () => onOpenLeaveModal?.(),
    },
    ...(phone
      ? [
          {
            label: 'WhatsApp Message',
            icon: WhatsAppIcon,
            onClick: () => {
              const num = phone.replace(/[^\d]/g, '');
              window.open(`https://wa.me/${num}`, '_blank');
            },
          },
        ]
      : []),
    { divider: true },
    {
      label: 'Return to Staff Directory',
      icon: ChevronLeftIcon,
      onClick: () => navigate('/staff/roster'),
    },
  ];

  return (
    <div className="relative rounded-3xl theme-bg-surface border-0 p-5 sm:p-7 shadow-xs transition-colors duration-150">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-6">
        
        {/* Left: Avatar & Identity Metadata */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 flex-1 min-w-0 text-center sm:text-left">
          
          {/* Avatar (Modern Borderless Soft Surface) */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-3xl overflow-hidden shrink-0 theme-bg-app shadow-2xs border-0 transition-transform duration-200">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName}
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-black theme-accent theme-bg-accent-soft rounded-3xl select-none">
                {initials}
              </div>
            )}
          </div>

          {/* Names & Metadata */}
          <div className="space-y-2.5 min-w-0 flex-1 flex flex-col items-center sm:items-start">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight theme-text-primary leading-tight">
                {displayName}
              </h1>

              {/* Theme Filled Status Badge */}
              <StatusBadge status={staff.employment_status || 'ACTIVE'} />
            </div>

            {/* Clean Minimal Metadata: ID & Role / Department */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-0.5 text-xs">
              {/* ID Badge with 1-Click Copy */}
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-app hover:theme-bg-elevated/60 theme-text-secondary hover:theme-text-primary font-mono text-[11px] font-semibold cursor-pointer border-0 shadow-2xs transition-all duration-150 group"
                title="Click to copy Employee ID"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">ID</span>
                <span className="font-bold theme-text-primary">{staff.employee_id || `STF-${staff.id}`}</span>
                <CopyIcon className="w-3 h-3 text-zinc-400 group-hover:theme-accent transition-colors shrink-0" />
              </button>

              {/* Role & Department (Clean Inline Typography, Zero Background Capsule) */}
              <div className="inline-flex items-center gap-1.5 text-xs theme-text-secondary">
                <TeacherIcon className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="font-semibold theme-text-primary">
                  {englishDesignation}
                </span>
                {staff.department_name && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="font-medium theme-text-secondary">
                      {staff.department_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Line 3: Academy Administrator / System Role */}
            {roleTitle && (
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs pt-0.5">
                <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent opacity-80 shrink-0" />
                <span className="font-medium theme-text-secondary">Role:</span>
                <span className="font-semibold theme-text-primary">{roleTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls & 3-Dot ActionMenu */}
        <div className="flex items-center gap-2 shrink-0">
          {phone && (
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${phone}`}
                className="w-9 h-9 rounded-2xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary flex items-center justify-center transition-all duration-150 border-0 shadow-2xs"
                title={`Call ${phone}`}
              >
                <PhoneIcon className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-2xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary flex items-center justify-center transition-all duration-150 border-0 shadow-2xs"
                title="WhatsApp Message"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
            </div>
          )}

          <ActionMenu items={heroActionMenuItems} align="right" />
        </div>
      </div>
    </div>
  );
};

export default StaffProfileHero;
