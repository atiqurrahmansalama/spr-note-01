import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StudentIcon,
  ClassIcon,
  PhoneIcon,
  WhatsAppIcon,
  TransferIcon,
  QrCodeIcon,
  EditIcon,
  CopyIcon,
} from '../../../../components/ui/Icons';
import ActionMenu from '../../../../components/ui/ActionMenu';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { useToast } from '../../../../context/ToastContext';
import { StudentFullProfile } from './types';
import { getDocUrl } from './utils';

export interface StudentProfileHeroProps {
  student: StudentFullProfile;
  canEditStudent?: boolean;
  canTransferStudent?: boolean;
  onOpenQrModal?: () => void;
  onOpenTransferModal?: () => void;
}

export const StudentProfileHero: React.FC<StudentProfileHeroProps> = ({
  student,
  canEditStudent = true,
  canTransferStudent = true,
  onOpenQrModal,
  onOpenTransferModal,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const displayName = student.name_en || student.name || 'Student';
  const initial = displayName.charAt(0).toUpperCase() || 'S';
  const guardianPhone =
    student.guardian_detail?.primary_guardian_phone ||
    student.guardian_detail?.father_phone ||
    student.details?.guardian_phone ||
    student.details?.emergency_phone;

  const handleCopyId = () => {
    const idToCopy = student.uniq_id || `STU-${student.id}`;
    navigator.clipboard.writeText(idToCopy);
    showToast('Student ID copied to clipboard!', 'success');
  };

  const heroActionMenuItems = [
    {
      label: 'View / Scan QR Code',
      icon: QrCodeIcon,
      onClick: () => onOpenQrModal?.(),
    },
    ...(canEditStudent
      ? [
          {
            label: 'Edit Student Profile',
            icon: EditIcon,
            onClick: () => navigate(`/admission?edit=${student.id}`),
          },
        ]
      : []),
    ...(canTransferStudent
      ? [
          {
            label: 'Transfer Class / Group',
            icon: TransferIcon,
            onClick: () => onOpenTransferModal?.(),
          },
        ]
      : []),
    { divider: true },
    {
      label: 'Return to Student Roster',
      icon: StudentIcon,
      onClick: () => navigate('/students'),
    },
  ];

  return (
    <div className="relative rounded-3xl theme-bg-surface border-0 p-5 sm:p-7 shadow-xs transition-colors duration-150">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-6">
        
        {/* Left: Avatar & Identity Metadata */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 flex-1 min-w-0 text-center sm:text-left">
          
          {/* Avatar (Modern Borderless Soft Surface) */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-3xl overflow-hidden shrink-0 theme-bg-app shadow-2xs border-0 transition-transform duration-200">
            {student.photo ? (
              <img
                src={getDocUrl(student.photo)}
                alt={displayName}
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-black theme-accent theme-bg-accent-soft rounded-3xl select-none">
                {initial}
              </div>
            )}
          </div>

          {/* Student Names & Metadata */}
          <div className="space-y-2.5 min-w-0 flex-1 flex flex-col items-center sm:items-start">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight theme-text-primary leading-tight">
                {displayName}
              </h1>

              {/* Theme Filled Status Badge */}
              <StatusBadge status={student.status || 'ACTIVE'} />
            </div>

            {/* Clean Minimal Metadata: ID & Class/Group */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-0.5 text-xs">
              {/* ID Badge with 1-Click Copy */}
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-app hover:theme-bg-elevated/60 theme-text-secondary hover:theme-text-primary font-mono text-[11px] font-semibold cursor-pointer border-0 shadow-2xs transition-all duration-150 group"
                title="Click to copy Student ID"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">ID</span>
                <span className="font-bold theme-text-primary">{student.uniq_id || `STU-${student.id}`}</span>
                <CopyIcon className="w-3 h-3 text-zinc-400 group-hover:theme-accent transition-colors shrink-0" />
              </button>

              {/* Class & Group / Section (Clean Inline Typography, Zero Background Capsule) */}
              <div className="inline-flex items-center gap-1.5 text-xs theme-text-secondary">
                <ClassIcon className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="font-semibold theme-text-primary">
                  {student.student_class_name || 'General Class'}
                </span>
                {(student.group_name || student.student_group_name) && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="font-medium theme-text-secondary">
                      {student.group_name || student.student_group_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls & 3-Dot ActionMenu */}
        <div className="flex items-center gap-2 shrink-0">
          {guardianPhone && (
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${guardianPhone}`}
                className="w-9 h-9 rounded-2xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary flex items-center justify-center transition-all duration-150 border-0 shadow-2xs"
                title={`Call Guardian: ${guardianPhone}`}
              >
                <PhoneIcon className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${guardianPhone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-2xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary flex items-center justify-center transition-all duration-150 border-0 shadow-2xs"
                title="WhatsApp Guardian"
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

export default StudentProfileHero;
