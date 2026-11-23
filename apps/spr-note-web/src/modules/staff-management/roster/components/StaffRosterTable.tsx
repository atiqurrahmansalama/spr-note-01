import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchIcon,
  EditIcon,
  TrashIcon,
  WhatsAppIcon,
  PhoneIcon,
  ClassIcon,
  DutyIcon,
} from '@/components/ui/Icons';
import DataTable from '@/components/ui/DataTable';
import ActionMenu from '@/components/ui/ActionMenu';
import { useStaffTranslation } from '../../locales';
import { formatEnglishDesignation } from '../utils/designationUtils';
import type { StaffMember, StaffRankItem } from '../../types';

interface StaffRosterTableProps {
  data: StaffMember[];
  ranksList: StaffRankItem[];
  isLoading: boolean;
  onOpenClassesModal: (staff: StaffMember) => void;
  onOpenDutiesModal: (staff: StaffMember) => void;
  onDeleteStaff: (staff: StaffMember) => void;
}

export const StaffRosterTable: React.FC<StaffRosterTableProps> = ({
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

  const columns = [
    {
      key: 'name',
      header: t('colFacultyStaff', 'FACULTY & STAFF'),
      headerClassName: 'text-left',
      align: 'left',
      render: (s: StaffMember) => {
        const staffName = s.user_name || s.name_en || s.employee_id;
        const initial = staffName ? staffName.charAt(0).toUpperCase() : 'S';
        const avatarSrc = s.avatar || s.user_avatar || s.avatar_url || (s as any).photo;

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center shrink-0 shadow-xs border-0">
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
              <span
                onClick={() => navigate(`/staff/${s.id}`)}
                className="font-bold theme-text-primary text-xs sm:text-sm truncate block leading-tight hover:underline cursor-pointer"
              >
                {staffName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono theme-accent font-medium">
                  {s.employee_id || 'ID: —'}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'designation',
      header: t('colDesignation', 'DESIGNATION'),
      headerClassName: 'text-left',
      align: 'left',
      render: (s: StaffMember) => {
        const title = formatEnglishDesignation(s.designation, ranksList);

        return (
          <span className="text-xs font-semibold theme-text-primary block">{title}</span>
        );
      },
    },
    {
      key: 'department_role',
      header: t('colDepartmentRole', 'DEPARTMENT & ROLE'),
      headerClassName: 'text-left',
      align: 'left',
      render: (s: StaffMember) => (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold theme-text-primary truncate">
            {s.department_name || 'General Department'}
          </div>
          <div
            className={`text-[11px] font-medium ${
              s.staff_type === 'TEACHING'
                ? 'theme-accent'
                : 'theme-text-secondary'
            }`}
          >
            {s.staff_type || 'Faculty'}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('colContact', 'CONTACT'),
      headerClassName: 'text-center',
      align: 'center',
      render: (s: StaffMember) => {
        const phone = s.phone_number || s.emergency_contact;
        return (
          <div className="flex items-center justify-center gap-1.5">
            {phone ? (
              <>
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-xl hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition-all cursor-pointer border-0 shadow-xs"
                  title={`Call ${phone}`}
                >
                  <PhoneIcon className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-all cursor-pointer border-0 shadow-xs"
                  title="WhatsApp Chat"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <span className="text-[11px] theme-text-secondary opacity-50">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: t('colStatus', 'STATUS'),
      headerClassName: 'text-center',
      align: 'center',
      render: (s: StaffMember) => (
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              s.employment_status === 'PERMANENT'
                ? 'theme-bg-accent'
                : s.employment_status === 'PROBATION'
                ? 'bg-amber-500'
                : 'theme-bg-subtle'
            }`}
          />
          <span
            className={`text-xs font-semibold ${
              s.employment_status === 'PERMANENT'
                ? 'theme-accent'
                : s.employment_status === 'PROBATION'
                ? 'text-amber-500'
                : 'theme-text-secondary'
            }`}
          >
            {s.employment_status || 'Active'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      align: 'right',
      render: (s: StaffMember) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionMenuItems(s)} align="right" />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyTitle={t('noStaffFound', 'No Faculty or Staff Found')}
      emptySubMessage={t('noStaffSubmessage', 'No teacher or staff records match your selected filters.')}
      onRowClick={(s: StaffMember) => navigate(`/staff/${s.id}`)}
    />
  );
};

