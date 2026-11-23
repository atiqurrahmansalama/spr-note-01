import React from 'react';
import {
  ClassIcon,
  DutyIcon,
  PlusIcon,
  AcademicCapIcon,
  GroupIcon,
  CalendarIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import EmptyState from '@/components/ui/EmptyState';
import type { StaffMember } from '@/types/staff';

export interface TeacherAssignmentItem {
  id: string | number;
  class_name: string;
  role_in_class?: string;
  group_name?: string;
  session_name?: string;
}

export interface GeneralDutyItem {
  id: string | number;
  duty_title: string;
  duty_description?: string;
  priority?: string;
  effective_from?: string;
  effective_to?: string;
}

export interface StaffDutiesTabProps {
  staff: StaffMember;
  assignments: TeacherAssignmentItem[];
  duties: GeneralDutyItem[];
  canAssignDuties?: boolean;
  onOpenAssignDrawer?: () => void;
}

export const StaffDutiesTab: React.FC<StaffDutiesTabProps> = ({
  staff,
  assignments,
  duties,
  canAssignDuties = true,
  onOpenAssignDrawer,
}) => {
  const isTeaching = staff.staff_type === 'TEACHING';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header with Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
              {isTeaching ? <ClassIcon className="w-5 h-5" /> : <DutyIcon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                {isTeaching ? 'Class & Subject Assignments' : 'General & Campus Duties'}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {isTeaching
                  ? 'Assigned classroom sections, groups, and academic teaching sessions'
                  : 'Assigned operational zones, residential supervision, and daily shifts'}
              </p>
            </div>
          </div>

          {canAssignDuties && (
            <button
              type="button"
              onClick={onOpenAssignDrawer}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs border-0 shrink-0 self-start sm:self-auto"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{isTeaching ? 'Assign Class' : 'Assign Duty'}</span>
            </button>
          )}
        </div>

        {/* Content Stream */}
        {isTeaching ? (
          assignments.length === 0 ? (
            <EmptyState
              icon={ClassIcon}
              title="No Classes Assigned"
              description="This faculty member currently has no active classroom teaching assignments."
              action={
                canAssignDuties && onOpenAssignDrawer
                  ? { label: 'Assign First Class', onClick: () => onOpenAssignDrawer() }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl theme-bg-app border-0 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm theme-text-primary">
                      {item.class_name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg theme-bg-accent-soft theme-accent">
                      {item.role_in_class || 'Primary Ustadh'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs theme-text-secondary">
                    {item.group_name && (
                      <div className="flex items-center gap-1.5">
                        <GroupIcon className="w-3.5 h-3.5 opacity-60" />
                        <span>Group: {item.group_name}</span>
                      </div>
                    )}
                    {item.session_name && (
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
                        <span>Session: {item.session_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : duties.length === 0 ? (
          <EmptyState
            icon={DutyIcon}
            title="No Duties Assigned"
            description="This staff member currently has no active operational campus duties."
            action={
              canAssignDuties && onOpenAssignDrawer
                ? { label: 'Assign First Duty', onClick: () => onOpenAssignDrawer() }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {duties.map((duty, idx) => (
              <div
                key={duty.id || idx}
                className="rounded-2xl theme-bg-app border-0 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm theme-text-primary truncate">
                    {duty.duty_title}
                  </span>
                  {duty.priority && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg theme-bg-accent-soft theme-accent">
                      {duty.priority}
                    </span>
                  )}
                </div>

                {duty.duty_description && (
                  <p className="text-xs theme-text-secondary line-clamp-2 leading-relaxed">
                    {duty.duty_description}
                  </p>
                )}

                {(duty.effective_from || duty.effective_to) && (
                  <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary pt-1 font-mono">
                    <ClockIcon className="w-3 h-3 opacity-60" />
                    <span>
                      {duty.effective_from || 'Now'} — {duty.effective_to || 'Ongoing'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDutiesTab;
