import React, { useRef } from 'react';
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
  CameraIcon,
} from '../../../../components/ui/Icons';
import ActionMenu from '../../../../components/ui/ActionMenu';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { useToast } from '../../../../context/ToastContext';
import { StudentFullProfile } from './types';
import { getDocUrl } from './utils';

export interface StudentProfileHeroProps {
  student: StudentFullProfile;
  uploadingPhoto?: boolean;
  canEditStudent?: boolean;
  canTransferStudent?: boolean;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenQrModal?: () => void;
  onOpenTransferModal?: () => void;
}

export const StudentProfileHero: React.FC<StudentProfileHeroProps> = ({
  student,
  uploadingPhoto = false,
  canEditStudent = true,
  canTransferStudent = true,
  onPhotoUpload,
  onOpenQrModal,
  onOpenTransferModal,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
    <div className="relative rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-6">
        
        {/* Left: Avatar & Identity Metadata */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 flex-1 min-w-0 text-center sm:text-left">
          
          {/* Avatar with Camera upload trigger */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-visible shrink-0 theme-bg-sub/80 border-0 shadow-xs">
            <div className="w-full h-full rounded-2xl overflow-hidden">
              {student.photo ? (
                <img
                  src={getDocUrl(student.photo)}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold theme-accent theme-bg-accent-soft rounded-2xl">
                  {initial}
                </div>
              )}
            </div>

            {/* Camera Upload Floating Button */}
            <label
              title="Upload student photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all z-10 border-0"
            >
              {uploadingPhoto ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <CameraIcon className="w-3.5 h-3.5" />
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoUpload}
                disabled={uploadingPhoto}
              />
            </label>
          </div>

          {/* Student Names & Metadata Chips */}
          <div className="space-y-2 min-w-0 flex-1 flex flex-col items-center sm:items-start">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary leading-tight">
                {displayName}
              </h1>

              {/* Reusable Theme Filled Status Badge */}
              <StatusBadge status={student.status || 'ACTIVE'} />
            </div>

            {student.bangla_name && (
              <p className="text-xs font-medium theme-text-secondary">
                {student.bangla_name}
              </p>
            )}

            {/* Minimal Clean Metadata: ID, Roll, Class, Group */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              {/* ID Badge with 1-Click Copy */}
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl theme-bg-app hover:theme-bg-elevated/40 theme-text-secondary hover:theme-text-primary font-mono text-xs cursor-pointer border-0 shadow-xs transition-all group"
                title="Click to copy Student ID"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">ID:</span>
                <span className="font-bold theme-text-primary">{student.uniq_id || `STU-${student.id}`}</span>
                <CopyIcon className="w-3 h-3 text-zinc-400 group-hover:theme-accent transition-colors shrink-0" />
              </button>

              {/* Roll Badge */}
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl theme-bg-app theme-text-secondary text-xs border-0 shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Roll:</span>
                <span className="font-mono font-bold theme-text-primary">
                  {student.roll_number ? `#${student.roll_number}` : '—'}
                </span>
              </div>

              {/* Class & Group / Section */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl theme-bg-app text-xs border-0 shadow-xs theme-text-secondary">
                <ClassIcon className="w-3.5 h-3.5 opacity-70" />
                <span className="font-semibold theme-text-primary">
                  {student.student_class_name || 'General Class'}
                </span>
                {(student.group_name || student.student_group_name) && (
                  <>
                    <span>•</span>
                    <span className="font-medium">
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
                className="p-2.5 rounded-2xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition-all border-0 shadow-xs"
                title={`Call Guardian: ${guardianPhone}`}
              >
                <PhoneIcon className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${guardianPhone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-2xl theme-bg-app hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-all border-0 shadow-xs"
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
