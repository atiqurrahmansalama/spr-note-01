import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TeacherIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  WhatsAppIcon,
  PhoneIcon,
  ClassIcon,
  DutyIcon,
} from '@/components/ui/Icons';
import DataCardGrid from '@/components/ui/DataCardGrid';
import ActionMenu from '@/components/ui/ActionMenu';
import { useStaffTranslation } from '../../locales';
import { formatEnglishDesignation } from '../utils/designationUtils';
import type { StaffMember, StaffRankItem } from '../../types';

interface StaffRosterCardGridProps {
  data: StaffMember[];
  ranksList: StaffRankItem[];
  isLoading: boolean;
  onOpenClassesModal: (staff: StaffMember) => void;
  onOpenDutiesModal: (staff: StaffMember) => void;
  onDeleteStaff: (staff: StaffMember) => void;
}

export const StaffRosterCardGrid: React.FC<StaffRosterCardGridProps> = ({
  data,
  ranksList,
  isLoading,
  onOpenClassesModal,
  onOpenDutiesModal,
  onDeleteStaff,
}) => {
  const navigate = useNavigate();
  const { t } = useStaffTranslation();

  const getActionMenuItems = (s: StaffMember) => [
    {
      label: t('viewProfile', 'View Profile'),
      icon: SearchIcon,
      onClick: () => navigate(`/staff/${s.id}`),
    },
    {
      label: t('editProfile', 'Edit Profile'),
      icon: EditIcon,
      onClick: () => navigate(`/staff/${s.id}`),
    },
    ...(s.staff_type === 'TEACHING'
      ? [
          {
            label: t('assignClasses', 'Assign Classes'),
            icon: ClassIcon,
            onClick: () => onOpenClassesModal(s),
          },
        ]
      : []),
    {
      label: t('assignDuties', 'Assign Duties'),
      icon: DutyIcon,
      onClick: () => onOpenDutiesModal(s),
    },
    { divider: true },
    {
      label: t('deleteRecord', 'Delete Record'),
      icon: TrashIcon,
      danger: true,
      onClick: () => onDeleteStaff(s),
    },
  ];

  return (
    <DataCardGrid
      data={data}
      isLoading={isLoading}
      emptyIcon={TeacherIcon}
      emptyTitle={t('noStaffFound', 'No Faculty or Staff Found')}
      emptySubMessage={t('noStaffSubmessage', 'No teacher or staff records match your selected filters.')}
      renderCard={(s: StaffMember) => {
        const staffName = s.user_name || s.name_en || s.employee_id;
        const initial = staffName ? staffName.charAt(0).toUpperCase() : 'S';
        const phone = s.phone_number || s.emergency_contact;
        const assignCount = s.assignments_count || 0;
        const designationTitle = formatEnglishDesignation(s.designation, ranksList);

        const avatarSrc = s.avatar || s.user_avatar || s.avatar_url || (s as any).photo;

        return (
          <div
            key={s.id}
            onClick={() => navigate(`/staff/${s.id}`)}
            className="p-5 rounded-3xl theme-bg-surface shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 border-0 hover:bg-[var(--accent-main)]/[0.03]"
          >
            {/* Header: Avatar, Name, Action Menu */}
            <div className="flex items-start justify-between gap-3 border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center shrink-0 border-0 shadow-xs">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={staffName}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm theme-text-primary truncate">
                    {staffName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[11px] theme-text-secondary truncate font-medium">
                      {designationTitle}
                    </p>
                  </div>
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <ActionMenu items={getActionMenuItems(s)} align="right" />
              </div>
            </div>

            {/* Department & ID */}
            <div className="flex flex-wrap items-center gap-2 border-0 text-xs">
              <span className="font-mono theme-accent font-semibold text-[11px]">
                {s.employee_id || 'ID: —'}
              </span>
              <span className="theme-text-secondary opacity-40">•</span>
              <span className="theme-text-secondary font-medium text-[11px]">
                {s.department_name || 'General Dept'}
              </span>
            </div>

            {/* Footer: Assignments & Quick Contact */}
            <div className="pt-3 flex items-center justify-between gap-2 border-0">
              <div className="text-[11px] theme-text-secondary font-medium">
                {s.staff_type === 'TEACHING'
                  ? t('classesAssigned', '{{count}} Classes Assigned', { count: assignCount })
                  : t('dutiesAssigned', '{{count}} Duties Assigned', { count: s.duties_count || 0 })}
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {phone && (
                  <>
                    <a
                      href={`tel:${phone}`}
                      className="p-1.5 rounded-xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition-all border-0 shadow-xs"
                      title="Call"
                    >
                      <PhoneIcon className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-xl theme-bg-app hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-all border-0 shadow-xs"
                      title="WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
};

